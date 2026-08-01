import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  listAdmins,
  createAdmin,
  activateAdmin,
  deactivateAdmin,
  resetAdminPassword,
} from '../utils/userApi';

const emptyForm = { fullName: '', email: '', password: '' };

const AdminListPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

  const [resetTarget, setResetTarget] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listAdmins();
      setAdmins(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load admin accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      const admin = await createAdmin(form);
      setCreatedCreds({ email: admin.email, password: form.password });
      setForm(emptyForm);
      setShowForm(false);
      fetchAdmins();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Unable to create admin account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    try {
      if (admin.is_active) {
        await deactivateAdmin(admin.id);
      } else {
        await activateAdmin(admin.id);
      }
      fetchAdmins();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update account status');
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    if (resetPassword.length < 8) {
      setResetError('Password must be at least 8 characters long');
      return;
    }
    setIsResetting(true);
    try {
      await resetAdminPassword(resetTarget.id, resetPassword);
      setCreatedCreds({ email: resetTarget.email, password: resetPassword });
      setResetTarget(null);
      setResetPassword('');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Unable to reset password');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <DashboardLayout title="Admins">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Manage Admins</h1>
          <p className="mt-1 text-sm text-ink/50">
            Admin accounts have the same access as your account, except for owner-only settings.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setFormError('');
          }}
          className="inline-flex items-center justify-center rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/90"
        >
          {showForm ? 'Cancel' : '+ Add Admin'}
        </button>
      </div>

      {createdCreds && (
        <div className="mt-4 rounded-sm border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium">Account ready — share these credentials securely:</p>
          <p className="mt-1 font-mono text-xs">
            Email: {createdCreds.email} &nbsp;•&nbsp; Temporary password: {createdCreds.password}
          </p>
          <p className="mt-1 text-xs text-emerald-700">They'll be required to set a new password on first login.</p>
          <button
            onClick={() => setCreatedCreds(null)}
            className="mt-2 text-xs font-medium text-emerald-700 underline hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-4 max-w-md rounded-sm border border-ink/10 bg-white p-4">
          {formError && (
            <div className="mb-3 rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Full name</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={handleChange('fullName')}
                className="w-full rounded-sm border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={handleChange('email')}
                className="w-full rounded-sm border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Temporary password</label>
              <input
                type="text"
                required
                minLength={8}
                value={form.password}
                onChange={handleChange('password')}
                placeholder="At least 8 characters"
                className="w-full rounded-sm border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 inline-flex items-center justify-center rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating…' : 'Create admin account'}
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mt-4 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-sm border border-ink/10 bg-white">
        <table className="min-w-full divide-y divide-ink/10 text-sm">
          <thead className="bg-ink/[0.03]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/60">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/60">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/60">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink/60">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/50">Loading…</td>
              </tr>
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/50">No admin accounts yet.</td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-4 py-3 text-ink">{admin.full_name}</td>
                  <td className="px-4 py-3 text-ink/80">{admin.email}</td>
                  <td className="px-4 py-3 capitalize text-ink/80">{admin.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        admin.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-ink/10 text-ink/50'
                      }`}
                    >
                      {admin.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-4">
                      <button
                        onClick={() => {
                          setResetTarget(admin);
                          setResetPassword('');
                          setResetError('');
                        }}
                        className="text-xs font-medium text-accent hover:text-accent/80"
                      >
                        Reset password
                      </button>
                      {admin.role !== 'owner' && (
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          className={`text-xs font-medium ${
                            admin.is_active ? 'text-red-600 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'
                          }`}
                        >
                          {admin.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <form onSubmit={handleResetSubmit} className="w-full max-w-sm rounded-sm bg-white p-5">
            <h2 className="font-display text-base font-semibold text-ink">
              Reset password for {resetTarget.full_name}
            </h2>
            {resetError && (
              <div className="mt-3 rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                {resetError}
              </div>
            )}
            <input
              type="text"
              required
              minLength={8}
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="New temporary password"
              className="mt-3 w-full rounded-sm border border-ink/15 bg-white px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="rounded-sm border border-ink/15 px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResetting}
                className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas hover:bg-ink/90 disabled:opacity-50"
              >
                {isResetting ? 'Saving…' : 'Set password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminListPage;
