import api from './api';

// -------------------------------------------------------
// TEACHER MESSAGES / NOTES (Phase 17)
// -------------------------------------------------------

/**
 * Owner/admin: send a message to a teacher, optionally about a specific student.
 * @param {{ teacherId: string, studentId?: string, subject: string, body: string }} payload
 */
export const sendMessage = async (payload) => {
  const { data } = await api.post('/messages', payload);
  return data;
};

/**
 * The logged-in user's own inbox (mainly for teachers).
 */
export const listInbox = async (params = {}) => {
  const { data } = await api.get('/messages/inbox', { params });
  return data;
};

/**
 * Owner/admin: messages they've sent, optionally filtered by teacherUserId.
 */
export const listSentMessages = async (params = {}) => {
  const { data } = await api.get('/messages/sent', { params });
  return data;
};

export const getUnreadMessageCount = async () => {
  const { data } = await api.get('/messages/unread-count');
  return data;
};

export const markMessageRead = async (id) => {
  const { data } = await api.patch(`/messages/${id}/read`);
  return data;
};

export const markAllMessagesRead = async () => {
  const { data } = await api.patch('/messages/read-all');
  return data;
};
