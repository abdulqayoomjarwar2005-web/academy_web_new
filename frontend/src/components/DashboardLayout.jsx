import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const roleLabels = { owner: 'Owner', admin: 'Administrator', teacher: 'Teacher' };
const roleBadgeStyle = {
  owner:   { background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.4)' },
  admin:   { background: 'rgba(45,86,144,0.18)', color: '#7FA6D9', border: '1px solid rgba(45,86,144,0.4)' },
  teacher: { background: 'rgba(16,122,90,0.15)', color: '#4ADE9A', border: '1px solid rgba(16,122,90,0.4)' },
};

const Icon = ({ d, size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const SIDEBAR_WIDTH = 232;

const navItems = (can) => [
  { to: '/students',              label: 'Students',      icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', show: true },
  { to: '/teachers',              label: 'Teachers',      icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z', show: can.teachers },
  { to: '/classes',               label: 'Classes',       icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', show: can.classes },
  { to: '/attendance',            label: 'Attendance',    icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', show: true },
  { to: '/fees/dashboard',        label: 'Fees',          icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', show: true },
  { to: '/defaulters',            label: 'Unpaid Fees',   icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', show: true, alert: true },
  { to: '/expenses/dashboard',    label: 'Expenses',      icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', show: can.expenses },
  { to: '/profit-loss/dashboard', label: 'Profit & Loss', icon: 'M18 20V10M12 20V4M6 20v-6', show: can.profitLoss },
  { to: '/reports/export',        label: 'Reports',       icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8', show: true },
  { to: '/audit',                 label: 'Activity Log',  icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', show: can.audit },
  { to: '/admins',                label: 'Admins',        icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', show: can.admins },
  { to: '/institutes',            label: 'Institutes',    icon: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1M9 21v-4h6v4', show: can.institutes },
  { to: '/board',                 label: 'Board / DIT Exams', icon: 'M22 10v6M2 10l10-5 10 5-10 5-10-5zM6 12v5c3 3 9 3 12 0v-5', show: can.board },
];

const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const can = {
    teachers:   user?.role === 'owner' || user?.role === 'admin',
    expenses:   user?.role === 'owner' || user?.role === 'admin',
    profitLoss: user?.role === 'owner' || user?.role === 'admin',
    audit:      user?.role === 'owner' || user?.role === 'admin',
    classes:    user?.role === 'owner' || user?.role === 'admin',
    admins:     user?.role === 'owner',
    institutes: user?.role === 'owner' || user?.role === 'admin',
    board:      user?.role === 'owner' || user?.role === 'admin',
  };

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const isActive = (to) => location.pathname.startsWith(to);

  const visibleNav = navItems(can).filter(n => n.show);

  const sidebarContent = (onNavClick) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo — click to return to the dashboard */}
      <Link
        to="/"
        onClick={onNavClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.7rem',
          padding: '1.25rem 1.1rem', textDecoration: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <img src="/logo.png" alt="Nation Builders Institute logo" style={{ width: 34, height: 34, objectFit: 'contain', flexShrink: 0, filter: 'invert(1)' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '0.82rem', fontWeight: 600, color: '#F4F6F9', lineHeight: 1.25 }}>Nation Builders Institute</div>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.7)', marginTop: 1 }}>of Learning Larkana</div>
        </div>
      </Link>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.6rem' }}>
        {visibleNav.map(({ to, label, icon, alert }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavClick}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.55rem 0.75rem', borderRadius: 6, marginBottom: '0.15rem',
                fontSize: '0.82rem', fontWeight: active ? 600 : 500,
                color: active ? '#C9A84C' : alert ? '#FDA4AF' : 'rgba(244,246,249,0.72)',
                background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#F4F6F9'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.color = alert ? '#FDA4AF' : 'rgba(244,246,249,0.72)'; e.currentTarget.style.background = 'transparent'; }}}
            >
              <Icon d={icon} size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: user info + small sign out */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '0.85rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(201,168,76,0.2)', border: '1.5px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.75rem', fontWeight: 700, color: '#C9A84C' }}>
              {(user?.fullName || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#F4F6F9', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName}</div>
            <span style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '1px 5px', borderRadius: 2, display: 'inline-block', marginTop: 2, ...roleBadgeStyle[user?.role] }}>
              {roleLabels[user?.role] || user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '0.4rem 0.6rem', borderRadius: 5,
            border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)',
            color: 'rgba(244,246,249,0.65)', fontSize: '0.72rem', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#F4F6F9'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(244,246,249,0.65)'; }}
        >
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={12} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F9', fontFamily: "'Inter', system-ui, sans-serif", display: 'flex' }}>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block"
        style={{
          width: SIDEBAR_WIDTH, flexShrink: 0, background: '#0B1F3A',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          position: 'sticky', top: 0, height: '100vh',
        }}
      >
        {sidebarContent()}
      </aside>

      {/* Mobile sidebar drawer + backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }}
        />
      )}
      <aside
        className="lg:hidden"
        style={{
          width: SIDEBAR_WIDTH, flexShrink: 0, background: '#0B1F3A',
          position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 70,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease',
        }}
      >
        {sidebarContent(() => setMobileOpen(false))}
      </aside>

      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <header style={{ background: 'white', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden"
                style={{ background: 'none', border: 'none', color: '#0B1F3A', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                aria-label="Open menu"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              {title && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <div style={{ width: 3, height: 18, background: '#C9A84C', borderRadius: 2, flexShrink: 0 }} />
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 600, color: '#0B1F3A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h2>
                </div>
              )}
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '2rem 1.5rem' }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #E2E8F0', background: 'white', padding: '1rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: '#8A9BB0', letterSpacing: '0.05em' }}>
            © {new Date().getFullYear()} Nation Builders Institute of Learning Larkana &nbsp;·&nbsp; All Rights Reserved
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DashboardLayout;
