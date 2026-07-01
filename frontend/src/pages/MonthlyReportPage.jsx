import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getMonthlyReport, getAvailableMonths } from '../utils/reportApi';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const currentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

const pct = (val) => {
  const n = parseFloat(val || 0);
  return isNaN(n) ? '0.00' : n.toFixed(2);
};

const pctColor = (val) => {
  const n = parseFloat(val || 0);
  if (n >= 90) return 'text-green-600';
  if (n >= 75) return 'text-yellow-600';
  return 'text-red-600';
};

const StatCard = ({ label, value, colorClass = 'text-ink' }) => (
  <div className="rounded-sm border border-ink/10 bg-white p-5 text-center">
    <div className={`font-display text-4xl ${colorClass}`}>{value ?? '—'}</div>
    <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</div>
  </div>
);

// -------------------------------------------------------
// Page
// -------------------------------------------------------

const MonthlyReportPage = () => {
  const [month, setMonth]                   = useState(currentMonth());
  const [classFilter, setClassFilter]       = useState('');
  const [sectionFilter, setSectionFilter]   = useState('');
  const [page, setPage]                     = useState(1);
  const [report, setReport]                 = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  // Load month options
  useEffect(() => {
    getAvailableMonths()
      .then((d) => setAvailableMonths(d.months || []))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMonthlyReport({
        month:     month     || undefined,
        className: classFilter   || undefined,
        section:   sectionFilter || undefined,
        page,
        limit: 50,
      });
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load monthly report.');
    } finally {
      setLoading(false);
    }
  }, [month, classFilter, sectionFilter, page]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleFilterChange = () => {
    setPage(1);
  };

  const totals = report?.totals;
  const students = report?.students || [];
  const pagination = report?.pagination || { total: 0, page: 1, totalPages: 1 };

  return (
    <DashboardLayout title="Monthly Attendance Report">
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        {/* Month */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Month</label>
          {availableMonths.length > 0 ? (
            <select
              value={month}
              onChange={(e) => { setMonth(e.target.value); handleFilterChange(); }}
              className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); handleFilterChange(); }}
              className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
            />
          )}
        </div>

        {/* Class */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Class</label>
          <input
            type="text"
            placeholder="e.g. Grade 9"
            value={classFilter}
            onChange={(e) => { setClassFilter(e.target.value); handleFilterChange(); }}
            className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none w-36"
          />
        </div>

        {/* Section */}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Section</label>
          <input
            type="text"
            placeholder="e.g. A"
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); handleFilterChange(); }}
            className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none w-28"
          />
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <p className="py-10 text-center text-sm text-ink/50">Loading report…</p>
      )}
      {error && !loading && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Report content */}
      {report && !loading && (
        <>
          {/* Aggregate summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard label="Total Students"  value={totals?.totalStudents} />
            <StatCard label="Total Present"   value={totals?.totalPresent}  colorClass="text-green-600" />
            <StatCard label="Total Absent"    value={totals?.totalAbsent}   colorClass="text-red-600" />
            <StatCard label="Total Leave"     value={totals?.totalLeave}    colorClass="text-yellow-600" />
            <div className="rounded-sm border border-ink/10 bg-white p-5 text-center">
              <div className={`font-display text-4xl ${pctColor(totals?.overallAttendancePercentage)}`}>
                {pct(totals?.overallAttendancePercentage)}%
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">
                Attendance Rate
              </div>
            </div>
          </div>

          {/* Per-student table */}
          <div className="rounded-sm border border-ink/10 bg-white">
            <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">
                Student Statistics
                {month && (
                  <span className="ml-2 text-xs font-normal text-ink/50">— {month}</span>
                )}
              </h2>
              <span className="text-xs text-ink/40">
                {pagination.total} student{pagination.total !== 1 ? 's' : ''}
              </span>
            </div>

            {students.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink/40">
                No records found for the selected filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/50">
                      <th className="px-4 py-2">Student ID</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Class</th>
                      <th className="px-4 py-2">Section</th>
                      <th className="px-4 py-2 text-right">Days</th>
                      <th className="px-4 py-2 text-right text-green-700">Present</th>
                      <th className="px-4 py-2 text-right text-red-700">Absent</th>
                      <th className="px-4 py-2 text-right text-yellow-700">Leave</th>
                      <th className="px-4 py-2 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr
                        key={s.student_id}
                        className="border-b border-ink/5 hover:bg-ink/[.02] transition-colors"
                      >
                        <td className="px-4 py-2 font-mono text-xs text-ink/60">
                          {s.student_code}
                        </td>
                        <td className="px-4 py-2 font-medium">{s.full_name}</td>
                        <td className="px-4 py-2">{s.class_name}</td>
                        <td className="px-4 py-2">{s.section}</td>
                        <td className="px-4 py-2 text-right">{s.total_days}</td>
                        <td className="px-4 py-2 text-right font-medium text-green-600">
                          {s.total_present}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-red-600">
                          {s.total_absent}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-yellow-600">
                          {s.total_leave}
                        </td>
                        <td className={`px-4 py-2 text-right font-semibold ${pctColor(s.attendance_percentage)}`}>
                          {pct(s.attendance_percentage)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-ink/10 px-4 py-3 text-sm">
                <span className="text-xs text-ink/50">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page <= 1}
                    className="rounded-sm border border-ink/20 px-3 py-1 text-xs disabled:opacity-40 hover:bg-ink/5"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                    disabled={page >= pagination.totalPages}
                    className="rounded-sm border border-ink/20 px-3 py-1 text-xs disabled:opacity-40 hover:bg-ink/5"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!report && !loading && !error && (
        <div className="py-16 text-center text-sm text-ink/40">
          No monthly data available for the selected filters.
        </div>
      )}
    </DashboardLayout>
  );
};

export default MonthlyReportPage;
