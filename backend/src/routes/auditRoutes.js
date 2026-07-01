// auditRoutes.js — Phase 12 (Audit Log System)
//
// All routes are restricted to owner and admin roles.
// Teachers have NO access to audit logs.

const express      = require('express');
const router       = express.Router();
const controller   = require('../controllers/auditController');
const authenticate = require('../middleware/authenticate');
const authorize    = require('../middleware/authorize');

// GET /api/audit              — paginated log list with filters
router.get('/',        authenticate, authorize('owner', 'admin'), controller.getLogs);

// GET /api/audit/summary      — stats for the dashboard card
router.get('/summary', authenticate, authorize('owner', 'admin'), controller.getSummary);

// GET /api/audit/filters      — available categories & actions for dropdowns
router.get('/filters', authenticate, authorize('owner', 'admin'), controller.getFilters);

module.exports = router;
