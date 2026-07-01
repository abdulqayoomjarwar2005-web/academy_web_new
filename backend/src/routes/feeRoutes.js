const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  getDashboard,
  listFees,
  getFee,
  getByReceipt,
  getDueMonths,
  ensureFeeRecord,
  bulkGenerate,
  markPaid,
  markUnpaid,
  markPartial,
  markWaived,
} = require('../controllers/feeController');

const authenticate     = require('../middleware/authenticate');
const authorize        = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

// All fee routes require authentication
router.use(authenticate);

const idParam   = [param('id').isUUID().withMessage('Invalid fee id')];
const uuidParam = [param('studentId').isUUID().withMessage('Invalid student id')];

// -------------------------------------------------------
// READ ROUTES — owner, admin, teacher all allowed
// -------------------------------------------------------

/**
 * GET /api/fees/dashboard
 * Collection stats: today / week / month / year.
 */
router.get(
  '/dashboard',
  authorize('owner', 'admin', 'teacher'),
  getDashboard
);

/**
 * GET /api/fees
 * List fee records with filters.
 */
router.get(
  '/',
  authorize('owner', 'admin', 'teacher'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['unpaid', 'paid', 'partial', 'waived']),
    query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('month must be YYYY-MM'),
  ],
  handleValidation,
  listFees
);

/**
 * GET /api/fees/receipt/:receiptNumber
 * Fetch a fee record by its receipt number.
 */
router.get(
  '/receipt/:receiptNumber',
  authorize('owner', 'admin', 'teacher'),
  getByReceipt
);

/**
 * GET /api/fees/due/:studentId
 * Get all due months for a specific student.
 */
router.get(
  '/due/:studentId',
  authorize('owner', 'admin', 'teacher'),
  uuidParam,
  handleValidation,
  getDueMonths
);

/**
 * GET /api/fees/:id
 * Single fee record.
 */
router.get(
  '/:id',
  authorize('owner', 'admin', 'teacher'),
  idParam,
  handleValidation,
  getFee
);

// -------------------------------------------------------
// WRITE ROUTES — owner and admin only
// -------------------------------------------------------

/**
 * POST /api/fees/ensure
 * Ensure a fee record exists for a student + month.
 * Creates it (unpaid) if absent.
 */
router.post(
  '/ensure',
  authorize('owner', 'admin'),
  [
    body('studentId').isUUID().withMessage('studentId must be a valid UUID'),
    body('feeMonth')
      .notEmpty()
      .matches(/^\d{4}-\d{2}$/)
      .withMessage('feeMonth must be in YYYY-MM format'),
  ],
  handleValidation,
  ensureFeeRecord
);

/**
 * POST /api/fees/bulk-generate
 * Generate fee records for ALL active students for a given month.
 */
router.post(
  '/bulk-generate',
  authorize('owner', 'admin'),
  [
    body('feeMonth')
      .notEmpty()
      .matches(/^\d{4}-\d{2}$/)
      .withMessage('feeMonth must be in YYYY-MM format'),
  ],
  handleValidation,
  bulkGenerate
);

/**
 * PATCH /api/fees/:id/mark-paid
 * Mark a fee as fully paid. Generates a receipt number.
 */
router.patch(
  '/:id/mark-paid',
  authorize('owner', 'admin'),
  [
    ...idParam,
    body('amountPaid').optional().isFloat({ min: 0 }).withMessage('amountPaid must be a non-negative number'),
  ],
  handleValidation,
  markPaid
);

/**
 * PATCH /api/fees/:id/mark-unpaid
 * Revert a fee to unpaid.
 */
router.patch(
  '/:id/mark-unpaid',
  authorize('owner', 'admin'),
  idParam,
  handleValidation,
  markUnpaid
);

/**
 * PATCH /api/fees/:id/mark-partial
 * Record a partial payment.
 */
router.patch(
  '/:id/mark-partial',
  authorize('owner', 'admin'),
  [
    ...idParam,
    body('amountPaid')
      .notEmpty()
      .isFloat({ min: 0 })
      .withMessage('amountPaid is required and must be a non-negative number'),
  ],
  handleValidation,
  markPartial
);

/**
 * PATCH /api/fees/:id/mark-waived
 * Waive a fee (with optional notes / reason).
 */
router.patch(
  '/:id/mark-waived',
  authorize('owner', 'admin'),
  [
    ...idParam,
    body('notes').optional().isString(),
  ],
  handleValidation,
  markWaived
);

module.exports = router;
