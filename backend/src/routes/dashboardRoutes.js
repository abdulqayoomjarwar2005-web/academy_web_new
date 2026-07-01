const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getDashboardStats } = require('../controllers/dashboardController');

/**
 * GET /api/dashboard
 * Returns role-specific dashboard info. Accessible to all authenticated roles.
 */
router.get('/dashboard', authenticate, (req, res) => {
  const { id, email, role } = req.user;

  const dashboards = {
    owner: {
      title: 'Owner Dashboard',
      widgets: ['All Branches Overview', 'Student Management', 'Revenue Reports', 'Staff Management', 'Expense Management', 'Profit & Loss', 'System Settings'],
    },
    admin: {
      title: 'Admin Dashboard',
      widgets: ['Student Management', 'Teacher Management', 'Attendance', 'Fee Management', 'Expense Management', 'Profit & Loss'],
    },
    teacher: {
      title: 'Teacher Dashboard',
      widgets: ['Student Management', 'My Classes', 'Attendance', 'Assignments', 'Student Performance'],
    },
  };

  return res.status(200).json({
    user: { id, email, role },
    dashboard: dashboards[role] || { title: 'Dashboard', widgets: [] },
  });
});

/**
 * GET /api/dashboard/stats
 * Returns role-specific dashboard statistics (Phase 10):
 *  - Owner: total students, teachers, collection, expenses, profit, attendance summary
 *  - Admin: students, teachers, collection, expenses, pending attendance requests
 *  - Teacher: students, today's attendance, present/absent counts, fee defaulters
 */
router.get('/dashboard/stats', authenticate, getDashboardStats);

/**
 * GET /api/owner/settings
 * Example route restricted to owner only.
 */
router.get('/owner/settings', authenticate, authorize('owner'), (req, res) => {
  return res.status(200).json({ message: 'Owner-only settings data' });
});

/**
 * GET /api/admin/users
 * Example route restricted to owner and admin.
 */
router.get('/admin/users', authenticate, authorize('owner', 'admin'), (req, res) => {
  return res.status(200).json({ message: 'Admin/Owner user management data' });
});

/**
 * GET /api/teacher/classes
 * Example route restricted to teacher (and owner/admin for oversight).
 */
router.get('/teacher/classes', authenticate, authorize('owner', 'admin', 'teacher'), (req, res) => {
  return res.status(200).json({ message: 'Teacher classes data' });
});

module.exports = router;
