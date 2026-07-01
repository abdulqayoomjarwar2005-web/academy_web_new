import api from './api';

// -------------------------------------------------------
// DAILY REPORT
// -------------------------------------------------------

/**
 * Get the daily attendance report for a specific date.
 * @param {string} date - YYYY-MM-DD
 * @returns {{ date, summary, present, absent, leave }}
 */
export const getDailyReport = async (date) => {
  const { data } = await api.get('/reports/daily', { params: { date } });
  return data;
};

/**
 * Get all dates that have submitted (locked) attendance records.
 * @returns {{ dates: string[] }}
 */
export const getAvailableDates = async () => {
  const { data } = await api.get('/reports/available-dates');
  return data;
};

// -------------------------------------------------------
// MONTHLY REPORT
// -------------------------------------------------------

/**
 * Get the monthly attendance report.
 * @param {object} params - month (YYYY-MM), className, section, page, limit
 * @returns {{ month, totals, students, pagination }}
 */
export const getMonthlyReport = async (params = {}) => {
  const { data } = await api.get('/reports/monthly', { params });
  return data;
};

/**
 * Get all months that have submitted attendance records.
 * @returns {{ months: string[] }}
 */
export const getAvailableMonths = async () => {
  const { data } = await api.get('/reports/available-months');
  return data;
};
