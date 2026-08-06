const pool = require('../config/db');

const ALLOWED_REQUEST_STATUSES = ['pending', 'approved', 'rejected'];

const StudentDeletionModel = {
  ALLOWED_REQUEST_STATUSES,

  /**
   * Create the student_deletion_requests table if it doesn't exist yet.
   * Called once on server startup, same pattern as auditModel / notificationModel / classModel.
   */
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_deletion_requests (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        requested_by  UUID NOT NULL REFERENCES users(id),
        reason        TEXT NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'pending',
        reviewed_by   UUID REFERENCES users(id),
        reviewed_at   TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_student_deletion_status CHECK (status IN ('pending', 'approved', 'rejected'))
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_student_deletion_status ON student_deletion_requests(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_student_deletion_student ON student_deletion_requests(student_id)`);
  },

  /**
   * Create a deletion request for a student. Blocks a second pending
   * request for the same student.
   */
  async createRequest(studentId, requestedBy, reason) {
    const existing = await pool.query(
      `SELECT id FROM student_deletion_requests WHERE student_id = $1 AND status = 'pending'`,
      [studentId]
    );
    if (existing.rows.length > 0) {
      throw new Error('A pending deletion request already exists for this student');
    }

    const result = await pool.query(
      `INSERT INTO student_deletion_requests (student_id, requested_by, reason)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [studentId, requestedBy, reason]
    );
    return result.rows[0];
  },

  /**
   * List deletion requests with optional status filter.
   */
  async listRequests({ status, page = 1, limit = 20 } = {}) {
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
      `SELECT COUNT(*) AS total FROM student_deletion_requests r ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT
         r.id, r.reason, r.status, r.created_at, r.reviewed_at,
         s.id AS student_id, s.student_id AS student_code, s.student_name, s.class, s.batch,
         u.full_name   AS requested_by_name,
         rev.full_name AS reviewed_by_name
       FROM student_deletion_requests r
       JOIN students s ON s.id = r.student_id
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

  async getRequestById(id) {
    const result = await pool.query(
      `SELECT r.*, s.student_name FROM student_deletion_requests r
       JOIN students s ON s.id = r.student_id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Approve a deletion request: deletes the student record and marks the
   * request approved, in a single transaction.
   */
  async approveRequest(requestId, reviewerId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reqResult = await client.query(
        `UPDATE student_deletion_requests
         SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $2 AND status = 'pending'
         RETURNING *`,
        [reviewerId, requestId]
      );

      if (!reqResult.rows[0]) {
        throw new Error('Request not found or already reviewed');
      }

      const request = reqResult.rows[0];

      const deleteResult = await client.query(
        `DELETE FROM students WHERE id = $1 RETURNING student_name`,
        [request.student_id]
      );

      await client.query('COMMIT');
      return { request, deletedStudentName: deleteResult.rows[0]?.student_name || null };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Reject a deletion request (student is left untouched).
   */
  async rejectRequest(requestId, reviewerId) {
    const result = await pool.query(
      `UPDATE student_deletion_requests
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

  /**
   * Count pending deletion requests (for dashboard/badge use).
   */
  async countPending() {
    const result = await pool.query(
      `SELECT COUNT(*) AS total FROM student_deletion_requests WHERE status = 'pending'`
    );
    return parseInt(result.rows[0].total, 10);
  },
};

module.exports = StudentDeletionModel;
