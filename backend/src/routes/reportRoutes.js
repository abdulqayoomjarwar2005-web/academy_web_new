const express = require('express');
const { query } = require('express-validator');
const router = express.Router();

const {
  getDailyReport,
  getAvailableDates,
  getMonthlyReport,
  getAvailableMonths,
} = require('../controllers/reportController');

const authenticate      = require('../middleware/authenticate');
const authorize         = require('../middleware/authorize');
const handleValidation  = require('../middleware/validate');

// All report routes require authentication
router.use(authenticate);

const ISO_DATE_REGEX  = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH_REGEX = /^\d{4}-\d{2}$/;

// -------------------------------------------------------
// DAILY REPORT
// -------------------------------------------------------

/**
 * GET /api/reports/daily?date=YYYY-MM-DD
 * Present / Absent / Leave lists for a specific day.
 */
router.get(
  '/daily',
  authorize('teacher', 'admin', 'owner'),
  [
    query('date')
      .notEmpty().withMessage('date is required')
      .matches(ISO_DATE_REGEX).withMessage('date must be YYYY-MM-DD'),
  ],
  handleValidation,
  getDailyReport
);

/**
 * GET /api/reports/available-dates
 * Returns dates that have locked attendance records.
 */
router.get(
  '/available-dates',
  authorize('teacher', 'admin', 'owner'),
  getAvailableDates
);

// -------------------------------------------------------
// MONTHLY REPORT
// -------------------------------------------------------

/**
 * GET /api/reports/monthly?month=YYYY-MM&className=&section=&page=1&limit=50
 * Per-student monthly stats + aggregate totals.
 */
router.get(
  '/monthly',
  authorize('admin', 'owner'),
  [
    query('month')
      .optional()
      .matches(ISO_MONTH_REGEX).withMessage('month must be YYYY-MM'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  handleValidation,
  getMonthlyReport
);

/**
 * GET /api/reports/available-months
 * Returns months that have locked attendance records.
 */
router.get(
  '/available-months',
  authorize('admin', 'owner'),
  getAvailableMonths
);

module.exports = router;
