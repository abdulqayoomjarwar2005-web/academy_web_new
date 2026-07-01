const ExportModel = require('../models/exportModel');
const { streamPdfReport } = require('../utils/pdfExport');
const { streamExcelReport } = require('../utils/excelExport');

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

/**
 * Dispatch a built report (rows + columns + summary) to either
 * the PDF or Excel generator based on `?format=`.
 */
const respondWithReport = async (req, res, { title, subtitle, columns, rows, summary, filenameBase }) => {
  const format = (req.query.format || 'pdf').toLowerCase();

  if (format === 'excel' || format === 'xlsx') {
    return streamExcelReport(res, { title, subtitle, columns, rows, summary, filename: filenameBase });
  }

  if (format === 'pdf') {
    return streamPdfReport(res, { title, subtitle, columns, rows, summary, filename: filenameBase });
  }

  return res.status(400).json({ message: "format must be 'pdf' or 'excel'" });
};

const buildSubtitle = (filters) => {
  const parts = Object.entries(filters)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`);
  return parts.length ? `Filters — ${parts.join(', ')}` : undefined;
};

// -------------------------------------------------------
// STUDENT REPORT
// GET /api/exports/students?format=pdf|excel&class=&batch=&status=
// -------------------------------------------------------
const exportStudentReport = async (req, res) => {
  try {
    const { class: className, batch, status } = req.query;
    const { rows, summary } = await ExportModel.getStudentReport({ class: className, batch, status });

    const columns = [
      { key: 'studentId', label: 'Student ID', width: 1.1 },
      { key: 'rollNumber', label: 'Roll No.', width: 0.8, excelWidth: 12 },
      { key: 'studentName', label: 'Name', width: 1.6, excelWidth: 24 },
      { key: 'fatherName', label: "Father's Name", width: 1.6, excelWidth: 24 },
      { key: 'contactNumber', label: 'Contact', width: 1.2, excelWidth: 16 },
      { key: 'class', label: 'Class', width: 0.9 },
      { key: 'batch', label: 'Batch', width: 0.9 },
      { key: 'admissionDate', label: 'Admission Date', width: 1.1, excelWidth: 16 },
      { key: 'monthlyFee', label: 'Monthly Fee', width: 1, align: 'right', excelWidth: 14 },
      { key: 'status', label: 'Status', width: 0.9 },
    ];

    return respondWithReport(req, res, {
      title: 'Student Report',
      subtitle: buildSubtitle({ class: className, batch, status }),
      columns,
      rows,
      summary,
      filenameBase: 'student-report',
    });
  } catch (err) {
    console.error('Student report export error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// TEACHER REPORT
// GET /api/exports/teachers?format=pdf|excel&subject=&status=
// -------------------------------------------------------
const exportTeacherReport = async (req, res) => {
  try {
    const { subject, status } = req.query;
    const { rows, summary } = await ExportModel.getTeacherReport({ subject, status });

    const columns = [
      { key: 'teacherId', label: 'Teacher ID', width: 1.1 },
      { key: 'teacherName', label: 'Name', width: 1.8, excelWidth: 26 },
      { key: 'contactNumber', label: 'Contact', width: 1.2, excelWidth: 16 },
      { key: 'subject', label: 'Subject', width: 1.3, excelWidth: 18 },
      { key: 'salary', label: 'Salary', width: 1, align: 'right', excelWidth: 14 },
      { key: 'joiningDate', label: 'Joining Date', width: 1.1, excelWidth: 16 },
      { key: 'status', label: 'Status', width: 0.9 },
    ];

    return respondWithReport(req, res, {
      title: 'Teacher Report',
      subtitle: buildSubtitle({ subject, status }),
      columns,
      rows,
      summary,
      filenameBase: 'teacher-report',
    });
  } catch (err) {
    console.error('Teacher report export error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// ATTENDANCE REPORT
// GET /api/exports/attendance?format=pdf|excel&month=YYYY-MM&class=&batch=
// -------------------------------------------------------
const exportAttendanceReport = async (req, res) => {
  try {
    const { month, class: className, batch } = req.query;
    const { month: targetMonth, rows, summary } = await ExportModel.getAttendanceReport({
      month,
      class: className,
      batch,
    });

    const columns = [
      { key: 'studentId', label: 'Student ID', width: 1.1 },
      { key: 'studentName', label: 'Name', width: 1.8, excelWidth: 26 },
      { key: 'class', label: 'Class', width: 0.9 },
      { key: 'batch', label: 'Batch', width: 0.9 },
      { key: 'presentDays', label: 'Present', width: 0.9, align: 'right' },
      { key: 'absentDays', label: 'Absent', width: 0.9, align: 'right' },
      { key: 'leaveDays', label: 'Leave', width: 0.9, align: 'right' },
      { key: 'totalMarked', label: 'Total Marked', width: 1, align: 'right', excelWidth: 14 },
      { key: 'attendancePct', label: 'Attendance %', width: 1, align: 'right', excelWidth: 14 },
    ];

    return respondWithReport(req, res, {
      title: 'Attendance Report',
      subtitle: buildSubtitle({ month: targetMonth, class: className, batch }),
      columns,
      rows,
      summary,
      filenameBase: `attendance-report-${targetMonth}`,
    });
  } catch (err) {
    console.error('Attendance report export error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// FEE REPORT
// GET /api/exports/fees?format=pdf|excel&month=YYYY-MM&status=&class=&batch=
// -------------------------------------------------------
const exportFeeReport = async (req, res) => {
  try {
    const { month, status, class: className, batch } = req.query;
    const { rows, summary } = await ExportModel.getFeeReport({ month, status, class: className, batch });

    const columns = [
      { key: 'studentId', label: 'Student ID', width: 1.1 },
      { key: 'studentName', label: 'Name', width: 1.6, excelWidth: 24 },
      { key: 'class', label: 'Class', width: 0.8 },
      { key: 'batch', label: 'Batch', width: 0.8 },
      { key: 'feeMonth', label: 'Fee Month', width: 0.9, excelWidth: 12 },
      { key: 'amount', label: 'Amount', width: 0.9, align: 'right', excelWidth: 12 },
      { key: 'amountPaid', label: 'Paid', width: 0.9, align: 'right', excelWidth: 12 },
      { key: 'balance', label: 'Balance', width: 0.9, align: 'right', excelWidth: 12 },
      { key: 'status', label: 'Status', width: 0.9 },
      { key: 'paidAt', label: 'Paid On', width: 1, excelWidth: 14 },
      { key: 'receiptNumber', label: 'Receipt #', width: 1.1, excelWidth: 16 },
    ];

    return respondWithReport(req, res, {
      title: 'Fee Report',
      subtitle: buildSubtitle({ month, status, class: className, batch }),
      columns,
      rows,
      summary,
      filenameBase: 'fee-report',
    });
  } catch (err) {
    console.error('Fee report export error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// EXPENSE REPORT
// GET /api/exports/expenses?format=pdf|excel&month=YYYY-MM&category=&startDate=&endDate=
// -------------------------------------------------------
const exportExpenseReport = async (req, res) => {
  try {
    const { month, category, startDate, endDate } = req.query;
    const { rows, summary } = await ExportModel.getExpenseReport({ month, category, startDate, endDate });

    const columns = [
      { key: 'expenseDate', label: 'Date', width: 1, excelWidth: 14 },
      { key: 'category', label: 'Category', width: 1.2, excelWidth: 18 },
      { key: 'description', label: 'Description', width: 2.4, excelWidth: 36 },
      { key: 'amount', label: 'Amount', width: 1, align: 'right', excelWidth: 14 },
      { key: 'recordedBy', label: 'Recorded By', width: 1.4, excelWidth: 20 },
    ];

    return respondWithReport(req, res, {
      title: 'Expense Report',
      subtitle: buildSubtitle({ month, category, startDate, endDate }),
      columns,
      rows,
      summary,
      filenameBase: 'expense-report',
    });
  } catch (err) {
    console.error('Expense report export error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// PROFIT REPORT
// GET /api/exports/profit-loss?format=pdf|excel&year=YYYY
// -------------------------------------------------------
const exportProfitReport = async (req, res) => {
  try {
    const { year } = req.query;
    const { year: targetYear, rows, summary } = await ExportModel.getProfitReport({ year });

    const columns = [
      { key: 'month', label: 'Month', width: 1, excelWidth: 14 },
      { key: 'totalCollection', label: 'Fee Collection', width: 1.2, align: 'right', excelWidth: 16 },
      { key: 'totalExpenses', label: 'Expenses', width: 1.2, align: 'right', excelWidth: 16 },
      { key: 'profit', label: 'Profit / Loss', width: 1.2, align: 'right', excelWidth: 16 },
    ];

    return respondWithReport(req, res, {
      title: 'Profit & Loss Report',
      subtitle: buildSubtitle({ year: targetYear }),
      columns,
      rows,
      summary,
      filenameBase: `profit-loss-report-${targetYear}`,
    });
  } catch (err) {
    console.error('Profit report export error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  exportStudentReport,
  exportTeacherReport,
  exportAttendanceReport,
  exportFeeReport,
  exportExpenseReport,
  exportProfitReport,
};
