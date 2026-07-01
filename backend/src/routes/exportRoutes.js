const express = require('express');
const router = express.Router();

const {
  exportStudentReport,
  exportTeacherReport,
  exportAttendanceReport,
  exportFeeReport,
  exportExpenseReport,
  exportProfitReport,
} = require('../controllers/exportController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

// -------------------------------------------------------
// GET /api/exports/students?format=pdf|excel
// All roles — same access as Student Management.
// -------------------------------------------------------
router.get('/students', exportStudentReport);

// -------------------------------------------------------
// GET /api/exports/teachers?format=pdf|excel
// Owner / Admin only — same access as Teacher Management.
// -------------------------------------------------------
router.get('/teachers', authorize('owner', 'admin'), exportTeacherReport);

// -------------------------------------------------------
// GET /api/exports/attendance?format=pdf|excel&month=YYYY-MM
// All roles — same access as Attendance.
// -------------------------------------------------------
router.get('/attendance', exportAttendanceReport);

// -------------------------------------------------------
// GET /api/exports/fees?format=pdf|excel
// All roles — same access as Fee Management.
// -------------------------------------------------------
router.get('/fees', exportFeeReport);

// -------------------------------------------------------
// GET /api/exports/expenses?format=pdf|excel
// Owner / Admin only — same access as Expense Management.
// -------------------------------------------------------
router.get('/expenses', authorize('owner', 'admin'), exportExpenseReport);

// -------------------------------------------------------
// GET /api/exports/profit-loss?format=pdf|excel&year=YYYY
// Owner / Admin only — same access as the Profit & Loss module.
// -------------------------------------------------------
router.get('/profit-loss', authorize('owner', 'admin'), exportProfitReport);

module.exports = router;
