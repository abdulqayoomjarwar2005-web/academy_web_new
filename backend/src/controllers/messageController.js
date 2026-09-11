// messageController.js — Phase 17 (Teacher Messages / Notes)

const MessageModel = require('../models/messageModel');
const TeacherModel = require('../models/teacherModel');
const NotificationModel = require('../models/notificationModel');
const UserModel = require('../models/userModel');

// ── POST /api/messages ────────────────────────────────────────────────────────
// Owner/admin sends a message/note to a teacher, optionally about a student.
// body: { teacherId, studentId?, subject, body }

const sendMessage = async (req, res) => {
  try {
    const { teacherId, studentId, subject, body } = req.body;

    if (!teacherId || !subject?.trim() || !body?.trim()) {
      return res.status(400).json({ message: 'teacherId, subject, and body are required' });
    }

    const teacher = await TeacherModel.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    if (!teacher.user_id) {
      return res.status(400).json({ message: 'This teacher does not have a login account yet, so they cannot receive messages in-app.' });
    }

    const message = await MessageModel.send({
      senderId: req.user.id,
      recipientUserId: teacher.user_id,
      studentId: studentId || null,
      subject: subject.trim(),
      body: body.trim(),
    });

    // Let the teacher know a message is waiting for them.
    const sender = await UserModel.findById(req.user.id);
    NotificationModel.notifyUser(teacher.user_id, {
      type: NotificationModel.TYPES.MESSAGE_RECEIVED,
      title: `New message: ${subject.trim()}`,
      body: `${sender?.full_name || 'An administrator'} sent you a message${studentId ? ' about a student' : ''}.`,
      entityType: 'message',
      entityId: message.id,
      entityLabel: subject.trim(),
    }).catch((err) => console.error('[Notifications] MESSAGE_RECEIVED dispatch failed:', err.message));

    return res.status(201).json({ message: 'Message sent', data: message });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /api/messages/inbox ──────────────────────────────────────────────────
// The logged-in teacher's own inbox.

const listInbox = async (req, res) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit      = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const unreadOnly = req.query.unreadOnly === 'true';

    const data = await MessageModel.listForRecipient(req.user.id, { page, limit, unreadOnly });
    return res.status(200).json(data);
  } catch (err) {
    console.error('listInbox error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /api/messages/sent ───────────────────────────────────────────────────
// Owner/admin's own sent message history, optionally filtered by teacher.

const listSent = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const { teacherUserId } = req.query;

    const data = await MessageModel.listBySender(req.user.id, {
      page,
      limit,
      recipientUserId: teacherUserId || null,
    });
    return res.status(200).json(data);
  } catch (err) {
    console.error('listSent error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /api/messages/unread-count ───────────────────────────────────────────

const getUnreadCount = async (req, res) => {
  try {
    const count = await MessageModel.unreadCount(req.user.id);
    return res.status(200).json({ count });
  } catch (err) {
    console.error('getUnreadCount error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── PATCH /api/messages/:id/read ─────────────────────────────────────────────

const markRead = async (req, res) => {
  try {
    const ok = await MessageModel.markRead(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ message: 'Message not found' });
    return res.status(200).json({ message: 'Marked as read' });
  } catch (err) {
    console.error('markRead error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── PATCH /api/messages/read-all ─────────────────────────────────────────────

const markAllRead = async (req, res) => {
  try {
    const updated = await MessageModel.markAllRead(req.user.id);
    return res.status(200).json({ message: 'All messages marked as read', updated });
  } catch (err) {
    console.error('markAllRead error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  sendMessage,
  listInbox,
  listSent,
  getUnreadCount,
  markRead,
  markAllRead,
};
