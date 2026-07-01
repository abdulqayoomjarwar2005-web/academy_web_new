import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { getDaySummary, getAttendanceHistory } from '../utils/attendanceApi';
import { useAuth } from '../context/AuthContext';

const today = () => new Date().toISOString().split('T')[0];

const StatCard = ({ label, value, color = 'text-ink' }) => (
  <div className="rounded-sm border border-ink/10 bg-white p-5 text-center">
    <div className={`font-display text-4xl ${color}`}>{value ?? '—'}</div>
    <div className="mt-1 text-xs text-ink/50 uppercase tracking-wide">{label}</div>
  </div>
);

const STATUS_BAR_COLORS = {
  present: 'bg-green-400',
  absent:  'bg-red-400',
  leave:   'bg-yellow-400',
};

const AttendanceDashboardPage = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState(null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [sumData, histData] = await Promise.all([
          getDaySummary(date),
          getAttendanceHistory({ date, limit: 5, page: 1 }),
        ]);
        setSummary(sumData.summary);
        setRecentRecords(histData.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [date]);

  const total   = parseInt(summary?.total   || 0, 10);
  const present = parseInt(summary?.present || 0, 10);
  const absent  = parseInt(summary?.absent  || 0, 10);
  const leave   = parseInt(summary?.leave   || 0, 10);

  const pctPresent = total ? Math.round((present / total) * 100) : 0;
  const pctAbsent  = total ? Math.round((absent  / total) * 100) : 0;
  const pctLeave   = total ? Math.round((leave   / total) * 100) : 0;

  const canSeeRequests = user?.role === 'admin' || user?.role === 'owner';

  return (
    <DashboardLayout title="Attendance Dashboard">
      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          to="/attendance/mark"
          className="rounded-sm border border-ink/20 bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80"
        >
          Mark Attendance
        </Link>
        <Link
          to="/attendance/history"
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          View History
        </Link>
        {canSeeRequests && (
          <Link
            to="/attendance/edit-requests"
            className="rounded-sm border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
          >
            Edit Requests
          </Link>
        )}
      </div>

      {/* Date Selector */}
      <div className="mb-6 flex items-center gap-3">
        <label className="text-sm font-medium text-ink/60">Viewing date:</label>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
        />
      </div>

      {error && <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Students" value={total} />
            <StatCard label="Present" value={present} color="text-green-600" />
            <StatCard label="Absent"  value={absent}  color="text-red-600" />
            <StatCard label="Leave"   value={leave}   color="text-yellow-600" />
          </div>

          {/* Attendance Bar */}
          {total > 0 && (
            <div className="mb-8">
              <div className="mb-2 flex items-center justify-between text-xs text-ink/50">
                <span>Attendance breakdown ({date})</span>
                <span>{pctPresent}% present</span>
              </div>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-ink/10">
                <div className={`${STATUS_BAR_COLORS.present} transition-all`} style={{ width: `${pctPresent}%` }} title={`Present: ${present}`} />
                <div className={`${STATUS_BAR_COLORS.leave}   transition-all`} style={{ width: `${pctLeave}%` }}   title={`Leave: ${leave}`} />
                <div className={`${STATUS_BAR_COLORS.absent}  transition-all`} style={{ width: `${pctAbsent}%` }}  title={`Absent: ${absent}`} />
              </div>
              <div className="mt-2 flex gap-4 text-xs text-ink/50">
                {[
                  { label: 'Present', pct: pctPresent, color: 'bg-green-400' },
                  { label: 'Leave',   pct: pctLeave,   color: 'bg-yellow-400' },
                  { label: 'Absent',  pct: pctAbsent,  color: 'bg-red-400' },
                ].map(({ label, pct, color }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
                    {label} ({pct}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lock status */}
          <div className="mb-8 flex items-center gap-2 text-sm">
            <span className={`inline-block h-2 w-2 rounded-full ${summary?.is_locked ? 'bg-green-400' : 'bg-amber-400'}`} />
            {summary?.is_locked
              ? 'Attendance for this date has been submitted and locked.'
              : total > 0
                ? 'Attendance has not been submitted for this date yet.'
                : 'No attendance records for this date.'}
          </div>

          {/* Recent Records */}
          {recentRecords.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg text-ink">Recent Records</h2>
                <Link to="/attendance/history" className="text-xs text-accent hover:underline">
                  View all →
                </Link>
              </div>
              <div className="overflow-x-auto rounded-sm border border-ink/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/10 bg-ink/3 text-left text-xs uppercase tracking-wide text-ink/50">
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Class</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Marked By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {recentRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-ink/2">
                        <td className="px-4 py-2 font-medium text-ink">{r.full_name}</td>
                        <td className="px-4 py-2 text-ink/60">{r.class_name}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium capitalize
                            ${r.status === 'present' ? 'bg-green-100 text-green-800' :
                              r.status === 'absent'  ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-ink/50 text-xs">{r.marked_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default AttendanceDashboardPage;
