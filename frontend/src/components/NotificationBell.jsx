// NotificationBell.jsx — Phase 13 (Notifications)
//
// A self-contained bell icon that:
//   • Polls unread count every 30 s (stops when dropdown is open)
//   • Shows a red badge with count when there are unread items
//   • Opens a compact dropdown listing the latest 10 notifications
//   • Lets the user mark individual items read, mark all read, or dismiss
//   • Links to the full /notifications page
//
// Usage (in DashboardLayout header):
//   import NotificationBell from './NotificationBell';
//   ...
//   <NotificationBell />

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../utils/notificationApi';

// ── Type → icon mapping ───────────────────────────────────────────────────────
const TYPE_ICONS = {
  FEE_RECEIVED:              '💰',
  ATTENDANCE_SUBMITTED:      '📋',
  ATTENDANCE_CHANGE_REQUEST: '🔄',
  STUDENT_ADDED:             '🎓',
  TEACHER_ADDED:             '👨‍🏫',
};

function typeIcon(type) {
  return TYPE_ICONS[type] || '🔔';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────

const NotificationBell = () => {
  const navigate = useNavigate();

  const [unread, setUnread]       = useState(0);
  const [open, setOpen]           = useState(false);
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);

  const panelRef = useRef(null);
  const pollRef  = useRef(null);

  // ── Poll unread count ─────────────────────────────────────────────────────

  const refreshCount = useCallback(async () => {
    try {
      const data = await fetchUnreadCount();
      setUnread(data.count ?? 0);
    } catch {
      // silently ignore — may not be logged in yet
    }
  }, []);

  useEffect(() => {
    refreshCount();
    pollRef.current = setInterval(refreshCount, 30_000);
    return () => clearInterval(pollRef.current);
  }, [refreshCount]);

  // ── Load items when dropdown opens ───────────────────────────────────────

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications({ limit: 10 });
      setItems(data.rows || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = () => {
    if (!open) loadItems();
    setOpen((v) => !v);
  };

  // ── Close on outside click ────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleMarkRead = async (id) => {
    await markNotificationRead(id).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  };

  const handleDelete = async (id) => {
    const wasUnread = items.find((n) => n.id === id)?.is_read === false;
    await deleteNotification(id).catch(() => {});
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnread((c) => Math.max(0, c - 1));
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead().catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const goToPage = () => {
    setOpen(false);
    navigate('/notifications');
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative flex h-8 w-8 items-center justify-center rounded border border-ink/10 text-ink/60 hover:bg-gray-50 hover:text-ink focus:outline-none"
      >
        {/* Bell SVG */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
             className="h-4 w-4" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {/* Badge */}
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[10px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-md border border-ink/10 bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink/8 px-4 py-3">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-96 overflow-y-auto divide-y divide-ink/5">
            {loading ? (
              <li className="px-4 py-6 text-center text-sm text-ink/40">Loading…</li>
            ) : items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-ink/40">No notifications yet</li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={`group flex items-start gap-3 px-4 py-3 ${
                    n.is_read ? 'opacity-60' : 'bg-blue-50/40'
                  } hover:bg-gray-50`}
                >
                  {/* Icon */}
                  <span className="mt-0.5 shrink-0 text-base">{typeIcon(n.type)}</span>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink leading-snug">{n.title}</p>
                    <p className="mt-0.5 text-xs text-ink/60 leading-snug line-clamp-2">{n.body}</p>
                    <p className="mt-1 text-[10px] text-ink/40">{timeAgo(n.created_at)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        title="Mark as read"
                        className="rounded p-0.5 text-ink/40 hover:text-accent"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                          <path fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      title="Dismiss"
                      className="rounded p-0.5 text-ink/40 hover:text-red-500"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          <div className="border-t border-ink/8 px-4 py-2.5">
            <button
              onClick={goToPage}
              className="w-full text-center text-xs font-medium text-accent hover:underline"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
