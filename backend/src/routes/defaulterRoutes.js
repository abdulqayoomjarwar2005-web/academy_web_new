const express = require('express');
const { query } = require('express-validator');
const router = express.Router();

const {
  listDefaulters,
  getStats,
  getFilterOptions,
} = require('../controllers/defaulterController');

const authenticate     = require('../middleware/authenticate');
const authorize        = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

// All defaulter routes require authentication
router.use(authenticate);

const monthQuery = query('month')
  .optional()
  .matches(/^\d{4}-\d{2}$/)
  .withMessage('month must be YYYY-MM');

/**
 * GET /api/defaulters/stats
 * KPI summary — total defaulters, total outstanding, record counts.
 * Accepts optional: class, batch, month filters.
 */
router.get(
  '/stats',
  authorize('owner', 'admin', 'teacher'),
  [
    monthQuery,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidation,
  getStats
);

/**
 * GET /api/defaulters/filter-options
 * Distinct classes & batches present among current defaulters.
 */
router.get(
  '/filter-options',
  authorize('owner', 'admin', 'teacher'),
  getFilterOptions
);

/**
 * GET /api/defaulters
 * Full paginated + filterable defaulter list.
 * Query params: class, batch, month, search, sortBy, sortDir, page, limit
 */
router.get(
  '/',
  authorize('owner', 'admin', 'teacher'),
  [
    monthQuery,
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy')
      .optional()
      .isIn(['outstanding_balance', 'due_months_count', 'student_name', 'oldest_due_month']),
    query('sortDir').optional().isIn(['asc', 'desc']),
  ],
  handleValidation,
  listDefaulters
);

module.exports = router;
