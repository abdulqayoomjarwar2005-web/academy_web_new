import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getDailyReport, getAvailableDates } from '../utils/reportApi';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const today = () => new Date().toISOString().split('T')[0];

const STATUS_COLORS = {
  present: { badge: 'bg-green-100 text-green-800',  ring: 'border-green-300' },
  absent:  { badge: 'bg-red-100   text-red-800',    ring: 'border-red-300'   },
  leave:   { badge: 'bg-yellow-100 text-yellow-800', ring: 'border-yellow-300' },
};

const StatCard = ({ label, value, colorClass = 'text-ink' }) => (
  <div className="rounded-sm border border-ink/10 bg-white p-5 text-center">
    <div className={`font-display text-4xl ${colorClass}`}>{value ?? '—'}</div>
    <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</div>
  </div>
);

const StudentTable = ({ rows, status }) => {
  if (!rows || rows.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-ink/40">
        No {status} students on this date.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/50">
            <th className="py-2 pr-4">Student ID</th>
            <th className="py-2 pr-4">Full Name</th>
            <th className="py-2 pr-4">Class</th>
            <th className="py-2 pr-4">Section</th>
            <th className="py-2">Marked By</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.attendance_id}
              className="border-b border-ink/5 hover:bg-ink/[.02] transition-colors"
            >
              <td className="py-2 pr-4 font-mono text-ink/70">{r.student_code}</td>
              <td className="py-2 pr-4 font-medium">{r.full_name}</td>
              <td className="py-2 pr-4">{r.class_name}</td>
              <td className="py-2 pr-4">{r.section}</td>
              <td className="py-2 text-ink/60">{r.marked_by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// -------------------------------------------------------
// Page
// -------------------------------------------------------

const DailyReportPage = () => {
  const [date, setDate]               = useState(today());
  const [report, setReport]           = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [activeTab, setActiveTab]     = useState('present');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Load available dates for helper hint
  useEffect(() => {
    getAvailableDates()
      .then((d) => setAvailableDates(d.dates || []))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const data = await getDailyReport(date);
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load daily report.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const tabs = [
    { key: 'present', label: 'Present', count: report?.summary.presentCount ?? 0, color: 'text-green-600' },
    { key: 'absent',  label: 'Absent',  count: report?.summary.absentCount  ?? 0, color: 'text-red-600'   },
    { key: 'leave',   label: 'Leave',   count: report?.summary.leaveCount   ?? 0, color: 'text-yellow-600' },
  ];

  return (
    <DashboardLayout title="Daily Attendance Report">
      {/* Date picker */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Select Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today()}
            className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>
        {availableDates.length > 0 && (
          <p className="text-xs text-ink/40">
            {availableDates.length} submitted date
            {availableDates.length !== 1 ? 's' : ''} available
          </p>
        )}
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
          {/* Lock badge */}
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                report.summary.isLocked
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {report.summary.isLocked ? '✓ Submitted' : '⚠ Draft / Unsubmitted'}
            </span>
            <span className="text-xs text-ink/40">
              {new Date(date).toLocaleDateString('en-GB', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </span>
          </div>

          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Total Students"
              value={report.summary.totalStudents}
            />
            <StatCard
              label="Present"
              value={report.summary.presentCount}
              colorClass="text-green-600"
            />
            <StatCard
              label="Absent"
              value={report.summary.absentCount}
              colorClass="text-red-600"
            />
            <StatCard
              label="Leave"
              value={report.summary.leaveCount}
              colorClass="text-yellow-600"
            />
          </div>

          {/* Attendance % bar */}
          {report.summary.totalStudents > 0 && (
            <div className="mb-6 rounded-sm border border-ink/10 bg-white p-4">
              <div className="mb-1 flex justify-between text-xs text-ink/60">
                <span>Attendance Rate</span>
                <span className="font-semibold text-ink">
                  {report.summary.attendancePercentage}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-ink/10">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(report.summary.attendancePercentage, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Tabs: present / absent / leave */}
          <div className="rounded-sm border border-ink/10 bg-white">
            {/* Tab headers */}
            <div className="flex border-b border-ink/10">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === t.key
                      ? `border-b-2 border-accent ${t.color}`
                      : 'text-ink/50 hover:text-ink/80'
                  }`}
                >
                  {t.label}
                  <span
                    className={`ml-2 rounded-full px-1.5 py-0.5 text-xs ${
                      STATUS_COLORS[t.key].badge
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab body */}
            <div className="p-4">
              <StudentTable rows={report[activeTab]} status={activeTab} />
            </div>
          </div>
        </>
      )}

      {/* No data */}
      {!report && !loading && !error && (
        <div className="py-16 text-center text-sm text-ink/40">
          No attendance records found for {date}.
        </div>
      )}
    </DashboardLayout>
  );
};

export default DailyReportPage;
