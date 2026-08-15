const pool = require('../config/db');

const ALLOWED_STATUSES = ['active', 'completed', 'dropped'];

const BoardCandidateModel = {
  ALLOWED_STATUSES,

  /**
   * Create the board_candidates table + code-generation sequence/function
   * if they don't exist yet. Called once on server startup from app.js.
   */
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS board_candidates (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_code    VARCHAR(30) UNIQUE NOT NULL,
        candidate_name    VARCHAR(150) NOT NULL,
        father_name       VARCHAR(150) NOT NULL,
        contact_number    VARCHAR(20),
        batch_id          UUID REFERENCES board_batches(id),
        enrollment_date   DATE NOT NULL,
        status            VARCHAR(20) NOT NULL DEFAULT 'active',
        created_by        UUID REFERENCES users(id),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_board_candidate_status CHECK (status IN ('active', 'completed', 'dropped'))
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_candidates_batch  ON board_candidates(batch_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_candidates_status ON board_candidates(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_candidates_name   ON board_candidates(candidate_name)`);

    await pool.query(`CREATE SEQUENCE IF NOT EXISTS board_candidate_code_seq START 1`);
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_board_candidate_code()
      RETURNS TEXT AS $$
      DECLARE
        next_val INTEGER;
      BEGIN
        next_val := nextval('board_candidate_code_seq');
        RETURN 'DIT-' || LPAD(next_val::TEXT, 5, '0');
      END;
      $$ LANGUAGE plpgsql;
    `);
  },

  async generateCandidateCode() {
    const result = await pool.query(`SELECT generate_board_candidate_code() AS code`);
    return result.rows[0].code;
  },

  // -------------------------------------------------------
  // CREATE / UPDATE / DELETE
  // -------------------------------------------------------

  async create({ candidateName, fatherName, contactNumber, batchId, enrollmentDate, createdBy }) {
    const candidateCode = await this.generateCandidateCode();
    const result = await pool.query(
      `INSERT INTO board_candidates
         (candidate_code, candidate_name, father_name, contact_number, batch_id, enrollment_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [candidateCode, candidateName, fatherName, contactNumber || null, batchId, enrollmentDate, createdBy]
    );
    return result.rows[0];
  },

  async update(id, { candidateName, fatherName, contactNumber, batchId, enrollmentDate, status }) {
    const fields = [];
    const params = [];
    let idx = 1;

    const set = (col, val) => {
      fields.push(`${col} = $${idx++}`);
      params.push(val);
    };

    if (candidateName !== undefined) set('candidate_name', candidateName);
    if (fatherName !== undefined) set('father_name', fatherName);
    if (contactNumber !== undefined) set('contact_number', contactNumber);
    if (batchId !== undefined) set('batch_id', batchId);
    if (enrollmentDate !== undefined) set('enrollment_date', enrollmentDate);
    if (status !== undefined) set('status', status);

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE board_candidates SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  async remove(id) {
    // ON DELETE CASCADE on board_fees.candidate_id removes fee items too.
    const result = await pool.query(`DELETE FROM board_candidates WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // FIND
  // -------------------------------------------------------

  async findById(id) {
    const result = await pool.query(
      `SELECT c.*, b.batch_name
       FROM board_candidates c
       LEFT JOIN board_batches b ON b.id = c.batch_id
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // LIST (filterable, with fee summary per candidate)
  // -------------------------------------------------------

  async list({ batchId, status, search, page = 1, limit = 20 } = {}) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);

    const conditions = [];
    const params = [];
    let idx = 1;

    if (batchId) {
      conditions.push(`c.batch_id = $${idx}`);
      params.push(batchId);
      idx++;
    }
    if (status) {
      conditions.push(`c.status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (search) {
      conditions.push(`(c.candidate_name ILIKE $${idx} OR c.candidate_code ILIKE $${idx} OR c.father_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (safePage - 1) * safeLimit;

    const baseQuery = `
      FROM board_candidates c
      LEFT JOIN board_batches b ON b.id = c.batch_id
      ${whereClause}
    `;

    const countResult = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT
         c.id, c.candidate_code, c.candidate_name, c.father_name, c.contact_number,
         c.enrollment_date, c.status, c.created_at,
         b.id AS batch_id, b.batch_name,
         COALESCE(SUM(f.amount), 0)       AS total_billed,
         COALESCE(SUM(f.amount_paid), 0)  AS total_paid,
         COALESCE(SUM(f.amount - f.amount_paid) FILTER (WHERE f.status IN ('unpaid','partial')), 0) AS total_due
       ${baseQuery}
       LEFT JOIN board_fees f ON f.candidate_id = c.id
       GROUP BY c.id, b.id
       ORDER BY c.created_at DESC
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
        COUNT(*)                                   AS total_candidates,
        COUNT(*) FILTER (WHERE status = 'active')   AS active_candidates,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_candidates,
        COUNT(*) FILTER (WHERE status = 'dropped')   AS dropped_candidates
      FROM board_candidates
    `);
    const row = result.rows[0];
    return {
      totalCandidates: parseInt(row.total_candidates, 10),
      activeCandidates: parseInt(row.active_candidates, 10),
      completedCandidates: parseInt(row.completed_candidates, 10),
      droppedCandidates: parseInt(row.dropped_candidates, 10),
    };
  },
};

module.exports = BoardCandidateModel;
