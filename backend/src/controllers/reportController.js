const ReportModel = require('../models/reportModel');

// -------------------------------------------------------
// DAILY REPORT
// -------------------------------------------------------

/**
 * GET /api/reports/daily?date=YYYY-MM-DD
 * Returns present / absent / leave student lists + summary for one day.
 * Allowed: teacher, admin, owner
 */
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'date query parameter is required (YYYY-MM-DD)' });
    }

    const report = await ReportModel.getDailyReport(date);
    return res.status(200).json(report);
  } catch (err) {
    console.error('Get daily report error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/reports/available-dates
 * Returns an array of dates (YYYY-MM-DD) that have locked attendance records.
 * Allowed: teacher, admin, owner
 */
const getAvailableDates = async (req, res) => {
  try {
    const dates = await ReportModel.getAvailableDates();
    return res.status(200).json({ dates });
  } catch (err) {
    console.error('Get available dates error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// MONTHLY REPORT
// -------------------------------------------------------

/**
 * GET /api/reports/monthly?month=YYYY-MM&className=&section=&page=1&limit=50
 * Returns per-student monthly statistics + aggregate totals.
 * Allowed: admin, owner
 */
const getMonthlyReport = async (req, res) => {
  try {
    const { month, className, section, page, limit } = req.query;

    const report = await ReportModel.getMonthlyReport({
      month,
      className,
      section,
      page,
      limit,
    });

    return res.status(200).json(report);
  } catch (err) {
    console.error('Get monthly report error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/reports/available-months
 * Returns an array of 'YYYY-MM' strings with attendance records.
 * Allowed: admin, owner
 */
const getAvailableMonths = async (req, res) => {
  try {
    const months = await ReportModel.getAvailableMonths();
    return res.status(200).json({ months });
  } catch (err) {
    console.error('Get available months error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDailyReport,
  getAvailableDates,
  getMonthlyReport,
  getAvailableMonths,
};
