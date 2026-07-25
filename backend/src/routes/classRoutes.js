const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const { listClasses, createClass, deleteClass } = require('../controllers/classController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

router.use(authenticate);

/**
 * GET /api/classes
 * All authenticated roles can view the class list.
 */
router.get('/', listClasses);

/**
 * POST /api/classes
 * Owner, Admin only.
 */
router.post(
  '/',
  authorize('owner', 'admin'),
  [body('name').trim().notEmpty().withMessage('Class name is required')],
  handleValidation,
  createClass
);

/**
 * DELETE /api/classes/:id
 * Owner, Admin only.
 */
router.delete(
  '/:id',
  authorize('owner', 'admin'),
  [param('id').isUUID().withMessage('Invalid class id')],
  handleValidation,
  deleteClass
);

module.exports = router;
