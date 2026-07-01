import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const roleRedirects = {
  owner: '/owner/dashboard',
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
};

const ChangePasswordPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setMessage(data.message);

      if (user?.mustChangePassword) {
        updateUser({ ...user, mustChangePassword: false });
        setTimeout(() => navigate(roleRedirects[user.role] || '/'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to change password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-ink">Change your password</h1>
        <p className="mt-2 text-sm text-ink/60">
          {user?.mustChangePassword
            ? 'For security, please set a new password before continuing.'
            : 'Update your account password below.'}
        </p>

        {message && (
          <div className="mt-6 rounded-sm border border-accent-light/60 bg-accent-light/10 px-4 py-3 text-sm text-ink/80">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-xs font-semibold uppercase tracking-wider text-ink/60"
            >
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-ink/15 bg-white px-4 py-2.5 text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-xs font-semibold uppercase tracking-wider text-ink/60"
            >
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-ink/15 bg-white px-4 py-2.5 text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold uppercase tracking-wider text-ink/60"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-ink/15 bg-white px-4 py-2.5 text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-sm bg-ink px-4 py-2.5 font-medium text-canvas transition hover:bg-ink/90 focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
