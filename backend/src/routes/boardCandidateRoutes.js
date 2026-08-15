const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  getDashboard,
  listCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate,
} = require('../controllers/boardCandidateController');

const BoardCandidateModel = require('../models/boardCandidateModel');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

router.use(authenticate);
router.use(authorize('owner', 'admin'));

const idParam = [param('id').isUUID().withMessage('Invalid candidate id')];

const candidateBodyValidators = [
  body('candidateName').trim().notEmpty().withMessage('candidateName is required'),
  body('fatherName').trim().notEmpty().withMessage('fatherName is required'),
  body('contactNumber').optional().isString(),
  body('batchId').isUUID().withMessage('A valid batchId is required'),
  body('enrollmentDate').notEmpty().isISO8601().withMessage('enrollmentDate must be a valid date (YYYY-MM-DD)'),
];

const candidateUpdateValidators = [
  body('candidateName').optional().trim().notEmpty(),
  body('fatherName').optional().trim().notEmpty(),
  body('contactNumber').optional().isString(),
  body('batchId').optional().isUUID(),
  body('enrollmentDate').optional().isISO8601(),
  body('status').optional().isIn(BoardCandidateModel.ALLOWED_STATUSES),
];

router.get('/dashboard', getDashboard);

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(BoardCandidateModel.ALLOWED_STATUSES),
    query('batchId').optional().isUUID(),
  ],
  handleValidation,
  listCandidates
);

router.get('/:id', idParam, handleValidation, getCandidate);

router.post('/', candidateBodyValidators, handleValidation, createCandidate);

router.patch('/:id', [...idParam, ...candidateUpdateValidators], handleValidation, updateCandidate);

router.delete('/:id', idParam, handleValidation, deleteCandidate);

module.exports = router;
