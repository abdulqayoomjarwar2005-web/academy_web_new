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
} = require('../controllers/boardExpenseController');

const BoardExpenseModel = require('../models/boardExpenseModel');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

router.use(authenticate);
router.use(authorize('owner', 'admin'));

const idParam = [param('id').isUUID().withMessage('Invalid expense id')];

const expenseBodyValidators = [
  body('expenseDate').notEmpty().isISO8601().withMessage('expenseDate must be a valid date (YYYY-MM-DD)'),
  body('category').notEmpty().isIn(BoardExpenseModel.ALLOWED_CATEGORIES)
    .withMessage(`category must be one of: ${BoardExpenseModel.ALLOWED_CATEGORIES.join(', ')}`),
  body('description').optional().isString(),
  body('amount').notEmpty().isFloat({ min: 0 }).withMessage('amount must be a non-negative number'),
];

const expenseUpdateValidators = [
  body('expenseDate').optional().isISO8601(),
  body('category').optional().isIn(BoardExpenseModel.ALLOWED_CATEGORIES),
  body('description').optional().isString(),
  body('amount').optional().isFloat({ min: 0 }),
];

router.get('/dashboard', getDashboard);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isIn(BoardExpenseModel.ALLOWED_CATEGORIES),
    query('month').optional().matches(/^\d{4}-\d{2}$/),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  handleValidation,
  listExpenses
);

router.get('/:id', idParam, handleValidation, getExpense);

router.post('/', expenseBodyValidators, handleValidation, createExpense);

router.patch('/:id', [...idParam, ...expenseUpdateValidators], handleValidation, updateExpense);

router.delete('/:id', idParam, handleValidation, deleteExpense);

module.exports = router;
