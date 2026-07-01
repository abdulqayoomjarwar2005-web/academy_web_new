const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  login,
  logout,
  refresh,
  getProfile,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/authController');

const authenticate = require('../middleware/authenticate');
const handleValidation = require('../middleware/validate');

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidation,
  login
);

router.post('/logout', logout);

router.post('/refresh', refresh);

router.get('/me', authenticate, getProfile);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required')],
  handleValidation,
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
  ],
  handleValidation,
  resetPassword
);

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long'),
  ],
  handleValidation,
  changePassword
);

module.exports = router;
