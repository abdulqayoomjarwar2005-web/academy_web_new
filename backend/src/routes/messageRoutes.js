// messageRoutes.js — Phase 17 (Teacher Messages / Notes)
//
// All routes require authentication.
// - POST   /               owner/admin only — send a message to a teacher
// - GET    /inbox          any authenticated user — their own inbox (teachers use this)
// - GET    /sent           owner/admin only — messages they've sent
// - GET    /unread-count   any authenticated user — badge count
// - PATCH  /:id/read       any authenticated user — mark their own message read
// - PATCH  /read-all       any authenticated user — mark all their own messages read

const express = require('express');
const router = express.Router();
const controller = require('../controllers/messageController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);

router.post('/', authorize('owner', 'admin'), controller.sendMessage);
router.get('/inbox', controller.listInbox);
router.get('/sent', authorize('owner', 'admin'), controller.listSent);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/:id/read', controller.markRead);
router.patch('/read-all', controller.markAllRead);

module.exports = router;
