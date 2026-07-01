// NotificationsPage.jsx — Phase 13 (Notifications)
//
// Full-page view of all notifications for the logged-in user.
// Features:
//   • Filter by type (All / specific event)
//   • Filter unread-only
//   • Pagination
//   • Mark individual as read / mark all read / dismiss

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../utils/notificationApi';

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_LABELS = {
  FEE_RECEIVED:              'Fee Received',
  ATTENDANCE_SUBMITTED:      'Attendance Submitted',
  ATTENDANCE_CHANGE_REQUEST: 'Attendance Change Request',
  STUDENT_ADDED:             'Student Added',
  TEACHER_ADDED:             'Teacher Added',
};

const TYPE_ICONS = {
  FEE_RECEIVED:              '💰',
  ATTENDANCE_SUBMITTED:      '📋',
  ATTENDANCE_CHANGE_REQUEST: '🔄',
  STUDENT_ADDED:             '🎓',
  TEACHER_ADDED:             '👨‍🏫',
};

const TYPE_STYLES = {
  FEE_RECEIVED:              'bg-green-50  text-green-700  border-green-200',
  ATTENDANCE_SUBMITTED:      'bg-yellow-50 text-yellow-700 border-yellow-200',
  ATTENDANCE_CHANGE_REQUEST: 'bg-blue-50   text-blue-700   border-blue-200',
  STUDENT_ADDED:             'bg-purple-50 text-purple-700 border-purple-200',
  TEACHER_ADDED:             'bg-orange-50 text-orange-700 border-orange-200',
};

function typeIcon(type)  { return TYPE_ICONS[type]  || '🔔'; }
function typeLabel(type) { return TYPE_LABELS[type]  || type; }
function typeStyle(type) { return TYPE_STYLES[type]  || 'bg-gray-50 text-gray-600 border-gray-200'; }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Badge({ type }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${typeStyle(type)}`}>
      <span>{typeIcon(type)}</span>
      {typeLabel(type)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const LIMIT = 20;

const NotificationsPage = () => {
  const [items, setItems]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: pg, limit: LIMIT };
      if (unreadOnly) params.unreadOnly = true;
      const data = await fetchNotifications(params);

      // Client-side type filter (server doesn't support it yet — easy to add later)
      const rows = typeFilter
        ? (data.rows || []).filter((n) => n.type === typeFilter)
        : (data.rows || []);

      setItems(rows);
      setTotal(data.total ?? rows.length);
      setPage(pg);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, typeFilter]);

  useEffect(() => { load(1); }, [load]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleMarkRead = async (id) => {
    await markNotificationRead(id).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleDelete = async (id) => {
    await deleteNotification(id).catch(() => {});
    setItems((prev) => prev.filter((n) => n.id !== id));
    setTotal((t) => t - 1);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead().catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const unreadCount = items.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout title="Notifications">
      <div className="mx-auto max-w-3xl px-6 py-8">

        {/* ── Page header ──────────────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl text-ink">Notifications</h1>
            <p className="mt-0.5 text-sm text-ink/50">Your activity feed across the institute</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="rounded border border-ink/15 px-3 py-1.5 text-sm text-ink/70 hover:bg-gray-50 hover:text-ink"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* ── Filters ──────────────────────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Unread toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded border-ink/20"
            />
            Unread only
          </label>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded border border-ink/15 px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* ── Error ────────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── List ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="py-16 text-center text-sm text-ink/40">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-ink/10 bg-white py-16 text-center">
            <p className="text-3xl">🔔</p>
            <p className="mt-3 text-sm text-ink/50">No notifications{unreadOnly ? ' (unread)' : ''}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/8 rounded-lg border border-ink/10 bg-white">
            {items.map((n) => (
              <li
                key={n.id}
                className={`group flex items-start gap-4 px-5 py-4 transition-colors ${
                  n.is_read ? '' : 'bg-blue-50/30'
                } hover:bg-gray-50`}
              >
                {/* Unread dot */}
                <div className="mt-1 shrink-0">
                  {n.is_read ? (
                    <div className="h-2 w-2 rounded-full" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>

                {/* Icon */}
                <span className="mt-0.5 shrink-0 text-xl">{typeIcon(n.type)}</span>

                {/* Main content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <p className="text-sm font-semibold text-ink leading-snug">{n.title}</p>
                    <Badge type={n.type} />
                  </div>
                  <p className="mt-1 text-sm text-ink/60 leading-relaxed">{n.body}</p>
                  <p className="mt-1.5 text-xs text-ink/35">{timeAgo(n.created_at)}</p>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      title="Mark as read"
                      className="flex items-center gap-1 rounded border border-ink/10 px-2 py-1 text-xs text-ink/50 hover:border-accent hover:text-accent"
                    >
                      ✓ Read
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(n.id)}
                    title="Dismiss"
                    className="flex items-center gap-1 rounded border border-ink/10 px-2 py-1 text-xs text-ink/50 hover:border-red-300 hover:text-red-500"
                  >
                    ✕ Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ── Pagination ────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm text-ink/50">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => load(page - 1)}
                className="rounded border border-ink/15 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => load(page + 1)}
                className="rounded border border-ink/15 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
