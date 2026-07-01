import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { getExpenseDashboard } from '../utils/expenseApi';

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const categoryLabels = {
  rent: 'Rent',
  electricity: 'Electricity',
  internet: 'Internet',
  salaries: 'Salaries',
  maintenance: 'Maintenance',
  other: 'Other',
};

const StatCard = ({ label, value, sub, color = 'text-ink', bg = 'bg-white' }) => (
  <div className={`rounded-sm border border-ink/10 ${bg} p-5`}>
    <div className={`font-display text-3xl ${color}`}>Rs {fmt(value)}</div>
    <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</div>
    {sub && <div className="mt-0.5 text-xs text-ink/40">{sub}</div>}
  </div>
);

const ExpenseDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getExpenseDashboard()
      .then((d) => setStats(d.stats))
      .catch(() => setError('Failed to load expense statistics.'))
      .finally(() => setLoading(false));
  }, []);

  const maxCategoryTotal = stats?.byCategory?.length
    ? Math.max(...stats.byCategory.map((c) => c.totalAmount), 1)
    : 1;

  return (
    <DashboardLayout title="Expense Dashboard">
      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          to="/expenses"
          className="rounded-sm border border-ink/20 bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80"
        >
          Expense Records
        </Link>
        <Link
          to="/expenses/new"
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          Add Expense
        </Link>
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
          {/* Spend Stats */}
          <h2 className="mb-4 font-display text-lg text-ink">Expenses</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today" value={stats.todayTotal} color="text-red-700" bg="bg-red-50" />
            <StatCard label="This Week" value={stats.weeklyTotal} sub="Current week" />
            <StatCard label="This Month" value={stats.monthlyTotal} sub="Current month" />
            <StatCard label="This Year" value={stats.yearlyTotal} sub="Current year" />
          </div>

          {/* All-time */}
          <div className="mb-8">
            <div className="rounded-sm border border-ink/10 bg-white p-5">
              <div className="font-display text-3xl text-ink">Rs {fmt(stats.allTimeTotal)}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">
                All-Time Total Expenses &middot; {stats.totalRecords} record{stats.totalRecords === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {/* By Category */}
          <h2 className="mb-4 font-display text-lg text-ink">By Category</h2>
          {stats.byCategory.length === 0 ? (
            <p className="text-sm text-ink/50">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.byCategory.map((c) => (
                <div key={c.category} className="rounded-sm border border-ink/10 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-ink">
                      {categoryLabels[c.category] || c.category}
                    </span>
                    <span className="text-sm text-ink/60">
                      Rs {fmt(c.totalAmount)} &middot; {c.recordCount} record{c.recordCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-ink/5">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(c.totalAmount / maxCategoryTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </DashboardLayout>
  );
};

export default ExpenseDashboardPage;
