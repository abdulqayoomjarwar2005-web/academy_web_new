import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { listTeachers } from '../utils/teacherApi';
import { listStudents } from '../utils/studentApi';
import {
  sendMessage,
  listInbox,
  listSentMessages,
  markMessageRead,
  markAllMessagesRead,
} from '../utils/messageApi';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// ---------------------------------------------------------------------------
// Compose panel (owner / admin only)
// ---------------------------------------------------------------------------

const ComposePanel = ({ onSent }) => {
  const [teachers, setTeachers] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searching, setSearching] = useState(false);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    listTeachers({ status: 'active', limit: 100 })
      .then((data) => setTeachers(data.data || []))
      .catch(() => setTeachers([]));
  }, []);

  const handleStudentSearch = async (e) => {
    e?.preventDefault();
    if (!studentSearch.trim()) return;
    setSearching(true);
    try {
      const data = await listStudents({ search: studentSearch.trim(), limit: 10 });
      setStudentResults(data.data || data.students || []);
    } catch {
      setStudentResults([]);
    } finally {
      setSearching(false);
    }
  };

  const reset = () => {
    setSubject('');
    setBody('');
    setStudentSearch('');
    setStudentResults([]);
    setSelectedStudent(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!teacherId) return setError('Select a teacher to message.');
    if (!subject.trim() || !body.trim()) return setError('Subject and message are required.');

    setSending(true);
    try {
      await sendMessage({
        teacherId,
        studentId: selectedStudent?.id,
        subject: subject.trim(),
        body: body.trim(),
      });
      setSuccess('Message sent.');
      reset();
      onSent?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-sm border border-ink/10 bg-white p-5">
      <h2 className="mb-1 font-display text-lg text-ink">Message a Teacher</h2>
      <p className="mb-4 text-sm text-ink/50">
        Contact a teacher directly — about a specific student issue, or anything else.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">Teacher</label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          >
            <option value="">Select a teacher…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id} disabled={!t.user_id}>
                {t.teacher_name} ({t.subject}){!t.user_id ? ' — no login account' : ''}
              </option>
            ))}
          </select>
          {teachers.length === 0 && (
            <p className="mt-1 text-xs text-ink/40">No teachers found.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
            Related student <span className="normal-case text-ink/30">(optional)</span>
          </label>
          {selectedStudent ? (
            <div className="flex items-center justify-between rounded-sm border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-ink">{selectedStudent.student_name}</span>{' '}
                <span className="text-ink/40">({selectedStudent.student_id}) · {selectedStudent.class}</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student by name…"
                className="w-full flex-1 rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={handleStudentSearch}
                disabled={searching}
                className="rounded-sm border border-ink/20 px-3 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5 disabled:opacity-50"
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
          )}
          {!selectedStudent && studentResults.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 rounded-sm border border-ink/10 p-2">
              {studentResults.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => { setSelectedStudent(s); setStudentResults([]); setStudentSearch(''); }}
                  className="rounded-sm px-2 py-1.5 text-left text-sm hover:bg-ink/5"
                >
                  <span className="font-medium text-ink">{s.student_name}</span>{' '}
                  <span className="text-ink/40">({s.student_id}) · {s.class}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Attendance concern"
            className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">Message</label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your note or message…"
            className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink placeholder-ink/30 focus:border-accent focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-700">{success}</p>}

        <button
          type="submit"
          disabled={sending}
          className="self-start rounded-sm bg-ink px-5 py-2 text-sm font-medium text-canvas hover:bg-ink/80 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send Message'}
        </button>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sent history (owner / admin only)
// ---------------------------------------------------------------------------

const SentList = ({ refreshKey }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listSentMessages({ limit: 30 })
      .then((data) => setRows(data.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="rounded-sm border border-ink/10 bg-white p-5">
      <h2 className="mb-4 font-display text-lg text-ink">Sent Messages</h2>
      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink/40">No messages sent yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-ink/5">
          {rows.map((m) => (
            <div key={m.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">{m.subject}</span>
                <span className="text-xs text-ink/40">{timeAgo(m.created_at)}</span>
              </div>
              <p className="mt-1 text-sm text-ink/60">{m.body}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink/40">
                <span>To: <span className="font-medium text-ink/60">{m.teacher_name}</span></span>
                {m.student_name && (
                  <span className="rounded-sm bg-accent/10 px-2 py-0.5 text-accent">
                    {m.student_name} ({m.student_code})
                  </span>
                )}
                <span className={m.is_read ? 'text-green-600' : 'text-amber-600'}>
                  {m.is_read ? 'Read' : 'Unread'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Inbox (teacher, but works for any role reading their own messages)
// ---------------------------------------------------------------------------

const InboxList = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    listInbox({ limit: 50 })
      .then((data) => setRows(data.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openMessage = async (m) => {
    setOpenId(openId === m.id ? null : m.id);
    if (!m.is_read) {
      await markMessageRead(m.id).catch(() => {});
      setRows((prev) => prev.map((r) => (r.id === m.id ? { ...r, is_read: true } : r)));
    }
  };

  const handleMarkAll = async () => {
    await markAllMessagesRead().catch(() => {});
    setRows((prev) => prev.map((r) => ({ ...r, is_read: true })));
  };

  const unreadCount = rows.filter((r) => !r.is_read).length;

  return (
    <div className="rounded-sm border border-ink/10 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Inbox</h2>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} className="text-xs font-medium text-accent hover:underline">
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink/40">No messages yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-ink/5">
          {rows.map((m) => (
            <button
              key={m.id}
              onClick={() => openMessage(m)}
              className={`py-3 text-left transition ${!m.is_read ? 'bg-accent/5' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-sm ${!m.is_read ? 'font-semibold text-ink' : 'font-medium text-ink/80'}`}>
                  {!m.is_read && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />}
                  {m.subject}
                </span>
                <span className="text-xs text-ink/40">{timeAgo(m.created_at)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/40">
                <span>From: <span className="font-medium text-ink/60">{m.sender_name}</span></span>
                {m.student_name && (
                  <span className="rounded-sm bg-accent/10 px-2 py-0.5 text-accent">
                    {m.student_name} ({m.student_code}) · {m.class}
                  </span>
                )}
              </div>
              {openId === m.id && (
                <p className="mt-2 rounded-sm bg-ink/3 p-3 text-sm text-ink/70">{m.body}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const MessagesPage = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'owner' || user?.role === 'admin';
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <DashboardLayout title="Messages">
      {isStaff ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ComposePanel onSent={() => setRefreshKey((k) => k + 1)} />
          <SentList refreshKey={refreshKey} />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <InboxList />
        </div>
      )}
    </DashboardLayout>
  );
};

export default MessagesPage;
