import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { getDueMonths, markPaid } from '../utils/feeApi';
import { useAuth } from '../context/AuthContext';

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const monthLabel = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const StatusBadge = ({ status }) => {
  const map = {
    unpaid:  'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium capitalize ${map[status] || 'bg-ink/10 text-ink'}`}>
      {status}
    </span>
  );
};

const StudentDuePage = () => {
  const { studentId } = useParams();
  const { user } = useAuth();
  const isReadOnly = user?.role === 'teacher';

  const [dueMonths, setDueMonths] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getDueMonths(studentId);
      setDueMonths(data.dueMonths);
      if (data.dueMonths.length > 0) {
        const first = data.dueMonths[0];
        setStudentInfo({
          name: first.student_name,
          code: first.student_code,
          class: first.class,
          batch: first.batch,
        });
      }
    } catch {
      setError('Failed to load due months.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [studentId]);

  const handleMarkPaid = async (fee) => {
    setActionMsg('');
    try {
      await markPaid(fee.id);
      setActionMsg(`Marked ${monthLabel(fee.fee_month)} as paid.`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    }
  };

  const totalDue = dueMonths.reduce(
    (sum, f) => sum + (parseFloat(f.amount) - parseFloat(f.amount_paid)),
    0
  );

  return (
    <DashboardLayout title="Due Months">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/fees"
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          ← Fee Records
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : (
        <>
          {studentInfo && (
            <div className="mb-6 rounded-sm border border-ink/10 bg-white p-5">
              <div className="font-display text-xl text-ink">{studentInfo.name}</div>
              <div className="mt-1 text-xs text-ink/40">
                {studentInfo.code} · {studentInfo.class} · {studentInfo.batch}
              </div>
              {dueMonths.length > 0 && (
                <div className="mt-3 inline-block rounded-sm bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                  Total Due: Rs {fmt(totalDue)}
                </div>
              )}
            </div>
          )}

          {actionMsg && (
            <div className="mb-4 rounded-sm border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
              {actionMsg}
            </div>
          )}

          {dueMonths.length === 0 ? (
            <div className="rounded-sm border border-green-200 bg-green-50 py-10 text-center text-sm text-green-700">
              No due months — all fees are cleared.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-sm border border-ink/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/10 bg-ink/3 text-left text-xs uppercase tracking-wide text-ink/50">
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3">Status</th>
                    {!isReadOnly && <th className="px-4 py-3">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {dueMonths.map((fee) => {
                    const balance = parseFloat(fee.amount) - parseFloat(fee.amount_paid);
                    return (
                      <tr key={fee.id} className="hover:bg-ink/2">
                        <td className="px-4 py-3 font-medium text-ink">{monthLabel(fee.fee_month)}</td>
                        <td className="px-4 py-3 text-right text-ink/70">Rs {fmt(fee.amount)}</td>
                        <td className="px-4 py-3 text-right text-ink/70">
                          {parseFloat(fee.amount_paid) > 0 ? `Rs ${fmt(fee.amount_paid)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">Rs {fmt(balance)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={fee.status} />
                        </td>
                        {!isReadOnly && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleMarkPaid(fee)}
                              className="rounded-sm bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Mark Paid
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-ink/10 bg-ink/3 text-xs font-semibold text-ink">
                    <td className="px-4 py-2" colSpan={3}>Total Due</td>
                    <td className="px-4 py-2 text-right text-red-600">Rs {fmt(totalDue)}</td>
                    <td colSpan={isReadOnly ? 1 : 2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default StudentDuePage;
