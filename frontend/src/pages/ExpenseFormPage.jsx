import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { EXPENSE_CATEGORIES, createExpense, getExpense, updateExpense } from '../utils/expenseApi';

const categoryLabels = {
  rent: 'Rent',
  electricity: 'Electricity',
  internet: 'Internet',
  salaries: 'Salaries',
  maintenance: 'Maintenance',
  other: 'Other',
};

const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const ExpenseFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [expenseDate, setExpenseDate] = useState(today());
  const [category, setCategory] = useState('rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;

    getExpense(id)
      .then((d) => {
        const e = d.expense;
        setExpenseDate(e.expense_date?.slice(0, 10) || today());
        setCategory(e.category);
        setDescription(e.description || '');
        setAmount(String(e.amount));
      })
      .catch(() => setError('Failed to load expense record.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numericAmount = parseFloat(amount);
    if (!expenseDate) {
      setError('Date is required.');
      return;
    }
    if (isNaN(numericAmount) || numericAmount < 0) {
      setError('Enter a valid non-negative amount.');
      return;
    }

    setSaving(true);
    try {
      const payload = { expenseDate, category, description, amount: numericAmount };
      if (isEdit) {
        await updateExpense(id, payload);
      } else {
        await createExpense(payload);
      }
      navigate('/expenses');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={isEdit ? 'Edit Expense' : 'Add Expense'}>
      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c] || c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this expense"
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Amount (Rs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              className="flex-1 rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
};

export default ExpenseFormPage;
