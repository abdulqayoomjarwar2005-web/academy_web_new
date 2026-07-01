const pool = require('../config/db');

const ALLOWED_STATUSES = ['present', 'absent', 'leave'];
const ALLOWED_REQUEST_STATUSES = ['pending', 'approved', 'rejected'];

const AttendanceModel = {
  ALLOWED_STATUSES,
  ALLOWED_REQUEST_STATUSES,

  // -------------------------------------------------------
  // ATTENDANCE CORE
  // -------------------------------------------------------

  /**
   * Get all students for a given date, joined with existing attendance if any.
   * Used by teachers to load the "mark attendance" form.
   */
  async getStudentsForDate(date) {
    const result = await pool.query(
      `SELECT
         s.id            AS student_id,
         s.student_id    AS student_code,
         s.student_name,
         s.class,
         
         a.id            AS attendance_id,
         a.status        AS attendance_status,
         a.is_locked,
         a.submitted_at
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id = s.id AND a.attendance_date = $1
       WHERE s.status = 'active'
       ORDER BY s.class, s.student_name`,
      [date]
    );
    return result.rows;
  },

  /**
   * Check whether attendance for a given date is already submitted/locked
   * (any locked record for that date means the session is locked).
   */
  async isDateLocked(date) {
    const result = await pool.query(
      `SELECT COUNT(*) AS cnt FROM attendance WHERE attendance_date = $1 AND is_locked = TRUE`,
      [date]
    );
    return parseInt(result.rows[0].cnt, 10) > 0;
  },

  /**
   * Upsert a single attendance record (used before submission).
   * Only allowed if not locked.
   */
  async upsertOne(studentId, teacherId, date, status) {
    const result = await pool.query(
      `INSERT INTO attendance (student_id, teacher_id, attendance_date, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, attendance_date)
       DO UPDATE SET
         status     = EXCLUDED.status,
         teacher_id = EXCLUDED.teacher_id,
         updated_at = NOW()
       WHERE attendance.is_locked = FALSE
       RETURNING *`,
      [studentId, teacherId, date, status]
    );
    return result.rows[0] || null;
  },

  /**
   * Submit (lock) all attendance records for a date.
   * Sets is_locked = TRUE and submitted_at = NOW() for all records on that date.
   */
  async submitAndLock(date, teacherId) {
    const result = await pool.query(
      `UPDATE attendance
       SET is_locked    = TRUE,
           submitted_at = NOW(),
           teacher_id   = $2,
           updated_at   = NOW()
       WHERE attendance_date = $1 AND is_locked = FALSE
       RETURNING *`,
      [date, teacherId]
    );
    return result.rows;
  },

  /**
   * Bulk save + lock in one transaction.
   * Takes an array of { studentId, status } objects.
   */
  async bulkSaveAndSubmit(entries, teacherId, date) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const { studentId, status } of entries) {
        await client.query(
          `INSERT INTO attendance (student_id, teacher_id, attendance_date, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (student_id, attendance_date)
           DO UPDATE SET
             status     = EXCLUDED.status,
             teacher_id = EXCLUDED.teacher_id,
             updated_at = NOW()
           WHERE attendance.is_locked = FALSE`,
          [studentId, teacherId, date, status]
        );
      }

      // Lock all for this date
      await client.query(
        `UPDATE attendance
         SET is_locked    = TRUE,
             submitted_at = NOW(),
             updated_at   = NOW()
         WHERE attendance_date = $1 AND is_locked = FALSE`,
        [date]
      );

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Update a single attendance record (only allowed when admin approved an edit request).
   */
  async updateOne(attendanceId, status) {
    const result = await pool.query(
      `UPDATE attendance
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, attendanceId]
    );
    return result.rows[0] || null;
  },

  /**
   * Re-lock a record after an approved edit has been applied.
   */
  async relockOne(attendanceId) {
    await pool.query(
      `UPDATE attendance SET is_locked = TRUE, updated_at = NOW() WHERE id = $1`,
      [attendanceId]
    );
  },

  /**
   * Temporarily unlock a specific attendance record (when admin approves edit request).
   */
  async unlockOne(attendanceId) {
    await pool.query(
      `UPDATE attendance SET is_locked = FALSE, updated_at = NOW() WHERE id = $1`,
      [attendanceId]
    );
  },

  // -------------------------------------------------------
  // HISTORY / REPORTS
  // -------------------------------------------------------

  /**
   * Get attendance history with filters.
   * Supports: date, studentId, status, class, section, page, limit.
   */
  async getHistory({ date, studentId, status, className, section, page = 1, limit = 20 }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (date) {
      conditions.push(`a.attendance_date = $${idx}`);
      params.push(date);
      idx++;
    }
    if (studentId) {
      conditions.push(`a.student_id = $${idx}`);
      params.push(studentId);
      idx++;
    }
    if (status) {
      conditions.push(`a.status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (className) {
      conditions.push(`s.class ILIKE $${idx}`);
      params.push(`%${className}%`);
      idx++;
    }
    if (section) {
      conditions.push(`s.batch ILIKE $${idx}`);
      params.push(`%${section}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT
         a.id,
         a.attendance_date,
         a.status,
         a.is_locked,
         a.submitted_at,
         s.id         AS student_id,
         s.student_id AS student_code,
         s.student_name,
         s.class,
         
         u.full_name  AS marked_by
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       JOIN users u ON u.id = a.teacher_id
       ${where}
       ORDER BY a.attendance_date DESC, s.class, s.student_name
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, safeLimit, offset]
    );

    return {
      data: dataResult.rows,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  },

  /**
   * Summary stats for a given date:
   * total students, present, absent, leave counts.
   */
  async getDaySummary(date) {
    const result = await pool.query(
      `SELECT
         COUNT(*)                               AS total,
         COUNT(*) FILTER (WHERE status='present') AS present,
         COUNT(*) FILTER (WHERE status='absent')  AS absent,
         COUNT(*) FILTER (WHERE status='leave')   AS leave,
         BOOL_AND(is_locked)                    AS is_locked
       FROM attendance
       WHERE attendance_date = $1`,
      [date]
    );
    return result.rows[0];
  },

  /**
   * Student-level summary: how many days present/absent/leave in a date range.
   */
  async getStudentSummary(studentId, fromDate, toDate) {
    const result = await pool.query(
      `SELECT
         COUNT(*)                               AS total_days,
         COUNT(*) FILTER (WHERE status='present') AS present,
         COUNT(*) FILTER (WHERE status='absent')  AS absent,
         COUNT(*) FILTER (WHERE status='leave')   AS leave
       FROM attendance
       WHERE student_id = $1
         AND attendance_date BETWEEN $2 AND $3`,
      [studentId, fromDate, toDate]
    );
    return result.rows[0];
  },

  // -------------------------------------------------------
  // EDIT REQUESTS
  // -------------------------------------------------------

  /**
   * Create an edit request for a locked attendance record.
   */
  async createEditRequest(attendanceId, requestedBy, reason) {
    // Prevent duplicate pending requests
    const existing = await pool.query(
      `SELECT id FROM attendance_edit_requests
       WHERE attendance_id = $1 AND status = 'pending'`,
      [attendanceId]
    );
    if (existing.rows.length > 0) {
      throw new Error('A pending edit request already exists for this record');
    }

    const result = await pool.query(
      `INSERT INTO attendance_edit_requests (attendance_id, requested_by, reason)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [attendanceId, requestedBy, reason]
    );
    return result.rows[0];
  },

  /**
   * List edit requests with optional filters.
   */
  async listEditRequests({ status, page = 1, limit = 20 }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`r.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM attendance_edit_requests r ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT
         r.id,
         r.reason,
         r.status,
         r.created_at,
         r.reviewed_at,
         a.id             AS attendance_id,
         a.attendance_date,
         a.status         AS current_status,
         s.student_name,
         s.student_id     AS student_code,
         s.class,
         
         u.full_name      AS requested_by_name,
         rev.full_name    AS reviewed_by_name
       FROM attendance_edit_requests r
       JOIN attendance a ON a.id = r.attendance_id
       JOIN students s ON s.id = a.student_id
       JOIN users u ON u.id = r.requested_by
       LEFT JOIN users rev ON rev.id = r.reviewed_by
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, safeLimit, offset]
    );

    return {
      data: dataResult.rows,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  },

  /**
   * Get a single edit request by ID.
   */
  async getEditRequestById(id) {
    const result = await pool.query(
      `SELECT r.*, a.student_id, a.attendance_date, a.status AS current_status, a.is_locked
       FROM attendance_edit_requests r
       JOIN attendance a ON a.id = r.attendance_id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Approve an edit request: unlock the attendance record.
   * The teacher can then update it, and it gets re-locked.
   */
  async approveEditRequest(requestId, reviewerId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reqResult = await client.query(
        `UPDATE attendance_edit_requests
         SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND status = 'pending'
         RETURNING *`,
        [reviewerId, requestId]
      );

      if (!reqResult.rows[0]) {
        throw new Error('Request not found or already reviewed');
      }

      const req = reqResult.rows[0];

      // Unlock the attendance record so teacher can edit
      await client.query(
        `UPDATE attendance SET is_locked = FALSE, updated_at = NOW() WHERE id = $1`,
        [req.attendance_id]
      );

      await client.query('COMMIT');
      return req;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Reject an edit request (no unlock).
   */
  async rejectEditRequest(requestId, reviewerId) {
    const result = await pool.query(
      `UPDATE attendance_edit_requests
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [reviewerId, requestId]
    );

    if (!result.rows[0]) {
      throw new Error('Request not found or already reviewed');
    }
    return result.rows[0];
  },

  // -------------------------------------------------------
  // COUNTS — used by dashboards (Phase 10)
  // -------------------------------------------------------

  /**
   * Count attendance edit requests that are still pending review.
   */
  async countPendingEditRequests() {
    const result = await pool.query(
      `SELECT COUNT(*) AS total FROM attendance_edit_requests WHERE status = 'pending'`
    );
    return parseInt(result.rows[0].total, 10);
  },
};

module.exports = AttendanceModel;
