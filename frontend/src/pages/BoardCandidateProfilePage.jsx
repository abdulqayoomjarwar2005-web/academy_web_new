import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import {
  getBoardCandidate,
  listBoardFeesForCandidate,
  setBoardFeeItem,
  markBoardFeePaid,
  markBoardFeePartial,
  markBoardFeeUnpaid,
  BOARD_FEE_TYPES,
} from '../utils/boardApi';

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const feeTypeLabels = {
  enrollment: 'Enrollment',
  exam_1: 'Exam I',
  exam_2: 'Exam II',
  project: 'Project Fee',
  other: 'Other',
};

const StatusBadge = ({ status }) => {
  const map = {
    unpaid: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium capitalize ${map[status] || 'bg-ink/10 text-ink'}`}>
      {status}
    </span>
  );
};

const FeeRow = ({ feeType, fee, candidateId, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [amountInput, setAmountInput] = useState(fee ? String(fee.amount) : '');
  const [partialInput, setPartialInput] = useState('');
  const [showPartial, setShowPartial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSaveAmount = async () => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount < 0) {
      setError('Enter a valid non-negative amount.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setBoardFeeItem({ candidateId, feeType, amount });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async () => {
    setBusy(true);
    setError('');
    try {
      await markBoardFeePaid(fee.id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPartial = async () => {
    const amount = parseFloat(partialInput);
    if (isNaN(amount) || amount < 0 || amount > parseFloat(fee.amount)) {
      setError('Enter a valid partial amount (not more than the total).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await markBoardFeePartial(fee.id, amount);
      setShowPartial(false);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update.');
    } finally {
      setBusy(false);
    }
  };

  const handleMarkUnpaid = async () => {
    setBusy(true);
    setError('');
    try {
      await markBoardFeeUnpaid(fee.id);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update.');
    } finally {
      setBusy(false);
    }
  };

  const balance = fee ? parseFloat(fee.amount) - parseFloat(fee.amount_paid) : 0;

  return (
    <div className="rounded-sm border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-ink">{feeTypeLabels[feeType]}</span>
        {fee ? <StatusBadge status={fee.status} /> : <span className="text-xs text-ink/40">Not billed yet</span>}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {editing || !fee ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="Amount (Rs)"
            className="w-32 rounded-sm border border-ink/20 px-2 py-1 text-sm text-ink focus:border-accent focus:outline-none"
          />
          <button
            onClick={handleSaveAmount}
            disabled={busy}
            className="rounded-sm bg-ink px-3 py-1 text-xs font-medium text-canvas hover:bg-ink/80 disabled:opacity-60"
          >
            {fee ? 'Update Amount' : 'Set Fee'}
          </button>
          {fee && (
            <button onClick={() => setEditing(false)} className="rounded-sm border border-ink/20 px-3 py-1 text-xs text-ink/70 hover:bg-ink/5">
              Cancel
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2 text-xs">
            <div><p className="text-ink/40">Amount</p><p className="text-ink/80">Rs {fmt(fee.amount)}</p></div>
            <div><p className="text-ink/40">Paid</p><p className="text-ink/80">{parseFloat(fee.amount_paid) > 0 ? `Rs ${fmt(fee.amount_paid)}` : '—'}</p></div>
            <div><p className="text-ink/40">Balance</p><p className="font-medium text-red-600">Rs {fmt(balance)}</p></div>
          </div>

          {fee.status !== 'paid' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleMarkPaid} disabled={busy} className="rounded-sm bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60">
                Mark Paid
              </button>
              {!showPartial ? (
                <button onClick={() => setShowPartial(true)} className="rounded-sm border border-ink/20 px-3 py-1 text-xs text-ink/70 hover:bg-ink/5">
                  Mark Partial
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partialInput}
                    onChange={(e) => setPartialInput(e.target.value)}
                    placeholder="Amount paid"
                    className="w-28 rounded-sm border border-ink/20 px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
                  />
                  <button onClick={handleMarkPartial} disabled={busy} className="rounded-sm bg-yellow-500 px-3 py-1 text-xs font-medium text-white hover:bg-yellow-600 disabled:opacity-60">
                    Save
                  </button>
                  <button onClick={() => setShowPartial(false)} className="text-xs text-ink/50 hover:text-ink">Cancel</button>
                </span>
              )}
              <button onClick={() => { setEditing(true); setAmountInput(String(fee.amount)); }} className="rounded-sm border border-ink/20 px-3 py-1 text-xs text-ink/70 hover:bg-ink/5">
                Edit Amount
              </button>
            </div>
          )}
          {fee.status === 'paid' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={handleMarkUnpaid} disabled={busy} className="rounded-sm border border-ink/20 px-3 py-1 text-xs text-ink/70 hover:bg-ink/5">
                Revert to Unpaid
              </button>
              <button onClick={() => { setEditing(true); setAmountInput(String(fee.amount)); }} className="rounded-sm border border-ink/20 px-3 py-1 text-xs text-ink/70 hover:bg-ink/5">
                Edit Amount
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const BoardCandidateProfilePage = () => {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [candidateData, feeData] = await Promise.all([
        getBoardCandidate(id),
        listBoardFeesForCandidate(id),
      ]);
      setCandidate(candidateData.candidate);
      setFees(feeData.fees);
    } catch {
      setError('Failed to load candidate.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const feesByType = Object.fromEntries(fees.map((f) => [f.fee_type, f]));
  const totalBilled = fees.reduce((sum, f) => sum + parseFloat(f.amount), 0);
  const totalPaid = fees.reduce((sum, f) => sum + parseFloat(f.amount_paid), 0);
  const totalDue = totalBilled - totalPaid;

  return (
    <DashboardLayout title="Candidate Profile">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/board/candidates" className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5">
          ← Candidates
        </Link>
        {candidate && (
          <Link to={`/board/candidates/${id}/edit`} className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5">
            Edit Candidate
          </Link>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      ) : (
        <>
          <div className="mb-6 rounded-sm border border-ink/10 bg-white p-5">
            <div className="font-display text-xl text-ink">{candidate.candidate_name}</div>
            <div className="mt-1 text-xs text-ink/40">
              {candidate.candidate_code} &middot; S/O-D/O {candidate.father_name} &middot; {candidate.batch_name || 'No batch'} &middot; {candidate.institute_name || 'No institute'}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink/70">
              <span>Enrolled: {candidate.enrollment_date?.slice(0, 10)}</span>
              {candidate.contact_number && <span>Contact: {candidate.contact_number}</span>}
              <span className="capitalize">Status: {candidate.status}</span>
            </div>
            {totalDue > 0 && (
              <div className="mt-3 inline-block rounded-sm bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                Total Due: Rs {fmt(totalDue)}
              </div>
            )}
          </div>

          <h2 className="mb-4 font-display text-lg text-ink">Fees</h2>
          <div className="space-y-3">
            {BOARD_FEE_TYPES.map((feeType) => (
              <FeeRow
                key={feeType}
                feeType={feeType}
                fee={feesByType[feeType]}
                candidateId={id}
                onChanged={fetchData}
              />
            ))}
          </div>

          <div className="mt-6 rounded-sm border border-ink/10 bg-ink/3 p-4 text-sm">
            <div className="flex justify-between"><span className="text-ink/60">Total Billed</span><span className="text-ink">Rs {fmt(totalBilled)}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-ink/60">Total Paid</span><span className="text-ink">Rs {fmt(totalPaid)}</span></div>
            <div className="mt-1 flex justify-between font-semibold"><span className="text-ink">Total Due</span><span className="text-red-600">Rs {fmt(totalDue)}</span></div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default BoardCandidateProfilePage;
