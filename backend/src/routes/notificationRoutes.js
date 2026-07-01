// notificationRoutes.js — Phase 13 (Notifications)
//
// All routes require authentication.
// Every authenticated user (owner, admin, teacher) can access their own notifications.
// The dispatch (creation) of notifications is done server-side; no POST route is exposed.

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/notificationController');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

// GET    /api/notifications                  — paginated list (own notifications)
router.get('/',               controller.listNotifications);

// GET    /api/notifications/unread-count     — badge count
router.get('/unread-count',   controller.getUnreadCount);

// PATCH  /api/notifications/read-all         — mark all read
router.patch('/read-all',     controller.markAllRead);

// PATCH  /api/notifications/:id/read         — mark one read
router.patch('/:id/read',     controller.markRead);

// DELETE /api/notifications/:id              — dismiss / delete
router.delete('/:id',         controller.deleteNotification);

module.exports = router;
