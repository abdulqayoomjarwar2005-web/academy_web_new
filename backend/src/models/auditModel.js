// auditModel.js — Phase 12 (Audit Log System)
//
// Table: audit_logs
//   id            SERIAL PRIMARY KEY
//   user_id       INTEGER  (FK → users.id, nullable if system action)
//   user_name     TEXT     (snapshot of name at time of action)
//   user_role     TEXT     (snapshot of role at time of action)
//   action        TEXT     (e.g. "STUDENT_ADDED", "FEE_UPDATED")
//   category      TEXT     (e.g. "Students", "Fees", "Expenses", "Attendance", "Users")
//   description   TEXT     (human-readable summary)
//   entity_type   TEXT     (e.g. "student", "fee", "expense")
//   entity_id     INTEGER  (ID of affected record, nullable)
//   entity_label  TEXT     (e.g. student name, receipt number)
//   ip_address    TEXT
//   created_at    TIMESTAMPTZ DEFAULT NOW()

const pool = require('../config/db');   // ← same pg pool instance used by all other models

// ── DDL ──────────────────────────────────────────────────────────────────────

async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id           SERIAL       PRIMARY KEY,
      user_id      INTEGER,
      user_name    TEXT         NOT NULL DEFAULT 'System',
      user_role    TEXT         NOT NULL DEFAULT 'system',
      action       TEXT         NOT NULL,
      category     TEXT         NOT NULL,
      description  TEXT         NOT NULL,
      entity_type  TEXT,
      entity_id    INTEGER,
      entity_label TEXT,
      ip_address   TEXT,
      created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  // Index for common query patterns
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs (created_at DESC)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_logs (user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs (category)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_logs (action)`);
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Insert a new audit log entry.
 * @param {object} params
 * @param {number|null}  params.userId
 * @param {string}       params.userName
 * @param {string}       params.userRole
 * @param {string}       params.action        — e.g. "STUDENT_ADDED"
 * @param {string}       params.category      — e.g. "Students"
 * @param {string}       params.description   — human-readable sentence
 * @param {string|null}  [params.entityType]
 * @param {number|null}  [params.entityId]
 * @param {string|null}  [params.entityLabel]
 * @param {string|null}  [params.ipAddress]
 */
async function log({
  userId       = null,
  userName     = 'System',
  userRole     = 'system',
  action,
  category,
  description,
  entityType   = null,
  entityId     = null,
  entityLabel  = null,
  ipAddress    = null,
}) {
  try {
    await pool.query(
      `
      INSERT INTO audit_logs
        (user_id, user_name, user_role, action, category, description,
         entity_type, entity_id, entity_label, ip_address)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [userId, userName, userRole, action, category, description,
       entityType, entityId, entityLabel, ipAddress],
    );
  } catch (err) {
    // Audit logging must never crash the main request
    console.error('[AuditLog] Failed to write log entry:', err.message);
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Fetch paginated audit logs with optional filters.
 * Accessible by owner and admin only (enforced in route).
 */
async function getLogs({
  page      = 1,
  limit     = 50,
  category  = null,
  action    = null,
  userId    = null,
  dateFrom  = null,
  dateTo    = null,
  search    = null,
} = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params     = [];

  const addCondition = (clause, value) => {
    params.push(value);
    conditions.push(clause.replace('?', `$${params.length}`));
  };

  if (category) addCondition('category = ?', category);
  if (action)   addCondition('action = ?', action);
  if (userId)   addCondition('user_id = ?', userId);
  if (dateFrom) addCondition('created_at >= ?', dateFrom + ' 00:00:00');
  if (dateTo)   addCondition('created_at <= ?', dateTo   + ' 23:59:59');
  if (search)   {
    const s = `%${search}%`;
    params.push(s, s, s);
    conditions.push(
      `(description ILIKE $${params.length - 2} OR entity_label ILIKE $${params.length - 1} OR user_name ILIKE $${params.length})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalResult = await pool.query(`SELECT COUNT(*) AS cnt FROM audit_logs ${where}`, params);
  const total = parseInt(totalResult.rows[0]?.cnt, 10) || 0;

  const rowsResult = await pool.query(
    `
    SELECT * FROM audit_logs
    ${where}
    ORDER BY created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, limit, offset],
  );

  return { total, page, limit, rows: rowsResult.rows };
}

/**
 * Get the distinct list of categories that have been logged.
 */
async function getCategories() {
  const result = await pool.query(`SELECT DISTINCT category FROM audit_logs ORDER BY category`);
  return result.rows.map(r => r.category);
}

/**
 * Get the distinct list of actions, optionally filtered by category.
 */
async function getActions(category = null) {
  if (category) {
    const result = await pool.query(
      `SELECT DISTINCT action FROM audit_logs WHERE category = $1 ORDER BY action`,
      [category],
    );
    return result.rows.map(r => r.action);
  }
  const result = await pool.query(`SELECT DISTINCT action FROM audit_logs ORDER BY action`);
  return result.rows.map(r => r.action);
}

/**
 * Summary stats for the dashboard card.
 */
async function getSummary() {
  const totalResult     = await pool.query(`SELECT COUNT(*) AS cnt FROM audit_logs`);
  const todayResult     = await pool.query(`SELECT COUNT(*) AS cnt FROM audit_logs WHERE created_at::date = CURRENT_DATE`);
  const weekResult      = await pool.query(`SELECT COUNT(*) AS cnt FROM audit_logs WHERE created_at >= NOW() - INTERVAL '7 days'`);
  const monthResult     = await pool.query(`SELECT COUNT(*) AS cnt FROM audit_logs WHERE date_trunc('month', created_at) = date_trunc('month', NOW())`);

  const byCategoryResult = await pool.query(`
    SELECT category, COUNT(*) AS cnt FROM audit_logs GROUP BY category ORDER BY cnt DESC
  `);

  const recentUsersResult = await pool.query(`
    SELECT user_name, user_role, COUNT(*) AS cnt
    FROM audit_logs
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY user_id, user_name, user_role
    ORDER BY cnt DESC
    LIMIT 5
  `);

  return {
    total:     parseInt(totalResult.rows[0]?.cnt, 10) || 0,
    today:     parseInt(todayResult.rows[0]?.cnt, 10) || 0,
    thisWeek:  parseInt(weekResult.rows[0]?.cnt, 10) || 0,
    thisMonth: parseInt(monthResult.rows[0]?.cnt, 10) || 0,
    byCategory: byCategoryResult.rows,
    recentUsers: recentUsersResult.rows,
  };
}

module.exports = { createTable, log, getLogs, getCategories, getActions, getSummary };
