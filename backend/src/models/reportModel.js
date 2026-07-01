const pool = require('../config/db');

const ReportModel = {
  // -------------------------------------------------------
  // DAILY REPORT
  // -------------------------------------------------------

  async getDailyReport(date) {
    const summaryResult = await pool.query(
      `SELECT
         COUNT(*)                                AS total_students,
         COUNT(*) FILTER (WHERE status = 'present') AS present_count,
         COUNT(*) FILTER (WHERE status = 'absent')  AS absent_count,
         COUNT(*) FILTER (WHERE status = 'leave')   AS leave_count,
         ROUND(
           COUNT(*) FILTER (WHERE status = 'present')::NUMERIC
           / NULLIF(COUNT(*), 0) * 100,
           2
         ) AS attendance_percentage,
         BOOL_AND(is_locked) AS is_locked
       FROM attendance
       WHERE attendance_date = $1`,
      [date]
    );

    const summary = summaryResult.rows[0];

    const detailResult = await pool.query(
      `SELECT
         a.id             AS attendance_id,
         a.status,
         a.is_locked,
         a.submitted_at,
         s.id             AS student_id,
         s.student_id     AS student_code,
         s.student_name,
         s.class,
         s.batch,
         u.full_name      AS marked_by
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN users    u ON u.id = a.teacher_id
       WHERE a.attendance_date = $1
       ORDER BY s.class, s.student_name`,
      [date]
    );

    const rows = detailResult.rows;

    return {
      date,
      summary: {
        totalStudents:        parseInt(summary.total_students   || 0, 10),
        presentCount:         parseInt(summary.present_count    || 0, 10),
        absentCount:          parseInt(summary.absent_count     || 0, 10),
        leaveCount:           parseInt(summary.leave_count      || 0, 10),
        attendancePercentage: parseFloat(summary.attendance_percentage || 0),
        isLocked:             summary.is_locked,
      },
      present: rows.filter((r) => r.status === 'present'),
      absent:  rows.filter((r) => r.status === 'absent'),
      leave:   rows.filter((r) => r.status === 'leave'),
    };
  },

  async getAvailableDates(limit = 90) {
    const result = await pool.query(
      `SELECT DISTINCT attendance_date
       FROM attendance
       WHERE is_locked = TRUE
       ORDER BY attendance_date DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((r) => r.attendance_date);
  },

  // -------------------------------------------------------
  // MONTHLY REPORT
  // -------------------------------------------------------

  async getMonthlyReport({ month, className, page = 1, limit = 50 }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (month) {
      conditions.push(`TO_CHAR(a.attendance_date, 'YYYY-MM') = $${idx}`);
      params.push(month);
      idx++;
    }
    if (className) {
      conditions.push(`s.class ILIKE $${idx}`);
      params.push(`%${className}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const safeLimit  = Math.min(Math.max(parseInt(limit,  10) || 50, 1), 200);
    const safePage   = Math.max(parseInt(page, 10) || 1, 1);
    const offset     = (safePage - 1) * safeLimit;

    const totalsResult = await pool.query(
      `SELECT
         COUNT(DISTINCT s.id)                          AS total_students,
         COUNT(*)                                      AS total_days_entries,
         COUNT(*) FILTER (WHERE a.status = 'present') AS total_present,
         COUNT(*) FILTER (WHERE a.status = 'absent')  AS total_absent,
         COUNT(*) FILTER (WHERE a.status = 'leave')   AS total_leave,
         ROUND(
           COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC
           / NULLIF(COUNT(*), 0) * 100,
           2
         ) AS overall_attendance_percentage
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       ${where}`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM (
         SELECT s.id
         FROM attendance a
         JOIN students s ON s.id = a.student_id
         ${where}
         GROUP BY s.id
       ) sub`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT
         s.id             AS student_id,
         s.student_id     AS student_code,
         s.student_name,
         s.class,
         s.batch,
         COUNT(*)                                     AS total_days,
         COUNT(*) FILTER (WHERE a.status = 'present') AS total_present,
         COUNT(*) FILTER (WHERE a.status = 'absent')  AS total_absent,
         COUNT(*) FILTER (WHERE a.status = 'leave')   AS total_leave,
         ROUND(
           COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC
           / NULLIF(COUNT(*), 0) * 100,
           2
         ) AS attendance_percentage
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       ${where}
       GROUP BY s.id, s.student_id, s.student_name, s.class, s.batch
       ORDER BY s.class, s.student_name
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, safeLimit, offset]
    );

    const totals = totalsResult.rows[0];

    return {
      month: month || null,
      totals: {
        totalStudents:               parseInt(totals.total_students              || 0, 10),
        totalPresent:                parseInt(totals.total_present               || 0, 10),
        totalAbsent:                 parseInt(totals.total_absent                || 0, 10),
        totalLeave:                  parseInt(totals.total_leave                 || 0, 10),
        overallAttendancePercentage: parseFloat(totals.overall_attendance_percentage || 0),
      },
      students: dataResult.rows.map((r) => ({
        ...r,
        total_days:            parseInt(r.total_days,    10),
        total_present:         parseInt(r.total_present, 10),
        total_absent:          parseInt(r.total_absent,  10),
        total_leave:           parseInt(r.total_leave,   10),
        attendance_percentage: parseFloat(r.attendance_percentage || 0),
      })),
      pagination: {
        total,
        page:       safePage,
        limit:      safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  },

  async getAvailableMonths() {
    const result = await pool.query(
      `SELECT DISTINCT TO_CHAR(attendance_date, 'YYYY-MM') AS month_label
       FROM attendance
       WHERE is_locked = TRUE
       ORDER BY month_label DESC`
    );
    return result.rows.map((r) => r.month_label);
  },
};

module.exports = ReportModel;
