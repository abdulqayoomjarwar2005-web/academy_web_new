import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { listClasses, createClass, deleteClass } from '../utils/classApi';

const ClassesPage = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listClasses();
      setClasses(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAdding(true);
    setError('');
    setMessage('');
    try {
      const data = await createClass(trimmed);
      setMessage(data.message);
      setNewName('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add class');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setError('');
    setMessage('');
    try {
      const data = await deleteClass(id);
      setMessage(data.message);
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete class');
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout title="Classes">
      <p className="mb-6 max-w-2xl text-sm text-ink/60">
        Manage the list of classes used across the app — when adding students, assigning
        teachers, and marking attendance.
      </p>

      {message && (
        <div className="mb-4 rounded-sm border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add class form */}
      <form onSubmit={handleAdd} className="mb-8 flex max-w-md items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60">
            New class name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Grade 9, or 9-A"
            className="mt-2 w-full rounded-sm border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {adding ? 'Adding…' : 'Add Class'}
        </button>
      </form>

      {/* Class list */}
      {loading ? (
        <p className="text-sm text-ink/60">Loading classes…</p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-ink/50">No classes added yet — add your first one above.</p>
      ) : (
        <div className="max-w-2xl overflow-hidden rounded-sm border border-ink/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/3 text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3">Class Name</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-ink/2">
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3">
                    {confirmDeleteId === c.id ? (
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-ink/60">Delete this class?</span>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="rounded-sm border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          {deletingId === c.id ? 'Deleting…' : 'Yes, delete'}
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
                        onClick={() => setConfirmDeleteId(c.id)}
                        className="rounded-sm border border-ink/20 px-2 py-0.5 text-xs text-ink/70 hover:border-red-300 hover:text-red-600 transition"
                      >
                        Delete
                      </button>
                    )}
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

export default ClassesPage;
