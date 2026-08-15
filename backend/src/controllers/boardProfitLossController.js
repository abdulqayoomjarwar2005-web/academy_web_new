const BoardProfitLossModel = require('../models/boardProfitLossModel');

const getDashboard = async (req, res) => {
  try {
    const dashboard = await BoardProfitLossModel.getDashboard();
    return res.status(200).json({ dashboard });
  } catch (err) {
    console.error('Board P&L dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const { year } = req.query;
    const report = await BoardProfitLossModel.getMonthlyReport(year);
    return res.status(200).json({ report });
  } catch (err) {
    console.error('Board P&L monthly report error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getYearlyReport = async (req, res) => {
  try {
    const report = await BoardProfitLossModel.getYearlyReport();
    return res.status(200).json({ report });
  } catch (err) {
    console.error('Board P&L yearly report error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAvailableYears = async (req, res) => {
  try {
    const years = await BoardProfitLossModel.getAvailableYears();
    return res.status(200).json({ years });
  } catch (err) {
    console.error('Board P&L available years error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getDashboard, getMonthlyReport, getYearlyReport, getAvailableYears };
