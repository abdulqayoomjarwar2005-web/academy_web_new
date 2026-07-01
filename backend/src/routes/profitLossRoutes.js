const express = require('express');
const { query } = require('express-validator');
const router = express.Router();

const {
  getDashboard,
  getMonthlyReport,
  getYearlyReport,
  getComparison,
  getAvailableYears,
} = require('../controllers/profitLossController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

// All Profit & Loss routes require authentication.
// Owner: full access. Admin: view access. Teacher: no access at all.
router.use(authenticate);
router.use(authorize('owner', 'admin'));

// -------------------------------------------------------
// GET /api/profit-loss/dashboard
// -------------------------------------------------------
router.get('/dashboard', getDashboard);

// -------------------------------------------------------
// GET /api/profit-loss/monthly?year=YYYY
// -------------------------------------------------------
router.get(
  '/monthly',
  [query('year').optional().matches(/^\d{4}$/).withMessage('year must be a 4-digit year')],
  handleValidation,
  getMonthlyReport
);

// -------------------------------------------------------
// GET /api/profit-loss/yearly
// -------------------------------------------------------
router.get('/yearly', getYearlyReport);

// -------------------------------------------------------
// GET /api/profit-loss/comparison
// -------------------------------------------------------
router.get('/comparison', getComparison);

// -------------------------------------------------------
// GET /api/profit-loss/years
// -------------------------------------------------------
router.get('/years', getAvailableYears);

module.exports = router;
