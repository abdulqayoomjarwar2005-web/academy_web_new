const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const UserModel = require('../models/userModel');
const OtpModel = require('../models/otpModel');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendOtpEmail } = require('../utils/email');

const OTP_EXPIRY_MINUTES = 10;

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await UserModel.findByEmail(email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact the administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.must_change_password,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  return res.status(200).json({ message: 'Logged out successfully' });
};

/**
 * POST /api/auth/refresh
 * Issues a new access token using the refresh token cookie.
 */
const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = await UserModel.findById(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    const userPayload = { id: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(userPayload);

    return res.status(200).json({ accessToken });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const getProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.must_change_password,
      },
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Generates a 6-digit OTP, stores its hash, and emails it to the user.
 * Body: { email }
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await UserModel.findByEmail(email.toLowerCase().trim());

    // Always return success to avoid leaking which emails are registered
    const genericResponse = {
      message: 'If an account with that email exists, a verification code has been sent to it.',
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // Generate a 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await OtpModel.invalidateAllForUser(user.id);
    await OtpModel.create({ userId: user.id, otpHash, expiresAt });

    await sendOtpEmail(user.email, otp);

    return res.status(200).json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/auth/reset-password
 * Body: { email, otp, newPassword }
 * Verifies the OTP for the given email and updates the user's password.
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const user = await UserModel.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const otpRecord = await OtpModel.findLatestActive(user.id);
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    if (otpRecord.attempts >= OtpModel.MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.' });
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    if (otpHash !== otpRecord.otp_hash) {
      await OtpModel.incrementAttempts(otpRecord.id);
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(user.id, passwordHash);
    await OtpModel.markUsed(otpRecord.id);

    return res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/auth/change-password
 * Requires authentication. Body: { currentPassword, newPassword }
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const user = await UserModel.findByIdWithPassword(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await UserModel.updatePassword(user.id, newPasswordHash);

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  login,
  logout,
  refresh,
  getProfile,
  forgotPassword,
  resetPassword,
  changePassword,
};
