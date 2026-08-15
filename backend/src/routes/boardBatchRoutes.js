const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  listBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
} = require('../controllers/boardBatchController');

const BoardBatchModel = require('../models/boardBatchModel');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

// Board/DIT area: Owner and Admin only.
router.use(authenticate);
router.use(authorize('owner', 'admin'));

const idParam = [param('id').isUUID().withMessage('Invalid batch id')];

router.get(
  '/',
  [query('status').optional().isIn(BoardBatchModel.ALLOWED_STATUSES)],
  handleValidation,
  listBatches
);

router.get('/:id', idParam, handleValidation, getBatch);

router.post(
  '/',
  [body('batchName').trim().notEmpty().withMessage('batchName is required')],
  handleValidation,
  createBatch
);

router.patch(
  '/:id',
  [
    ...idParam,
    body('batchName').optional().trim().notEmpty(),
    body('status').optional().isIn(BoardBatchModel.ALLOWED_STATUSES),
  ],
  handleValidation,
  updateBatch
);

router.delete('/:id', idParam, handleValidation, deleteBatch);

module.exports = router;
