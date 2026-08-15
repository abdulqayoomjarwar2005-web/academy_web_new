import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import { listBoardExpenses, deleteBoardExpense, BOARD_EXPENSE_CATEGORIES } from '../utils/boardApi';

const categoryLabels = {
  examination_fee: 'Examination Fee (Board)',
  printing_stationery: 'Printing & Stationery',
  invigilation: 'Invigilation',
  venue_arrangements: 'Venue Arrangements',
  transport: 'Transport',
  other: 'Other',
};

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const BoardExpenseListPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [totalAmount, setTotalAmount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listBoardExpenses({
        category: categoryFilter || undefined,
        month: monthFilter || undefined,
        page,
        limit: 10,
      });
      setExpenses(data.data);
      setPagination(data.pagination);
      setTotalAmount(data.totalAmount);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load expenses');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, monthFilter, page]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBoardExpense(deleteTarget.id);
      setDeleteTarget(null);
      if (expenses.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchExpenses();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete expense');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Board Expenses">
      <p className="mb-6 max-w-2xl text-sm text-ink/60">
        Expenses recorded here belong only to the Board/DIT exam area and are kept separate from
        the main school's expenses and Profit &amp; Loss.
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => { setPage(1); setCategoryFilter(e.target.value); }}
            className="rounded-sm border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="">All categories</option>
            {BOARD_EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryLabels[c] || c}</option>
            ))}
          </select>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => { setPage(1); setMonthFilter(e.target.value); }}
            className="rounded-sm border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {(categoryFilter || monthFilter) && (
            <button
              onClick={() => { setCategoryFilter(''); setMonthFilter(''); setPage(1); }}
              className="text-sm font-medium text-accent hover:text-accent/80"
            >
              Clear filters
            </button>
          )}
        </div>

        <Link to="/board/expenses/new" className="inline-flex items-center justify-center rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/90">
          + Add Expense
        </Link>
      </div>

      <div className="mt-4 inline-block rounded-sm border border-ink/10 bg-ink/3 px-4 py-2 text-sm">
        <span className="text-ink/60">Total for current filter: </span>
        <span className="font-semibold text-ink">Rs {fmt(totalAmount)}</span>
      </div>

      {error && (
        <div className="mt-4 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Mobile card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {loading ? (
          <div className="rounded-sm border border-ink/10 bg-white px-4 py-8 text-center text-sm text-ink/50">Loading expenses…</div>
        ) : expenses.length === 0 ? (
          <div className="rounded-sm border border-ink/10 bg-white px-4 py-8 text-center text-sm text-ink/50">No expenses found.</div>
        ) : (
          expenses.map((e) => (
            <div key={e.id} className="rounded-sm border border-ink/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{categoryLabels[e.category] || e.category}</p>
                  <p className="text-xs text-ink/40">{e.expense_date?.slice(0, 10)}</p>
                </div>
                <span className="font-semibold text-ink">Rs {fmt(e.amount)}</span>
              </div>
              {e.description && <p className="mt-2 text-xs text-ink/60">{e.description}</p>}
              <div className="mt-3 flex justify-end gap-4 border-t border-ink/5 pt-3">
                <button onClick={() => navigate(`/board/expenses/${e.id}/edit`)} className="text-xs font-medium text-accent hover:text-accent/80">Edit</button>
                <button onClick={() => setDeleteTarget(e)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table */}
      <div className="mt-6 hidden overflow-x-auto rounded-sm border border-ink/10 bg-white md:block">
        <table className="min-w-full divide-y divide-ink/10 text-sm">
          <thead className="bg-ink/[0.03]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Date</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Category</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Description</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Amount</th>
              <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-xs text-ink/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/50">Loading expenses…</td></tr>
            ) : expenses.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink/50">No expenses found.</td></tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 text-ink/80">{e.expense_date?.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-ink/80">{categoryLabels[e.category] || e.category}</td>
                  <td className="px-4 py-3 text-ink/70">{e.description || '—'}</td>
                  <td className="px-4 py-3 font-medium text-ink">Rs {fmt(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link to={`/board/expenses/${e.id}/edit`} className="text-xs font-medium text-accent hover:text-accent/80">Edit</Link>
                      <button onClick={() => setDeleteTarget(e)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} records</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-sm border border-ink/15 px-3 py-1.5 font-medium text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded-sm border border-ink/15 px-3 py-1.5 font-medium text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete expense"
          message={`Are you sure you want to delete this ${categoryLabels[deleteTarget.category] || deleteTarget.category} expense of Rs ${fmt(deleteTarget.amount)}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={isDeleting}
        />
      )}
    </DashboardLayout>
  );
};

export default BoardExpenseListPage;
