const pool = require('../config/db');

const ALLOWED_CATEGORIES = [
  'examination_fee',
  'printing_stationery',
  'invigilation',
  'venue_arrangements',
  'transport',
  'other',
];

const BoardExpenseModel = {
  ALLOWED_CATEGORIES,

  /**
   * Create the board_expenses table if it doesn't exist yet.
   * Called once on server startup from app.js.
   */
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS board_expenses (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_date     DATE NOT NULL,
        category         VARCHAR(30) NOT NULL,
        description      TEXT,
        amount           NUMERIC(10, 2) NOT NULL,
        created_by       UUID REFERENCES users(id),
        updated_by       UUID REFERENCES users(id),
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_board_expense_category CHECK (
          category IN ('examination_fee','printing_stationery','invigilation','venue_arrangements','transport','other')
        ),
        CONSTRAINT chk_board_expense_amount CHECK (amount >= 0)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_expenses_date     ON board_expenses(expense_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_expenses_category ON board_expenses(category)`);
  },

  // -------------------------------------------------------
  // CREATE
  // -------------------------------------------------------

  async create({ expenseDate, category, description, amount, createdBy }) {
    const result = await pool.query(
      `INSERT INTO board_expenses (expense_date, category, description, amount, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5)
       RETURNING *`,
      [expenseDate, category, description || null, amount, createdBy]
    );
    return result.rows[0];
  },

  // -------------------------------------------------------
  // FIND BY ID
  // -------------------------------------------------------

  async findById(id) {
    const result = await pool.query(
      `SELECT e.*,
              u1.full_name AS created_by_name,
              u2.full_name AS updated_by_name
       FROM board_expenses e
       LEFT JOIN users u1 ON u1.id = e.created_by
       LEFT JOIN users u2 ON u2.id = e.updated_by
       WHERE e.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------

  async update(id, { expenseDate, category, description, amount, updatedBy }) {
    const fields = [];
    const params = [];
    let idx = 1;

    if (expenseDate !== undefined) {
      fields.push(`expense_date = $${idx++}`);
      params.push(expenseDate);
    }
    if (category !== undefined) {
      fields.push(`category = $${idx++}`);
      params.push(category);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      params.push(description);
    }
    if (amount !== undefined) {
      fields.push(`amount = $${idx++}`);
      params.push(amount);
    }

    fields.push(`updated_by = $${idx++}`);
    params.push(updatedBy);
    fields.push(`updated_at = NOW()`);

    params.push(id);

    const result = await pool.query(
      `UPDATE board_expenses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // DELETE
  // -------------------------------------------------------

  async remove(id) {
    const result = await pool.query(`DELETE FROM board_expenses WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // LIST (filterable)
  // -------------------------------------------------------

  async list({
    category,
    month,
    startDate,
    endDate,
    search,
    sortBy = 'expense_date',
    sortDir = 'desc',
    page = 1,
    limit = 20,
  } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (category) {
      conditions.push(`e.category = $${idx}`);
      params.push(category);
      idx++;
    }
    if (month) {
      conditions.push(`TO_CHAR(e.expense_date, 'YYYY-MM') = $${idx}`);
      params.push(month);
      idx++;
    }
    if (startDate) {
      conditions.push(`e.expense_date >= $${idx}`);
      params.push(startDate);
      idx++;
    }
    if (endDate) {
      conditions.push(`e.expense_date <= $${idx}`);
      params.push(endDate);
      idx++;
    }
    if (search) {
      conditions.push(`e.description ILIKE $${idx}`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const ALLOWED_SORT = {
      expense_date: 'e.expense_date',
      category: 'e.category',
      amount: 'e.amount',
      created_at: 'e.created_at',
    };
    const sortColumn = ALLOWED_SORT[sortBy] || 'e.expense_date';
    const sortDirection = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const baseQuery = `FROM board_expenses e ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const sumResult = await pool.query(`SELECT COALESCE(SUM(e.amount), 0) AS total_amount ${baseQuery}`, params);
    const totalAmount = parseFloat(sumResult.rows[0].total_amount || 0);

    const dataResult = await pool.query(
      `SELECT
         e.id, e.expense_date, e.category, e.description, e.amount,
         e.created_at, e.updated_at,
         u1.full_name AS created_by_name,
         u2.full_name AS updated_by_name
       FROM board_expenses e
       LEFT JOIN users u1 ON u1.id = e.created_by
       LEFT JOIN users u2 ON u2.id = e.updated_by
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
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
      totalAmount,
    };
  },

  // -------------------------------------------------------
  // DASHBOARD STATS
  // -------------------------------------------------------

  async getDashboardStats() {
    const statsResult = await pool.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE expense_date >= CURRENT_DATE AND expense_date < CURRENT_DATE + INTERVAL '1 day'), 0) AS today_total,
        COALESCE(SUM(amount) FILTER (WHERE expense_date >= DATE_TRUNC('week', CURRENT_DATE)), 0) AS weekly_total,
        COALESCE(SUM(amount) FILTER (WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS monthly_total,
        COALESCE(SUM(amount) FILTER (WHERE expense_date >= DATE_TRUNC('year', CURRENT_DATE)), 0) AS yearly_total,
        COALESCE(SUM(amount), 0) AS all_time_total,
        COUNT(*) AS total_records
      FROM board_expenses
    `);

    const byCategoryResult = await pool.query(`
      SELECT category, COUNT(*) AS record_count, COALESCE(SUM(amount), 0) AS total_amount
      FROM board_expenses
      GROUP BY category
      ORDER BY total_amount DESC
    `);

    const row = statsResult.rows[0] || {};

    return {
      todayTotal: parseFloat(row.today_total || 0),
      weeklyTotal: parseFloat(row.weekly_total || 0),
      monthlyTotal: parseFloat(row.monthly_total || 0),
      yearlyTotal: parseFloat(row.yearly_total || 0),
      allTimeTotal: parseFloat(row.all_time_total || 0),
      totalRecords: parseInt(row.total_records || 0, 10),
      byCategory: byCategoryResult.rows.map((r) => ({
        category: r.category,
        recordCount: parseInt(r.record_count, 10),
        totalAmount: parseFloat(r.total_amount),
      })),
    };
  },
};

module.exports = BoardExpenseModel;
