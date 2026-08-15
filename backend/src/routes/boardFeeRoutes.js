const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  getDashboard,
  listFees,
  getFee,
  listForCandidate,
  setFeeItem,
  markPaid,
  markPartial,
  markUnpaid,
} = require('../controllers/boardFeeController');

const BoardFeeModel = require('../models/boardFeeModel');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

router.use(authenticate);
router.use(authorize('owner', 'admin'));

const idParam = [param('id').isUUID().withMessage('Invalid fee id')];

router.get('/dashboard', getDashboard);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('feeType').optional().isIn(BoardFeeModel.ALLOWED_FEE_TYPES),
    query('status').optional().isIn(BoardFeeModel.ALLOWED_STATUSES),
    query('candidateId').optional().isUUID(),
    query('batchId').optional().isUUID(),
  ],
  handleValidation,
  listFees
);

router.get('/candidate/:candidateId', [param('candidateId').isUUID()], handleValidation, listForCandidate);

router.get('/:id', idParam, handleValidation, getFee);

// Create/update the billed amount for a candidate + fee type (Enrollment, Exam I, Exam II, Project, Other)
router.post(
  '/item',
  [
    body('candidateId').isUUID().withMessage('A valid candidateId is required'),
    body('feeType').isIn(BoardFeeModel.ALLOWED_FEE_TYPES).withMessage(`feeType must be one of: ${BoardFeeModel.ALLOWED_FEE_TYPES.join(', ')}`),
    body('amount').isFloat({ min: 0 }).withMessage('amount must be a non-negative number'),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('notes').optional().isString(),
  ],
  handleValidation,
  setFeeItem
);

router.patch('/:id/mark-paid', [...idParam, body('amountPaid').optional().isFloat({ min: 0 })], handleValidation, markPaid);
router.patch('/:id/mark-partial', [...idParam, body('amountPaid').isFloat({ min: 0 })], handleValidation, markPartial);
router.patch('/:id/mark-unpaid', idParam, handleValidation, markUnpaid);

module.exports = router;
