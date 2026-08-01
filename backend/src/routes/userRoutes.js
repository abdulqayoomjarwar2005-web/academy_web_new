const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  listAdmins,
  createAdmin,
  activateAdmin,
  deactivateAdmin,
  resetAdminPassword,
} = require('../controllers/userController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

// Everything here is owner-only: creating/managing admin accounts is
// intentionally restricted to the owner so admins can't grant themselves
// or each other more access.
router.use(authenticate, authorize('owner'));

router.get('/admins', listAdmins);

router.post(
  '/admins',
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  ],
  handleValidation,
  createAdmin
);

router.patch('/admins/:id/activate', activateAdmin);
router.patch('/admins/:id/deactivate', deactivateAdmin);

router.patch(
  '/admins/:id/reset-password',
  [body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')],
  handleValidation,
  resetAdminPassword
);

module.exports = router;
