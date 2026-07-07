import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../utils/api';

const ResetPasswordPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Email is required');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit verification code sent to your email');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await api.post('/auth/reset-password', { email, otp, newPassword });
      setMessage(data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-ink">Enter your verification code</h1>
        <p className="mt-2 text-sm text-ink/60">
          We emailed a 6-digit code to your address. Enter it below along with your new password.
          The code expires in 10 minutes.
        </p>

        {message && (
          <div className="mt-6 rounded-sm border border-accent-light/60 bg-accent-light/10 px-4 py-3 text-sm text-ink/80">
            {message} Redirecting to sign in…
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
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-ink/60"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-sm border border-ink/15 bg-white px-4 py-2.5 text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="otp"
              className="block text-xs font-semibold uppercase tracking-wider text-ink/60"
            >
              Verification code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="mt-2 w-full rounded-sm border border-ink/15 bg-white px-4 py-2.5 tracking-[0.4em] text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="••••••"
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
              Confirm password
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
            {isSubmitting ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          <Link to="/forgot-password" className="font-medium text-accent hover:text-accent/80">
            Didn't get a code? Resend it
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-ink/60">
          <Link to="/login" className="font-medium text-accent hover:text-accent/80">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
