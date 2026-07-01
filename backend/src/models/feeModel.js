const pool = require('../config/db');

const ALLOWED_STATUSES = ['unpaid', 'paid', 'partial', 'waived'];

const FeeModel = {
  ALLOWED_STATUSES,

  // -------------------------------------------------------
  // RECEIPT GENERATION
  // -------------------------------------------------------

  async generateReceiptNumber() {
    const result = await pool.query(`SELECT generate_receipt_number() AS receipt_number`);
    return result.rows[0].receipt_number;
  },

  // -------------------------------------------------------
  // CREATE / UPSERT
  // -------------------------------------------------------

  /**
   * Ensure a fee record exists for a student+month.
   * Creates it with the student's current monthly_fee if absent.
   * Returns the existing or newly-created record.
   */
  async ensureFeeRecord(studentId, feeMonth, createdBy) {
    // Normalise to first-of-month (YYYY-MM-01)
    const monthDate = `${feeMonth}-01`;

    const existing = await pool.query(
      `SELECT f.*, s.student_name, s.student_id AS student_code, s.class, s.batch, s.monthly_fee AS current_monthly_fee
       FROM fees f
       JOIN students s ON s.id = f.student_id
       WHERE f.student_id = $1 AND f.fee_month = $2`,
      [studentId, monthDate]
    );

    if (existing.rows.length > 0) return existing.rows[0];

    // Fetch student's monthly_fee to snapshot it
    const stuResult = await pool.query(
      `SELECT monthly_fee FROM students WHERE id = $1`,
      [studentId]
    );

    if (!stuResult.rows[0]) return null;

    const amount = stuResult.rows[0].monthly_fee;

    const inserted = await pool.query(
      `INSERT INTO fees (student_id, fee_month, amount, amount_paid, status, created_by)
       VALUES ($1, $2, $3, 0, 'unpaid', $4)
       RETURNING *`,
      [studentId, monthDate, amount, createdBy]
    );

    return inserted.rows[0];
  },

  // -------------------------------------------------------
  // MARK PAID
  // -------------------------------------------------------

  /**
   * Mark a fee record as paid (full payment).
   * Generates a receipt number if not already set.
   */
  async markPaid(feeId, updatedBy, amountPaidOverride = null) {
    const fee = await this.findById(feeId);
    if (!fee) return null;

    const amountPaid = amountPaidOverride !== null ? amountPaidOverride : fee.amount;
    const receiptNumber = fee.receipt_number || (await this.generateReceiptNumber());

    const result = await pool.query(
      `UPDATE fees
       SET status = 'paid',
           amount_paid = $1,
           paid_at = NOW(),
           receipt_number = $2,
           updated_by = $3
       WHERE id = $4
       RETURNING *`,
      [amountPaid, receiptNumber, updatedBy, feeId]
    );

    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // MARK UNPAID
  // -------------------------------------------------------

  /**
   * Revert a fee record back to unpaid.
   * Clears payment info but keeps receipt_number for audit trail.
   */
  async markUnpaid(feeId, updatedBy) {
    const result = await pool.query(
      `UPDATE fees
       SET status = 'unpaid',
           amount_paid = 0,
           paid_at = NULL,
           updated_by = $1
       WHERE id = $2
       RETURNING *`,
      [updatedBy, feeId]
    );

    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // MARK PARTIAL
  // -------------------------------------------------------

  async markPartial(feeId, amountPaid, updatedBy) {
    const receiptNumber = (await this.findById(feeId))?.receipt_number || (await this.generateReceiptNumber());

    const result = await pool.query(
      `UPDATE fees
       SET status = 'partial',
           amount_paid = $1,
           paid_at = NOW(),
           receipt_number = $2,
           updated_by = $3
       WHERE id = $4
       RETURNING *`,
      [amountPaid, receiptNumber, updatedBy, feeId]
    );

    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // MARK WAIVED
  // -------------------------------------------------------

  async markWaived(feeId, notes, updatedBy) {
    const result = await pool.query(
      `UPDATE fees
       SET status = 'waived',
           amount_paid = 0,
           paid_at = NULL,
           notes = $1,
           updated_by = $2
       WHERE id = $3
       RETURNING *`,
      [notes, updatedBy, feeId]
    );

    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // FIND BY ID
  // -------------------------------------------------------

  async findById(id) {
    const result = await pool.query(
      `SELECT f.*,
              s.student_name, s.student_id AS student_code, s.father_name,
              s.class, s.batch, s.contact_number,
              u1.full_name AS created_by_name,
              u2.full_name AS updated_by_name
       FROM fees f
       JOIN students s ON s.id = f.student_id
       LEFT JOIN users u1 ON u1.id = f.created_by
       LEFT JOIN users u2 ON u2.id = f.updated_by
       WHERE f.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // FIND BY RECEIPT
  // -------------------------------------------------------

  async findByReceipt(receiptNumber) {
    const result = await pool.query(
      `SELECT f.*,
              s.student_name, s.student_id AS student_code, s.father_name,
              s.class, s.batch, s.contact_number,
              u1.full_name AS created_by_name,
              u2.full_name AS updated_by_name
       FROM fees f
       JOIN students s ON s.id = f.student_id
       LEFT JOIN users u1 ON u1.id = f.created_by
       LEFT JOIN users u2 ON u2.id = f.updated_by
       WHERE f.receipt_number = $1`,
      [receiptNumber]
    );
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // LIST FEES (filterable)
  // -------------------------------------------------------

  async list({
    studentId,
    month,       // YYYY-MM
    status,
    class: className,
    batch,
    search,
    sortBy = 'fee_month',
    sortDir = 'desc',
    page = 1,
    limit = 20,
  }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (studentId) {
      conditions.push(`f.student_id = $${idx}`);
      params.push(studentId);
      idx++;
    }

    if (month) {
      conditions.push(`TO_CHAR(f.fee_month, 'YYYY-MM') = $${idx}`);
      params.push(month);
      idx++;
    }

    if (status) {
      conditions.push(`f.status = $${idx}`);
      params.push(status);
      idx++;
    }

    if (className) {
      conditions.push(`s.class = $${idx}`);
      params.push(className);
      idx++;
    }

    if (batch) {
      conditions.push(`s.batch = $${idx}`);
      params.push(batch);
      idx++;
    }

    if (search) {
      conditions.push(
        `(s.student_name ILIKE $${idx} OR s.student_id ILIKE $${idx} OR s.father_name ILIKE $${idx} OR f.receipt_number ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const ALLOWED_SORT = {
      fee_month: 'f.fee_month',
      amount: 'f.amount',
      amount_paid: 'f.amount_paid',
      status: 'f.status',
      paid_at: 'f.paid_at',
      student_name: 's.student_name',
    };

    const sortColumn = ALLOWED_SORT[sortBy] || 'f.fee_month';
    const sortDirection = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const baseQuery = `
      FROM fees f
      JOIN students s ON s.id = f.student_id
      LEFT JOIN users u ON u.id = f.updated_by
      ${whereClause}
    `;

    const countResult = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const dataParams = [...params, safeLimit, offset];
    const dataResult = await pool.query(
      `SELECT
         f.id, f.fee_month, f.amount, f.amount_paid, f.status,
         f.paid_at, f.receipt_number, f.due_date, f.notes,
         f.created_at, f.updated_at,
         s.id AS student_uuid,
         s.student_id AS student_code, s.student_name, s.father_name,
         s.class, s.batch, s.contact_number,
         u.full_name AS updated_by_name
       ${baseQuery}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams
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
  // DUE MONTHS FOR A STUDENT
  // -------------------------------------------------------

  /**
   * Returns all unpaid/partial months for a student,
   * ordered by fee_month ascending (oldest first).
   */
  async getDueMonths(studentId) {
    const result = await pool.query(
      `SELECT f.*, s.student_name, s.student_id AS student_code, s.class, s.batch
       FROM fees f
       JOIN students s ON s.id = f.student_id
       WHERE f.student_id = $1
         AND f.status IN ('unpaid', 'partial')
       ORDER BY f.fee_month ASC`,
      [studentId]
    );
    return result.rows;
  },

  // -------------------------------------------------------
  // DASHBOARD STATISTICS
  // -------------------------------------------------------

  /**
   * Returns collection totals for today, this week, this month, and this year.
   */
  async getDashboardStats() {
    const result = await pool.query(`
      SELECT
        -- Today's collection
        COALESCE(SUM(amount_paid) FILTER (
          WHERE DATE(paid_at AT TIME ZONE 'UTC') = CURRENT_DATE
        ), 0) AS today_collection,

        -- Weekly collection (last 7 days rolling)
        COALESCE(SUM(amount_paid) FILTER (
          WHERE paid_at >= DATE_TRUNC('week', NOW())
        ), 0) AS weekly_collection,

        -- Monthly collection (current calendar month)
        COALESCE(SUM(amount_paid) FILTER (
          WHERE paid_at >= DATE_TRUNC('month', NOW())
        ), 0) AS monthly_collection,

        -- Yearly collection (current calendar year)
        COALESCE(SUM(amount_paid) FILTER (
          WHERE paid_at >= DATE_TRUNC('year', NOW())
        ), 0) AS yearly_collection,

        -- Overall due
        COALESCE(SUM(amount - amount_paid) FILTER (
          WHERE status IN ('unpaid', 'partial')
        ), 0) AS total_outstanding,

        -- Student counts
        COUNT(DISTINCT student_id) FILTER (WHERE status = 'paid')    AS paid_students,
        COUNT(DISTINCT student_id) FILTER (WHERE status IN ('unpaid','partial')) AS unpaid_students,

        -- Fee counts by status
        COUNT(*) FILTER (WHERE status = 'paid')    AS paid_count,
        COUNT(*) FILTER (WHERE status = 'unpaid')  AS unpaid_count,
        COUNT(*) FILTER (WHERE status = 'partial') AS partial_count,
        COUNT(*) FILTER (WHERE status = 'waived')  AS waived_count

      FROM fees
    `);

    const row = result.rows[0];

    return {
      todayCollection:   parseFloat(row.today_collection   || 0),
      weeklyCollection:  parseFloat(row.weekly_collection  || 0),
      monthlyCollection: parseFloat(row.monthly_collection || 0),
      yearlyCollection:  parseFloat(row.yearly_collection  || 0),
      totalOutstanding:  parseFloat(row.total_outstanding  || 0),
      paidStudents:      parseInt(row.paid_students   || 0, 10),
      unpaidStudents:    parseInt(row.unpaid_students || 0, 10),
      paidCount:         parseInt(row.paid_count    || 0, 10),
      unpaidCount:       parseInt(row.unpaid_count  || 0, 10),
      partialCount:      parseInt(row.partial_count || 0, 10),
      waivedCount:       parseInt(row.waived_count  || 0, 10),
    };
  },

  // -------------------------------------------------------
  // BULK GENERATE FEE RECORDS
  // -------------------------------------------------------

  /**
   * Generates fee records for ALL active students for a given month.
   * Skips students who already have a record for that month.
   * Returns counts of created vs skipped.
   */
  async bulkGenerateForMonth(feeMonth, createdBy) {
    const monthDate = `${feeMonth}-01`;

    // Get all active students
    const students = await pool.query(
      `SELECT id, monthly_fee FROM students WHERE status = 'active'`
    );

    let created = 0;
    let skipped = 0;

    for (const student of students.rows) {
      const existing = await pool.query(
        `SELECT id FROM fees WHERE student_id = $1 AND fee_month = $2`,
        [student.id, monthDate]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO fees (student_id, fee_month, amount, status, created_by)
         VALUES ($1, $2, $3, 'unpaid', $4)`,
        [student.id, monthDate, student.monthly_fee, createdBy]
      );
      created++;
    }

    return { created, skipped };
  },
};

module.exports = FeeModel;
