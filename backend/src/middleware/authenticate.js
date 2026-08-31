const { verifyAccessToken } = require('../utils/jwt');
const UserModel = require('../models/userModel');

/**
 * Middleware to verify JWT access token from Authorization header,
 * and confirm the user's account is still active in the database.
 * Expects header: Authorization: Bearer <token>
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access token missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    // Re-check current status in the DB on every request, not just at login.
    // Prevents an already-issued token from continuing to work after an
    // admin deactivates the account (e.g. a teacher's login access).
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact the administrator.' });
    }

    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Access token expired' });
    }
    return res.status(401).json({ message: 'Invalid access token' });
  }
};

module.exports = authenticate;
