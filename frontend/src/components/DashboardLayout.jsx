import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const roleLabels = { owner: 'Owner', admin: 'Administrator', teacher: 'Teacher' };
const roleBadgeStyle = {
  owner:   { background: 'rgba(201,168,76,0.15)', color: '#A07828', border: '1px solid rgba(201,168,76,0.4)' },
  admin:   { background: 'rgba(45,86,144,0.12)', color: '#1A3557', border: '1px solid rgba(45,86,144,0.3)' },
  teacher: { background: 'rgba(16,122,90,0.10)', color: '#0B6B4E', border: '1px solid rgba(16,122,90,0.3)' },
};

// Icon components
const Icon = ({ d, size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const navItems = (can) => [
  { to: '/students',              label: 'Students',      icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', show: true },
  { to: '/teachers',             label: 'Faculty',       icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z', show: can.teachers },
  { to: '/attendance',           label: 'Attendance',    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', show: true },
  { to: '/fees/dashboard',       label: 'Fees',          icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', show: true },
  { to: '/defaulters',           label: 'Defaulters',    icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', show: true, alert: true },
  { to: '/expenses/dashboard',   label: 'Expenses',      icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', show: can.expenses },
  { to: '/profit-loss/dashboard',label: 'P & L',         icon: 'M18 20V10M12 20V4M6 20v-6', show: can.profitLoss },
  { to: '/reports/export',       label: 'Reports',       icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8', show: true },
  { to: '/audit',                label: 'Audit Log',     icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', show: can.audit },
];

const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const can = {
    teachers:  user?.role === 'owner' || user?.role === 'admin',
    expenses:  user?.role === 'owner' || user?.role === 'admin',
    profitLoss:user?.role === 'owner' || user?.role === 'admin',
    audit:     user?.role === 'owner' || user?.role === 'admin',
  };

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const isActive = (to) => location.pathname.startsWith(to);

  const visibleNav = navItems(can).filter(n => n.show);

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F9', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <header style={{ background: '#0B1F3A', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, zIndex: 50 }}>

        {/* Gold accent line */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #C9A84C 0%, #E2C97E 50%, rgba(201,168,76,0.2) 100%)' }} />

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, background: 'rgba(201,168,76,0.15)', border: '1.5px solid rgba(201,168,76,0.45)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.1rem', fontWeight: 700, color: '#C9A84C' }}>N</span>
            </div>
            <div className="hidden sm:block">
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.88rem', fontWeight: 600, color: '#F4F6F9', lineHeight: 1.2 }}>Nation Builders Institute</div>
              <div style={{ fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)', marginTop: 1 }}>of Learning Larkana</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }} className="hidden xl:flex">
            {visibleNav.map(({ to, label, icon, alert }) => {
              const active = isActive(to);
              return (
                <Link key={to} to={to} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.4rem 0.7rem', borderRadius: 4,
                  fontSize: '0.78rem', fontWeight: active ? 600 : 500,
                  color: active ? '#C9A84C' : alert ? '#FDA4AF' : 'rgba(244,246,249,0.7)',
                  background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                  textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#F4F6F9'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = alert ? '#FDA4AF' : 'rgba(244,246,249,0.7)'; e.currentTarget.style.background = 'transparent'; }}}
                >
                  <Icon d={icon} size={13} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

            {/* User info */}
            <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#F4F6F9', lineHeight: 1.2 }}>{user?.fullName}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                  <span style={{ fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 2, ...roleBadgeStyle[user?.role] }}>
                    {roleLabels[user?.role] || user?.role}
                  </span>
                </div>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(201,168,76,0.2)', border: '2px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.85rem', fontWeight: 700, color: '#C9A84C' }}>
                  {(user?.fullName || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            </div>

            <NotificationBell />

            <button onClick={handleLogout} style={{
              padding: '0.35rem 0.85rem', borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
              color: 'rgba(244,246,249,0.7)', fontSize: '0.75rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#F4F6F9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(244,246,249,0.7)'; }}
            >
              <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={13} />
              Sign Out
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(v => !v)} className="xl:hidden"
              style={{ background: 'none', border: 'none', color: '#F4F6F9', cursor: 'pointer', padding: 4 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen
                  ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="xl:hidden" style={{ background: '#122847', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '0.5rem 1rem 1rem' }}>
            {visibleNav.map(({ to, label, icon, alert }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.65rem 0.75rem', borderRadius: 4, margin: '0.15rem 0',
                fontSize: '0.85rem', fontWeight: 500,
                color: alert ? '#FDA4AF' : isActive(to) ? '#C9A84C' : 'rgba(244,246,249,0.8)',
                background: isActive(to) ? 'rgba(201,168,76,0.1)' : 'transparent',
                textDecoration: 'none',
              }}>
                <Icon d={icon} size={15} />
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* ── Page title bar ── */}
      {title && (
        <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0.875rem 1.5rem' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 3, height: 18, background: '#C9A84C', borderRadius: 2 }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 600, color: '#0B1F3A', margin: 0 }}>{title}</h2>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {children}
      </main>

      {/* ── Footer ── */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid #E2E8F0', background: 'white', padding: '1rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.7rem', color: '#8A9BB0', letterSpacing: '0.05em' }}>
          © {new Date().getFullYear()} Nation Builders Institute of Learning Larkana &nbsp;·&nbsp; All Rights Reserved
        </p>
      </footer>
    </div>
  );
};

export default DashboardLayout;
