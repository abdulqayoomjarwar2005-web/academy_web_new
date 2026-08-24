const pool = require('../config/db');

const ALLOWED_STATUSES = ['active', 'inactive'];

const InstituteModel = {
  ALLOWED_STATUSES,

  /**
   * Create the institutes table if it doesn't exist yet. Same bootstrap
   * pattern as classModel/notificationModel — called once on server
   * startup from app.js. board_candidates.institute_id (see
   * boardCandidateModel.js) references this table.
   */
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS institutes (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(150) UNIQUE NOT NULL,
        status      VARCHAR(20) NOT NULL DEFAULT 'active',
        created_by  UUID REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_institute_status CHECK (status IN ('active', 'inactive'))
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_institutes_status ON institutes(status)`);
  },

  // -------------------------------------------------------
  // LIST / FIND
  // -------------------------------------------------------

  async list({ status } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`i.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         i.id, i.name, i.status, i.created_at,
         COUNT(c.id) AS candidate_count
       FROM institutes i
       LEFT JOIN board_candidates c ON c.institute_id = i.id
       ${whereClause}
       GROUP BY i.id
       ORDER BY i.name ASC`,
      params
    );
    return result.rows.map((r) => ({ ...r, candidate_count: parseInt(r.candidate_count, 10) }));
  },

  async findById(id) {
    const result = await pool.query(`SELECT * FROM institutes WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  async findByName(name) {
    const result = await pool.query(`SELECT * FROM institutes WHERE name = $1`, [name]);
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // CREATE / UPDATE / DELETE
  // -------------------------------------------------------

  async create({ name, createdBy }) {
    const result = await pool.query(
      `INSERT INTO institutes (name, created_by) VALUES ($1, $2) RETURNING *`,
      [name, createdBy]
    );
    return result.rows[0];
  },

  async update(id, { name, status }) {
    const fields = [];
    const params = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      params.push(name);
    }
    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(status);
    }
    fields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE institutes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  async countCandidates(id) {
    const result = await pool.query(`SELECT COUNT(*) AS cnt FROM board_candidates WHERE institute_id = $1`, [id]);
    return parseInt(result.rows[0].cnt, 10);
  },

  async remove(id) {
    const result = await pool.query(`DELETE FROM institutes WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
  },
};

module.exports = InstituteModel;
