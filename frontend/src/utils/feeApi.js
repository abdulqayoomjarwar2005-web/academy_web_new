import api from './api';

// -------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------

/**
 * Get fee dashboard statistics.
 * @returns {{ stats: { todayCollection, weeklyCollection, monthlyCollection, yearlyCollection, totalOutstanding, paidStudents, unpaidStudents, ... } }}
 */
export const getFeeDashboard = async () => {
  const { data } = await api.get('/fees/dashboard');
  return data;
};

// -------------------------------------------------------
// LIST / FETCH
// -------------------------------------------------------

/**
 * List fee records with optional filters.
 * @param {object} params - studentId, month (YYYY-MM), status, class, batch, search, sortBy, sortDir, page, limit
 */
export const listFees = async (params = {}) => {
  const { data } = await api.get('/fees', { params });
  return data;
};

/**
 * Get a single fee record by UUID.
 */
export const getFee = async (id) => {
  const { data } = await api.get(`/fees/${id}`);
  return data;
};

/**
 * Fetch a fee record by receipt number.
 */
export const getFeeByReceipt = async (receiptNumber) => {
  const { data } = await api.get(`/fees/receipt/${receiptNumber}`);
  return data;
};

/**
 * Get all due months for a student.
 * @param {string} studentId - UUID of the student
 */
export const getDueMonths = async (studentId) => {
  const { data } = await api.get(`/fees/due/${studentId}`);
  return data;
};

// -------------------------------------------------------
// CREATE
// -------------------------------------------------------

/**
 * Ensure a fee record exists for a student + month.
 * Creates it as 'unpaid' if it doesn't exist yet.
 */
export const ensureFeeRecord = async (studentId, feeMonth) => {
  const { data } = await api.post('/fees/ensure', { studentId, feeMonth });
  return data;
};

/**
 * Bulk-generate fee records for all active students for a month.
 * @param {string} feeMonth - YYYY-MM
 */
export const bulkGenerateFees = async (feeMonth) => {
  const { data } = await api.post('/fees/bulk-generate', { feeMonth });
  return data;
};

// -------------------------------------------------------
// STATUS CHANGES
// -------------------------------------------------------

/**
 * Mark a fee as fully paid.
 * @param {string} id - fee UUID
 * @param {number|null} amountPaid - if null, uses the fee's full amount
 */
export const markPaid = async (id, amountPaid = null) => {
  const body = amountPaid !== null ? { amountPaid } : {};
  const { data } = await api.patch(`/fees/${id}/mark-paid`, body);
  return data;
};

/**
 * Revert a fee to unpaid.
 */
export const markUnpaid = async (id) => {
  const { data } = await api.patch(`/fees/${id}/mark-unpaid`);
  return data;
};

/**
 * Record a partial payment.
 * @param {string} id - fee UUID
 * @param {number} amountPaid
 */
export const markPartial = async (id, amountPaid) => {
  const { data } = await api.patch(`/fees/${id}/mark-partial`, { amountPaid });
  return data;
};

/**
 * Waive a fee.
 * @param {string} id - fee UUID
 * @param {string} notes - reason for waiver
 */
export const markWaived = async (id, notes = '') => {
  const { data } = await api.patch(`/fees/${id}/mark-waived`, { notes });
  return data;
};
