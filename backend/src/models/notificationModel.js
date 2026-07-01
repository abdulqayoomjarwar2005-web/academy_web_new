// notificationModel.js — Phase 13 (Notifications)
//
// Table: notifications
//   id           SERIAL PRIMARY KEY
//   user_id      INTEGER  NOT NULL  (FK → users.id — recipient)
//   type         TEXT     NOT NULL  (FEE_RECEIVED | ATTENDANCE_SUBMITTED |
//                                    ATTENDANCE_CHANGE_REQUEST | STUDENT_ADDED |
//                                    TEACHER_ADDED)
//   title        TEXT     NOT NULL  (short headline)
//   body         TEXT     NOT NULL  (human-readable sentence)
//   entity_type  TEXT               (e.g. 'fee', 'student', 'teacher', 'attendance')
//   entity_id    TEXT               (UUID or integer cast to text)
//   entity_label TEXT               (e.g. student name, receipt number)
//   is_read      BOOLEAN  NOT NULL  DEFAULT FALSE
//   created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
//
// Delivery rules (who receives which notification):
//   FEE_RECEIVED               → owner, all admins
//   ATTENDANCE_SUBMITTED       → owner, all admins
//   ATTENDANCE_CHANGE_REQUEST  → owner, all admins
//   STUDENT_ADDED              → owner, all admins
//   TEACHER_ADDED              → owner only

const pool = require('../config/db');

// ── DDL ───────────────────────────────────────────────────────────────────────

async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id           SERIAL PRIMARY KEY,
      user_id      INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type         TEXT         NOT NULL,
      title        TEXT         NOT NULL,
      body         TEXT         NOT NULL,
      entity_type  TEXT,
      entity_id    TEXT,
      entity_label TEXT,
      is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notif_user_unread
      ON notifications (user_id, is_read, created_at DESC)
  `);
}

// ── Helpers: resolve recipient user_ids ───────────────────────────────────────

/**
 * Returns ids of all users with the given role(s) that are active.
 */
async function getUserIdsByRoles(roles) {
  const result = await pool.query(
    `SELECT u.id
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE r.name = ANY($1::text[])
        AND u.is_active = TRUE`,
    [roles]
  );
  return result.rows.map((r) => r.id);
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Insert a notification row for every recipient in userIds.
 * Fire-and-forget: errors are caught and logged without crashing.
 */
async function insertForUsers(userIds, { type, title, body, entityType, entityId, entityLabel }) {
  if (!userIds || userIds.length === 0) return;

  // Deduplicate
  const unique = [...new Set(userIds)];

  const values = unique.map((_, i) => {
    const base = i * 7;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  });

  const params = [];
  for (const uid of unique) {
    params.push(uid, type, title, body, entityType ?? null, entityId != null ? String(entityId) : null, entityLabel ?? null);
  }

  await pool.query(
    `INSERT INTO notifications
       (user_id, type, title, body, entity_type, entity_id, entity_label)
     VALUES ${values.join(', ')}`,
    params
  );
}

/**
 * High-level notification dispatcher.
 * Resolves recipients by notification type and inserts rows.
 *
 * @param {string} type       — one of the TYPE constants below
 * @param {object} payload    — { title, body, entityType?, entityId?, entityLabel? }
 * @param {number} [actorId]  — the user who triggered the action (excluded from recipients
 *                              only when the actor is already an owner/admin to avoid
 *                              self-notification on their own dashboard actions)
 */
async function dispatch(type, payload, actorId = null) {
  try {
    let recipientIds = [];

    switch (type) {
      case TYPES.FEE_RECEIVED:
      case TYPES.ATTENDANCE_SUBMITTED:
      case TYPES.ATTENDANCE_CHANGE_REQUEST:
      case TYPES.STUDENT_ADDED:
        recipientIds = await getUserIdsByRoles(['owner', 'admin']);
        break;

      case TYPES.TEACHER_ADDED:
        recipientIds = await getUserIdsByRoles(['owner']);
        break;

      default:
        recipientIds = await getUserIdsByRoles(['owner', 'admin']);
    }

    // Remove the actor so they don't notify themselves
    if (actorId) {
      recipientIds = recipientIds.filter((id) => id !== actorId);
    }

    if (recipientIds.length === 0) return;

    await insertForUsers(recipientIds, { type, ...payload });
  } catch (err) {
    // Notifications must never crash the main request
    console.error('[Notifications] dispatch error:', err.message);
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Paginated list of notifications for a user.
 */
async function listForUser(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const offset = (page - 1) * limit;
  const where  = unreadOnly
    ? 'WHERE user_id = $1 AND is_read = FALSE'
    : 'WHERE user_id = $1';

  const countResult = await pool.query(
    `SELECT COUNT(*) AS cnt FROM notifications ${where}`,
    [userId]
  );
  const total = parseInt(countResult.rows[0].cnt, 10);

  const rows = await pool.query(
    `SELECT id, type, title, body, entity_type, entity_id, entity_label, is_read, created_at
       FROM notifications
      ${where}
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return { total, page, limit, rows: rows.rows };
}

/**
 * Count of unread notifications for a user (for the badge).
 */
async function unreadCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return parseInt(result.rows[0].cnt, 10);
}

/**
 * Mark one notification as read.
 * Returns false if the notification does not belong to the user.
 */
async function markRead(notificationId, userId) {
  const result = await pool.query(
    `UPDATE notifications
        SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
  RETURNING id`,
    [notificationId, userId]
  );
  return result.rowCount > 0;
}

/**
 * Mark ALL unread notifications for a user as read.
 */
async function markAllRead(userId) {
  const result = await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return result.rowCount;
}

/**
 * Delete a notification (user can dismiss it).
 */
async function deleteOne(notificationId, userId) {
  const result = await pool.query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [notificationId, userId]
  );
  return result.rowCount > 0;
}

// ── Type constants ────────────────────────────────────────────────────────────

const TYPES = Object.freeze({
  FEE_RECEIVED:               'FEE_RECEIVED',
  ATTENDANCE_SUBMITTED:       'ATTENDANCE_SUBMITTED',
  ATTENDANCE_CHANGE_REQUEST:  'ATTENDANCE_CHANGE_REQUEST',
  STUDENT_ADDED:              'STUDENT_ADDED',
  TEACHER_ADDED:              'TEACHER_ADDED',
});

module.exports = {
  TYPES,
  createTable,
  dispatch,
  listForUser,
  unreadCount,
  markRead,
  markAllRead,
  deleteOne,
};
