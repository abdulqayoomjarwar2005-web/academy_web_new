import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { bulkGenerateFees } from '../utils/feeApi';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const GenerateFeesPage = () => {
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!month) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await bulkGenerateFees(month);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate fees.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Generate Monthly Fees">
      <div className="mb-6">
        <Link
          to="/fees"
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          ← Fee Records
        </Link>
      </div>

      <div className="max-w-md">
        <p className="mb-6 text-sm text-ink/60">
          This creates fee records for <strong>all active students</strong> for the selected month,
          based on their current monthly fee amount. Students who already have a record for that
          month are skipped automatically.
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-ink/70">Select Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 rounded-sm border border-green-200 bg-green-50 p-4 text-sm">
            <div className="font-semibold text-green-800">Done!</div>
            <div className="mt-1 text-green-700">
              {result.created} fee records created · {result.skipped} already existed (skipped)
            </div>
            <Link
              to="/fees"
              className="mt-2 inline-block text-xs text-accent hover:underline"
            >
              View fee records →
            </Link>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !month}
          className="rounded-sm bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate Fees'}
        </button>
      </div>
    </DashboardLayout>
  );
};

export default GenerateFeesPage;
