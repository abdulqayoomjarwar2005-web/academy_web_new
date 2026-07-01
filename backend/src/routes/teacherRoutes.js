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

module.exports = router;
