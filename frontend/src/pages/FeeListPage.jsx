import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { listFees, markPaid, markUnpaid, markPartial, markWaived } from '../utils/feeApi';
import { useAuth } from '../context/AuthContext';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

const currentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

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
    paid:    'bg-green-100 text-green-800',
    unpaid:  'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
    waived:  'bg-ink/10 text-ink/60',
  };
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium capitalize ${map[status] || 'bg-ink/10 text-ink'}`}>
      {status}
    </span>
  );
};

// -------------------------------------------------------
// Partial Payment Modal
// -------------------------------------------------------

const PartialModal = ({ fee, onClose, onConfirm }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) {
      setError('Enter a valid positive amount');
      return;
    }
    if (n > parseFloat(fee.amount)) {
      setError('Amount cannot exceed the total fee');
      return;
    }
    onConfirm(n);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-sm border border-ink/15 bg-white p-6 shadow-lg">
        <h3 className="mb-4 font-display text-lg text-ink">Record Partial Payment</h3>
        <p className="mb-3 text-sm text-ink/60">
          Total fee: <strong>Rs {fmt(fee.amount)}</strong> — {fee.student_name} ({monthLabel(fee.fee_month)})
        </p>
        <input
          type="number"
          min="1"
          step="1"
          max={fee.amount}
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(''); }}
          placeholder="Amount paid"
          className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas hover:bg-ink/80"
          >
            Confirm
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------
// Waive Modal
// -------------------------------------------------------

const WaiveModal = ({ fee, onClose, onConfirm }) => {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-sm border border-ink/15 bg-white p-6 shadow-lg">
        <h3 className="mb-4 font-display text-lg text-ink">Waive Fee</h3>
        <p className="mb-3 text-sm text-ink/60">
          Waiving <strong>Rs {fmt(fee.amount)}</strong> for {fee.student_name} ({monthLabel(fee.fee_month)})
        </p>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Reason for waiver (optional)"
          className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onConfirm(notes)}
            className="flex-1 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas hover:bg-ink/80"
          >
            Waive
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------
// Main Page
// -------------------------------------------------------

const FeeListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isReadOnly = user?.role === 'teacher';

  const [fees, setFees]             = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [actionError, setActionError] = useState('');

  // Filters
  const [month, setMonth]       = useState(currentMonth());
  const [status, setStatus]     = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);

  // Modals
  const [partialFee, setPartialFee] = useState(null);
  const [waiveFee, setWaiveFee]     = useState(null);

  const fetchFees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listFees({ month: month || undefined, status: status || undefined, search: search || undefined, page, limit: 25 });
      setFees(result.data);
      setPagination(result.pagination);
    } catch {
      setError('Failed to load fee records.');
    } finally {
      setLoading(false);
    }
  }, [month, status, search, page]);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  // -------------------------------------------------------
  // Action handlers
  // -------------------------------------------------------

  const handleAction = async (action) => {
    setActionError('');
    try {
      await action();
      fetchFees();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Action failed');
    }
  };

  const handleMarkPaid = (fee) => handleAction(() => markPaid(fee.id));
  const handleMarkUnpaid = (fee) => handleAction(() => markUnpaid(fee.id));
  const handlePartialConfirm = (amount) => {
    handleAction(() => markPartial(partialFee.id, amount));
    setPartialFee(null);
  };
  const handleWaiveConfirm = (notes) => {
    handleAction(() => markWaived(waiveFee.id, notes));
    setWaiveFee(null);
  };

  return (
    <DashboardLayout title="Fee Records">
      {/* Modals */}
      {partialFee && (
        <PartialModal
          fee={partialFee}
          onClose={() => setPartialFee(null)}
          onConfirm={handlePartialConfirm}
        />
      )}
      {waiveFee && (
        <WaiveModal
          fee={waiveFee}
          onClose={() => setWaiveFee(null)}
          onConfirm={handleWaiveConfirm}
        />
      )}

      {/* Actions */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to="/fees/dashboard"
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          ← Dashboard
        </Link>
        {!isReadOnly && (
          <Link
            to="/fees/generate"
            className="rounded-sm border border-ink/20 bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80"
          >
            Generate Monthly Fees
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="waived">Waived</option>
        </select>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, ID, receipt…"
          className="w-64 rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink placeholder-ink/30 focus:border-accent focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}
      {actionError && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{actionError}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : fees.length === 0 ? (
        <div className="py-16 text-center text-ink/40">No fee records found.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-sm border border-ink/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/3 text-left text-xs uppercase tracking-wide text-ink/50">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class / Batch</th>
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Receipt</th>
                  {!isReadOnly && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {fees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-ink/2">
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{fee.student_name}</div>
                      <div className="text-xs text-ink/40">{fee.student_code}</div>
                    </td>
                    <td className="px-4 py-3 text-ink/60">
                      {fee.class}
                      {fee.batch ? ` · ${fee.batch}` : ''}
                    </td>
                    <td className="px-4 py-3 text-ink/70">{monthLabel(fee.fee_month)}</td>
                    <td className="px-4 py-3 text-right font-medium text-ink">Rs {fmt(fee.amount)}</td>
                    <td className="px-4 py-3 text-right text-ink/70">
                      {parseFloat(fee.amount_paid) > 0 ? `Rs ${fmt(fee.amount_paid)}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={fee.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink/50">
                      {fee.receipt_number ? (
                        <button
                          onClick={() => navigate(`/fees/receipt/${fee.receipt_number}`)}
                          className="text-accent hover:underline"
                        >
                          {fee.receipt_number}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {fee.status !== 'paid' && fee.status !== 'waived' && (
                            <button
                              onClick={() => handleMarkPaid(fee)}
                              className="rounded-sm bg-green-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Mark Paid
                            </button>
                          )}
                          {fee.status !== 'unpaid' && fee.status !== 'waived' && (
                            <button
                              onClick={() => handleMarkUnpaid(fee)}
                              className="rounded-sm border border-red-300 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              Mark Unpaid
                            </button>
                          )}
                          {fee.status !== 'paid' && fee.status !== 'waived' && (
                            <button
                              onClick={() => setPartialFee(fee)}
                              className="rounded-sm border border-yellow-300 px-2 py-0.5 text-xs font-medium text-yellow-800 hover:bg-yellow-50"
                            >
                              Partial
                            </button>
                          )}
                          {fee.status !== 'waived' && (
                            <button
                              onClick={() => setWaiveFee(fee)}
                              className="rounded-sm border border-ink/20 px-2 py-0.5 text-xs font-medium text-ink/50 hover:bg-ink/5"
                            >
                              Waive
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-ink/50">
                {pagination.total} records · Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-sm border border-ink/20 px-3 py-1 text-ink/60 hover:bg-ink/5 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-sm border border-ink/20 px-3 py-1 text-ink/60 hover:bg-ink/5 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default FeeListPage;
