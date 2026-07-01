const ProfitLossModel = require('../models/profitLossModel');

// -------------------------------------------------------
// GET /api/profit-loss/dashboard
// Analytics dashboard: current month/year/all-time totals
// plus a 12-month trend series for charts.
// -------------------------------------------------------
const getDashboard = async (req, res) => {
  try {
    const dashboard = await ProfitLossModel.getDashboard();
    return res.status(200).json({ dashboard });
  } catch (err) {
    console.error('Profit & Loss dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/profit-loss/monthly?year=YYYY
// Monthly Profit/Loss report for a given year (defaults to
// the current year).
// -------------------------------------------------------
const getMonthlyReport = async (req, res) => {
  try {
    const { year } = req.query;
    const report = await ProfitLossModel.getMonthlyReport(year);
    return res.status(200).json({ report });
  } catch (err) {
    console.error('Monthly P&L report error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/profit-loss/yearly
// Yearly Profit/Loss report across all years with activity.
// -------------------------------------------------------
const getYearlyReport = async (req, res) => {
  try {
    const report = await ProfitLossModel.getYearlyReport();
    return res.status(200).json({ report });
  } catch (err) {
    console.error('Yearly P&L report error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/profit-loss/comparison
// Collection Comparison and Expense Comparison: current
// month vs previous month, current year vs previous year.
// -------------------------------------------------------
const getComparison = async (req, res) => {
  try {
    const comparison = await ProfitLossModel.getComparison();
    return res.status(200).json({ comparison });
  } catch (err) {
    console.error('P&L comparison error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/profit-loss/years
// List of years available for the report year selector.
// -------------------------------------------------------
const getAvailableYears = async (req, res) => {
  try {
    const years = await ProfitLossModel.getAvailableYears();
    return res.status(200).json({ years });
  } catch (err) {
    console.error('Available years error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDashboard,
  getMonthlyReport,
  getYearlyReport,
  getComparison,
  getAvailableYears,
};
