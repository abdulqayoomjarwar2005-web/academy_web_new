const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const {
  getMarkPage,
  getMyClasses,
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
const attachTeacherClasses = require('../middleware/teacherScope');
const handleValidation = require('../middleware/validate');
const { auditLog }  = require('../middleware/auditMiddleware');

// All attendance routes require authentication
router.use(authenticate);
router.use(attachTeacherClasses);

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
 * GET /api/attendance/my-classes
 * Classes available to the current user for the class selector dropdown.
 */
router.get('/my-classes', authorize('teacher', 'admin', 'owner'), getMyClasses);

/**
 * GET /api/attendance/mark?date=YYYY-MM-DD&class=ClassName
 * Fetch student list + existing attendance for a date, for ONE class at a time.
 */
router.get(
  '/mark',
  authorize('teacher', 'admin', 'owner'),
  [
    validateDate('date'),
    query('class').trim().notEmpty().withMessage('class is required — select a single class'),
  ],
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
    body('class').trim().notEmpty().withMessage('class is required — attendance is submitted one class at a time'),
    body('entries')
      .isArray({ min: 1 }).withMessage('entries must be a non-empty array'),
    body('entries.*.studentId')
      .isUUID().withMessage('Each entry must have a valid studentId (UUID)'),
    body('entries.*.status')
      .isIn(['present', 'absent', 'leave'])
      .withMessage('Each entry status must be present, absent, or leave'),
  ],
  handleValidation,
  auditLog({
    action: 'ATTENDANCE_SUBMITTED',
    category: 'Attendance',
    description: (req) => `Submitted attendance for ${req.body?.class} on ${req.body?.date} (${req.body?.entries?.length || 0} students)`,
    entityType: 'attendance',
    entityLabel: (req) => `${req.body?.class} — ${req.body?.date}`,
  }),
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
  auditLog({
    action: 'ATTENDANCE_UPDATED',
    category: 'Attendance',
    description: (req) => `Changed attendance record ${req.params.attendanceId} to "${req.body?.status}"`,
    entityType: 'attendance',
    entityId: (req) => req.params.attendanceId,
  }),
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
  auditLog({
    action: 'ATTENDANCE_EDIT_REQUESTED',
    category: 'Attendance',
    description: (req) => `Requested edit on attendance record ${req.body?.attendanceId} — reason: ${req.body?.reason}`,
    entityType: 'attendance',
    entityId: (req) => req.body?.attendanceId,
  }),
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
  auditLog({
    action: 'ATTENDANCE_EDIT_APPROVED',
    category: 'Attendance',
    description: (req) => `Approved attendance edit request ${req.params.requestId}`,
    entityType: 'attendance_edit_request',
    entityId: (req) => req.params.requestId,
  }),
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
  auditLog({
    action: 'ATTENDANCE_EDIT_REJECTED',
    category: 'Attendance',
    description: (req) => `Rejected attendance edit request ${req.params.requestId}`,
    entityType: 'attendance_edit_request',
    entityId: (req) => req.params.requestId,
  }),
  rejectEditRequest
);

module.exports = router;
