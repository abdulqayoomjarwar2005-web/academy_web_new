import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// -----------------------------------------------------------------------
// Every hour, while a teacher is using the app, show a reminder popup:
//   - 1st–4th of the month  → ask them to remind students to pay fees
//   - 5th–10th of the month → ask them to make sure everyone has paid
//   - 11th onward           → no popup
//
// A "last shown" hour-bucket is kept in localStorage so it fires once per
// hour per browser (even across page reloads / navigation), rather than
// re-appearing on every render.
// -----------------------------------------------------------------------

const STORAGE_KEY = 'nbil_fee_reminder_last_shown';
const CHECK_INTERVAL_MS = 60 * 1000; // check every minute for the hour to roll over

function getReminder(date) {
  const day = date.getDate();
  if (day >= 1 && day <= 4) {
    return {
      icon: '💰',
      title: 'Fee Collection Reminder',
      body: "It's the start of the month — please remind your students to pay this month's fees by the 4th.",
    };
  }
  if (day >= 5 && day <= 10) {
    return {
      icon: '✅',
      title: 'Fee Collection Follow-up',
      body: "Please make sure each of your students has paid this month's fees.",
    };
  }
  return null;
}

function hourBucket(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
}

const FeeReminderPopup = () => {
  const { user } = useAuth();
  const [reminder, setReminder] = useState(null);

  const check = useCallback(() => {
    if (!user || user.role !== 'teacher') return;

    const now = new Date();
    const message = getReminder(now);
    if (!message) return;

    const bucket = hourBucket(now);
    let lastShown = null;
    try {
      lastShown = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — fall back to showing every check
    }

    if (lastShown !== bucket) {
      setReminder(message);
      try {
        localStorage.setItem(STORAGE_KEY, bucket);
      } catch {
        // ignore — non-fatal if we can't persist
      }
    }
  }, [user]);

  useEffect(() => {
    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  if (!reminder) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(11,31,58,0.55)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: 'white', borderRadius: 12, maxWidth: 420, width: '100%',
          padding: '2rem 1.75rem 1.75rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>{reminder.icon}</div>
        <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.15rem', fontWeight: 700, color: '#0B1F3A', marginBottom: '0.6rem' }}>
          {reminder.title}
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.55, marginBottom: '1.5rem' }}>
          {reminder.body}
        </p>
        <button
          onClick={() => setReminder(null)}
          style={{
            width: '100%', padding: '0.7rem', borderRadius: 8, border: 'none',
            background: '#0B1F3A', color: 'white', fontWeight: 600, fontSize: '0.88rem',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default FeeReminderPopup;
