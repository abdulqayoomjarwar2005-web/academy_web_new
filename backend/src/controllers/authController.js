// auditController.js — Phase 12 (Audit Log System)

const auditModel = require('../models/auditModel');

// GET /api/audit
// Query params: page, limit, category, action, userId, dateFrom, dateTo, search
// Access: owner + admin only (enforced in route)
exports.getLogs = async (req, res) => {
  try {
    const {
      page     = 1,
      limit    = 50,
      category = '',
      action   = '',
      userId   = '',
      dateFrom = '',
      dateTo   = '',
      search   = '',
    } = req.query;

    const result = await auditModel.getLogs({
      page:     parseInt(page,  10) || 1,
      limit:    Math.min(parseInt(limit, 10) || 50, 200),
      category: category  || null,
      action:   action    || null,
      userId:   userId    || null,
      dateFrom: dateFrom  || null,
      dateTo:   dateTo    || null,
      search:   search    || null,
    });

    res.json(result);
  } catch (err) {
    console.error('[AuditController] getLogs error:', err);
    res.status(500).json({ message: 'Failed to fetch audit logs.' });
  }
};

// GET /api/audit/summary
// Access: owner + admin only
exports.getSummary = async (req, res) => {
  try {
    const summary = await auditModel.getSummary();
    res.json(summary);
  } catch (err) {
    console.error('[AuditController] getSummary error:', err);
    res.status(500).json({ message: 'Failed to fetch audit summary.' });
  }
};

// GET /api/audit/filters
// Returns available categories and actions for filter dropdowns
// Access: owner + admin only
exports.getFilters = async (req, res) => {
  try {
    const { category = '' } = req.query;
    const categories = await auditModel.getCategories();
    const actions    = await auditModel.getActions(category || null);
    res.json({ categories, actions });
  } catch (err) {
    console.error('[AuditController] getFilters error:', err);
    res.status(500).json({ message: 'Failed to fetch filter options.' });
  }
};
