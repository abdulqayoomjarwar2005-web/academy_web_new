// notificationController.js — Phase 13 (Notifications)

const NotificationModel = require('../models/notificationModel');

// ── GET /api/notifications ────────────────────────────────────────────────────
// Query params: page, limit, unreadOnly (true/false)

const listNotifications = async (req, res) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit      = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const unreadOnly = req.query.unreadOnly === 'true';

    const data = await NotificationModel.listForUser(req.user.id, { page, limit, unreadOnly });
    return res.status(200).json(data);
  } catch (err) {
    console.error('listNotifications error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /api/notifications/unread-count ──────────────────────────────────────

const getUnreadCount = async (req, res) => {
  try {
    const count = await NotificationModel.unreadCount(req.user.id);
    return res.status(200).json({ count });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────

const markRead = async (req, res) => {
  try {
    const ok = await NotificationModel.markRead(parseInt(req.params.id, 10), req.user.id);
    if (!ok) return res.status(404).json({ message: 'Notification not found' });
    return res.status(200).json({ message: 'Marked as read' });
  } catch (err) {
    console.error('markRead error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── PATCH /api/notifications/read-all ────────────────────────────────────────

const markAllRead = async (req, res) => {
  try {
    const updated = await NotificationModel.markAllRead(req.user.id);
    return res.status(200).json({ message: 'All notifications marked as read', updated });
  } catch (err) {
    console.error('markAllRead error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── DELETE /api/notifications/:id ────────────────────────────────────────────

const deleteNotification = async (req, res) => {
  try {
    const ok = await NotificationModel.deleteOne(parseInt(req.params.id, 10), req.user.id);
    if (!ok) return res.status(404).json({ message: 'Notification not found' });
    return res.status(200).json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('deleteNotification error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
};
