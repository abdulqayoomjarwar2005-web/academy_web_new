import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../utils/dashboardApi';

const widgetLinks = {
  'Student Management':  '/students',
  'Fee Management':      '/fees/dashboard',
  'Expense Management':  '/expenses/dashboard',
  'Profit & Loss':       '/profit-loss/dashboard',
};

const widgetIcons = {
  'Student Management':  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  'Fee Management':      'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  'Expense Management':  'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  'Profit & Loss':       'M18 20V10M12 20V4M6 20v-6',
};

const fmtMoney  = n => new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(parseFloat(n || 0));
const fmtNumber = n => new Intl.NumberFormat('en-US').format(parseInt(n || 0, 10));

// ── Stat Card ──────────────────────────────────────────────
const StatCard = ({ label, value, sub, money = false, profit = false, link, icon, color }) => {
  const numeric = parseFloat(value || 0);
  let valueColor = '#0B1F3A';
  let bgAccent   = '#EEF2F7';
  let iconColor  = '#2D5690';

  if (profit) {
    valueColor = numeric >= 0 ? '#065F46' : '#B91C1C';
    bgAccent   = numeric >= 0 ? '#ECFDF5' : '#FEF2F2';
    iconColor  = numeric >= 0 ? '#10B981' : '#EF4444';
  } else if (color === 'gold') {
    bgAccent  = '#FEF9EC';
    iconColor = '#C9A84C';
  } else if (color === 'navy') {
    bgAccent  = '#EEF2F9';
    iconColor = '#2D5690';
  }

  const display = money
    ? `Rs ${profit && numeric < 0 ? '-' : ''}${fmtMoney(Math.abs(numeric))}`
    : fmtNumber(numeric);

  const inner = (
    <div className="stat-card" style={{
      background: 'white', borderRadius: 8, padding: '1.25rem 1.5rem',
      border: '1px solid #E8EDF4', display: 'flex', alignItems: 'flex-start', gap: '1rem',
      boxShadow: '0 1px 4px rgba(11,31,58,0.06)',
    }}>
      {icon && (
        <div style={{ width: 42, height: 42, borderRadius: 8, background: bgAccent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon}/>
          </svg>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A9BB0', marginBottom: '0.3rem' }}>{label}</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: valueColor, lineHeight: 1.1 }}>{display}</div>
        {sub && <div style={{ fontSize: '0.7rem', color: '#8A9BB0', marginTop: '0.25rem' }}>{sub}</div>}
      </div>
      {link && (
        <div style={{ color: '#C9A84C', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      )}
    </div>
  );

  return link
    ? <Link to={link} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
    : inner;
};

// ── Section header ─────────────────────────────────────────
const SectionHead = ({ title, sub }) => (
  <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: '#0B1F3A', margin: 0 }}>{title}</h2>
    {sub && <span style={{ fontSize: '0.7rem', color: '#8A9BB0', letterSpacing: '0.04em' }}>{sub}</span>}
    <div style={{ flex: 1, height: 1, background: '#E2E8F0', marginLeft: '0.5rem' }} />
  </div>
);

// ── Role stat sections ─────────────────────────────────────
const OwnerStats = ({ stats }) => (
  <>
    <SectionHead title="Financial Overview" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      <StatCard label="Total Students"   value={stats.totalStudents}   link="/students"              icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" color="navy" />
      <StatCard label="Total Faculty"    value={stats.totalTeachers}   link="/teachers"              icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" color="navy" />
      <StatCard label="Total Collection" value={stats.totalCollection} link="/fees/dashboard" money  icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" color="gold" />
      <StatCard label="Total Expenses"   value={stats.totalExpenses}   link="/expenses/dashboard" money icon="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <StatCard label="Net Profit / Loss" value={stats.profit}         link="/profit-loss/dashboard" money profit icon="M18 20V10M12 20V4M6 20v-6" />
    </div>

    <SectionHead title="Today's Attendance" sub={stats.attendanceSummary?.isLocked ? '✓ Submitted' : 'Not yet submitted'} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
      <StatCard label="Total Marked" value={stats.attendanceSummary?.total}   icon="M9 11l3 3L22 4" />
      <StatCard label="Present"      value={stats.attendanceSummary?.present} color="gold" icon="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <StatCard label="Absent"       value={stats.attendanceSummary?.absent}  icon="M18 6L6 18M6 6l12 12" />
      <StatCard label="On Leave"     value={stats.attendanceSummary?.leave}   icon="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </div>
    {!stats.attendanceSummary?.isLocked && (
      <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: '#8A9BB0', fontStyle: 'italic' }}>
        Today's attendance has not been finalised — figures may change.
      </p>
    )}
  </>
);

const AdminStats = ({ stats }) => (
  <>
    <SectionHead title="Institute Overview" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
      <StatCard label="Students"            value={stats.students}            link="/students"              icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" color="navy" />
      <StatCard label="Faculty Members"     value={stats.teachers}            link="/teachers"              icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" color="navy" />
      <StatCard label="Fee Collection"      value={stats.collection}          link="/fees/dashboard" money  icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" color="gold" />
      <StatCard label="Expenses"            value={stats.expenses}            link="/expenses/dashboard" money icon="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <StatCard label="Pending Edit Requests" value={stats.attendanceRequests} link="/attendance/edit-requests" sub="Attendance corrections" icon="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    </div>
  </>
);

const TeacherStats = ({ stats }) => (
  <>
    <SectionHead title="My Classroom" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
      <StatCard label="My Students"      value={stats.students}                   link="/students" icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" color="navy" />
      <StatCard label="Today's Attendance" value={stats.todaysAttendance?.total}   link="/attendance/mark" sub={stats.todaysAttendance?.isLocked ? '✓ Submitted' : 'Pending submission'} icon="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      <StatCard label="Present"          value={stats.presentCount}               color="gold"    icon="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <StatCard label="Absent"           value={stats.absentCount}                               icon="M18 6L6 18M6 6l12 12" />
      <StatCard label="Fee Defaulters"   value={stats.feeDefaulters}              link="/defaulters" icon="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </div>
  </>
);

// ── Module Card ────────────────────────────────────────────
const ModuleCard = ({ widget }) => {
  const href = widgetLinks[widget];
  const icon = widgetIcons[widget];
  const inner = (
    <div className="stat-card" style={{
      background: 'white', borderRadius: 8, padding: '1.5rem',
      border: '1px solid #E8EDF4', boxShadow: '0 1px 4px rgba(11,31,58,0.06)',
      display: 'flex', flexDirection: 'column', gap: '1rem',
    }}>
      {icon && (
        <div style={{ width: 44, height: 44, borderRadius: 8, background: '#EEF2F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D5690" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon}/>
          </svg>
        </div>
      )}
      <div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.35rem' }}>{widget}</div>
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: href ? '#C9A84C' : '#8A9BB0', fontWeight: 600 }}>
          {href ? 'Open Module →' : 'Coming Soon'}
        </div>
      </div>
    </div>
  );
  return href
    ? <Link to={href} style={{ textDecoration: 'none' }}>{inner}</Link>
    : <div style={{ opacity: 0.6 }}>{inner}</div>;
};

// ── Page ───────────────────────────────────────────────────
const RoleDashboard = () => {
  const { user }  = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats]         = useState(null);
  const [error, setError]         = useState('');

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => setDashboard(data.dashboard)).catch(err => setError(err.response?.data?.message || 'Unable to load dashboard'));
    getDashboardStats().then(d => setStats(d.stats)).catch(() => setError('Unable to load statistics'));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout title={dashboard?.title || 'Dashboard'}>

      {/* Welcome banner */}
      <div style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #1A3557 100%)', borderRadius: 10, padding: '1.75rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', border: '30px solid rgba(201,168,76,0.08)' }} />
        <div style={{ position: 'absolute', right: 80, bottom: -40, width: 100, height: 100, borderRadius: '50%', border: '20px solid rgba(201,168,76,0.05)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.8)', marginBottom: '0.35rem' }}>
            {greeting()},
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: '#F4F6F9', margin: 0 }}>
            {user?.fullName}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(244,246,249,0.55)', marginTop: '0.3rem' }}>
            {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ background: 'rgba(201,168,76,0.15)', border: '1.5px solid rgba(201,168,76,0.4)', borderRadius: 6, padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A84C', position: 'relative', zIndex: 1 }} className="hidden sm:block">
          {user?.role === 'owner' ? 'Institution Owner' : user?.role === 'admin' ? 'Administrator' : 'Teacher'}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: '0.82rem', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      {!stats ? (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid #E2E8F0', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#8A9BB0', fontSize: '0.85rem' }}>Loading dashboard…</p>
        </div>
      ) : user?.role === 'owner' ? (
        <OwnerStats stats={stats} />
      ) : user?.role === 'admin' ? (
        <AdminStats stats={stats} />
      ) : user?.role === 'teacher' ? (
        <TeacherStats stats={stats} />
      ) : null}

      {/* Modules */}
      {(dashboard?.widgets || []).length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <SectionHead title="Quick Access" sub="Modules available to your role" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {(dashboard.widgets).map(w => <ModuleCard key={w} widget={w} />)}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
};

export default RoleDashboard;
