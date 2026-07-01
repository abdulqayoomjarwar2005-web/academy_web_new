import api from './api';

// -------------------------------------------------------
// ANALYTICS DASHBOARD
// -------------------------------------------------------

/**
 * Get the Profit & Loss analytics dashboard:
 * current month, current year, all-time totals, and a
 * 12-month trend series for charts.
 */
export const getProfitLossDashboard = async () => {
  const { data } = await api.get('/profit-loss/dashboard');
  return data;
};

// -------------------------------------------------------
// REPORTS
// -------------------------------------------------------

/**
 * Get the Monthly Profit/Loss report for a given year.
 * @param {string|number} year - e.g. 2026
 */
export const getMonthlyPnLReport = async (year) => {
  const { data } = await api.get('/profit-loss/monthly', { params: { year } });
  return data;
};

/**
 * Get the Yearly Profit/Loss report across all years.
 */
export const getYearlyPnLReport = async () => {
  const { data } = await api.get('/profit-loss/yearly');
  return data;
};

/**
 * Get the Collection Comparison and Expense Comparison
 * (current vs previous month, current vs previous year).
 */
export const getPnLComparison = async () => {
  const { data } = await api.get('/profit-loss/comparison');
  return data;
};

/**
 * Get the list of years available for the report selector.
 */
export const getAvailablePnLYears = async () => {
  const { data } = await api.get('/profit-loss/years');
  return data;
};
