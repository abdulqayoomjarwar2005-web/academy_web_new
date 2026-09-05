import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { listStudents } from '../utils/studentApi';
import { getDueMonths, payFamilyFees } from '../utils/feeApi';

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const monthLabel = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

// -------------------------------------------------------
// Main Page
// -------------------------------------------------------

const FamilyPaymentPage = () => {
  const navigate = useNavigate();

  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched]     = useState(false);

  // studentId -> { student, dueMonths, loading, error, selectedIds: Set, amounts: {feeId: string} }
  const [cart, setCart] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearched(true);
    try {
      const data = await listStudents({ search: search.trim(), status: 'active', limit: 25 });
      setResults(data.data || data.students || []);
    } catch {
      setSearchError('Failed to search students.');
    } finally {
      setSearching(false);
    }
  };

  const addStudent = async (student) => {
    if (cart[student.id]) return;
    setCart((prev) => ({
      ...prev,
      [student.id]: { student, dueMonths: [], loading: true, error: '', selectedIds: new Set(), amounts: {} },
    }));
    try {
      const data = await getDueMonths(student.id);
      const due = data.dueMonths || [];
      setCart((prev) => ({
        ...prev,
        [student.id]: {
          ...prev[student.id],
          dueMonths: due,
          loading: false,
          selectedIds: new Set(due.map((f) => f.id)), // pre-select all due months
          amounts: Object.fromEntries(
            due.map((f) => [f.id, String((parseFloat(f.amount) - parseFloat(f.amount_paid)).toFixed(0))])
          ),
        },
      }));
    } catch {
      setCart((prev) => ({
        ...prev,
        [student.id]: { ...prev[student.id], loading: false, error: 'Failed to load due months.' },
      }));
    }
  };

  const removeStudent = (studentId) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const toggleFee = (studentId, feeId) => {
    setCart((prev) => {
      const entry = prev[studentId];
      const nextSelected = new Set(entry.selectedIds);
      if (nextSelected.has(feeId)) nextSelected.delete(feeId);
      else nextSelected.add(feeId);
      return { ...prev, [studentId]: { ...entry, selectedIds: nextSelected } };
    });
  };

  const setAmount = (studentId, feeId, value) => {
    setCart((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        amounts: { ...prev[studentId].amounts, [feeId]: value },
      },
    }));
  };

  // Flatten all selected fee entries across all students in the cart.
  const selectedPayments = Object.values(cart).flatMap((entry) =>
    entry.dueMonths
      .filter((f) => entry.selectedIds.has(f.id))
      .map((f) => ({
        feeId: f.id,
        studentName: entry.student.student_name,
        month: f.fee_month,
        balance: parseFloat(f.amount) - parseFloat(f.amount_paid),
        amountPaid: entry.amounts[f.id],
      }))
  );

  const studentsWithSelection = new Set(
    Object.entries(cart)
      .filter(([, entry]) => entry.dueMonths.some((f) => entry.selectedIds.has(f.id)))
      .map(([id]) => id)
  );

  const total = selectedPayments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
  const canSubmit = studentsWithSelection.size >= 2 && selectedPayments.every((p) => parseFloat(p.amountPaid) > 0);

  const handleSubmit = async () => {
    setSubmitError('');
    if (!canSubmit) {
      setSubmitError('Select fee months for at least two different students, each with a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      const payments = selectedPayments.map((p) => ({ feeId: p.feeId, amountPaid: parseFloat(p.amountPaid) }));
      const firstStudent = Object.values(cart)[0]?.student;
      const result = await payFamilyFees(payments, {
        guardianName: firstStudent?.father_name,
        contactNumber: firstStudent?.contact_number,
        notes: notes || undefined,
      });
      navigate(`/fees/family-receipt/${result.receiptNumber}`);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to record combined payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Family / Combined Payment">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to="/fees"
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          ← Fee Records
        </Link>
      </div>

      <div className="mb-6 rounded-sm border border-ink/10 bg-white p-5">
        <h2 className="mb-1 font-display text-lg text-ink">Find siblings / family members</h2>
        <p className="mb-4 text-sm text-ink/50">
          Search by student name, father&apos;s name, or contact number — add each student, then choose which
          due months to pay together. One combined receipt will be generated for the whole family.
        </p>
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. father's name or phone number"
            className="w-full flex-1 rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-accent focus:outline-none sm:w-64"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas hover:bg-ink/80 disabled:opacity-50"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchError && <p className="mt-3 text-sm text-red-600">{searchError}</p>}

        {searched && !searching && results.length === 0 && !searchError && (
          <p className="mt-3 text-sm text-ink/40">No matching students found.</p>
        )}

        {results.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            {results.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-sm border border-ink/10 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">{s.student_name}</span>{' '}
                  <span className="text-ink/40">({s.student_id})</span>
                  <div className="text-xs text-ink/40">
                    {s.father_name} · {s.class} {s.batch ? `· ${s.batch}` : ''} · {s.contact_number}
                  </div>
                </div>
                <button
                  onClick={() => addStudent(s)}
                  disabled={!!cart[s.id]}
                  className="rounded-sm border border-ink/20 px-3 py-1 text-xs font-medium text-ink/70 hover:bg-ink/5 disabled:opacity-40"
                >
                  {cart[s.id] ? 'Added' : '+ Add to voucher'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart of added students */}
      {Object.keys(cart).length > 0 && (
        <div className="mb-6 flex flex-col gap-4">
          {Object.entries(cart).map(([studentId, entry]) => (
            <div key={studentId} className="rounded-sm border border-ink/10 bg-white p-5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-display text-base text-ink">{entry.student.student_name}</div>
                  <div className="text-xs text-ink/40">
                    {entry.student.student_id} · {entry.student.class} {entry.student.batch ? `· ${entry.student.batch}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => removeStudent(studentId)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>

              {entry.loading ? (
                <p className="text-sm text-ink/40">Loading due months…</p>
              ) : entry.error ? (
                <p className="text-sm text-red-600">{entry.error}</p>
              ) : entry.dueMonths.length === 0 ? (
                <p className="text-sm text-green-700">No due months — fully paid.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {entry.dueMonths.map((f) => {
                    const balance = parseFloat(f.amount) - parseFloat(f.amount_paid);
                    const checked = entry.selectedIds.has(f.id);
                    return (
                      <div
                        key={f.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-ink/10 px-3 py-2"
                      >
                        <label className="flex items-center gap-2 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFee(studentId, f.id)}
                          />
                          {monthLabel(f.fee_month)}
                          <span className="text-xs text-ink/40">(balance Rs {fmt(balance)})</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-ink/40">Rs</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            disabled={!checked}
                            value={entry.amounts[f.id] ?? ''}
                            onChange={(e) => setAmount(studentId, f.id, e.target.value)}
                            className="w-28 rounded-sm border border-ink/20 px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-40"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary + submit */}
      {Object.keys(cart).length > 0 && (
        <div className="rounded-sm border border-ink/10 bg-ink/3 p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-ink/60">
              {studentsWithSelection.size} student{studentsWithSelection.size === 1 ? '' : 's'} · {selectedPayments.length} fee month{selectedPayments.length === 1 ? '' : 's'} selected
            </span>
            <span className="text-lg font-semibold text-ink">Total: Rs {fmt(total)}</span>
          </div>

          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="mb-3 w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-accent focus:outline-none"
          />

          {studentsWithSelection.size === 1 && (
            <p className="mb-3 text-xs text-amber-700">
              Select due months for at least one more student to create a family voucher.
            </p>
          )}
          {submitError && <p className="mb-3 text-sm text-red-600">{submitError}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full rounded-sm bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-40 sm:w-auto"
          >
            {submitting ? 'Processing…' : 'Confirm Combined Payment & Generate Receipt'}
          </button>
        </div>
      )}
    </DashboardLayout>
  );
};

export default FamilyPaymentPage;
