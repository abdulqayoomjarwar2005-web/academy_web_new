const express = require('express');
const { query } = require('express-validator');
const router = express.Router();

const {
  getDashboard,
  getMonthlyReport,
  getYearlyReport,
  getAvailableYears,
} = require('../controllers/boardProfitLossController');

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const handleValidation = require('../middleware/validate');

router.use(authenticate);
router.use(authorize('owner', 'admin'));

router.get('/dashboard', getDashboard);
router.get('/years', getAvailableYears);
router.get('/monthly', [query('year').optional().matches(/^\d{4}$/)], handleValidation, getMonthlyReport);
router.get('/yearly', getYearlyReport);

module.exports = router;
