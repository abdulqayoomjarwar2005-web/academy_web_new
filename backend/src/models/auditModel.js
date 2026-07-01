// auditModel.js — Phase 12 (Audit Log System)
//
// Table: audit_logs
//   id            INTEGER PRIMARY KEY AUTOINCREMENT
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
//   created_at    DATETIME DEFAULT CURRENT_TIMESTAMP

const db = require('../db');   // ← same db instance used by all other models

// ── DDL ──────────────────────────────────────────────────────────────────────

function createTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id           INTEGER  PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER,
      user_name    TEXT     NOT NULL DEFAULT 'System',
      user_role    TEXT     NOT NULL DEFAULT 'system',
      action       TEXT     NOT NULL,
      category     TEXT     NOT NULL,
      description  TEXT     NOT NULL,
      entity_type  TEXT,
      entity_id    INTEGER,
      entity_label TEXT,
      ip_address   TEXT,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Index for common query patterns
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_logs (created_at DESC)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_logs (user_id)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_category ON audit_logs (category)`).run();
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_logs (action)`).run();
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
function log({
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
    db.prepare(`
      INSERT INTO audit_logs
        (user_id, user_name, user_role, action, category, description,
         entity_type, entity_id, entity_label, ip_address)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, userName, userRole, action, category, description,
      entityType, entityId, entityLabel, ipAddress,
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
function getLogs({
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

  if (category) { conditions.push('category = ?');        params.push(category); }
  if (action)   { conditions.push('action = ?');          params.push(action); }
  if (userId)   { conditions.push('user_id = ?');         params.push(userId); }
  if (dateFrom) { conditions.push('created_at >= ?');     params.push(dateFrom + ' 00:00:00'); }
  if (dateTo)   { conditions.push('created_at <= ?');     params.push(dateTo   + ' 23:59:59'); }
  if (search)   {
    conditions.push('(description LIKE ? OR entity_label LIKE ? OR user_name LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) AS cnt FROM audit_logs ${where}`).get(...params)?.cnt ?? 0;

  const rows = db.prepare(`
    SELECT * FROM audit_logs
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { total, page, limit, rows };
}

/**
 * Get the distinct list of categories that have been logged.
 */
function getCategories() {
  return db.prepare(`SELECT DISTINCT category FROM audit_logs ORDER BY category`).all().map(r => r.category);
}

/**
 * Get the distinct list of actions, optionally filtered by category.
 */
function getActions(category = null) {
  if (category) {
    return db.prepare(`SELECT DISTINCT action FROM audit_logs WHERE category = ? ORDER BY action`).all(category).map(r => r.action);
  }
  return db.prepare(`SELECT DISTINCT action FROM audit_logs ORDER BY action`).all().map(r => r.action);
}

/**
 * Summary stats for the dashboard card.
 */
function getSummary() {
  const total      = db.prepare(`SELECT COUNT(*) AS cnt FROM audit_logs`).get()?.cnt ?? 0;
  const today      = db.prepare(`SELECT COUNT(*) AS cnt FROM audit_logs WHERE DATE(created_at) = DATE('now')`).get()?.cnt ?? 0;
  const thisWeek   = db.prepare(`SELECT COUNT(*) AS cnt FROM audit_logs WHERE created_at >= DATE('now','-7 days')`).get()?.cnt ?? 0;
  const thisMonth  = db.prepare(`SELECT COUNT(*) AS cnt FROM audit_logs WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now')`).get()?.cnt ?? 0;

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) AS cnt FROM audit_logs GROUP BY category ORDER BY cnt DESC
  `).all();

  const recentUsers = db.prepare(`
    SELECT user_name, user_role, COUNT(*) AS cnt
    FROM audit_logs
    WHERE created_at >= DATE('now','-7 days')
    GROUP BY user_id
    ORDER BY cnt DESC
    LIMIT 5
  `).all();

  return { total, today, thisWeek, thisMonth, byCategory, recentUsers };
}

module.exports = { createTable, log, getLogs, getCategories, getActions, getSummary };
