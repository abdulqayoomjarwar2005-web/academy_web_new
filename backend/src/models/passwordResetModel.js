const pool = require('../config/db');

const PasswordResetModel = {
  async create({ userId, tokenHash, expiresAt }) {
    const result = await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, tokenHash, expiresAt]
    );
    return result.rows[0];
  },

  async findValidByTokenHash(tokenHash) {
    const result = await pool.query(
      `SELECT id, user_id, expires_at, used
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used = FALSE AND expires_at > NOW()`,
      [tokenHash]
    );
    return result.rows[0] || null;
  },

  async markUsed(id) {
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
      [id]
    );
  },

  async invalidateAllForUser(userId) {
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [userId]
    );
  },
};

module.exports = PasswordResetModel;
