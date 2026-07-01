const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  getDashboard,
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');

const ExpenseModel = require('../models/expenseModel');

const authenticate     = require('../middleware/authenticate');
const authorize        = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

// All expense routes require authentication.
// Owner and Admin: full access. Teacher: no access at all.
router.use(authenticate);
router.use(authorize('owner', 'admin'));

const idParam = [param('id').isUUID().withMessage('Invalid expense id')];

const expenseBodyValidators = [
  body('expenseDate')
    .notEmpty()
    .isISO8601()
    .withMessage('expenseDate must be a valid date (YYYY-MM-DD)'),
  body('category')
    .notEmpty()
    .isIn(ExpenseModel.ALLOWED_CATEGORIES)
    .withMessage(`category must be one of: ${ExpenseModel.ALLOWED_CATEGORIES.join(', ')}`),
  body('description').optional().isString(),
  body('amount')
    .notEmpty()
    .isFloat({ min: 0 })
    .withMessage('amount must be a non-negative number'),
];

const expenseUpdateValidators = [
  body('expenseDate').optional().isISO8601().withMessage('expenseDate must be a valid date (YYYY-MM-DD)'),
  body('category').optional().isIn(ExpenseModel.ALLOWED_CATEGORIES)
    .withMessage(`category must be one of: ${ExpenseModel.ALLOWED_CATEGORIES.join(', ')}`),
  body('description').optional().isString(),
  body('amount').optional().isFloat({ min: 0 }).withMessage('amount must be a non-negative number'),
];

// -------------------------------------------------------
// GET /api/expenses/dashboard
// -------------------------------------------------------
router.get('/dashboard', getDashboard);

// -------------------------------------------------------
// GET /api/expenses
// -------------------------------------------------------
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isIn(ExpenseModel.ALLOWED_CATEGORIES),
    query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('month must be YYYY-MM'),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  handleValidation,
  listExpenses
);

// -------------------------------------------------------
// GET /api/expenses/:id
// -------------------------------------------------------
router.get('/:id', idParam, handleValidation, getExpense);

// -------------------------------------------------------
// POST /api/expenses
// -------------------------------------------------------
router.post('/', expenseBodyValidators, handleValidation, createExpense);

// -------------------------------------------------------
// PATCH /api/expenses/:id
// -------------------------------------------------------
router.patch('/:id', [...idParam, ...expenseUpdateValidators], handleValidation, updateExpense);

// -------------------------------------------------------
// DELETE /api/expenses/:id
// -------------------------------------------------------
router.delete('/:id', idParam, handleValidation, deleteExpense);

module.exports = router;
