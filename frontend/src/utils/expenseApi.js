import api from './api';

export const EXPENSE_CATEGORIES = ['rent', 'electricity', 'internet', 'salaries', 'maintenance', 'other'];

// -------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------

/**
 * Get expense dashboard statistics.
 */
export const getExpenseDashboard = async () => {
  const { data } = await api.get('/expenses/dashboard');
  return data;
};

// -------------------------------------------------------
// LIST / FETCH
// -------------------------------------------------------

/**
 * List expense records with optional filters.
 * @param {object} params - category, month (YYYY-MM), startDate, endDate, search, sortBy, sortDir, page, limit
 */
export const listExpenses = async (params = {}) => {
  const { data } = await api.get('/expenses', { params });
  return data;
};

/**
 * Get a single expense record by UUID.
 */
export const getExpense = async (id) => {
  const { data } = await api.get(`/expenses/${id}`);
  return data;
};

// -------------------------------------------------------
// CREATE / UPDATE / DELETE
// -------------------------------------------------------

/**
 * Create a new expense record.
 * @param {object} payload - { expenseDate, category, description, amount }
 */
export const createExpense = async (payload) => {
  const { data } = await api.post('/expenses', payload);
  return data;
};

/**
 * Update an existing expense record.
 */
export const updateExpense = async (id, payload) => {
  const { data } = await api.patch(`/expenses/${id}`, payload);
  return data;
};

/**
 * Delete an expense record.
 */
export const deleteExpense = async (id) => {
  const { data } = await api.delete(`/expenses/${id}`);
  return data;
};
