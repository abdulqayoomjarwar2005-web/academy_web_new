// auditMiddleware.js — Phase 12
//
// A reusable middleware factory that you attach to any route to automatically
// log the outcome after the response is sent.
//
// Usage in a route file:
//
//   const { auditLog } = require('../middleware/auditMiddleware');
//
//   router.post('/students', authenticate, auditLog({
//     action:      'STUDENT_ADDED',
//     category:    'Students',
//     description: (req, res, body) => `Added student ${body?.fullName || ''}`,
//     entityType:  'student',
//     entityId:    (req, res, body) => body?.id,
//     entityLabel: (req, res, body) => body?.fullName,
//   }), studentController.create);

const auditModel = require('../models/auditModel');

/**
 * Wraps res.json so we can capture the response body after it is sent.
 */
function interceptJson(res) {
  let capturedBody = null;
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    capturedBody = body;
    return originalJson(body);
  };
  return () => capturedBody;
}

/**
 * Resolve a value that may be a static primitive or a function of (req, res, responseBody).
 */
function resolve(value, req, res, body) {
  return typeof value === 'function' ? value(req, res, body) : value;
}

/**
 * Factory: returns an Express middleware that logs after the response.
 *
 * @param {object} opts
 * @param {string|Function}      opts.action        — audit action key
 * @param {string|Function}      opts.category      — module category
 * @param {string|Function}      opts.description   — human-readable log line
 * @param {string|null|Function} [opts.entityType]
 * @param {number|null|Function} [opts.entityId]
 * @param {string|null|Function} [opts.entityLabel]
 * @param {number[]}             [opts.onStatus]    — only log these HTTP statuses (default: 2xx)
 */
function auditLog({
  action,
  category,
  description,
  entityType   = null,
  entityId     = null,
  entityLabel  = null,
  onStatus     = null,     // null = any 2xx
}) {
  return (req, res, next) => {
    const getBody = interceptJson(res);

    res.on('finish', () => {
      try {
        const status = res.statusCode;
        const body   = getBody();

        // Determine whether to log based on HTTP status
        const shouldLog = onStatus
          ? onStatus.includes(status)
          : status >= 200 && status < 300;

        if (!shouldLog) return;

        const user = req.user || {};
        const ip   = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                  || req.socket?.remoteAddress
                  || null;

        auditModel.log({
          userId:      user.id      || null,
          userName:    user.fullName || user.username || 'Unknown',
          userRole:    user.role    || 'unknown',
          action:      resolve(action,      req, res, body),
          category:    resolve(category,    req, res, body),
          description: resolve(description, req, res, body),
          entityType:  resolve(entityType,  req, res, body),
          entityId:    resolve(entityId,    req, res, body),
          entityLabel: resolve(entityLabel, req, res, body),
          ipAddress:   ip,
        });
      } catch (err) {
        console.error('[AuditMiddleware] Error writing log:', err.message);
      }
    });

    next();
  };
}

/**
 * Convenience: log a manual entry from inside a controller.
 * Call after performing the action.
 */
function logManual(req, opts) {
  const user = req.user || {};
  const ip   = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
             || req.socket?.remoteAddress
             || null;
  auditModel.log({
    userId:   user.id      || null,
    userName: user.fullName || user.username || 'Unknown',
    userRole: user.role    || 'unknown',
    ipAddress: ip,
    ...opts,
  });
}

module.exports = { auditLog, logManual };
