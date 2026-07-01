import api from './api';

const EXT_BY_FORMAT = {
  pdf: 'pdf',
  excel: 'xlsx',
};

/**
 * Download a report file (PDF or Excel) and save it via the browser.
 *
 * @param {string} endpoint - e.g. '/exports/students'
 * @param {'pdf'|'excel'} format
 * @param {Object} [params] - extra query params (filters)
 * @param {string} [fallbackName] - filename to use if the response doesn't include one
 */
export const downloadReport = async (endpoint, format, params = {}, fallbackName = 'report') => {
  const response = await api.get(endpoint, {
    params: { ...params, format },
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'];
  let filename = `${fallbackName}.${EXT_BY_FORMAT[format] || 'pdf'}`;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  }

  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

// -------------------------------------------------------
// Convenience wrappers — one per report type
// -------------------------------------------------------

export const downloadStudentReport = (format, params) =>
  downloadReport('/exports/students', format, params, 'student-report');

export const downloadTeacherReport = (format, params) =>
  downloadReport('/exports/teachers', format, params, 'teacher-report');

export const downloadAttendanceReport = (format, params) =>
  downloadReport('/exports/attendance', format, params, 'attendance-report');

export const downloadFeeReport = (format, params) =>
  downloadReport('/exports/fees', format, params, 'fee-report');

export const downloadExpenseReport = (format, params) =>
  downloadReport('/exports/expenses', format, params, 'expense-report');

export const downloadProfitReport = (format, params) =>
  downloadReport('/exports/profit-loss', format, params, 'profit-loss-report');
