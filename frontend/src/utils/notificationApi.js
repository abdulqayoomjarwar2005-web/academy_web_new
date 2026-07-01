// notificationApi.js — Phase 13 (Notifications)

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

/** Paginated list — params: { page, limit, unreadOnly } */
export function fetchNotifications(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  ).toString();
  return apiFetch(`/notifications${qs ? `?${qs}` : ''}`);
}

/** Badge count — returns { count: number } */
export function fetchUnreadCount() {
  return apiFetch('/notifications/unread-count');
}

/** Mark one as read */
export function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
}

/** Mark all as read */
export function markAllNotificationsRead() {
  return apiFetch('/notifications/read-all', { method: 'PATCH' });
}

/** Delete / dismiss one */
export function deleteNotification(id) {
  return apiFetch(`/notifications/${id}`, { method: 'DELETE' });
}
