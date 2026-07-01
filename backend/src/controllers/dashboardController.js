const StudentModel = require('../models/studentModel');
const TeacherModel = require('../models/teacherModel');
const AttendanceModel = require('../models/attendanceModel');
const DefaulterModel = require('../models/defaulterModel');
const ProfitLossModel = require('../models/profitLossModel');

const todayDate = () => new Date().toISOString().slice(0, 10);

const toInt = (v) => parseInt(v || 0, 10);

const emptyDaySummary = (date) => ({
  date,
  total: 0,
  present: 0,
  absent: 0,
  leave: 0,
  isLocked: false,
});

const formatDaySummary = (date, row) => {
  if (!row || row.total === null || row.total === undefined) {
    return emptyDaySummary(date);
  }
  return {
    date,
    total: toInt(row.total),
    present: toInt(row.present),
    absent: toInt(row.absent),
    leave: toInt(row.leave),
    isLocked: !!row.is_locked,
  };
};

// -------------------------------------------------------
// GET /api/dashboard/stats
// Returns role-specific dashboard statistics.
// -------------------------------------------------------
const getDashboardStats = async (req, res) => {
  try {
    const { role } = req.user;
    const date = todayDate();

    if (role === 'owner') {
      const [totalStudents, totalTeachers, pnl, daySummaryRow] = await Promise.all([
        StudentModel.countActive(),
        TeacherModel.countActive(),
        ProfitLossModel.getDashboard(),
        AttendanceModel.getDaySummary(date),
      ]);

      return res.status(200).json({
        stats: {
          totalStudents,
          totalTeachers,
          totalCollection: pnl.allTime.totalCollection,
          totalExpenses: pnl.allTime.totalExpenses,
          profit: pnl.allTime.profit,
          attendanceSummary: formatDaySummary(date, daySummaryRow),
        },
      });
    }

    if (role === 'admin') {
      const [students, teachers, pnl, attendanceRequests] = await Promise.all([
        StudentModel.countActive(),
        TeacherModel.countActive(),
        ProfitLossModel.getDashboard(),
        AttendanceModel.countPendingEditRequests(),
      ]);

      return res.status(200).json({
        stats: {
          students,
          teachers,
          collection: pnl.allTime.totalCollection,
          expenses: pnl.allTime.totalExpenses,
          attendanceRequests,
        },
      });
    }

    if (role === 'teacher') {
      const [students, daySummaryRow, defaulterStats] = await Promise.all([
        StudentModel.countActive(),
        AttendanceModel.getDaySummary(date),
        DefaulterModel.getSummaryStats(),
      ]);

      const todaysAttendance = formatDaySummary(date, daySummaryRow);

      return res.status(200).json({
        stats: {
          students,
          todaysAttendance,
          presentCount: todaysAttendance.present,
          absentCount: todaysAttendance.absent,
          feeDefaulters: defaulterStats.totalDefaulters,
        },
      });
    }

    return res.status(200).json({ stats: {} });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDashboardStats,
};
