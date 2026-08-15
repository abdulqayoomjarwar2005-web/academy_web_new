import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import PnLTrendChart from '../components/PnLTrendChart';
import { getBoardProfitLossDashboard, getBoardProfitLossMonthly, getBoardProfitLossYears } from '../utils/boardApi';

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

const StatCard = ({ label, value, profit = false }) => {
  const numeric = parseFloat(value || 0);
  const color = profit ? (numeric >= 0 ? 'text-green-700' : 'text-red-700') : 'text-ink';
  const bg = profit ? (numeric >= 0 ? 'bg-green-50' : 'bg-red-50') : 'bg-white';

  return (
    <div className={`rounded-sm border border-ink/10 ${bg} p-5`}>
      <div className={`font-display text-3xl ${color}`}>
        {profit && numeric < 0 ? '- ' : ''}Rs {fmt(Math.abs(numeric))}
      </div>
      <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</div>
    </div>
  );
};

const BoardProfitLossPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getBoardProfitLossDashboard(), getBoardProfitLossYears()])
      .then(([d, y]) => {
        setDashboard(d.dashboard);
        setYears(y.years);
        setSelectedYear(y.years[0] || new Date().getFullYear().toString());
      })
      .catch(() => setError('Failed to load Board Profit & Loss.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    setReportLoading(true);
    getBoardProfitLossMonthly(selectedYear)
      .then((d) => setMonthlyReport(d.report))
      .catch(() => setError('Failed to load monthly report.'))
      .finally(() => setReportLoading(false));
  }, [selectedYear]);

  return (
    <DashboardLayout title="Board / DIT Profit &amp; Loss">
      <p className="mb-6 max-w-2xl text-sm text-ink/60">
        This report reflects only Board/DIT exam fee collections and this area's own expenses —
        it is entirely separate from the main school's Profit &amp; Loss.
      </p>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : dashboard ? (
        <>
          <h2 className="mb-4 font-display text-lg text-ink">This Month &middot; {monthLabel(dashboard.currentMonth.month)}</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Fee Collection" value={dashboard.currentMonth.totalCollection} />
            <StatCard label="Expenses" value={dashboard.currentMonth.totalExpenses} />
            <StatCard label="Profit / Loss" value={dashboard.currentMonth.profit} profit />
          </div>

          <h2 className="mb-4 font-display text-lg text-ink">This Year &middot; {dashboard.currentYear.year}</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Fee Collection" value={dashboard.currentYear.totalCollection} />
            <StatCard label="Expenses" value={dashboard.currentYear.totalExpenses} />
            <StatCard label="Profit / Loss" value={dashboard.currentYear.profit} profit />
          </div>

          <h2 className="mb-4 font-display text-lg text-ink">All-Time (Board/DIT only)</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Fee Collection" value={dashboard.allTime.totalCollection} />
            <StatCard label="Expenses" value={dashboard.allTime.totalExpenses} />
            <StatCard label="Profit / Loss" value={dashboard.allTime.profit} profit />
          </div>

          <h2 className="mb-4 font-display text-lg text-ink">Trends &middot; Last 12 Months</h2>
          <div className="mb-8 rounded-sm border border-ink/10 bg-white p-5">
            <PnLTrendChart data={dashboard.trends} />
          </div>

          {/* Monthly report table */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Monthly Report</h2>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-sm border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {reportLoading ? (
            <p className="text-sm text-ink/50">Loading…</p>
          ) : monthlyReport ? (
            <div className="overflow-x-auto rounded-sm border border-ink/10 bg-white">
              <table className="min-w-full divide-y divide-ink/10 text-sm">
                <thead className="bg-ink/[0.03]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Month</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Collection</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Expenses</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Profit / Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {monthlyReport.months.map((m) => (
                    <tr key={m.month} className="hover:bg-ink/[0.02]">
                      <td className="px-4 py-3 text-ink/80">{monthLabel(m.month)}</td>
                      <td className="px-4 py-3 text-ink/80">Rs {fmt(m.totalCollection)}</td>
                      <td className="px-4 py-3 text-ink/80">Rs {fmt(m.totalExpenses)}</td>
                      <td className={`px-4 py-3 font-medium ${m.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {m.profit < 0 ? '- ' : ''}Rs {fmt(Math.abs(m.profit))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-ink/10 bg-ink/3 font-semibold">
                    <td className="px-4 py-3 text-ink">Total</td>
                    <td className="px-4 py-3 text-ink">Rs {fmt(monthlyReport.totals.totalCollection)}</td>
                    <td className="px-4 py-3 text-ink">Rs {fmt(monthlyReport.totals.totalExpenses)}</td>
                    <td className={`px-4 py-3 ${monthlyReport.totals.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {monthlyReport.totals.profit < 0 ? '- ' : ''}Rs {fmt(Math.abs(monthlyReport.totals.profit))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </DashboardLayout>
  );
};

export default BoardProfitLossPage;
