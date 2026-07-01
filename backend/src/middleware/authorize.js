/**
 * Middleware factory for Role-Based Access Control.
 * Usage: authorize('owner', 'admin')
 * Must be used AFTER the `authenticate` middleware, since it relies on req.user.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Forbidden: insufficient permissions for this action',
      });
    }

    next();
  };
};

module.exports = authorize;
