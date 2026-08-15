import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { getBoardCandidateDashboard, getBoardFeeDashboard } from '../utils/boardApi';

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const StatCard = ({ label, value, sub, color = 'text-ink', bg = 'bg-white', isMoney = true }) => (
  <div className={`rounded-sm border border-ink/10 ${bg} p-5`}>
    <div className={`font-display text-3xl ${color}`}>{isMoney ? `Rs ${fmt(value)}` : value}</div>
    <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</div>
    {sub && <div className="mt-0.5 text-xs text-ink/40">{sub}</div>}
  </div>
);

const feeTypeLabels = {
  enrollment: 'Enrollment',
  exam_1: 'Exam I',
  exam_2: 'Exam II',
  project: 'Project Fee',
  other: 'Other',
};

const BoardDashboardPage = () => {
  const [candidateStats, setCandidateStats] = useState(null);
  const [feeStats, setFeeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getBoardCandidateDashboard(), getBoardFeeDashboard()])
      .then(([c, f]) => {
        setCandidateStats(c.stats);
        setFeeStats(f.stats);
      })
      .catch(() => setError('Failed to load Board/DIT overview.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Board / DIT Exams">
      <p className="mb-6 max-w-2xl text-sm text-ink/60">
        A fully separate area for Board exam enrollments and fees — DIT batches, candidates,
        Enrollment/Exam/Project fees, and this area's own expenses and profit &amp; loss, kept
        apart from the main school's finances.
      </p>

      {/* Quick Actions */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link to="/board/batches" className="rounded-sm border border-ink/20 bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80">
          DIT Batches
        </Link>
        <Link to="/board/candidates" className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5">
          Candidates
        </Link>
        <Link to="/board/candidates/new" className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5">
          Enroll Candidate
        </Link>
        <Link to="/board/expenses" className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5">
          Expenses
        </Link>
        <Link to="/board/profit-loss" className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5">
          Profit &amp; Loss
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : (
        <>
          {/* Candidates */}
          <h2 className="mb-4 font-display text-lg text-ink">Candidates</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Enrolled" value={candidateStats.totalCandidates} isMoney={false} />
            <StatCard label="Active" value={candidateStats.activeCandidates} isMoney={false} color="text-green-700" bg="bg-green-50" />
            <StatCard label="Completed" value={candidateStats.completedCandidates} isMoney={false} />
            <StatCard label="Dropped" value={candidateStats.droppedCandidates} isMoney={false} color="text-red-700" bg="bg-red-50" />
          </div>

          {/* Collections */}
          <h2 className="mb-4 font-display text-lg text-ink">Fee Collection</h2>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today" value={feeStats.todayCollection} color="text-green-700" bg="bg-green-50" />
            <StatCard label="This Week" value={feeStats.weeklyCollection} />
            <StatCard label="This Month" value={feeStats.monthlyCollection} />
            <StatCard label="This Year" value={feeStats.yearlyCollection} />
          </div>

          <div className="mb-8">
            <div className="rounded-sm border border-red-200 bg-red-50 p-5">
              <div className="font-display text-3xl text-red-700">Rs {fmt(feeStats.totalOutstanding)}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">Total Outstanding</div>
            </div>
          </div>

          {/* By fee type */}
          <h2 className="mb-4 font-display text-lg text-ink">By Fee Type</h2>
          {feeStats.byType.length === 0 ? (
            <p className="text-sm text-ink/50">No fee items recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {feeStats.byType.map((t) => (
                <div key={t.feeType} className="rounded-sm border border-ink/10 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{feeTypeLabels[t.feeType] || t.feeType}</span>
                    <span className="text-sm text-ink/60">
                      Rs {fmt(t.totalPaid)} collected of Rs {fmt(t.totalBilled)} billed &middot; {t.recordCount} record{t.recordCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default BoardDashboardPage;
