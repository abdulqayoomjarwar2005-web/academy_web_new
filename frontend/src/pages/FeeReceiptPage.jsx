import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { getFeeByReceipt } from '../utils/feeApi';

const fmt = n => new Intl.NumberFormat('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n || 0));
const monthLabel = d => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' }); };
const formatDate = s => { if (!s) return '—'; return new Date(s).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }); };

const Row = ({ label, value, bold, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid #F1F5F9' }}>
    <span style={{ fontSize: '0.75rem', color: '#8A9BB0', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: '0.85rem', fontWeight: bold ? 700 : 500, color: highlight ? '#C9A84C' : '#0B1F3A', fontFamily: bold ? "'Playfair Display', serif" : 'inherit' }}>{value}</span>
  </div>
);

const statusColor = s => {
  if (!s) return { background: '#F1F5F9', color: '#8A9BB0' };
  if (s.toLowerCase() === 'paid')    return { background: '#ECFDF5', color: '#065F46' };
  if (s.toLowerCase() === 'partial') return { background: '#FEF9EC', color: '#A07828' };
  return { background: '#FEF2F2', color: '#B91C1C' };
};

const FeeReceiptPage = () => {
  const { receiptNumber } = useParams();
  const [fee, setFee]       = useState(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    getFeeByReceipt(receiptNumber)
      .then(d => setFee(d.fee))
      .catch(() => setError('Receipt not found.'))
      .finally(() => setLoad(false));
  }, [receiptNumber]);

  return (
    <DashboardLayout title="Fee Receipt">
      <div className="no-print" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link to="/fees" style={{ padding: '0.55rem 1.1rem', borderRadius: 4, border: '1px solid #E2E8F0', background: 'white', color: '#0B1F3A', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Fee Records
        </Link>
        {fee && (
          <button onClick={() => window.print()}
            style={{ padding: '0.55rem 1.1rem', borderRadius: 4, border: 'none', background: '#0B1F3A', color: 'white', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Receipt
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#8A9BB0' }}>Loading receipt…</div>
      ) : error ? (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 6, border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', fontSize: '0.85rem' }}>{error}</div>
      ) : fee ? (
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <div id="receipt-card" style={{ background: 'white', borderRadius: 10, boxShadow: '0 4px 24px rgba(11,31,58,0.12)', overflow: 'hidden' }}>

            {/* Header band */}
            <div style={{ background: 'linear-gradient(135deg, #0B1F3A 0%, #1A3557 100%)', padding: '2rem 2.25rem 1.75rem', textAlign: 'center', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #C9A84C, #E2C97E, #C9A84C)' }} />

              {/* Crest */}
              <div style={{ width: 56, height: 56, background: 'rgba(201,168,76,0.15)', border: '2px solid rgba(201,168,76,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: '#C9A84C' }}>N</span>
              </div>

              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.1rem', fontWeight: 700, color: '#F4F6F9', letterSpacing: '0.02em' }}>
                Nation Builders Institute of Learning
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(201,168,76,0.8)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 3 }}>
                Larkana, Sindh
              </div>

              <div style={{ marginTop: '1rem', display: 'inline-block', padding: '0.3rem 1.2rem', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 2, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.9)' }}>
                Official Fee Receipt
              </div>
            </div>

            {/* Receipt meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2.25rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A9BB0' }}>Receipt No.</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: '#0B1F3A', fontSize: '1rem', marginTop: 2 }}>{fee.receipt_number}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A9BB0' }}>Date Issued</div>
                <div style={{ fontSize: '0.82rem', color: '#0B1F3A', fontWeight: 500, marginTop: 2 }}>{formatDate(fee.paid_at)}</div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem 2.25rem' }}>

              {/* Student details */}
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '0.6rem' }}>Student Information</div>
              <div style={{ background: '#F8FAFC', borderRadius: 6, padding: '0.25rem 1rem 0.5rem', marginBottom: '1.5rem', border: '1px solid #E8EDF4' }}>
                <Row label="Full Name"     value={fee.student_name} />
                <Row label="Student ID"    value={fee.student_code} />
                <Row label="Father's Name" value={fee.father_name} />
                <Row label="Class"         value={fee.class} />
                <Row label="Batch"         value={fee.batch} />
                <Row label="Contact"       value={fee.contact_number} />
              </div>

              {/* Fee details */}
              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '0.6rem' }}>Fee Details</div>
              <div style={{ padding: '0 0 0.5rem', marginBottom: '1.25rem' }}>
                <Row label="Fee Month"   value={monthLabel(fee.fee_month)} />
                <Row label="Fee Amount"  value={`Rs ${fmt(fee.amount)}`} />
                <Row label="Amount Paid" value={`Rs ${fmt(fee.amount_paid)}`} bold highlight />
                <Row label="Balance Due" value={`Rs ${fmt(Math.max(0, parseFloat(fee.amount) - parseFloat(fee.amount_paid)))}`} bold />
              </div>

              {/* Status badge */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.4rem 2rem', borderRadius: 3, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', ...statusColor(fee.status) }}>
                  {fee.status?.toUpperCase()}
                </div>
              </div>

              {fee.notes && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 5, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: '0.78rem', color: '#8A9BB0', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 600, color: '#0B1F3A' }}>Notes: </span>{fee.notes}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #E2E8F0', padding: '1rem 2.25rem', textAlign: 'center', background: '#F8FAFC' }}>
              {fee.updated_by_name && (
                <p style={{ fontSize: '0.72rem', color: '#8A9BB0', marginBottom: '0.3rem' }}>
                  Processed by: <span style={{ fontWeight: 600, color: '#0B1F3A' }}>{fee.updated_by_name}</span>
                </p>
              )}
              <p style={{ fontSize: '0.65rem', color: '#B0BEC5', letterSpacing: '0.04em' }}>
                This is a computer-generated receipt — no signature required.
              </p>
              <div style={{ marginTop: '0.75rem', height: 1, background: 'linear-gradient(90deg, transparent, #C9A84C40, transparent)' }} />
              <p style={{ fontSize: '0.6rem', color: '#C9A84C', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '0.6rem', opacity: 0.7 }}>
                NBIL · Nation Builders Institute of Learning Larkana
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
};

export default FeeReceiptPage;
