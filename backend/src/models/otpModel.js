const pool = require('../config/db');

const MAX_ATTEMPTS = 5;

const OtpModel = {
  MAX_ATTEMPTS,

  /**
   * Store a new OTP (already hashed) for a user.
   */
  async create({ userId, otpHash, expiresAt }) {
    const result = await pool.query(
      `INSERT INTO password_reset_otps (user_id, otp_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, otpHash, expiresAt]
    );
    return result.rows[0];
  },

  /**
   * Invalidate any previously issued, still-active OTPs for this user.
   * Called before issuing a new one so only the latest OTP is valid.
   */
  async invalidateAllForUser(userId) {
    await pool.query(
      `UPDATE password_reset_otps SET used = TRUE WHERE user_id = $1 AND used = FALSE`,
      [userId]
    );
  },

  /**
   * Find the latest non-expired, unused OTP for a user.
   */
  async findLatestActive(userId) {
    const result = await pool.query(
      `SELECT * FROM password_reset_otps
       WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Increment failed attempt counter. Returns the new attempt count.
   */
  async incrementAttempts(id) {
    const result = await pool.query(
      `UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts`,
      [id]
    );
    return result.rows[0]?.attempts ?? 0;
  },

  /**
   * Mark an OTP as used (consumed) so it cannot be reused.
   */
  async markUsed(id) {
    await pool.query(`UPDATE password_reset_otps SET used = TRUE WHERE id = $1`, [id]);
  },
};

module.exports = OtpModel;
