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
const notificationRoutes  = require('./routes/notificationRoutes'); // Phase 13 ← NEW

// ── Phase 12: ensure audit_logs table exists ─────────────────────────────────
const auditModel = require('./models/auditModel');
auditModel.createTable();

// ── Phase 13: ensure notifications table exists ──────────────────────────────
const notificationModel = require('./models/notificationModel');
notificationModel.createTable().catch((err) =>
  console.error('[Notifications] createTable error:', err.message)
);

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow any vercel.app subdomain
      if (/\.vercel\.app$/.test(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
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
app.use('/api/notifications',  notificationRoutes); // Phase 13 ← NEW

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
