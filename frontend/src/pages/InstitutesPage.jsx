import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { listInstitutes, createInstitute, updateInstitute, deleteInstitute } from '../utils/instituteApi';

const InstitutesPage = () => {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listInstitutes();
      setInstitutes(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load institutes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    setError('');
    setMessage('');
    try {
      const data = await createInstitute(trimmed);
      setMessage(data.message);
      setNewName('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add institute');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleStatus = async (institute) => {
    setBusyId(institute.id);
    setError('');
    setMessage('');
    try {
      const newStatus = institute.status === 'active' ? 'inactive' : 'active';
      await updateInstitute(institute.id, { status: newStatus });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update institute');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    setBusyId(id);
    setError('');
    setMessage('');
    try {
      const data = await deleteInstitute(id);
      setMessage(data.message);
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete institute');
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout title="Institutes">
      <p className="mb-6 max-w-2xl text-sm text-ink/60">
        Manage affiliated academies. Once added, an institute becomes available for selection
        whenever a student is added or edited.
      </p>

      {message && <div className="mb-4 rounded-sm border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleAdd} className="mb-8 flex max-w-md items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60">New institute name</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Nation Builders Institute"
            className="mt-2 w-full rounded-sm border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? 'Adding…' : 'Add Institute'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink/60">Loading institutes…</p>
      ) : institutes.length === 0 ? (
        <p className="text-sm text-ink/50">No institutes added yet — add your first one above.</p>
      ) : (
        <div className="max-w-3xl overflow-hidden rounded-sm border border-ink/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/3 text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3">Institute Name</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {institutes.map((i) => (
                <tr key={i.id} className="hover:bg-ink/2">
                  <td className="px-4 py-3 font-medium text-ink">{i.name}</td>
                  <td className="px-4 py-3 text-ink/70">{i.student_count}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium capitalize ${i.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-ink/10 text-ink/60'}`}>
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(i)}
                        disabled={busyId === i.id}
                        className="rounded-sm border border-ink/20 px-2 py-0.5 text-xs text-ink/70 hover:bg-ink/5"
                      >
                        Mark {i.status === 'active' ? 'Inactive' : 'Active'}
                      </button>
                      {confirmDeleteId === i.id ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-ink/60">Delete?</span>
                          <button
                            onClick={() => handleDelete(i.id)}
                            disabled={busyId === i.id}
                            className="rounded-sm border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            {busyId === i.id ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-sm border border-ink/15 px-2 py-1 text-xs text-ink/70 hover:bg-ink/5"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(i.id)}
                          className="rounded-sm border border-ink/20 px-2 py-0.5 text-xs text-ink/70 hover:border-red-300 hover:text-red-600 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
};

export default InstitutesPage;
