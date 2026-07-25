import { useEffect, useState } from 'react';
import {
  getTeacherAccount,
  createTeacherAccount,
  updateTeacherClasses,
  activateTeacherAccount,
  deactivateTeacherAccount,
  resetTeacherPassword,
} from '../utils/teacherApi';

// Simple free-text "tag" input for building a list of class names,
// e.g. "9-A", "10-B" — since classes aren't a fixed enum in this system.
const ClassTagInput = ({ classes, setClasses }) => {
  const [draft, setDraft] = useState('');

  const addClass = () => {
    const value = draft.trim();
    if (!value) return;
    if (!classes.includes(value)) setClasses([...classes, value]);
    setDraft('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {classes.map((cls) => (
          <span
            key={cls}
            className="inline-flex items-center gap-1.5 rounded-sm bg-ink/5 px-3 py-1 text-sm text-ink"
          >
            {cls}
            <button
              type="button"
              onClick={() => setClasses(classes.filter((c) => c !== cls))}
              className="text-ink/40 hover:text-red-600"
              aria-label={`Remove ${cls}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addClass();
            }
          }}
          placeholder="e.g. 9-A"
          className="w-40 rounded-sm border border-ink/15 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="button"
          onClick={addClass}
          className="rounded-sm border border-ink/15 px-3 py-2 text-sm font-medium text-ink transition hover:bg-ink/5"
        >
          Add class
        </button>
      </div>
    </div>
  );
};

// Generates a random, easy-to-read temporary password (avoids
// confusing look-alike characters like 0/O and 1/l/I).
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
};

// Small reusable "copy to clipboard" button.
const CopyButton = ({ value, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable — fail silently
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-sm border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-ink/5"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
};

const TeacherAccountPanel = ({ teacherId }) => {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Create-account form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newClasses, setNewClasses] = useState([]);

  // Holds the just-created credentials so they can be shown + copied
  // after submission (the server response doesn't echo the password back).
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Edit-classes state
  const [editingClasses, setEditingClasses] = useState(false);
  const [classDraft, setClassDraft] = useState([]);

  // Reset-password state
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [resetCredentials, setResetCredentials] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTeacherAccount(teacherId);
      setAccount(data);
      setClassDraft(data.classes || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load account info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await createTeacherAccount(teacherId, { email, password, classes: newClasses });
      setMessage(data.message);
      setCreatedCredentials({ email, password });
      setEmail('');
      setPassword('');
      setNewClasses([]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create login account');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveClasses = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await updateTeacherClasses(teacherId, classDraft);
      setMessage(data.message);
      setEditingClasses(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update class assignments');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = account.isActive
        ? await deactivateTeacherAccount(teacherId)
        : await activateTeacherAccount(teacherId);
      setMessage(data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update account status');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const data = await resetTeacherPassword(teacherId, tempPassword);
      setMessage(data.message);
      setResetCredentials({ email: account.email, password: tempPassword });
      setTempPassword('');
      setShowResetPassword(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-ink/60">Loading login account…</p>;
  }

  return (
    <div className="mt-10 border-t border-ink/10 pt-6">
      <h3 className="font-display text-lg text-ink">Portal login access</h3>
      <p className="mt-1 text-sm text-ink/60">
        Let this teacher log in to mark attendance, and add/view students for their assigned class(es).
      </p>

      {message && (
        <div className="mt-4 rounded-sm border border-accent-light/60 bg-accent-light/10 px-4 py-3 text-sm text-ink/80">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Just-created credentials — shown once, ready to copy and send */}
      {createdCredentials && (
        <div className="mt-4 max-w-md rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            Share these with the teacher
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm text-ink">Email: <strong>{createdCredentials.email}</strong></span>
            <CopyButton value={createdCredentials.email} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-sm text-ink">Password: <strong>{createdCredentials.password}</strong></span>
            <CopyButton value={createdCredentials.password} />
          </div>
          <button
            type="button"
            onClick={() => setCreatedCredentials(null)}
            className="mt-2 text-xs font-medium text-ink/50 hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Just-reset credentials — same idea for password resets */}
      {resetCredentials && (
        <div className="mt-4 max-w-md rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            New password — share with the teacher
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm text-ink">Email: <strong>{resetCredentials.email}</strong></span>
            <CopyButton value={resetCredentials.email} />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-sm text-ink">Password: <strong>{resetCredentials.password}</strong></span>
            <CopyButton value={resetCredentials.password} />
          </div>
          <button
            type="button"
            onClick={() => setResetCredentials(null)}
            className="mt-2 text-xs font-medium text-ink/50 hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      )}

      {!account?.hasAccount ? (
        <form onSubmit={handleCreateAccount} className="mt-4 max-w-md space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60">
              Login email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-sm border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="teacher@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60">
                Temporary password
              </label>
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="text-xs font-medium text-accent hover:text-accent/80"
              >
                Generate password
              </button>
            </div>
            <input
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="At least 8 characters, or click Generate password"
            />
            <p className="mt-1 text-xs text-ink/40">The teacher will be asked to change this on first login.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60">
              Assigned class(es)
            </label>
            <div className="mt-2">
              <ClassTagInput classes={newClasses} setClasses={setNewClasses} />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create login account'}
          </button>
        </form>
      ) : (
        <div className="mt-4 space-y-5">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink/40">Login email</dt>
              <dd className="mt-1 text-sm text-ink">{account.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink/40">Status</dt>
              <dd className="mt-1 text-sm">
                <span
                  className={`rounded-sm px-2 py-0.5 text-xs font-medium ${
                    account.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {account.isActive ? 'Active' : 'Deactivated'}
                </span>
              </dd>
            </div>
          </dl>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink/40">Assigned class(es)</dt>
            {!editingClasses ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(account.classes || []).length > 0 ? (
                  account.classes.map((cls) => (
                    <span key={cls} className="rounded-sm bg-ink/5 px-3 py-1 text-sm text-ink">
                      {cls}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-ink/50">No classes assigned yet</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setClassDraft(account.classes || []);
                    setEditingClasses(true);
                  }}
                  className="ml-2 text-sm font-medium text-accent hover:text-accent/80"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="mt-2">
                <ClassTagInput classes={classDraft} setClasses={setClassDraft} />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveClasses}
                    disabled={busy}
                    className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/90 disabled:opacity-60"
                  >
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingClasses(false)}
                    className="rounded-sm border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleToggleActive}
              disabled={busy}
              className={`rounded-sm border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
                account.isActive
                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {account.isActive ? 'Deactivate login' : 'Activate login'}
            </button>
            <button
              type="button"
              onClick={() => setShowResetPassword((v) => !v)}
              className="rounded-sm border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/5"
            >
              Set temporary password
            </button>
          </div>

          {showResetPassword && (
            <form onSubmit={handleResetPassword} className="mt-2 max-w-md space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60">
                  New temporary password
                </label>
                <button
                  type="button"
                  onClick={() => setTempPassword(generatePassword())}
                  className="text-xs font-medium text-accent hover:text-accent/80"
                >
                  Generate password
                </button>
              </div>
              <div className="flex items-end gap-3">
                <input
                  type="text"
                  required
                  minLength={8}
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="flex-1 rounded-sm border border-ink/15 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="At least 8 characters, or click Generate password"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-sm bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition hover:bg-ink/90 disabled:opacity-60"
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherAccountPanel;
