import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import { EXPENSE_CATEGORIES, listExpenses, deleteExpense } from '../utils/expenseApi';

const currentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const dateLabel = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const categoryLabels = {
  rent: 'Rent',
  electricity: 'Electricity',
  internet: 'Internet',
  salaries: 'Salaries',
  maintenance: 'Maintenance',
  other: 'Other',
};

const CategoryBadge = ({ category }) => (
  <span className="inline-block rounded-sm bg-ink/5 px-2 py-0.5 text-xs font-medium capitalize text-ink/70">
    {categoryLabels[category] || category}
  </span>
);

const ExpenseListPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Filters
  const [month, setMonth] = useState(currentMonth());
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listExpenses({
        month: month || undefined,
        category: category || undefined,
        search: search || undefined,
        page,
        limit: 25,
      });
      setExpenses(result.data);
      setPagination(result.pagination);
      setTotalAmount(result.totalAmount);
    } catch {
      setError('Failed to load expense records.');
    } finally {
      setLoading(false);
    }
  }, [month, category, search, page]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      await deleteExpense(deleteTarget.id);
      setDeleteTarget(null);
      await fetchExpenses();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to delete expense.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Expenses">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-ink/50">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); setPage(1); }}
              className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-ink/50">Category</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="">All</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryLabels[c] || c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-ink/50">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Description..."
              className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <Link
          to="/expenses/new"
          className="rounded-sm border border-ink/20 bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80"
        >
          + Add Expense
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {actionError && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="mb-4 rounded-sm border border-ink/10 bg-white p-4">
        <span className="text-sm text-ink/60">Total for selected filters: </span>
        <span className="font-display text-lg text-ink">Rs {fmt(totalAmount)}</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="py-16 text-center text-ink/40">No expense records found.</div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Recorded By</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-ink/5 last:border-0">
                  <td className="px-4 py-3 text-ink/80">{dateLabel(exp.expense_date)}</td>
                  <td className="px-4 py-3"><CategoryBadge category={exp.category} /></td>
                  <td className="px-4 py-3 text-ink/70">{exp.description || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink">Rs {fmt(exp.amount)}</td>
                  <td className="px-4 py-3 text-ink/50">{exp.updated_by_name || exp.created_by_name || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/expenses/${exp.id}/edit`}
                        className="rounded-sm border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(exp)}
                        className="rounded-sm border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink/60">
          <span>
            Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="rounded-sm border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 transition hover:bg-ink/5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-sm border border-ink/15 px-3 py-1 text-xs font-medium text-ink/70 transition hover:bg-ink/5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Expense"
          message={`Delete the ${categoryLabels[deleteTarget.category] || deleteTarget.category} expense of Rs ${fmt(deleteTarget.amount)} dated ${dateLabel(deleteTarget.expense_date)}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleting}
        />
      )}
    </DashboardLayout>
  );
};

export default ExpenseListPage;
