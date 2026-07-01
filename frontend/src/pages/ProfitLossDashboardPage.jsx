import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import PnLTrendChart from '../components/PnLTrendChart';
import { getProfitLossDashboard } from '../utils/profitLossApi';

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const monthLabel = (ym) => {
  if (!ym) return '';
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const StatCard = ({ label, value, sub, profit = false }) => {
  const numeric = parseFloat(value || 0);
  const color = profit ? (numeric >= 0 ? 'text-green-700' : 'text-red-700') : 'text-ink';
  const bg = profit ? (numeric >= 0 ? 'bg-green-50' : 'bg-red-50') : 'bg-white';

  return (
    <div className={`rounded-sm border border-ink/10 ${bg} p-5`}>
      <div className={`font-display text-3xl ${color}`}>
        {profit && numeric < 0 ? '- ' : ''}Rs {fmt(Math.abs(numeric))}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-ink/40">{sub}</div>}
    </div>
  );
};

const ProfitLossDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProfitLossDashboard()
      .then((d) => setDashboard(d.dashboard))
      .catch(() => setError('Failed to load Profit & Loss analytics.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Profit &amp; Loss Analytics">
      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          to="/profit-loss/reports"
          className="rounded-sm border border-ink/20 bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80"
        >
          Financial Reports
        </Link>
        <Link
          to="/expenses/dashboard"
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          Expense Dashboard
        </Link>
        <Link
          to="/fees/dashboard"
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          Fee Dashboard
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : dashboard ? (
        <>
          {/* Current Month */}
          <h2 className="mb-4 font-display text-lg text-ink">
            This Month &middot; {monthLabel(dashboard.currentMonth.month)}
          </h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Fee Collection" value={dashboard.currentMonth.totalCollection} />
            <StatCard label="Expenses" value={dashboard.currentMonth.totalExpenses} />
            <StatCard label="Profit / Loss" value={dashboard.currentMonth.profit} profit />
          </div>

          {/* Current Year */}
          <h2 className="mb-4 font-display text-lg text-ink">
            This Year &middot; {dashboard.currentYear.year}
          </h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Fee Collection" value={dashboard.currentYear.totalCollection} />
            <StatCard label="Expenses" value={dashboard.currentYear.totalExpenses} />
            <StatCard label="Profit / Loss" value={dashboard.currentYear.profit} profit />
          </div>

          {/* All Time */}
          <h2 className="mb-4 font-display text-lg text-ink">All-Time</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Fee Collection" value={dashboard.allTime.totalCollection} />
            <StatCard label="Expenses" value={dashboard.allTime.totalExpenses} />
            <StatCard label="Profit / Loss" value={dashboard.allTime.profit} profit />
          </div>

          {/* Trend Charts */}
          <h2 className="mb-4 font-display text-lg text-ink">Trends &middot; Last 12 Months</h2>
          <div className="space-y-6">
            <div className="rounded-sm border border-ink/10 bg-white p-5">
              <h3 className="mb-3 text-sm font-medium text-ink/70">Collections</h3>
              <PnLTrendChart
                data={dashboard.trends}
                series={[{ key: 'totalCollection', label: 'Collections', color: '#3D5A80' }]}
              />
            </div>
            <div className="rounded-sm border border-ink/10 bg-white p-5">
              <h3 className="mb-3 text-sm font-medium text-ink/70">Expenses</h3>
              <PnLTrendChart
                data={dashboard.trends}
                series={[{ key: 'totalExpenses', label: 'Expenses', color: '#EE964B' }]}
              />
            </div>
            <div className="rounded-sm border border-ink/10 bg-white p-5">
              <h3 className="mb-3 text-sm font-medium text-ink/70">Profit Trends</h3>
              <PnLTrendChart
                data={dashboard.trends}
                series={[{ key: 'profit', label: 'Profit', color: '#2F8F4E' }]}
              />
            </div>
            <div className="rounded-sm border border-ink/10 bg-white p-5">
              <h3 className="mb-3 text-sm font-medium text-ink/70">Collections vs Expenses vs Profit</h3>
              <PnLTrendChart data={dashboard.trends} />
            </div>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
};

export default ProfitLossDashboardPage;
