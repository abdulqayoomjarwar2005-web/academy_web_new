// messageModel.js — Phase 17 (Teacher Messages / Notes)
//
// Lets an owner or admin send a message/note to a specific teacher,
// optionally tied to a particular student, so the teacher can be
// contacted about a student issue (or anything else) directly in-app.

const pool = require('../config/db');

async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS teacher_messages (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id          UUID NOT NULL REFERENCES users(id),
      recipient_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_id         UUID REFERENCES students(id) ON DELETE SET NULL,
      subject            VARCHAR(200) NOT NULL,
      body               TEXT NOT NULL,
      is_read            BOOLEAN NOT NULL DEFAULT FALSE,
      read_at            TIMESTAMP WITH TIME ZONE,
      created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_teacher_messages_recipient
      ON teacher_messages (recipient_user_id, is_read, created_at DESC)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_teacher_messages_sender
      ON teacher_messages (sender_id, created_at DESC)
  `);
}

const MessageModel = {
  createTable,

  /**
   * Send a message from an owner/admin to a teacher's login account.
   * studentId is optional — used when the note relates to a specific student.
   */
  async send({ senderId, recipientUserId, studentId, subject, body }) {
    const result = await pool.query(
      `INSERT INTO teacher_messages (sender_id, recipient_user_id, student_id, subject, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [senderId, recipientUserId, studentId || null, subject, body]
    );
    return result.rows[0];
  },

  /**
   * Inbox for the logged-in teacher (or anyone reading their own messages).
   */
  async listForRecipient(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const offset = (page - 1) * limit;
    const where = unreadOnly
      ? `WHERE m.recipient_user_id = $1 AND m.is_read = FALSE`
      : `WHERE m.recipient_user_id = $1`;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS cnt FROM teacher_messages m ${where}`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].cnt, 10);

    const rows = await pool.query(
      `SELECT m.id, m.subject, m.body, m.is_read, m.read_at, m.created_at,
              m.student_id, s.student_name, s.student_id AS student_code, s.class,
              u.full_name AS sender_name
       FROM teacher_messages m
       LEFT JOIN students s ON s.id = m.student_id
       JOIN users u ON u.id = m.sender_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return { total, page, limit, rows: rows.rows };
  },

  /**
   * Sent history for the owner/admin who composed messages.
   * Optionally scoped to a single recipient teacher.
   */
  async listBySender(senderId, { page = 1, limit = 20, recipientUserId = null } = {}) {
    const offset = (page - 1) * limit;
    const params = [senderId];
    let where = `WHERE m.sender_id = $1`;
    if (recipientUserId) {
      params.push(recipientUserId);
      where += ` AND m.recipient_user_id = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) AS cnt FROM teacher_messages m ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].cnt, 10);

    params.push(limit, offset);
    const rows = await pool.query(
      `SELECT m.id, m.subject, m.body, m.is_read, m.created_at,
              m.student_id, s.student_name, s.student_id AS student_code,
              t.teacher_name, t.id AS teacher_id
       FROM teacher_messages m
       LEFT JOIN students s ON s.id = m.student_id
       JOIN teachers t ON t.user_id = m.recipient_user_id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return { total, page, limit, rows: rows.rows };
  },

  async unreadCount(userId) {
    const result = await pool.query(
      `SELECT COUNT(*) AS cnt FROM teacher_messages WHERE recipient_user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return parseInt(result.rows[0].cnt, 10);
  },

  async markRead(id, userId) {
    const result = await pool.query(
      `UPDATE teacher_messages
          SET is_read = TRUE, read_at = NOW()
        WHERE id = $1 AND recipient_user_id = $2
    RETURNING id`,
      [id, userId]
    );
    return result.rowCount > 0;
  },

  async markAllRead(userId) {
    const result = await pool.query(
      `UPDATE teacher_messages
          SET is_read = TRUE, read_at = NOW()
        WHERE recipient_user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return result.rowCount;
  },

  async getById(id) {
    const result = await pool.query(`SELECT * FROM teacher_messages WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },
};

module.exports = MessageModel;
