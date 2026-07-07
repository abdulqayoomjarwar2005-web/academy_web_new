const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const {
  createTeacher,
  listTeachers,
  getFilterOptions,
  getTeacher,
  updateTeacher,
  deleteTeacher,
  createTeacherAccount,
  getTeacherAccount,
  updateTeacherClasses,
  activateTeacherAccount,
  deactivateTeacherAccount,
  resetTeacherPassword,
  getMyClasses,
} = require('../controllers/teacherController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');
const TeacherModel = require('../models/teacherModel');

// All teacher routes require authentication
router.use(authenticate);

const teacherValidationRules = [
  body('teacherName').trim().notEmpty().withMessage('Teacher name is required'),
  body('contactNumber')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required')
    .matches(/^[0-9+\-\s()]{6,20}$/)
    .withMessage('Contact number format is invalid'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('salary')
    .notEmpty()
    .withMessage('Salary is required')
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),
  body('joiningDate')
    .notEmpty()
    .withMessage('Joining date is required')
    .isISO8601()
    .withMessage('Joining date must be a valid date (YYYY-MM-DD)'),
  body('status')
    .optional()
    .isIn(TeacherModel.ALLOWED_STATUSES)
    .withMessage(`Status must be one of: ${TeacherModel.ALLOWED_STATUSES.join(', ')}`),
];

const updateValidationRules = [
  body('teacherName').optional().trim().notEmpty().withMessage('Teacher name cannot be empty'),
  body('contactNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact number cannot be empty')
    .matches(/^[0-9+\-\s()]{6,20}$/)
    .withMessage('Contact number format is invalid'),
  body('subject').optional().trim().notEmpty().withMessage('Subject cannot be empty'),
  body('salary').optional().isFloat({ min: 0 }).withMessage('Salary must be a positive number'),
  body('joiningDate').optional().isISO8601().withMessage('Joining date must be a valid date (YYYY-MM-DD)'),
  body('status')
    .optional()
    .isIn(TeacherModel.ALLOWED_STATUSES)
    .withMessage(`Status must be one of: ${TeacherModel.ALLOWED_STATUSES.join(', ')}`),
];

const idParamRule = [param('id').isUUID().withMessage('Invalid teacher id')];

/**
 * GET /api/teachers
 * Owner, Admin only — teachers have no access to this module.
 */
router.get(
  '/',
  authorize('owner', 'admin'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidation,
  listTeachers
);

/**
 * GET /api/teachers/filters
 * Returns distinct subject/status values for filter dropdowns.
 */
router.get('/filters', authorize('owner', 'admin'), getFilterOptions);

/**
 * GET /api/teachers/me/classes
 * A logged-in teacher's own assigned classes.
 * Registered before the /:id routes so "me" isn't swallowed as an id param.
 */
router.get('/me/classes', authorize('teacher'), getMyClasses);

/**
 * GET /api/teachers/:id
 * Owner, Admin only.
 */
router.get(
  '/:id',
  authorize('owner', 'admin'),
  idParamRule,
  handleValidation,
  getTeacher
);

/**
 * POST /api/teachers
 * Owner, Admin: full add access.
 */
router.post(
  '/',
  authorize('owner', 'admin'),
  teacherValidationRules,
  handleValidation,
  createTeacher
);

/**
 * PUT /api/teachers/:id
 * Owner, Admin: full edit access.
 */
router.put(
  '/:id',
  authorize('owner', 'admin'),
  [...idParamRule, ...updateValidationRules],
  handleValidation,
  updateTeacher
);

/**
 * DELETE /api/teachers/:id
 * Owner, Admin: full delete access.
 */
router.delete(
  '/:id',
  authorize('owner', 'admin'),
  idParamRule,
  handleValidation,
  deleteTeacher
);

// -------------------------------------------------------
// LOGIN ACCOUNT MANAGEMENT (Phase 14 — Teacher Portal)
// -------------------------------------------------------

/**
 * GET /api/teachers/:id/account
 * View a teacher's login account status + assigned classes.
 */
router.get(
  '/:id/account',
  authorize('owner', 'admin'),
  idParamRule,
  handleValidation,
  getTeacherAccount
);

/**
 * POST /api/teachers/:id/account
 * Create a login account for an existing teacher.
 */
router.post(
  '/:id/account',
  authorize('owner', 'admin'),
  [
    ...idParamRule,
    body('email').isEmail().withMessage('A valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Temporary password must be at least 8 characters long'),
    body('classes').optional().isArray().withMessage('classes must be an array'),
  ],
  handleValidation,
  createTeacherAccount
);

/**
 * PUT /api/teachers/:id/classes
 * Replace the classes a teacher's login is scoped to.
 */
router.put(
  '/:id/classes',
  authorize('owner', 'admin'),
  [
    ...idParamRule,
    body('classes').isArray().withMessage('classes must be an array'),
  ],
  handleValidation,
  updateTeacherClasses
);

/**
 * PATCH /api/teachers/:id/account/activate
 */
router.patch(
  '/:id/account/activate',
  authorize('owner', 'admin'),
  idParamRule,
  handleValidation,
  activateTeacherAccount
);

/**
 * PATCH /api/teachers/:id/account/deactivate
 */
router.patch(
  '/:id/account/deactivate',
  authorize('owner', 'admin'),
  idParamRule,
  handleValidation,
  deactivateTeacherAccount
);

/**
 * PATCH /api/teachers/:id/account/reset-password
 * Admin issues a new temporary password for a teacher.
 */
router.patch(
  '/:id/account/reset-password',
  authorize('owner', 'admin'),
  [
    ...idParamRule,
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long'),
  ],
  handleValidation,
  resetTeacherPassword
);

module.exports = router;
