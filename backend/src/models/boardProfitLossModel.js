const pool = require('../config/db');

const toNumber = (v) => parseFloat(v || 0);

const mapRow = (row) => ({
  month: row.month,
  totalCollection: toNumber(row.total_collection),
  totalExpenses: toNumber(row.total_expenses),
  profit: toNumber(row.profit),
});

const mapYearRow = (row) => ({
  year: row.year,
  totalCollection: toNumber(row.total_collection),
  totalExpenses: toNumber(row.total_expenses),
  profit: toNumber(row.profit),
});

const BoardProfitLossModel = {
  /**
   * Creates views scoped ONLY to board_fees / board_expenses — completely
   * separate from the main school's pnl_monthly / pnl_yearly views, so
   * DIT/Board revenue, expenses, and profit never mix with the main
   * school's Profit & Loss. Called once on server startup from app.js,
   * after both board_fees and board_expenses tables exist.
   */
  async createViews() {
    await pool.query(`
      CREATE OR REPLACE VIEW board_monthly_collections AS
      SELECT
          TO_CHAR(paid_at, 'YYYY-MM') AS month,
          COALESCE(SUM(amount_paid), 0) AS total_collection
      FROM board_fees
      WHERE paid_at IS NOT NULL
      GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
    `);

    await pool.query(`
      CREATE OR REPLACE VIEW board_monthly_expenses AS
      SELECT
          TO_CHAR(expense_date, 'YYYY-MM') AS month,
          COALESCE(SUM(amount), 0) AS total_expenses
      FROM board_expenses
      GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
    `);

    await pool.query(`
      CREATE OR REPLACE VIEW board_pnl_monthly AS
      SELECT
          COALESCE(c.month, e.month) AS month,
          COALESCE(c.total_collection, 0) AS total_collection,
          COALESCE(e.total_expenses, 0) AS total_expenses,
          COALESCE(c.total_collection, 0) - COALESCE(e.total_expenses, 0) AS profit
      FROM board_monthly_collections c
      FULL OUTER JOIN board_monthly_expenses e ON c.month = e.month
    `);

    await pool.query(`
      CREATE OR REPLACE VIEW board_yearly_collections AS
      SELECT
          TO_CHAR(paid_at, 'YYYY') AS year,
          COALESCE(SUM(amount_paid), 0) AS total_collection
      FROM board_fees
      WHERE paid_at IS NOT NULL
      GROUP BY TO_CHAR(paid_at, 'YYYY')
    `);

    await pool.query(`
      CREATE OR REPLACE VIEW board_yearly_expenses AS
      SELECT
          TO_CHAR(expense_date, 'YYYY') AS year,
          COALESCE(SUM(amount), 0) AS total_expenses
      FROM board_expenses
      GROUP BY TO_CHAR(expense_date, 'YYYY')
    `);

    await pool.query(`
      CREATE OR REPLACE VIEW board_pnl_yearly AS
      SELECT
          COALESCE(c.year, e.year) AS year,
          COALESCE(c.total_collection, 0) AS total_collection,
          COALESCE(e.total_expenses, 0) AS total_expenses,
          COALESCE(c.total_collection, 0) - COALESCE(e.total_expenses, 0) AS profit
      FROM board_yearly_collections c
      FULL OUTER JOIN board_yearly_expenses e ON c.year = e.year
    `);
  },

  // -------------------------------------------------------
  // MONTHLY REPORT
  // -------------------------------------------------------

  async getMonthlyReport(year) {
    const targetYear = year || new Date().getFullYear().toString();

    const result = await pool.query(
      `SELECT
         TO_CHAR(gs, 'YYYY-MM') AS month,
         COALESCE(p.total_collection, 0) AS total_collection,
         COALESCE(p.total_expenses, 0)  AS total_expenses,
         COALESCE(p.total_collection, 0) - COALESCE(p.total_expenses, 0) AS profit
       FROM generate_series(
         MAKE_DATE($1::int, 1, 1),
         MAKE_DATE($1::int, 12, 1),
         INTERVAL '1 month'
       ) AS gs
       LEFT JOIN board_pnl_monthly p ON p.month = TO_CHAR(gs, 'YYYY-MM')
       ORDER BY gs`,
      [targetYear]
    );

    const months = result.rows.map(mapRow);
    const totals = months.reduce(
      (acc, m) => ({
        totalCollection: acc.totalCollection + m.totalCollection,
        totalExpenses: acc.totalExpenses + m.totalExpenses,
        profit: acc.profit + m.profit,
      }),
      { totalCollection: 0, totalExpenses: 0, profit: 0 }
    );

    return { year: targetYear, months, totals };
  },

  // -------------------------------------------------------
  // YEARLY REPORT
  // -------------------------------------------------------

  async getYearlyReport() {
    const result = await pool.query(
      `SELECT year, total_collection, total_expenses, profit
       FROM board_pnl_yearly
       WHERE year IS NOT NULL
       ORDER BY year ASC`
    );

    const years = result.rows.map(mapYearRow);
    const totals = years.reduce(
      (acc, y) => ({
        totalCollection: acc.totalCollection + y.totalCollection,
        totalExpenses: acc.totalExpenses + y.totalExpenses,
        profit: acc.profit + y.profit,
      }),
      { totalCollection: 0, totalExpenses: 0, profit: 0 }
    );

    return { years, totals };
  },

  // -------------------------------------------------------
  // DASHBOARD (current month/year, all-time, 12-month trend)
  // -------------------------------------------------------

  async getDashboard() {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentYearKey = new Date().getFullYear().toString();

    const trendResult = await pool.query(
      `SELECT
         TO_CHAR(gs, 'YYYY-MM') AS month,
         COALESCE(p.total_collection, 0) AS total_collection,
         COALESCE(p.total_expenses, 0)  AS total_expenses,
         COALESCE(p.total_collection, 0) - COALESCE(p.total_expenses, 0) AS profit
       FROM generate_series(
         DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
         DATE_TRUNC('month', CURRENT_DATE),
         INTERVAL '1 month'
       ) AS gs
       LEFT JOIN board_pnl_monthly p ON p.month = TO_CHAR(gs, 'YYYY-MM')
       ORDER BY gs`
    );

    const trends = trendResult.rows.map(mapRow);

    const currentMonth =
      trends.find((m) => m.month === currentMonthKey) || {
        month: currentMonthKey,
        totalCollection: 0,
        totalExpenses: 0,
        profit: 0,
      };

    const yearResult = await pool.query(
      `SELECT year, total_collection, total_expenses, profit FROM board_pnl_yearly WHERE year = $1`,
      [currentYearKey]
    );

    const currentYear = yearResult.rows[0]
      ? mapYearRow(yearResult.rows[0])
      : { year: currentYearKey, totalCollection: 0, totalExpenses: 0, profit: 0 };

    const allTimeResult = await pool.query(`
      SELECT
        COALESCE(SUM(total_collection), 0) AS total_collection,
        COALESCE(SUM(total_expenses), 0)  AS total_expenses,
        COALESCE(SUM(profit), 0)          AS profit
      FROM board_pnl_monthly
    `);

    const allTime = {
      totalCollection: toNumber(allTimeResult.rows[0]?.total_collection),
      totalExpenses: toNumber(allTimeResult.rows[0]?.total_expenses),
      profit: toNumber(allTimeResult.rows[0]?.profit),
    };

    return { currentMonth, currentYear, allTime, trends };
  },

  // -------------------------------------------------------
  // AVAILABLE YEARS
  // -------------------------------------------------------

  async getAvailableYears() {
    const result = await pool.query(
      `SELECT DISTINCT year FROM board_pnl_yearly WHERE year IS NOT NULL ORDER BY year DESC`
    );
    const years = result.rows.map((r) => r.year);

    const currentYear = new Date().getFullYear().toString();
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }
    return years;
  },
};

module.exports = BoardProfitLossModel;
