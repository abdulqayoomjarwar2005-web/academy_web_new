const pool = require('../config/db');

const ClassModel = {
  /**
   * Create the classes table if it doesn't exist yet.
   * Called once on server startup, same pattern as auditModel / notificationModel.
   */
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name       TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  },

  /**
   * List all classes, alphabetically.
   */
  async list() {
    const result = await pool.query(
      `SELECT id, name, created_at FROM classes ORDER BY name ASC`
    );
    return result.rows;
  },

  /**
   * Look up a class by exact name (used to prevent duplicates).
   */
  async findByName(name) {
    const result = await pool.query(
      `SELECT id, name FROM classes WHERE name = $1`,
      [name]
    );
    return result.rows[0] || null;
  },

  /**
   * Get a class by id.
   */
  async getById(id) {
    const result = await pool.query(
      `SELECT id, name FROM classes WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new class.
   */
  async create(name) {
    const result = await pool.query(
      `INSERT INTO classes (name) VALUES ($1) RETURNING id, name, created_at`,
      [name]
    );
    return result.rows[0];
  },

  /**
   * Count how many students currently belong to a class name.
   * Used to block deletion if the class is still in use.
   */
  async countStudentsInClass(name) {
    const result = await pool.query(
      `SELECT COUNT(*) AS cnt FROM students WHERE class = $1`,
      [name]
    );
    return parseInt(result.rows[0].cnt, 10);
  },

  /**
   * Delete a class by id.
   */
  async delete(id) {
    const result = await pool.query(
      `DELETE FROM classes WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = ClassModel;
