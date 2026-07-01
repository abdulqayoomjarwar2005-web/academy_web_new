import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleRedirects = {
  owner:   '/owner/dashboard',
  admin:   '/admin/dashboard',
  teacher: '/teacher/dashboard',
};

const LoginPage = () => {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.mustChangePassword) { navigate('/change-password', { replace: true }); return; }
      navigate(roleRedirects[user.role] || '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Left Panel ── */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #060E1C 0%, #0B1F3A 40%, #122847 100%)' }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A84C' fill-opacity='0.06'%3E%3Cpath d='M0 0h80v80H0V0zm20 20v40h40V20H20zm20 35a15 15 0 1 1 0-30 15 15 0 0 1 0 30z' fill-rule='evenodd'/%3E%3C/g%3E%3C/svg%3E\")" }}
        />

        {/* Gold top border */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #C9A84C, #E2C97E, #C9A84C)' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full px-14 py-12">

          {/* Logo mark */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded"
              style={{ background: 'rgba(201,168,76,0.15)', border: '1.5px solid rgba(201,168,76,0.5)' }}>
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.35rem', fontWeight: 700, color: '#C9A84C' }}>N</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.95rem', color: '#F4F6F9', letterSpacing: '0.02em' }}>
                Nation Builders
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.8)', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: '1px' }}>
                Institute of Learning
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div className="max-w-lg">
            <div style={{ width: 48, height: 2, background: '#C9A84C', marginBottom: '2rem', borderRadius: 1 }} />
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '3.25rem', fontWeight: 700, color: '#F4F6F9', lineHeight: 1.15, marginBottom: '1.5rem' }}>
              Shaping Tomorrow's
              <span style={{ display: 'block', color: '#C9A84C' }}>Nation Builders.</span>
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'rgba(244,246,249,0.65)', lineHeight: 1.75, maxWidth: '28rem' }}>
              A unified management platform for administrators, educators, and institution leadership — attendance, finances, and academic records, all in one place.
            </p>

            {/* Stats row */}
            <div className="flex gap-8 mt-10">
              {[['Students', 'Enrolled'], ['Faculty', 'Members'], ['Modules', 'Integrated']].map(([num, lbl]) => (
                <div key={lbl}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: '#C9A84C' }}>—</div>
                  <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(244,246,249,0.45)', marginTop: 2 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ fontSize: '0.7rem', color: 'rgba(244,246,249,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Larkana, Sindh &nbsp;·&nbsp; Academic Management System
          </div>
        </div>

        {/* Decorative arch */}
        <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full opacity-10"
          style={{ border: '40px solid #C9A84C' }} />
        <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full opacity-5"
          style={{ border: '30px solid #C9A84C' }} />
      </div>

      {/* ── Right Panel — Form ── */}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-6 py-12" style={{ background: '#F4F6F9' }}>
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded flex items-center justify-center"
              style={{ background: '#0B1F3A' }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: '#C9A84C' }}>N</span>
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.85rem', fontWeight: 600, color: '#0B1F3A' }}>Nation Builders Institute</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8A9BB0' }}>of Learning Larkana</div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '0.5rem' }}>
              Secure Access Portal
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '2rem', fontWeight: 700, color: '#0B1F3A', lineHeight: 1.2 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#8A9BB0', marginTop: '0.4rem' }}>
              Sign in to access your dashboard
            </p>
          </div>

          {/* Gold rule */}
          <div style={{ height: 2, background: 'linear-gradient(90deg, #C9A84C, #E2C97E 50%, transparent)', marginBottom: '2rem', borderRadius: 1 }} />

          {/* Error */}
          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 4, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: '0.8rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Email */}
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0B1F3A', marginBottom: '0.5rem' }}>
                Email Address
              </label>
              <input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="abdulqayoom@nb"
                style={{ width: '100%', padding: '0.7rem 1rem', border: '1.5px solid #E2E8F0', borderRadius: 4, background: 'white', color: '#0B1F3A', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#C9A84C'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            {/* Password */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="password" style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0B1F3A' }}>
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: '#2D5690', fontWeight: 500, textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" type={showPass ? 'text' : 'password'} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', padding: '0.7rem 2.75rem 0.7rem 1rem', border: '1.5px solid #E2E8F0', borderRadius: 4, background: 'white', color: '#0B1F3A', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                  onFocus={e => e.target.style.borderColor = '#C9A84C'}
                  onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8A9BB0', padding: 0 }}>
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={isSubmitting}
              style={{
                width: '100%', padding: '0.8rem 1rem', borderRadius: 4, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                background: isSubmitting ? '#8A9BB0' : 'linear-gradient(135deg, #0B1F3A 0%, #1A3557 100%)',
                color: 'white', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.04em',
                transition: 'opacity 0.15s', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {isSubmitting ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Signing in…
                </>
              ) : 'Sign In to Dashboard'}
            </button>
          </form>

          <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.72rem', color: '#8A9BB0', lineHeight: 1.6 }}>
            Access is provisioned by your institute administrator.<br />
            <span style={{ color: '#C9A84C' }}>NBIL</span> — Nation Builders Institute of Learning Larkana
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default LoginPage;
