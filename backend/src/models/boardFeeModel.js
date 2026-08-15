const pool = require('../config/db');

const ALLOWED_FEE_TYPES = ['enrollment', 'exam_1', 'exam_2', 'project', 'other'];
const ALLOWED_STATUSES = ['unpaid', 'paid', 'partial'];

const BoardFeeModel = {
  ALLOWED_FEE_TYPES,
  ALLOWED_STATUSES,

  /**
   * Create the board_fees table + its receipt-number sequence/function
   * if they don't exist yet. Called once on server startup from app.js.
   * One row per (candidate, fee_type) — amount is entered per candidate.
   */
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS board_fees (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id     UUID NOT NULL REFERENCES board_candidates(id) ON DELETE CASCADE,
        fee_type         VARCHAR(20) NOT NULL,
        amount           NUMERIC(10, 2) NOT NULL DEFAULT 0,
        amount_paid      NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status           VARCHAR(20) NOT NULL DEFAULT 'unpaid',
        due_date         DATE,
        paid_at          TIMESTAMPTZ,
        receipt_number   VARCHAR(50) UNIQUE,
        notes            TEXT,
        created_by       UUID REFERENCES users(id),
        updated_by       UUID REFERENCES users(id),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_board_fee_type   CHECK (fee_type IN ('enrollment','exam_1','exam_2','project','other')),
        CONSTRAINT chk_board_fee_status CHECK (status IN ('unpaid','paid','partial')),
        CONSTRAINT chk_board_fee_amount CHECK (amount >= 0),
        CONSTRAINT chk_board_fee_amount_paid CHECK (amount_paid >= 0),
        CONSTRAINT uq_board_fee_candidate_type UNIQUE (candidate_id, fee_type)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_fees_candidate ON board_fees(candidate_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_fees_status    ON board_fees(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_fees_paid_at   ON board_fees(paid_at)`);

    await pool.query(`CREATE SEQUENCE IF NOT EXISTS board_receipt_number_seq START 1`);
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_board_receipt_number()
      RETURNS TEXT AS $$
      DECLARE
        next_val INTEGER;
      BEGIN
        next_val := nextval('board_receipt_number_seq');
        RETURN 'DIT-RCP-' || LPAD(next_val::TEXT, 6, '0');
      END;
      $$ LANGUAGE plpgsql;
    `);
  },

  async generateReceiptNumber() {
    const result = await pool.query(`SELECT generate_board_receipt_number() AS receipt_number`);
    return result.rows[0].receipt_number;
  },

  // -------------------------------------------------------
  // SET FEE ITEM (create or update the billed amount for a
  // candidate + fee type — "Enrollment", "Exam I", etc.)
  // -------------------------------------------------------

  async setFeeItem({ candidateId, feeType, amount, dueDate, notes, createdBy }) {
    const result = await pool.query(
      `INSERT INTO board_fees (candidate_id, fee_type, amount, due_date, notes, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       ON CONFLICT (candidate_id, fee_type)
       DO UPDATE SET amount = $3, due_date = $4, notes = $5, updated_by = $6, updated_at = NOW()
       RETURNING *`,
      [candidateId, feeType, amount, dueDate || null, notes || null, createdBy]
    );
    return result.rows[0];
  },

  // -------------------------------------------------------
  // MARK PAID / PARTIAL / UNPAID
  // -------------------------------------------------------

  async markPaid(feeId, updatedBy, amountPaidOverride = null) {
    const fee = await this.findById(feeId);
    if (!fee) return null;

    const amountPaid = amountPaidOverride !== null ? amountPaidOverride : fee.amount;
    const receiptNumber = fee.receipt_number || (await this.generateReceiptNumber());

    const result = await pool.query(
      `UPDATE board_fees
       SET status = 'paid', amount_paid = $1, paid_at = NOW(), receipt_number = $2, updated_by = $3
       WHERE id = $4
       RETURNING *`,
      [amountPaid, receiptNumber, updatedBy, feeId]
    );
    return result.rows[0] || null;
  },

  async markPartial(feeId, amountPaid, updatedBy) {
    const receiptNumber = (await this.findById(feeId))?.receipt_number || (await this.generateReceiptNumber());

    const result = await pool.query(
      `UPDATE board_fees
       SET status = 'partial', amount_paid = $1, paid_at = NOW(), receipt_number = $2, updated_by = $3
       WHERE id = $4
       RETURNING *`,
      [amountPaid, receiptNumber, updatedBy, feeId]
    );
    return result.rows[0] || null;
  },

  async markUnpaid(feeId, updatedBy) {
    const result = await pool.query(
      `UPDATE board_fees
       SET status = 'unpaid', amount_paid = 0, paid_at = NULL, updated_by = $1
       WHERE id = $2
       RETURNING *`,
      [updatedBy, feeId]
    );
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // FIND
  // -------------------------------------------------------

  async findById(id) {
    const result = await pool.query(
      `SELECT f.*,
              c.candidate_name, c.candidate_code, c.father_name,
              b.batch_name,
              u1.full_name AS created_by_name,
              u2.full_name AS updated_by_name
       FROM board_fees f
       JOIN board_candidates c ON c.id = f.candidate_id
       LEFT JOIN board_batches b ON b.id = c.batch_id
       LEFT JOIN users u1 ON u1.id = f.created_by
       LEFT JOIN users u2 ON u2.id = f.updated_by
       WHERE f.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async listForCandidate(candidateId) {
    const result = await pool.query(
      `SELECT f.*, c.candidate_name, c.candidate_code, c.father_name, b.batch_name
       FROM board_fees f
       JOIN board_candidates c ON c.id = f.candidate_id
       LEFT JOIN board_batches b ON b.id = c.batch_id
       WHERE f.candidate_id = $1
       ORDER BY f.created_at ASC`,
      [candidateId]
    );
    return result.rows;
  },

  // -------------------------------------------------------
  // LIST (filterable, across all candidates)
  // -------------------------------------------------------

  async list({ candidateId, batchId, feeType, status, search, page = 1, limit = 20 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const conditions = [];
    const params = [];
    let idx = 1;

    if (candidateId) {
      conditions.push(`f.candidate_id = $${idx}`);
      params.push(candidateId);
      idx++;
    }
    if (batchId) {
      conditions.push(`c.batch_id = $${idx}`);
      params.push(batchId);
      idx++;
    }
    if (feeType) {
      conditions.push(`f.fee_type = $${idx}`);
      params.push(feeType);
      idx++;
    }
    if (status) {
      conditions.push(`f.status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (search) {
      conditions.push(`(c.candidate_name ILIKE $${idx} OR c.candidate_code ILIKE $${idx} OR f.receipt_number ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (safePage - 1) * safeLimit;

    const baseQuery = `
      FROM board_fees f
      JOIN board_candidates c ON c.id = f.candidate_id
      LEFT JOIN board_batches b ON b.id = c.batch_id
      ${whereClause}
    `;

    const countResult = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT
         f.id, f.fee_type, f.amount, f.amount_paid, f.status,
         f.paid_at, f.receipt_number, f.due_date, f.notes, f.created_at,
         c.id AS candidate_id, c.candidate_code, c.candidate_name, c.father_name,
         b.batch_name
       ${baseQuery}
       ORDER BY f.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, safeLimit, offset]
    );

    return {
      data: dataResult.rows,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  },

  // -------------------------------------------------------
  // DASHBOARD STATS
  // -------------------------------------------------------

  async getDashboardStats() {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(amount_paid) FILTER (WHERE DATE(paid_at AT TIME ZONE 'UTC') = CURRENT_DATE), 0) AS today_collection,
        COALESCE(SUM(amount_paid) FILTER (WHERE paid_at >= DATE_TRUNC('week', NOW())), 0)  AS weekly_collection,
        COALESCE(SUM(amount_paid) FILTER (WHERE paid_at >= DATE_TRUNC('month', NOW())), 0) AS monthly_collection,
        COALESCE(SUM(amount_paid) FILTER (WHERE paid_at >= DATE_TRUNC('year', NOW())), 0)  AS yearly_collection,
        COALESCE(SUM(amount - amount_paid) FILTER (WHERE status IN ('unpaid','partial')), 0) AS total_outstanding,
        COUNT(*) FILTER (WHERE status = 'paid')    AS paid_count,
        COUNT(*) FILTER (WHERE status = 'unpaid')  AS unpaid_count,
        COUNT(*) FILTER (WHERE status = 'partial') AS partial_count
      FROM board_fees
    `);
    const row = result.rows[0];

    const byType = await pool.query(`
      SELECT fee_type,
             COUNT(*) AS record_count,
             COALESCE(SUM(amount), 0) AS total_billed,
             COALESCE(SUM(amount_paid), 0) AS total_paid
      FROM board_fees
      GROUP BY fee_type
    `);

    return {
      todayCollection: parseFloat(row.today_collection || 0),
      weeklyCollection: parseFloat(row.weekly_collection || 0),
      monthlyCollection: parseFloat(row.monthly_collection || 0),
      yearlyCollection: parseFloat(row.yearly_collection || 0),
      totalOutstanding: parseFloat(row.total_outstanding || 0),
      paidCount: parseInt(row.paid_count || 0, 10),
      unpaidCount: parseInt(row.unpaid_count || 0, 10),
      partialCount: parseInt(row.partial_count || 0, 10),
      byType: byType.rows.map((r) => ({
        feeType: r.fee_type,
        recordCount: parseInt(r.record_count, 10),
        totalBilled: parseFloat(r.total_billed),
        totalPaid: parseFloat(r.total_paid),
      })),
    };
  },
};

module.exports = BoardFeeModel;
