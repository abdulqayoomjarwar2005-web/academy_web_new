import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const ForgotPasswordPage = () => {
  const [email, setEmail]         = useState('');
  const [message, setMessage]     = useState('');
  const [error, setError]         = useState('');
  const [isSubmitting, setSubmit] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setSubmit(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setSubmit(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #060E1C 0%, #0B1F3A 50%, #122847 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>

          {/* Gold top bar */}
          <div style={{ height: 4, background: 'linear-gradient(90deg, #C9A84C, #E2C97E, #C9A84C)' }} />

          <div style={{ padding: '2.5rem 2.25rem' }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <div style={{ width: 40, height: 40, background: '#0B1F3A', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: '#C9A84C' }}>N</span>
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.85rem', fontWeight: 700, color: '#0B1F3A' }}>Nation Builders Institute</div>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A9BB0' }}>of Learning Larkana</div>
              </div>
            </div>

            <div style={{ width: 32, height: 2, background: '#C9A84C', borderRadius: 1, marginBottom: '1.5rem' }} />

            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.5rem' }}>
              Reset Password
            </h1>
            <p style={{ fontSize: '0.82rem', color: '#8A9BB0', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              Enter your registered email address and we'll send you a secure reset link.
            </p>

            {message && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 4, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#065F46', fontSize: '0.8rem', marginBottom: '1.25rem', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
                {message}
              </div>
            )}
            {error && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: 4, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label htmlFor="email" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0B1F3A', marginBottom: '0.5rem' }}>
                  Email Address
                </label>
                <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="abdulqayoom@nb"
                  style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #E2E8F0', borderRadius: 4, color: '#0B1F3A', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>
              <button type="submit" disabled={isSubmitting}
                style={{ width: '100%', padding: '0.8rem', borderRadius: 4, border: 'none', background: isSubmitting ? '#8A9BB0' : 'linear-gradient(135deg, #0B1F3A, #1A3557)', color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}>
                {isSubmitting ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
              <Link to="/login" style={{ color: '#2D5690', fontWeight: 500, textDecoration: 'none' }}>
                ← Back to Sign In
              </Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '1.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Nation Builders Institute of Learning Larkana
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
