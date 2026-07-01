// AuditLogPage.jsx — Phase 12 (Audit Log System)
// Access: Owner + Admin only. Teachers are redirected away by ProtectedRoute.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { fetchAuditLogs, fetchAuditSummary, fetchAuditFilters } from '../utils/auditApi';
import { useAuth } from '../context/AuthContext';

// ── Category colour badges ────────────────────────────────────────────────────
const CATEGORY_STYLES = {
  Students:   'bg-blue-50   text-blue-700   border-blue-200',
  Teachers:   'bg-purple-50 text-purple-700 border-purple-200',
  Fees:       'bg-green-50  text-green-700  border-green-200',
  Expenses:   'bg-orange-50 text-orange-700 border-orange-200',
  Attendance: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Users:      'bg-gray-50   text-gray-700   border-gray-200',
  Auth:       'bg-red-50    text-red-700    border-red-200',
};

// ── Action icons ──────────────────────────────────────────────────────────────
const ACTION_ICONS = {
  STUDENT_ADDED:          '➕',
  STUDENT_UPDATED:        '✏️',
  STUDENT_DELETED:        '🗑️',
  TEACHER_ADDED:          '➕',
  TEACHER_UPDATED:        '✏️',
  TEACHER_DELETED:        '🗑️',
  FEE_GENERATED:          '💰',
  FEE_PAYMENT_RECORDED:   '✅',
  FEE_UPDATED:            '✏️',
  FEE_WAIVED:             '🎁',
  EXPENSE_ADDED:          '➕',
  EXPENSE_UPDATED:        '✏️',
  EXPENSE_DELETED:        '🗑️',
  ATTENDANCE_MARKED:      '📋',
  ATTENDANCE_MODIFIED:    '🔄',
  USER_CREATED:           '👤',
  USER_UPDATED:           '✏️',
  USER_DELETED:           '🗑️',
  USER_LOGIN:             '🔑',
  USER_LOGOUT:            '🚪',
};

function BadgeCategory({ category }) {
  const style = CATEGORY_STYLES[category] || 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${style}`}>
      {category}
    </span>
  );
}

function ActionIcon({ action }) {
  return (
    <span className="text-base" title={action}>
      {ACTION_ICONS[action] || '📝'}
    </span>
  );
}

function RoleBadge({ role }) {
  const styles = {
    owner:   'bg-indigo-50 text-indigo-700',
    admin:   'bg-blue-50   text-blue-700',
    teacher: 'bg-green-50  text-green-700',
    system:  'bg-gray-50   text-gray-500',
  };
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ${styles[role] || 'bg-gray-50 text-gray-600'}`}>
      {role}
    </span>
  );
}

function formatDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleString('en-PK', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCards({ summary }) {
  if (!summary) return null;
  const cards = [
    { label: 'Total Actions', value: summary.total,     icon: '📊' },
    { label: 'Today',         value: summary.today,     icon: '📅' },
    { label: 'This Week',     value: summary.thisWeek,  icon: '📆' },
    { label: 'This Month',    value: summary.thisMonth, icon: '🗓️' },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(c => (
        <div key={c.label} className="rounded-lg border border-ink/10 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">{c.icon}</span>
            <span className="text-xs text-ink/50">{c.label}</span>
          </div>
          <p className="mt-1 font-display text-2xl text-ink">{c.value.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // Guard — teacher should not reach here (ProtectedRoute handles it,
  // but defensive check in case of direct navigation)
  useEffect(() => {
    if (user?.role === 'teacher') navigate('/', { replace: true });
  }, [user, navigate]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    search:   '',
    category: '',
    action:   '',
    dateFrom: '',
    dateTo:   '',
  });
  const [page,  setPage]  = useState(1);
  const LIMIT = 50;

  // ── Data ───────────────────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState([]);
  const [total,      setTotal]      = useState(0);
  const [summary,    setSummary]    = useState(null);
  const [categories, setCategories] = useState([]);
  const [actions,    setActions]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // Load filter options once
  useEffect(() => {
    fetchAuditFilters().then(f => {
      setCategories(f.categories || []);
      setActions(f.actions || []);
    }).catch(() => {});

    fetchAuditSummary().then(setSummary).catch(() => {});
  }, []);

  // Re-load actions when category changes
  useEffect(() => {
    fetchAuditFilters(filters.category).then(f => {
      setActions(f.actions || []);
      // If current action not in new list, clear it
      setFilters(prev => ({
        ...prev,
        action: f.actions?.includes(prev.action) ? prev.action : '',
      }));
    }).catch(() => {});
  }, [filters.category]);

  // Load logs when filters/page change
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAuditLogs({ ...filters, page, limit: LIMIT });
      setLogs(result.rows || []);
      setTotal(result.total || 0);
    } catch (e) {
      setError(e.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const totalPages = Math.ceil(total / LIMIT) || 1;

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters({ search: '', category: '', action: '', dateFrom: '', dateTo: '' });
    setPage(1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Audit Log">
      <div className="mx-auto max-w-6xl px-4 py-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-ink">Audit Log</h1>
            <p className="mt-1 text-sm text-ink/50">
              Track all important actions across the system.
            </p>
          </div>
          <button
            onClick={loadLogs}
            className="rounded border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink/70 hover:bg-gray-50"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Summary cards */}
        <SummaryCards summary={summary} />

        {/* Filters */}
        <div className="mb-4 rounded-lg border border-ink/10 bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">

            {/* Search */}
            <input
              type="text"
              placeholder="Search description, name…"
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              className="col-span-1 rounded border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent lg:col-span-2"
            />

            {/* Category */}
            <select
              value={filters.category}
              onChange={e => handleFilterChange('category', e.target.value)}
              className="rounded border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Action */}
            <select
              value={filters.action}
              onChange={e => handleFilterChange('action', e.target.value)}
              className="rounded border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              disabled={!actions.length}
            >
              <option value="">All Actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="rounded border border-ink/15 bg-gray-50 px-3 py-2 text-sm text-ink/60 hover:bg-gray-100"
            >
              Reset Filters
            </button>
          </div>

          {/* Date range */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-xs text-ink/50">Date range:</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => handleFilterChange('dateFrom', e.target.value)}
              className="rounded border border-ink/15 px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
            <span className="text-ink/40 text-sm">to</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => handleFilterChange('dateTo', e.target.value)}
              className="rounded border border-ink/15 px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results count */}
        <p className="mb-2 text-xs text-ink/40">
          {total.toLocaleString()} {total === 1 ? 'entry' : 'entries'}
          {filters.search || filters.category || filters.action || filters.dateFrom || filters.dateTo
            ? ' matching filters'
            : ' total'}
        </p>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-white">
          {loading ? (
            <div className="py-16 text-center text-sm text-ink/40">Loading…</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl">📋</p>
              <p className="mt-2 text-sm text-ink/50">No audit entries found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-ink/10 bg-gray-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/50 uppercase tracking-wide">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/50 uppercase tracking-wide">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/50 uppercase tracking-wide">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/50 uppercase tracking-wide">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/50 uppercase tracking-wide">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink/50 uppercase tracking-wide hidden lg:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-ink/60 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-ink">{log.user_name}</span>
                          <RoleBadge role={log.user_role} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <BadgeCategory category={log.category} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <ActionIcon action={log.action} />
                          <span className="text-xs font-mono text-ink/70">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-ink">{log.description}</p>
                        {log.entity_label && (
                          <p className="text-xs text-ink/40">{log.entity_type}: {log.entity_label}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-ink/30 font-mono">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-ink/40">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="rounded border border-ink/15 px-3 py-1.5 text-sm text-ink/70 hover:bg-gray-50 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="rounded border border-ink/15 px-3 py-1.5 text-sm text-ink/70 hover:bg-gray-50 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Category breakdown (from summary) */}
        {summary?.byCategory?.length > 0 && (
          <div className="mt-6 rounded-lg border border-ink/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-medium text-ink">Actions by Category</h3>
            <div className="flex flex-wrap gap-2">
              {summary.byCategory.map(row => (
                <button
                  key={row.category}
                  onClick={() => handleFilterChange('category', row.category)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors
                    ${filters.category === row.category
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-ink/10 bg-gray-50 text-ink/60 hover:border-ink/25'
                    }`}
                >
                  <span>{row.category}</span>
                  <span className="font-medium">{row.cnt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
