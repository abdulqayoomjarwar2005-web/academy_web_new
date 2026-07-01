const pool = require('../config/db');

const ALLOWED_CATEGORIES = ['rent', 'electricity', 'internet', 'salaries', 'maintenance', 'other'];

const ExpenseModel = {
  ALLOWED_CATEGORIES,

  // -------------------------------------------------------
  // CREATE
  // -------------------------------------------------------

  async create({ expenseDate, category, description, amount, createdBy }) {
    const result = await pool.query(
      `INSERT INTO expenses (expense_date, category, description, amount, created_by, updated_by)
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
       FROM expenses e
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

    params.push(id);

    const result = await pool.query(
      `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // DELETE
  // -------------------------------------------------------

  async remove(id) {
    const result = await pool.query(`DELETE FROM expenses WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // LIST (filterable)
  // -------------------------------------------------------

  async list({
    category,
    month,        // YYYY-MM
    startDate,    // YYYY-MM-DD
    endDate,      // YYYY-MM-DD
    search,
    sortBy = 'expense_date',
    sortDir = 'desc',
    page = 1,
    limit = 20,
  }) {
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

    const baseQuery = `FROM expenses e ${whereClause}`;

    const countResult = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].total, 10);

    const sumResult = await pool.query(`SELECT COALESCE(SUM(e.amount), 0) AS total_amount ${baseQuery}`, params);
    const totalAmount = parseFloat(sumResult.rows[0].total_amount || 0);

    const dataParams = [...params, safeLimit, offset];
    const dataResult = await pool.query(
      `SELECT
         e.id, e.expense_date, e.category, e.description, e.amount,
         e.created_at, e.updated_at,
         u1.full_name AS created_by_name,
         u2.full_name AS updated_by_name
       ${baseQuery}
       LEFT JOIN users u1 ON u1.id = e.created_by
       LEFT JOIN users u2 ON u2.id = e.updated_by
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
      totalAmount,
    };
  },

  // -------------------------------------------------------
  // DASHBOARD STATS
  // -------------------------------------------------------

  async getDashboardStats() {
    const statsResult = await pool.query(`SELECT * FROM expense_summary_stats`);
    const byCategoryResult = await pool.query(`SELECT * FROM expense_summary_by_category ORDER BY total_amount DESC`);

    const row = statsResult.rows[0] || {};

    return {
      todayTotal:    parseFloat(row.today_total    || 0),
      weeklyTotal:   parseFloat(row.weekly_total   || 0),
      monthlyTotal:  parseFloat(row.monthly_total  || 0),
      yearlyTotal:   parseFloat(row.yearly_total   || 0),
      allTimeTotal:  parseFloat(row.all_time_total || 0),
      totalRecords:  parseInt(row.total_records || 0, 10),
      byCategory: byCategoryResult.rows.map((r) => ({
        category: r.category,
        recordCount: parseInt(r.record_count, 10),
        totalAmount: parseFloat(r.total_amount),
      })),
    };
  },
};

module.exports = ExpenseModel;
