import api from './api';

export const BOARD_CANDIDATE_STATUSES = ['active', 'completed', 'dropped'];
export const BOARD_BATCH_STATUSES = ['active', 'completed'];
export const BOARD_FEE_TYPES = ['enrollment', 'exam_1', 'exam_2', 'project', 'other'];
export const BOARD_EXPENSE_CATEGORIES = [
  'examination_fee',
  'printing_stationery',
  'invigilation',
  'venue_arrangements',
  'transport',
  'other',
];

// -------------------------------------------------------
// BATCHES
// -------------------------------------------------------

export const listBoardBatches = async (params = {}) => {
  const { data } = await api.get('/board/batches', { params });
  return data.batches;
};

export const createBoardBatch = async (batchName) => {
  const { data } = await api.post('/board/batches', { batchName });
  return data;
};

export const updateBoardBatch = async (id, payload) => {
  const { data } = await api.patch(`/board/batches/${id}`, payload);
  return data;
};

export const deleteBoardBatch = async (id) => {
  const { data } = await api.delete(`/board/batches/${id}`);
  return data;
};

// -------------------------------------------------------
// CANDIDATES
// -------------------------------------------------------

export const getBoardCandidateDashboard = async () => {
  const { data } = await api.get('/board/candidates/dashboard');
  return data;
};

export const listBoardCandidates = async (params = {}) => {
  const { data } = await api.get('/board/candidates', { params });
  return data;
};

export const getBoardCandidate = async (id) => {
  const { data } = await api.get(`/board/candidates/${id}`);
  return data;
};

export const createBoardCandidate = async (payload) => {
  const { data } = await api.post('/board/candidates', payload);
  return data;
};

export const updateBoardCandidate = async (id, payload) => {
  const { data } = await api.patch(`/board/candidates/${id}`, payload);
  return data;
};

export const deleteBoardCandidate = async (id) => {
  const { data } = await api.delete(`/board/candidates/${id}`);
  return data;
};

// -------------------------------------------------------
// FEES
// -------------------------------------------------------

export const getBoardFeeDashboard = async () => {
  const { data } = await api.get('/board/fees/dashboard');
  return data;
};

export const listBoardFees = async (params = {}) => {
  const { data } = await api.get('/board/fees', { params });
  return data;
};

export const listBoardFeesForCandidate = async (candidateId) => {
  const { data } = await api.get(`/board/fees/candidate/${candidateId}`);
  return data;
};

export const setBoardFeeItem = async (payload) => {
  const { data } = await api.post('/board/fees/item', payload);
  return data;
};

export const markBoardFeePaid = async (id, amountPaid) => {
  const { data } = await api.patch(`/board/fees/${id}/mark-paid`, amountPaid !== undefined ? { amountPaid } : {});
  return data;
};

export const markBoardFeePartial = async (id, amountPaid) => {
  const { data } = await api.patch(`/board/fees/${id}/mark-partial`, { amountPaid });
  return data;
};

export const markBoardFeeUnpaid = async (id) => {
  const { data } = await api.patch(`/board/fees/${id}/mark-unpaid`);
  return data;
};

// -------------------------------------------------------
// EXPENSES
// -------------------------------------------------------

export const getBoardExpenseDashboard = async () => {
  const { data } = await api.get('/board/expenses/dashboard');
  return data;
};

export const listBoardExpenses = async (params = {}) => {
  const { data } = await api.get('/board/expenses', { params });
  return data;
};

export const getBoardExpense = async (id) => {
  const { data } = await api.get(`/board/expenses/${id}`);
  return data;
};

export const createBoardExpense = async (payload) => {
  const { data } = await api.post('/board/expenses', payload);
  return data;
};

export const updateBoardExpense = async (id, payload) => {
  const { data } = await api.patch(`/board/expenses/${id}`, payload);
  return data;
};

export const deleteBoardExpense = async (id) => {
  const { data } = await api.delete(`/board/expenses/${id}`);
  return data;
};

// -------------------------------------------------------
// PROFIT & LOSS
// -------------------------------------------------------

export const getBoardProfitLossDashboard = async () => {
  const { data } = await api.get('/board/profit-loss/dashboard');
  return data;
};

export const getBoardProfitLossMonthly = async (year) => {
  const { data } = await api.get('/board/profit-loss/monthly', { params: year ? { year } : {} });
  return data;
};

export const getBoardProfitLossYearly = async () => {
  const { data } = await api.get('/board/profit-loss/yearly');
  return data;
};

export const getBoardProfitLossYears = async () => {
  const { data } = await api.get('/board/profit-loss/years');
  return data;
};
