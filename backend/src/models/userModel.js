const pool = require('../config/db');

const UserModel = {
  /**
   * Find a user by email, including role name.
   */
  async findByEmail(email) {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active,
              u.must_change_password, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a user by ID, including role name.
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.is_active,
              u.must_change_password, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new user.
   */
  async create({ fullName, email, passwordHash, role, mustChangePassword = false }) {
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id, must_change_password)
       VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = $4), $5)
       RETURNING id, full_name, email, must_change_password`,
      [fullName, email, passwordHash, role, mustChangePassword]
    );
    return result.rows[0];
  },

  /**
   * Update a user's password hash.
   */
  async updatePassword(userId, passwordHash) {
    await pool.query(
      `UPDATE users
       SET password_hash = $1, must_change_password = FALSE
       WHERE id = $2`,
      [passwordHash, userId]
    );
  },

  /**
   * Get full record (including password hash) by ID - used for change password.
   */
  async findByIdWithPassword(id) {
    const result = await pool.query(
      `SELECT id, password_hash FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = UserModel;
