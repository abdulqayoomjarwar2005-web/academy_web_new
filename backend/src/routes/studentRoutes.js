const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();

const {
  createStudent,
  listStudents,
  getFilterOptions,
  getStudent,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');
const StudentModel = require('../models/studentModel');

// All student routes require authentication
router.use(authenticate);

const studentValidationRules = [
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('studentName').trim().notEmpty().withMessage('Student name is required'),
  body('fatherName').trim().notEmpty().withMessage("Father's name is required"),
  body('contactNumber')
    .trim()
    .notEmpty()
    .withMessage('Contact number is required')
    .matches(/^[0-9+\-\s()]{6,20}$/)
    .withMessage('Contact number format is invalid'),
  body('class').trim().notEmpty().withMessage('Class is required'),
  body('batch').trim().notEmpty().withMessage('Batch is required'),
  body('admissionDate')
    .notEmpty()
    .withMessage('Admission date is required')
    .isISO8601()
    .withMessage('Admission date must be a valid date (YYYY-MM-DD)'),
  body('monthlyFee')
    .notEmpty()
    .withMessage('Monthly fee is required')
    .isFloat({ min: 0 })
    .withMessage('Monthly fee must be a positive number'),
  body('status')
    .optional()
    .isIn(StudentModel.ALLOWED_STATUSES)
    .withMessage(`Status must be one of: ${StudentModel.ALLOWED_STATUSES.join(', ')}`),
];

const updateValidationRules = [
  body('rollNumber').optional().trim().notEmpty().withMessage('Roll number cannot be empty'),
  body('studentName').optional().trim().notEmpty().withMessage('Student name cannot be empty'),
  body('fatherName').optional().trim().notEmpty().withMessage("Father's name cannot be empty"),
  body('contactNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Contact number cannot be empty')
    .matches(/^[0-9+\-\s()]{6,20}$/)
    .withMessage('Contact number format is invalid'),
  body('class').optional().trim().notEmpty().withMessage('Class cannot be empty'),
  body('batch').optional().trim().notEmpty().withMessage('Batch cannot be empty'),
  body('admissionDate').optional().isISO8601().withMessage('Admission date must be a valid date (YYYY-MM-DD)'),
  body('monthlyFee').optional().isFloat({ min: 0 }).withMessage('Monthly fee must be a positive number'),
  body('status')
    .optional()
    .isIn(StudentModel.ALLOWED_STATUSES)
    .withMessage(`Status must be one of: ${StudentModel.ALLOWED_STATUSES.join(', ')}`),
];

const idParamRule = [param('id').isUUID().withMessage('Invalid student id')];

/**
 * GET /api/students
 * All roles (owner, admin, teacher) can view the student list.
 */
router.get(
  '/',
  authorize('owner', 'admin', 'teacher'),
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidation,
  listStudents
);

/**
 * GET /api/students/filters
 * Returns distinct class/batch/status values for filter dropdowns.
 */
router.get('/filters', authorize('owner', 'admin', 'teacher'), getFilterOptions);

/**
 * GET /api/students/:id
 * All roles can view a student profile.
 */
router.get(
  '/:id',
  authorize('owner', 'admin', 'teacher'),
  idParamRule,
  handleValidation,
  getStudent
);

/**
 * POST /api/students
 * Owner, Admin, Teacher: full add access.
 */
router.post(
  '/',
  authorize('owner', 'admin', 'teacher'),
  studentValidationRules,
  handleValidation,
  createStudent
);

/**
 * PUT /api/students/:id
 * Owner, Admin, Teacher: full edit access.
 */
router.put(
  '/:id',
  authorize('owner', 'admin', 'teacher'),
  [...idParamRule, ...updateValidationRules],
  handleValidation,
  updateStudent
);

/**
 * DELETE /api/students/:id
 * Owner, Admin, Teacher: full delete access.
 */
router.delete(
  '/:id',
  authorize('owner', 'admin', 'teacher'),
  idParamRule,
  handleValidation,
  deleteStudent
);

module.exports = router;
