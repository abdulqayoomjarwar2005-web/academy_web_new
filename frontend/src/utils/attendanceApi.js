import api from './api';

export const ATTENDANCE_STATUS_OPTIONS = ['present', 'absent', 'leave'];
export const EDIT_REQUEST_STATUS_OPTIONS = ['pending', 'approved', 'rejected'];

// -------------------------------------------------------
// MARK ATTENDANCE
// -------------------------------------------------------

/**
 * Fetch students + existing attendance for a date.
 * @param {string} date - YYYY-MM-DD
 */
export const getMarkPage = async (date) => {
  const { data } = await api.get('/attendance/mark', { params: { date } });
  return data;
};

/**
 * Submit (bulk save + lock) attendance for a date.
 * @param {string} date
 * @param {Array<{studentId: string, status: string}>} entries
 */
export const submitAttendance = async (date, entries) => {
  const { data } = await api.post('/attendance/submit', { date, entries });
  return data;
};

/**
 * Update a single attendance record (only when unlocked by admin approval).
 * @param {string} attendanceId
 * @param {string} status
 */
export const updateAttendance = async (attendanceId, status) => {
  const { data } = await api.patch(`/attendance/${attendanceId}`, { status });
  return data;
};

// -------------------------------------------------------
// HISTORY & REPORTS
// -------------------------------------------------------

/**
 * Get paginated attendance history.
 * @param {object} params - date, studentId, status, className, section, page, limit
 */
export const getAttendanceHistory = async (params = {}) => {
  const { data } = await api.get('/attendance/history', { params });
  return data;
};

/**
 * Get summary for a date.
 * @param {string} date
 */
export const getDaySummary = async (date) => {
  const { data } = await api.get('/attendance/summary', { params: { date } });
  return data;
};

/**
 * Get attendance summary for a specific student over a date range.
 * @param {string} studentId
 * @param {string} from - YYYY-MM-DD
 * @param {string} to   - YYYY-MM-DD
 */
export const getStudentSummary = async (studentId, from, to) => {
  const { data } = await api.get(`/attendance/student-summary/${studentId}`, {
    params: { from, to },
  });
  return data;
};

// -------------------------------------------------------
// EDIT REQUESTS
// -------------------------------------------------------

/**
 * Teacher submits an edit request for a locked record.
 * @param {string} attendanceId
 * @param {string} reason
 */
export const createEditRequest = async (attendanceId, reason) => {
  const { data } = await api.post('/attendance/edit-requests', { attendanceId, reason });
  return data;
};

/**
 * Admin/Owner: list edit requests.
 * @param {object} params - status, page, limit
 */
export const listEditRequests = async (params = {}) => {
  const { data } = await api.get('/attendance/edit-requests', { params });
  return data;
};

/**
 * Admin/Owner: approve an edit request.
 * @param {string} requestId
 */
export const approveEditRequest = async (requestId) => {
  const { data } = await api.patch(`/attendance/edit-requests/${requestId}/approve`);
  return data;
};

/**
 * Admin/Owner: reject an edit request.
 * @param {string} requestId
 */
export const rejectEditRequest = async (requestId) => {
  const { data } = await api.patch(`/attendance/edit-requests/${requestId}/reject`);
  return data;
};
