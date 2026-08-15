// app.js — Phase 13 (Notifications)
//
// Changes from Phase 12:
//   1. Import notificationRoutes and mount at /api/notifications
//   2. Call notificationModel.createTable() on startup
//
// ── Diff from Phase 12 ─────────────────────────────────────────────────────
//
//   ADDED (imports):
//     const notificationRoutes = require('./routes/notificationRoutes');
//     const notificationModel  = require('./models/notificationModel');
//
//   ADDED (after app creation, before routes):
//     notificationModel.createTable();
//
//   ADDED (routes):
//     app.use('/api/notifications', notificationRoutes);
//
// ── Full updated app.js ─────────────────────────────────────────────────────

const express = require('express');
const cors    = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes          = require('./routes/authRoutes');
const dashboardRoutes     = require('./routes/dashboardRoutes');
const studentRoutes       = require('./routes/studentRoutes');
const teacherRoutes       = require('./routes/teacherRoutes');
const attendanceRoutes    = require('./routes/attendanceRoutes'); // Phase 4
const reportRoutes        = require('./routes/reportRoutes');     // Phase 5
const feeRoutes           = require('./routes/feeRoutes');        // Phase 6
const defaulterRoutes     = require('./routes/defaulterRoutes');  // Phase 7
const expenseRoutes       = require('./routes/expenseRoutes');    // Phase 8
const profitLossRoutes    = require('./routes/profitLossRoutes'); // Phase 9
const exportRoutes        = require('./routes/exportRoutes');     // Phase 11
const auditRoutes         = require('./routes/auditRoutes');      // Phase 12
const notificationRoutes  = require('./routes/notificationRoutes'); // Phase 13
const classRoutes         = require('./routes/classRoutes');        // Classes
const userRoutes          = require('./routes/userRoutes');          // Admin management
const boardBatchRoutes      = require('./routes/boardBatchRoutes');      // Board/DIT Exams
const boardCandidateRoutes  = require('./routes/boardCandidateRoutes');  // Board/DIT Exams
const boardFeeRoutes        = require('./routes/boardFeeRoutes');        // Board/DIT Exams
const boardExpenseRoutes    = require('./routes/boardExpenseRoutes');    // Board/DIT Exams
const boardProfitLossRoutes = require('./routes/boardProfitLossRoutes'); // Board/DIT Exams

// ── Phase 12: ensure audit_logs table exists ─────────────────────────────────
const auditModel = require('./models/auditModel');
auditModel.createTable().catch((err) =>
  console.error('[Audit] createTable error:', err.message)
);

// ── Phase 13: ensure notifications table exists ──────────────────────────────
const notificationModel = require('./models/notificationModel');
notificationModel.createTable().catch((err) =>
  console.error('[Notifications] createTable error:', err.message)
);

// ── Classes: ensure classes table exists ──────────────────────────────────────
const classModel = require('./models/classModel');
classModel.createTable().catch((err) =>
  console.error('[Classes] createTable error:', err.message)
);

// ── Student deletion requests: ensure table exists ────────────────────────────
const studentDeletionModel = require('./models/studentDeletionModel');
studentDeletionModel.createTable().catch((err) =>
  console.error('[StudentDeletion] createTable error:', err.message)
);

// ── Fees: auto-generate current month's fee records on boot, then monthly ← NEW
const { startFeeScheduler } = require('./jobs/feeScheduler');
startFeeScheduler();

// ── Board/DIT Exams: ensure tables + isolated P&L views exist ────────────────
const boardBatchModel = require('./models/boardBatchModel');
const boardCandidateModel = require('./models/boardCandidateModel');
const boardFeeModel = require('./models/boardFeeModel');
const boardExpenseModel = require('./models/boardExpenseModel');
const boardProfitLossModel = require('./models/boardProfitLossModel');

(async () => {
  try {
    await boardBatchModel.createTable();
    await boardCandidateModel.createTable();
    await boardFeeModel.createTable();
    await boardExpenseModel.createTable();
    await boardProfitLossModel.createViews();
  } catch (err) {
    console.error('[Board/DIT] setup error:', err.message);
  }
})();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Nation Builders Institute of Learning Larkana API is running' });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api',                dashboardRoutes);
app.use('/api/students',       studentRoutes);
app.use('/api/teachers',       teacherRoutes);
app.use('/api/attendance',     attendanceRoutes); // Phase 4
app.use('/api/reports',        reportRoutes);     // Phase 5
app.use('/api/fees',           feeRoutes);        // Phase 6
app.use('/api/defaulters',     defaulterRoutes);  // Phase 7
app.use('/api/expenses',       expenseRoutes);    // Phase 8
app.use('/api/profit-loss',    profitLossRoutes); // Phase 9
app.use('/api/exports',        exportRoutes);     // Phase 11
app.use('/api/audit',          auditRoutes);      // Phase 12
app.use('/api/notifications',  notificationRoutes); // Phase 13
app.use('/api/classes',         classRoutes);        // Classes
app.use('/api/users',           userRoutes);          // Admin management
app.use('/api/board/batches',       boardBatchRoutes);      // Board/DIT Exams
app.use('/api/board/candidates',    boardCandidateRoutes);  // Board/DIT Exams
app.use('/api/board/fees',          boardFeeRoutes);        // Board/DIT Exams
app.use('/api/board/expenses',      boardExpenseRoutes);    // Board/DIT Exams
app.use('/api/board/profit-loss',   boardProfitLossRoutes); // Board/DIT Exams ← NEW

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
