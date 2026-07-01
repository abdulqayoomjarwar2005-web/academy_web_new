import api from './api';

// -------------------------------------------------------
// DEFAULTER LIST
// -------------------------------------------------------

/**
 * List fee defaulters with optional filters.
 *
 * @param {object} params
 * @param {string}  [params.class]    - Filter by class
 * @param {string}  [params.batch]    - Filter by batch
 * @param {string}  [params.month]    - YYYY-MM — only defaulters for this month
 * @param {string}  [params.search]   - Student name / code / father name
 * @param {string}  [params.sortBy]   - outstanding_balance | due_months_count | student_name | oldest_due_month
 * @param {string}  [params.sortDir]  - asc | desc
 * @param {number}  [params.page]
 * @param {number}  [params.limit]
 */
export const listDefaulters = async (params = {}) => {
  const { data } = await api.get('/defaulters', { params });
  return data; // { data: [...], pagination: { total, page, limit, totalPages } }
};

// -------------------------------------------------------
// KPI STATS
// -------------------------------------------------------

/**
 * Get summary KPI stats for the defaulter dashboard.
 * Accepts same class / batch / month filters.
 *
 * @returns {{ stats: { totalDefaulters, totalOutstanding, totalDueRecords, unpaidRecords, partialRecords } }}
 */
export const getDefaulterStats = async (params = {}) => {
  const { data } = await api.get('/defaulters/stats', { params });
  return data;
};

// -------------------------------------------------------
// FILTER OPTIONS
// -------------------------------------------------------

/**
 * Get distinct classes & batches that currently have defaulters.
 * @returns {{ classes: string[], batches: string[] }}
 */
export const getDefaulterFilterOptions = async () => {
  const { data } = await api.get('/defaulters/filter-options');
  return data;
};
