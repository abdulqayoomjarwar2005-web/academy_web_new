const DefaulterModel = require('../models/defaulterModel');

// -------------------------------------------------------
// GET /api/defaulters
// List all defaulters with filters & pagination
// -------------------------------------------------------
const listDefaulters = async (req, res) => {
  try {
    const {
      class: className,
      batch,
      month,
      search,
      sortBy,
      sortDir,
      page,
      limit,
    } = req.query;

    const result = await DefaulterModel.listDefaulters({
      class: className,
      batch,
      month,
      search,
      sortBy,
      sortDir,
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('List defaulters error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/defaulters/stats
// Summary KPI cards (with optional filters)
// -------------------------------------------------------
const getStats = async (req, res) => {
  try {
    const { class: className, batch, month } = req.query;

    const stats = await DefaulterModel.getSummaryStats({
      class: className,
      batch,
      month,
    });

    return res.status(200).json({ stats });
  } catch (err) {
    console.error('Defaulter stats error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/defaulters/filter-options
// Distinct classes & batches that have defaulters
// -------------------------------------------------------
const getFilterOptions = async (req, res) => {
  try {
    const options = await DefaulterModel.getFilterOptions();
    return res.status(200).json(options);
  } catch (err) {
    console.error('Filter options error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { listDefaulters, getStats, getFilterOptions };
