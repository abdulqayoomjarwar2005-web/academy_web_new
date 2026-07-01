import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getAttendanceHistory, ATTENDANCE_STATUS_OPTIONS } from '../utils/attendanceApi';

const STATUS_COLORS = {
  present: 'bg-green-100 text-green-800',
  absent:  'bg-red-100 text-red-800',
  leave:   'bg-yellow-100 text-yellow-800',
};

const AttendanceHistoryPage = () => {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAttendanceHistory({
        date:      dateFilter   || undefined,
        status:    statusFilter || undefined,
        className: classFilter  || undefined,
        page,
        limit: 20,
      });
      setRecords(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, classFilter, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFilterChange = () => {
    setPage(1);
    fetchHistory();
  };

  return (
    <DashboardLayout title="Attendance History">
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Date</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
          >
            <option value="">All Statuses</option>
            {ATTENDANCE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink/60 mb-1">Class</label>
          <input
            type="text"
            placeholder="e.g. Grade 9"
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
            className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>
        <button
          onClick={() => { setDateFilter(''); setStatusFilter(''); setClassFilter(''); setPage(1); }}
          className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink/60 hover:bg-ink/5"
        >
          Clear Filters
        </button>
      </div>

      {error && <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center text-ink/40">No attendance records found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-sm border border-ink/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/3 text-left text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Marked By</th>
                  <th className="px-4 py-3">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-ink/2">
                    <td className="px-4 py-3 text-ink/80">{r.attendance_date}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink/60">{r.student_code}</td>
                    <td className="px-4 py-3 font-medium text-ink">{r.full_name}</td>
                    <td className="px-4 py-3 text-ink/70">{r.class_name}</td>
                    <td className="px-4 py-3 text-ink/70">{r.section}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-500'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/60">{r.marked_by}</td>
                    <td className="px-4 py-3 text-ink/50 text-xs">
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between text-sm text-ink/60">
            <span>{pagination.total} records total</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-sm border border-ink/20 px-3 py-1 hover:bg-ink/5 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-1">Page {page} of {pagination.totalPages}</span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-sm border border-ink/20 px-3 py-1 hover:bg-ink/5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default AttendanceHistoryPage;
