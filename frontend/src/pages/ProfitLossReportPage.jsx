import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import {
  getMonthlyPnLReport,
  getYearlyPnLReport,
  getPnLComparison,
  getAvailablePnLYears,
} from '../utils/profitLossApi';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const profitClass = (n) => (parseFloat(n || 0) >= 0 ? 'text-green-700' : 'text-red-700');

const monthLabel = (ym) => {
  if (!ym) return '';
  const [year, month] = ym.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long' });
};

const changeClass = (n) => {
  const v = parseFloat(n || 0);
  if (v > 0) return 'text-green-700';
  if (v < 0) return 'text-red-700';
  return 'text-ink/60';
};

const changeLabel = (n) => {
  const v = parseFloat(n || 0);
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
};

// -------------------------------------------------------
// Comparison Card
// -------------------------------------------------------

const ComparisonCard = ({ title, comparison }) => (
  <div className="rounded-sm border border-ink/10 bg-white p-5">
    <h3 className="mb-4 font-display text-lg text-ink">{title}</h3>

    <div className="mb-4">
      <div className="text-xs uppercase tracking-wide text-ink/50">Month over Month</div>
      <div className="mt-1 flex items-baseline justify-between">
        <div>
          <div className="font-display text-2xl text-ink">Rs {fmt(comparison.currentMonth.amount)}</div>
          <div className="text-xs text-ink/40">
            {comparison.currentMonth.period} vs Rs {fmt(comparison.previousMonth.amount)} ({comparison.previousMonth.period})
          </div>
        </div>
        <div className={`text-sm font-medium ${changeClass(comparison.monthChangePercent)}`}>
          {changeLabel(comparison.monthChangePercent)}
        </div>
      </div>
    </div>

    <div>
      <div className="text-xs uppercase tracking-wide text-ink/50">Year over Year</div>
      <div className="mt-1 flex items-baseline justify-between">
        <div>
          <div className="font-display text-2xl text-ink">Rs {fmt(comparison.currentYear.amount)}</div>
          <div className="text-xs text-ink/40">
            {comparison.currentYear.period} vs Rs {fmt(comparison.previousYear.amount)} ({comparison.previousYear.period})
          </div>
        </div>
        <div className={`text-sm font-medium ${changeClass(comparison.yearChangePercent)}`}>
          {changeLabel(comparison.yearChangePercent)}
        </div>
      </div>
    </div>
  </div>
);

// -------------------------------------------------------
// Page
// -------------------------------------------------------

const ProfitLossReportPage = () => {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [years, setYears] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [yearlyReport, setYearlyReport] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAvailablePnLYears()
      .then((d) => setYears(d.years || []))
      .catch(() => {});

    getYearlyPnLReport()
      .then((d) => setYearlyReport(d.report))
      .catch(() => setError('Failed to load the yearly report.'));

    getPnLComparison()
      .then((d) => setComparison(d.comparison))
      .catch(() => setError('Failed to load comparison data.'));
  }, []);

  const fetchMonthly = useCallback(async (y) => {
    setLoading(true);
    setError('');
    try {
      const data = await getMonthlyPnLReport(y);
      setMonthlyReport(data.report);
    } catch (err) {
      setError('Failed to load the monthly report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthly(year);
  }, [year, fetchMonthly]);

  return (
    <DashboardLayout title="Financial Reports">
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          to="/profit-loss/dashboard"
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          &larr; Analytics Dashboard
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Collection & Expense Comparison */}
      {comparison && (
        <>
          <h2 className="mb-4 font-display text-lg text-ink">Comparisons</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ComparisonCard title="Collection Comparison" comparison={comparison.collection} />
            <ComparisonCard title="Expense Comparison" comparison={comparison.expenses} />
          </div>
        </>
      )}

      {/* Monthly Profit/Loss */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg text-ink">Monthly Profit / Loss</h2>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-sm border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-10 text-center text-ink/40">Loading…</div>
      ) : monthlyReport ? (
        <div className="mb-8 overflow-x-auto rounded-sm border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Fee Collection</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Profit / Loss</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReport.months.map((m) => (
                <tr key={m.month} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-2.5 text-ink">{monthLabel(m.month)}</td>
                  <td className="px-4 py-2.5 text-right text-ink">Rs {fmt(m.totalCollection)}</td>
                  <td className="px-4 py-2.5 text-right text-ink">Rs {fmt(m.totalExpenses)}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${profitClass(m.profit)}`}>
                    Rs {fmt(m.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink/10 bg-ink/[0.03] font-medium">
                <td className="px-4 py-3 text-ink">Total &middot; {monthlyReport.year}</td>
                <td className="px-4 py-3 text-right text-ink">Rs {fmt(monthlyReport.totals.totalCollection)}</td>
                <td className="px-4 py-3 text-right text-ink">Rs {fmt(monthlyReport.totals.totalExpenses)}</td>
                <td className={`px-4 py-3 text-right ${profitClass(monthlyReport.totals.profit)}`}>
                  Rs {fmt(monthlyReport.totals.profit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}

      {/* Yearly Profit/Loss */}
      <h2 className="mb-4 font-display text-lg text-ink">Yearly Profit / Loss</h2>
      {yearlyReport && yearlyReport.years.length > 0 ? (
        <div className="overflow-x-auto rounded-sm border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3 text-right">Fee Collection</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Profit / Loss</th>
              </tr>
            </thead>
            <tbody>
              {yearlyReport.years.map((y) => (
                <tr key={y.year} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-2.5 text-ink">{y.year}</td>
                  <td className="px-4 py-2.5 text-right text-ink">Rs {fmt(y.totalCollection)}</td>
                  <td className="px-4 py-2.5 text-right text-ink">Rs {fmt(y.totalExpenses)}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${profitClass(y.profit)}`}>
                    Rs {fmt(y.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink/10 bg-ink/[0.03] font-medium">
                <td className="px-4 py-3 text-ink">Grand Total</td>
                <td className="px-4 py-3 text-right text-ink">Rs {fmt(yearlyReport.totals.totalCollection)}</td>
                <td className="px-4 py-3 text-right text-ink">Rs {fmt(yearlyReport.totals.totalExpenses)}</td>
                <td className={`px-4 py-3 text-right ${profitClass(yearlyReport.totals.profit)}`}>
                  Rs {fmt(yearlyReport.totals.profit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ink/50">No yearly data available yet.</p>
      )}
    </DashboardLayout>
  );
};

export default ProfitLossReportPage;
