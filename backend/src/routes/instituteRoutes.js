const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const {
  listInstitutes,
  getInstitute,
  createInstitute,
  updateInstitute,
  deleteInstitute,
} = require('../controllers/instituteController');

const InstituteModel = require('../models/instituteModel');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

router.use(authenticate);

const idParam = [param('id').isUUID().withMessage('Invalid institute id')];

// Read access: owner, admin, and teacher (teachers need this list when adding students)
router.get(
  '/',
  authorize('owner', 'admin', 'teacher'),
  [query('status').optional().isIn(InstituteModel.ALLOWED_STATUSES)],
  handleValidation,
  listInstitutes
);
router.get('/:id', authorize('owner', 'admin', 'teacher'), idParam, handleValidation, getInstitute);

// Manage access: owner, admin only
router.post(
  '/',
  authorize('owner', 'admin'),
  [body('name').trim().notEmpty().withMessage('name is required')],
  handleValidation,
  createInstitute
);

router.patch(
  '/:id',
  authorize('owner', 'admin'),
  [
    ...idParam,
    body('name').optional().trim().notEmpty(),
    body('status').optional().isIn(InstituteModel.ALLOWED_STATUSES),
  ],
  handleValidation,
  updateInstitute
);

router.delete('/:id', authorize('owner', 'admin'), idParam, handleValidation, deleteInstitute);

module.exports = router;
