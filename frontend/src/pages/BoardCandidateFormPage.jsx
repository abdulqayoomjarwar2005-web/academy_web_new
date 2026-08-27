import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import {
  getBoardCandidate,
  createBoardCandidate,
  updateBoardCandidate,
  listBoardBatches,
  BOARD_CANDIDATE_STATUSES,
} from '../utils/boardApi';
import { listInstitutes } from '../utils/instituteApi';

const today = () => new Date().toISOString().slice(0, 10);

const BoardCandidateFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [candidateName, setCandidateName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [batchId, setBatchId] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(today());
  const [status, setStatus] = useState('active');
  const [batches, setBatches] = useState([]);
  const [instituteId, setInstituteId] = useState('');
  const [institutes, setInstitutes] = useState([]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listBoardBatches({ status: 'active' }).then(setBatches).catch(() => {});
  }, []);

  useEffect(() => {
    listInstitutes({ status: 'active' }).then(setInstitutes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    getBoardCandidate(id)
      .then((d) => {
        const c = d.candidate;
        setCandidateName(c.candidate_name);
        setFatherName(c.father_name);
        setContactNumber(c.contact_number || '');
        setBatchId(c.batch_id || '');
        setEnrollmentDate(c.enrollment_date?.slice(0, 10) || today());
        setStatus(c.status);
        setInstituteId(c.institute_id || '');
      })
      .catch(() => setError('Failed to load candidate.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!candidateName.trim() || !fatherName.trim()) {
      setError('Candidate name and father name are required.');
      return;
    }
    if (!batchId) {
      setError('Please select a DIT batch.');
      return;
    }
    if (!instituteId) {
      setError('Please select an institute.');
      return;
    }
    if (!enrollmentDate) {
      setError('Enrollment date is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        candidateName: candidateName.trim(),
        fatherName: fatherName.trim(),
        contactNumber: contactNumber.trim() || undefined,
        batchId,
        enrollmentDate,
        instituteId,
      };
      if (isEdit) {
        await updateBoardCandidate(id, { ...payload, status });
        navigate(`/board/candidates/${id}`);
      } else {
        const data = await createBoardCandidate(payload);
        navigate(`/board/candidates/${data.candidate.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save candidate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title={isEdit ? 'Edit Candidate' : 'Enroll Candidate'}>
      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Candidate Name</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Father's Name</label>
            <input
              type="text"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Contact Number</label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">DIT Batch</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              required
            >
              <option value="">Select a batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.batch_name}</option>
              ))}
            </select>
            {batches.length === 0 && (
              <p className="mt-1 text-xs text-ink/40">No active batches yet — add one on the DIT Batches page first.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Institute</label>
            <select
              value={instituteId}
              onChange={(e) => setInstituteId(e.target.value)}
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              required
            >
              <option value="">Select institute…</option>
              {institutes.map((inst) => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
            {institutes.length === 0 && (
              <p className="mt-1 text-xs text-ink/40">No institutes set up yet — add one on the Institutes page first.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-ink/70">Enrollment Date</label>
            <input
              type="date"
              value={enrollmentDate}
              onChange={(e) => setEnrollmentDate(e.target.value)}
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              required
            />
          </div>

          {isEdit && (
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink capitalize focus:border-accent focus:outline-none"
              >
                {BOARD_CANDIDATE_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Enroll Candidate'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/board/candidates')}
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

export default BoardCandidateFormPage;
