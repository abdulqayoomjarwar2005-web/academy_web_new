const statusStyles = {
  active:     { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
  inactive:   { background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' },
  graduated:  { background: '#FEF9EC', color: '#A07828', border: '1px solid rgba(201,168,76,0.4)' },
  suspended:  { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' },
  paid:       { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
  partial:    { background: '#FEF9EC', color: '#A07828', border: '1px solid rgba(201,168,76,0.4)' },
  unpaid:     { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' },
  pending:    { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
  approved:   { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
  rejected:   { background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' },
};

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  const style = statusStyles[s] || statusStyles.inactive;
  return (
    <span style={{
      ...style,
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 3,
      fontSize: '0.62rem', fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
};

export default StatusBadge;
