import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import {
  listDefaulters,
  getDefaulterStats,
  getDefaulterFilterOptions,
} from '../utils/defaulterApi';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const PKR = (n) =>
  new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(parseFloat(n || 0));

const MONTH_OPTIONS = (() => {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-PK', { month: 'long', year: 'numeric' });
    opts.push({ value, label });
  }
  return opts;
})();

// -------------------------------------------------------
// Sub-components
// -------------------------------------------------------

const KpiCard = ({ label, value, sub, color = 'text-ink', bg = 'bg-white', prefix = '' }) => (
  <div className={`rounded-sm border border-ink/10 ${bg} p-5`}>
    <div className={`font-display text-3xl ${color}`}>
      {prefix}{typeof value === 'number' && prefix === 'Rs ' ? PKR(value) : value ?? '—'}
    </div>
    <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</div>
    {sub && <div className="mt-0.5 text-xs text-ink/40">{sub}</div>}
  </div>
);

const SortIcon = ({ active, dir }) => {
  if (!active) return <span className="ml-1 text-ink/20">↕</span>;
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
};

const StatusPill = ({ count, label, color }) =>
  count > 0 ? (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {count} {label}
    </span>
  ) : null;

// -------------------------------------------------------
// Main Page
// -------------------------------------------------------

const DefaulterDashboardPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters (read from URL for shareability)
  const [filters, setFilters] = useState({
    class: searchParams.get('class') || '',
    batch: searchParams.get('batch') || '',
    month: searchParams.get('month') || '',
    search: searchParams.get('search') || '',
  });
  const [sortBy, setSortBy]   = useState('outstanding_balance');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage]       = useState(1);

  // Data
  const [stats, setStats]           = useState(null);
  const [defaulters, setDefaulters] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filterOpts, setFilterOpts] = useState({ classes: [], batches: [] });

  // UI state
  const [loading, setLoading]       = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError]           = useState('');

  // -------------------------------------------------------
  // Load filter options once
  // -------------------------------------------------------
  useEffect(() => {
    getDefaulterFilterOptions()
      .then(setFilterOpts)
      .catch(() => {});
  }, []);

  // -------------------------------------------------------
  // Load stats whenever top-level filters change
  // -------------------------------------------------------
  useEffect(() => {
    setStatsLoading(true);
    const p = {};
    if (filters.class) p.class = filters.class;
    if (filters.batch) p.batch = filters.batch;
    if (filters.month) p.month = filters.month;

    getDefaulterStats(p)
      .then((d) => setStats(d.stats))
      .catch(() => setError('Failed to load defaulter statistics.'))
      .finally(() => setStatsLoading(false));
  }, [filters.class, filters.batch, filters.month]);

  // -------------------------------------------------------
  // Load defaulter list
  // -------------------------------------------------------
  const loadDefaulters = useCallback(() => {
    setLoading(true);
    setError('');

    const p = { sortBy, sortDir, page, limit: 20 };
    if (filters.class)  p.class  = filters.class;
    if (filters.batch)  p.batch  = filters.batch;
    if (filters.month)  p.month  = filters.month;
    if (filters.search) p.search = filters.search;

    listDefaulters(p)
      .then((d) => {
        setDefaulters(d.data);
        setPagination(d.pagination);
      })
      .catch(() => setError('Failed to load defaulters.'))
      .finally(() => setLoading(false));
  }, [filters, sortBy, sortDir, page]);

  useEffect(() => {
    loadDefaulters();
  }, [loadDefaulters]);

  // -------------------------------------------------------
  // Filter handlers
  // -------------------------------------------------------
  const applyFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      value ? next.set(key, value) : next.delete(key);
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({ class: '', batch: '', month: '', search: '' });
    setPage(1);
    setSearchParams({});
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <DashboardLayout title="Fee Defaulters">
      {/* ── Breadcrumb / sub-nav ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-ink/50">
        <Link to="/fees/dashboard" className="hover:text-ink">
          Fee Dashboard
        </Link>
        <span>/</span>
        <span className="text-ink">Defaulters</span>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Defaulters"
          value={stats?.totalDefaulters ?? '—'}
          color="text-red-700"
          bg="bg-red-50"
        />
        <KpiCard
          label="Total Outstanding"
          value={stats?.totalOutstanding}
          prefix="Rs "
          color="text-red-700"
          bg="bg-red-50"
        />
        <KpiCard
          label="Unpaid Records"
          value={stats?.unpaidRecords ?? '—'}
          color="text-orange-700"
          bg="bg-orange-50"
        />
        <KpiCard
          label="Partial Records"
          value={stats?.partialRecords ?? '—'}
          color="text-yellow-700"
          bg="bg-yellow-50"
          sub="Partially paid"
        />
      </div>

      {/* ── Filters ── */}
      <div className="mb-6 rounded-sm border border-ink/10 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Search
            </label>
            <input
              type="text"
              placeholder="Name, ID, father's name…"
              value={filters.search}
              onChange={(e) => applyFilter('search', e.target.value)}
              className="w-full rounded-sm border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-ink/40 focus:outline-none"
            />
          </div>

          {/* Class */}
          <div className="min-w-[130px]">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Class
            </label>
            <select
              value={filters.class}
              onChange={(e) => applyFilter('class', e.target.value)}
              className="w-full rounded-sm border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none"
            >
              <option value="">All Classes</option>
              {filterOpts.classes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Batch */}
          <div className="min-w-[130px]">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Batch
            </label>
            <select
              value={filters.batch}
              onChange={(e) => applyFilter('batch', e.target.value)}
              className="w-full rounded-sm border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none"
            >
              <option value="">All Batches</option>
              {filterOpts.batches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
              Month
            </label>
            <select
              value={filters.month}
              onChange={(e) => applyFilter('month', e.target.value)}
              className="w-full rounded-sm border border-ink/20 bg-canvas px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none"
            >
              <option value="">All Months</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Clear */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="rounded-sm border border-ink/15 px-3 py-2 text-sm text-ink/60 transition hover:bg-ink/5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-sm border border-ink/10 bg-white">
        {/* Table header row */}
        <div className="border-b border-ink/10 px-5 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">
            {pagination ? (
              <>
                {pagination.total} defaulter{pagination.total !== 1 ? 's' : ''}
                {hasFilters && <span className="ml-1 text-ink/40">(filtered)</span>}
              </>
            ) : (
              'Loading…'
            )}
          </span>
          <Link
            to="/fees"
            className="text-xs text-ink/50 hover:text-ink"
          >
            View all fee records →
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-ink/40">Loading defaulters…</div>
        ) : defaulters.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">✓</div>
            <div className="font-display text-lg text-ink">No defaulters found</div>
            <div className="mt-1 text-sm text-ink/50">
              {hasFilters ? 'Try adjusting your filters.' : 'All students are up to date with payments.'}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="px-5 py-3">Student</th>
                    <th className="px-4 py-3">Class / Batch</th>
                    <th
                      className="cursor-pointer px-4 py-3 hover:text-ink/60"
                      onClick={() => handleSort('due_months_count')}
                    >
                      Due Months
                      <SortIcon active={sortBy === 'due_months_count'} dir={sortDir} />
                    </th>
                    <th className="px-4 py-3">Due Period</th>
                    <th
                      className="cursor-pointer px-4 py-3 text-right hover:text-ink/60"
                      onClick={() => handleSort('outstanding_balance')}
                    >
                      Outstanding
                      <SortIcon active={sortBy === 'outstanding_balance'} dir={sortDir} />
                    </th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {defaulters.map((d) => (
                    <DefaulterRow key={d.student_id} row={d} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-ink/10 px-5 py-3">
                <span className="text-xs text-ink/40">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-sm border border-ink/15 px-3 py-1.5 text-xs disabled:opacity-30 hover:bg-ink/5"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-sm border border-ink/15 px-3 py-1.5 text-xs disabled:opacity-30 hover:bg-ink/5"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

// -------------------------------------------------------
// Defaulter Row
// -------------------------------------------------------
const DefaulterRow = ({ row }) => {
  const [expanded, setExpanded] = useState(false);

  const oldest = row.oldest_due_month
    ? new Date(row.oldest_due_month).toLocaleString('en-PK', { month: 'short', year: 'numeric' })
    : '—';
  const latest = row.latest_due_month
    ? new Date(row.latest_due_month).toLocaleString('en-PK', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <>
      <tr className="hover:bg-ink/[0.02]">
        {/* Student */}
        <td className="px-5 py-3">
          <div className="font-medium text-ink">{row.student_name}</div>
          <div className="text-xs text-ink/50">{row.student_code} · {row.father_name}</div>
          {row.contact_number && (
            <div className="text-xs text-ink/40">{row.contact_number}</div>
          )}
        </td>

        {/* Class / Batch */}
        <td className="px-4 py-3">
          <div className="text-ink">{row.class || '—'}</div>
          <div className="text-xs text-ink/50">{row.batch || '—'}</div>
        </td>

        {/* Due months count */}
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 font-display text-xl text-red-600">
              {row.due_months_count}
            </span>
            <div className="flex flex-wrap gap-1">
              <StatusPill count={parseInt(row.unpaid_count)} label="unpaid" color="bg-red-100 text-red-700" />
              <StatusPill count={parseInt(row.partial_count)} label="partial" color="bg-yellow-100 text-yellow-700" />
            </div>
          </div>
        </td>

        {/* Due period */}
        <td className="px-4 py-3 text-sm text-ink/70">
          <div>{oldest}</div>
          {oldest !== latest && (
            <div className="text-xs text-ink/40">to {latest}</div>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-xs text-accent hover:underline"
          >
            {expanded ? 'Hide months ▲' : 'Show months ▼'}
          </button>
        </td>

        {/* Outstanding */}
        <td className="px-4 py-3 text-right">
          <div className="font-display text-base text-red-700">
            Rs {PKR(row.outstanding_balance)}
          </div>
          {parseFloat(row.total_paid_partial) > 0 && (
            <div className="text-xs text-ink/40">
              Partial paid: Rs {PKR(row.total_paid_partial)}
            </div>
          )}
        </td>

        {/* Action */}
        <td className="px-4 py-3 text-right">
          <Link
            to={`/fees/due/${row.student_id}`}
            className="rounded-sm border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-ink hover:text-canvas"
          >
            Collect Fee
          </Link>
        </td>
      </tr>

      {/* Expanded month list */}
      {expanded && (
        <tr className="bg-ink/[0.02]">
          <td colSpan={6} className="px-5 pb-3 pt-1">
            <div className="text-xs text-ink/60 mb-1 font-medium uppercase tracking-wide">Due Months</div>
            <div className="flex flex-wrap gap-1.5">
              {(row.due_month_labels || []).map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs text-red-700"
                >
                  {m}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default DefaulterDashboardPage;
