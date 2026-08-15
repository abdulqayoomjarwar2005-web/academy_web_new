const pool = require('../config/db');

const ALLOWED_STATUSES = ['active', 'completed'];

const BoardBatchModel = {
  ALLOWED_STATUSES,

  /**
   * Create the board_batches table if it doesn't exist yet.
   * Same bootstrap pattern as classModel / notificationModel — called
   * once on server startup from app.js.
   */
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS board_batches (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_name  VARCHAR(100) UNIQUE NOT NULL,
        status      VARCHAR(20) NOT NULL DEFAULT 'active',
        created_by  UUID REFERENCES users(id),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_board_batch_status CHECK (status IN ('active', 'completed'))
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_board_batches_status ON board_batches(status)`);
  },

  // -------------------------------------------------------
  // LIST
  // -------------------------------------------------------

  async list({ status } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) {
      conditions.push(`b.status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         b.id, b.batch_name, b.status, b.created_at,
         COUNT(c.id) AS candidate_count
       FROM board_batches b
       LEFT JOIN board_candidates c ON c.batch_id = b.id
       ${whereClause}
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      params
    );
    return result.rows.map((r) => ({ ...r, candidate_count: parseInt(r.candidate_count, 10) }));
  },

  // -------------------------------------------------------
  // FIND
  // -------------------------------------------------------

  async findById(id) {
    const result = await pool.query(`SELECT * FROM board_batches WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  async findByName(batchName) {
    const result = await pool.query(`SELECT * FROM board_batches WHERE batch_name = $1`, [batchName]);
    return result.rows[0] || null;
  },

  // -------------------------------------------------------
  // CREATE / UPDATE / DELETE
  // -------------------------------------------------------

  async create({ batchName, createdBy }) {
    const result = await pool.query(
      `INSERT INTO board_batches (batch_name, created_by) VALUES ($1, $2) RETURNING *`,
      [batchName, createdBy]
    );
    return result.rows[0];
  },

  async update(id, { batchName, status }) {
    const fields = [];
    const params = [];
    let idx = 1;

    if (batchName !== undefined) {
      fields.push(`batch_name = $${idx++}`);
      params.push(batchName);
    }
    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      params.push(status);
    }
    fields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await pool.query(
      `UPDATE board_batches SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return result.rows[0] || null;
  },

  async countCandidatesInBatch(id) {
    const result = await pool.query(
      `SELECT COUNT(*) AS cnt FROM board_candidates WHERE batch_id = $1`,
      [id]
    );
    return parseInt(result.rows[0].cnt, 10);
  },

  async remove(id) {
    const result = await pool.query(`DELETE FROM board_batches WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
  },
};

module.exports = BoardBatchModel;
