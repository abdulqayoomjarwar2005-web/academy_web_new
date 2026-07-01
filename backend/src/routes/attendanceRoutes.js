const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const {
  getMarkPage,
  submitAttendance,
  updateAttendance,
  getHistory,
  getDaySummary,
  getStudentSummary,
  createEditRequest,
  listEditRequests,
  approveEditRequest,
  rejectEditRequest,
} = require('../controllers/attendanceController');

const authenticate  = require('../middleware/authenticate');
const authorize     = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

// All attendance routes require authentication
router.use(authenticate);

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const validateDate = (field) =>
  query(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .matches(ISO_DATE_REGEX)
    .withMessage(`${field} must be YYYY-MM-DD`);

// -------------------------------------------------------
// MARK ATTENDANCE
// -------------------------------------------------------

/**
 * GET /api/attendance/mark?date=YYYY-MM-DD
 * Fetch student list + existing attendance for a date.
 */
router.get(
  '/mark',
  authorize('teacher', 'admin', 'owner'),
  [validateDate('date')],
  handleValidation,
  getMarkPage
);

/**
 * POST /api/attendance/submit
 * Submit (bulk save + lock) attendance for a date.
 */
router.post(
  '/submit',
  authorize('teacher', 'admin', 'owner'),
  [
    body('date')
      .notEmpty().withMessage('date is required')
      .matches(ISO_DATE_REGEX).withMessage('date must be YYYY-MM-DD'),
    body('entries')
      .isArray({ min: 1 }).withMessage('entries must be a non-empty array'),
    body('entries.*.studentId')
      .isUUID().withMessage('Each entry must have a valid studentId (UUID)'),
    body('entries.*.status')
      .isIn(['present', 'absent', 'leave'])
      .withMessage('Each entry status must be present, absent, or leave'),
  ],
  handleValidation,
  submitAttendance
);

/**
 * PATCH /api/attendance/:attendanceId
 * Update a single attendance record (only when unlocked after approval).
 */
router.patch(
  '/:attendanceId',
  authorize('teacher', 'admin', 'owner'),
  [
    param('attendanceId').isUUID().withMessage('Invalid attendance ID'),
    body('status')
      .isIn(['present', 'absent', 'leave'])
      .withMessage('status must be present, absent, or leave'),
  ],
  handleValidation,
  updateAttendance
);

// -------------------------------------------------------
// HISTORY & REPORTS
// -------------------------------------------------------

/**
 * GET /api/attendance/history
 */
router.get(
  '/history',
  authorize('teacher', 'admin', 'owner'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('date').optional().matches(ISO_DATE_REGEX).withMessage('date must be YYYY-MM-DD'),
  ],
  handleValidation,
  getHistory
);

/**
 * GET /api/attendance/summary?date=YYYY-MM-DD
 */
router.get(
  '/summary',
  authorize('teacher', 'admin', 'owner'),
  [validateDate('date')],
  handleValidation,
  getDaySummary
);

/**
 * GET /api/attendance/student-summary/:studentId?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
router.get(
  '/student-summary/:studentId',
  authorize('admin', 'owner'),
  [
    param('studentId').isUUID().withMessage('Invalid student ID'),
    query('from').notEmpty().matches(ISO_DATE_REGEX).withMessage('from must be YYYY-MM-DD'),
    query('to').notEmpty().matches(ISO_DATE_REGEX).withMessage('to must be YYYY-MM-DD'),
  ],
  handleValidation,
  getStudentSummary
);

// -------------------------------------------------------
// EDIT REQUESTS
// -------------------------------------------------------

/**
 * POST /api/attendance/edit-requests
 * Teacher submits an edit request for a locked record.
 */
router.post(
  '/edit-requests',
  authorize('teacher', 'admin', 'owner'),
  [
    body('attendanceId').isUUID().withMessage('attendanceId must be a valid UUID'),
    body('reason').trim().notEmpty().withMessage('reason is required'),
  ],
  handleValidation,
  createEditRequest
);

/**
 * GET /api/attendance/edit-requests
 * Admin/Owner lists all edit requests.
 */
router.get(
  '/edit-requests',
  authorize('admin', 'owner'),
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status filter'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidation,
  listEditRequests
);

/**
 * PATCH /api/attendance/edit-requests/:requestId/approve
 */
router.patch(
  '/edit-requests/:requestId/approve',
  authorize('admin', 'owner'),
  [param('requestId').isUUID().withMessage('Invalid request ID')],
  handleValidation,
  approveEditRequest
);

/**
 * PATCH /api/attendance/edit-requests/:requestId/reject
 */
router.patch(
  '/edit-requests/:requestId/reject',
  authorize('admin', 'owner'),
  [param('requestId').isUUID().withMessage('Invalid request ID')],
  handleValidation,
  rejectEditRequest
);

module.exports = router;
