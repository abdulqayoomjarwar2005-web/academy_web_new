const pool = require('../config/db');

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

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

const percentChange = (current, previous) => {
  if (!previous) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

const ProfitLossModel = {
  // -------------------------------------------------------
  // MONTHLY PROFIT/LOSS REPORT
  // Returns all 12 months for the given year (defaults to
  // the current year), filling in months with no activity
  // as zero.
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
       LEFT JOIN pnl_monthly p ON p.month = TO_CHAR(gs, 'YYYY-MM')
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
  // YEARLY PROFIT/LOSS REPORT
  // Returns every year that has fee collections and/or
  // expense records, oldest first.
  // -------------------------------------------------------

  async getYearlyReport() {
    const result = await pool.query(
      `SELECT year, total_collection, total_expenses, profit
       FROM pnl_yearly
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
  // ANALYTICS DASHBOARD
  // Current month, current year, all-time totals, plus a
  // 12-month trend series for charts.
  // -------------------------------------------------------

  async getDashboard() {
    const currentMonthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
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
       LEFT JOIN pnl_monthly p ON p.month = TO_CHAR(gs, 'YYYY-MM')
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
      `SELECT year, total_collection, total_expenses, profit
       FROM pnl_yearly
       WHERE year = $1`,
      [currentYearKey]
    );

    const currentYear = yearResult.rows[0]
      ? mapYearRow(yearResult.rows[0])
      : { year: currentYearKey, totalCollection: 0, totalExpenses: 0, profit: 0 };

    const allTimeResult = await pool.query(
      `SELECT
         COALESCE(SUM(total_collection), 0) AS total_collection,
         COALESCE(SUM(total_expenses), 0)  AS total_expenses,
         COALESCE(SUM(profit), 0)          AS profit
       FROM pnl_monthly`
    );

    const allTime = {
      totalCollection: toNumber(allTimeResult.rows[0]?.total_collection),
      totalExpenses: toNumber(allTimeResult.rows[0]?.total_expenses),
      profit: toNumber(allTimeResult.rows[0]?.profit),
    };

    return { currentMonth, currentYear, allTime, trends };
  },

  // -------------------------------------------------------
  // COLLECTION & EXPENSE COMPARISON
  // Compares the current month vs the previous month, and
  // the current year vs the previous year.
  // -------------------------------------------------------

  async getComparison() {
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthKey = prevMonthDate.toISOString().slice(0, 7);

    const currentYearKey = now.getFullYear().toString();
    const previousYearKey = (now.getFullYear() - 1).toString();

    const monthResult = await pool.query(
      `SELECT month, total_collection, total_expenses, profit
       FROM pnl_monthly
       WHERE month IN ($1, $2)`,
      [currentMonthKey, previousMonthKey]
    );

    const yearResult = await pool.query(
      `SELECT year, total_collection, total_expenses, profit
       FROM pnl_yearly
       WHERE year IN ($1, $2)`,
      [currentYearKey, previousYearKey]
    );

    const monthRows = {};
    monthResult.rows.forEach((r) => {
      monthRows[r.month] = mapRow(r);
    });

    const yearRows = {};
    yearResult.rows.forEach((r) => {
      yearRows[r.year] = mapYearRow(r);
    });

    const zeroMonth = (month) => ({ month, totalCollection: 0, totalExpenses: 0, profit: 0 });
    const zeroYear = (year) => ({ year, totalCollection: 0, totalExpenses: 0, profit: 0 });

    const currentMonth = monthRows[currentMonthKey] || zeroMonth(currentMonthKey);
    const previousMonth = monthRows[previousMonthKey] || zeroMonth(previousMonthKey);
    const currentYear = yearRows[currentYearKey] || zeroYear(currentYearKey);
    const previousYear = yearRows[previousYearKey] || zeroYear(previousYearKey);

    return {
      collection: {
        currentMonth: { period: currentMonthKey, amount: currentMonth.totalCollection },
        previousMonth: { period: previousMonthKey, amount: previousMonth.totalCollection },
        monthChangePercent: percentChange(
          currentMonth.totalCollection,
          previousMonth.totalCollection
        ),
        currentYear: { period: currentYearKey, amount: currentYear.totalCollection },
        previousYear: { period: previousYearKey, amount: previousYear.totalCollection },
        yearChangePercent: percentChange(
          currentYear.totalCollection,
          previousYear.totalCollection
        ),
      },
      expenses: {
        currentMonth: { period: currentMonthKey, amount: currentMonth.totalExpenses },
        previousMonth: { period: previousMonthKey, amount: previousMonth.totalExpenses },
        monthChangePercent: percentChange(
          currentMonth.totalExpenses,
          previousMonth.totalExpenses
        ),
        currentYear: { period: currentYearKey, amount: currentYear.totalExpenses },
        previousYear: { period: previousYearKey, amount: previousYear.totalExpenses },
        yearChangePercent: percentChange(
          currentYear.totalExpenses,
          previousYear.totalExpenses
        ),
      },
      profit: {
        currentMonth: { period: currentMonthKey, amount: currentMonth.profit },
        previousMonth: { period: previousMonthKey, amount: previousMonth.profit },
        monthChangePercent: percentChange(currentMonth.profit, previousMonth.profit),
        currentYear: { period: currentYearKey, amount: currentYear.profit },
        previousYear: { period: previousYearKey, amount: previousYear.profit },
        yearChangePercent: percentChange(currentYear.profit, previousYear.profit),
      },
    };
  },

  // -------------------------------------------------------
  // AVAILABLE YEARS
  // Years that have any collection or expense activity,
  // used to populate the year selector on the reports page.
  // -------------------------------------------------------

  async getAvailableYears() {
    const result = await pool.query(
      `SELECT DISTINCT year FROM pnl_yearly WHERE year IS NOT NULL ORDER BY year DESC`
    );
    const years = result.rows.map((r) => r.year);

    const currentYear = new Date().getFullYear().toString();
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }

    return years;
  },
};

module.exports = ProfitLossModel;
