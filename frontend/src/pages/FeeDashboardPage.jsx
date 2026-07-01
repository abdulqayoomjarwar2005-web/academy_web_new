import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { getFeeDashboard } from '../utils/feeApi';
import { useAuth } from '../context/AuthContext';

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const StatCard = ({ label, value, sub, color = 'text-ink', bg = 'bg-white' }) => (
  <div className={`rounded-sm border border-ink/10 ${bg} p-5`}>
    <div className={`font-display text-3xl ${color}`}>Rs {fmt(value)}</div>
    <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</div>
    {sub && <div className="mt-0.5 text-xs text-ink/40">{sub}</div>}
  </div>
);

const CountCard = ({ label, value, color = 'text-ink' }) => (
  <div className="rounded-sm border border-ink/10 bg-white p-5 text-center">
    <div className={`font-display text-4xl ${color}`}>{value ?? '—'}</div>
    <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</div>
  </div>
);

const FeeDashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isReadOnly = user?.role === 'teacher';

  useEffect(() => {
    getFeeDashboard()
      .then((d) => setStats(d.stats))
      .catch(() => setError('Failed to load fee statistics.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Fee Dashboard">
      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          to="/fees"
          className="rounded-sm border border-ink/20 bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80"
        >
          Fee Records
        </Link>
        {!isReadOnly && (
          <>
            <Link
              to="/fees/generate"
              className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
            >
              Generate Monthly Fees
            </Link>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : stats ? (
        <>
          {/* Collection Stats */}
          <h2 className="mb-4 font-display text-lg text-ink">Collections</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Today's Collection"
              value={stats.todayCollection}
              color="text-green-700"
              bg="bg-green-50"
            />
            <StatCard
              label="Weekly Collection"
              value={stats.weeklyCollection}
              sub="Current week"
            />
            <StatCard
              label="Monthly Collection"
              value={stats.monthlyCollection}
              sub="Current month"
            />
            <StatCard
              label="Yearly Collection"
              value={stats.yearlyCollection}
              sub="Current year"
            />
          </div>

          {/* Outstanding */}
          <div className="mb-8">
            <div className="rounded-sm border border-red-200 bg-red-50 p-5">
              <div className="font-display text-3xl text-red-700">Rs {fmt(stats.totalOutstanding)}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-red-500">
                Total Outstanding Balance
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          <h2 className="mb-4 font-display text-lg text-ink">Fee Status</h2>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <CountCard label="Paid Records"    value={stats.paidCount}    color="text-green-600" />
            <CountCard label="Unpaid Records"  value={stats.unpaidCount}  color="text-red-600" />
            <CountCard label="Partial Records" value={stats.partialCount} color="text-yellow-600" />
            <CountCard label="Waived Records"  value={stats.waivedCount}  color="text-ink/50" />
          </div>

          {/* Student breakdown */}
          <h2 className="mb-4 font-display text-lg text-ink">Students</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <CountCard label="Students with Paid Fees"   value={stats.paidStudents}   color="text-green-600" />
            <CountCard label="Students with Due Fees"    value={stats.unpaidStudents} color="text-red-600" />
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
};

export default FeeDashboardPage;
