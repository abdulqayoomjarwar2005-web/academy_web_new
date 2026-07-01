import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { getMarkPage, submitAttendance, updateAttendance, createEditRequest } from '../utils/attendanceApi';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  present: 'bg-green-100 text-green-800 border-green-300',
  absent:  'bg-red-100  text-red-800  border-red-300',
  leave:   'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const today = () => new Date().toISOString().split('T')[0];

const MarkAttendancePage = () => {
  const { user } = useAuth();
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});  // studentId -> status
  const [isLocked, setIsLocked] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit request modal state
  const [editRequestModal, setEditRequestModal] = useState(null); // { attendanceId, studentName }
  const [editReason, setEditReason] = useState('');
  const [requestingEdit, setRequestingEdit] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await getMarkPage(date);
      setStudents(data.students);
      setIsLocked(data.isLocked);
      setSummary(data.summary);

      // Build initial attendance map
      const map = {};
      for (const s of data.students) {
        map[s.student_id] = s.attendance_status || 'present';
      }
      setAttendanceMap(map);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = (studentId, status) => {
    if (isLocked) return;
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status) => {
    if (isLocked) return;
    const updated = {};
    students.forEach((s) => { updated[s.student_id] = status; });
    setAttendanceMap(updated);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      const entries = students.map((s) => ({
        studentId: s.student_id,
        status: attendanceMap[s.student_id] || 'present',
      }));
      await submitAttendance(date, entries);
      setSuccessMsg('Attendance submitted and locked successfully!');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestEdit = async () => {
    if (!editReason.trim()) return;
    setRequestingEdit(true);
    try {
      await createEditRequest(editRequestModal.attendanceId, editReason.trim());
      setEditSuccess('Edit request submitted. Wait for admin approval.');
      setEditRequestModal(null);
      setEditReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit edit request');
      setEditRequestModal(null);
    } finally {
      setRequestingEdit(false);
    }
  };

  const presentCount = students.filter((s) => attendanceMap[s.student_id] === 'present').length;
  const absentCount  = students.filter((s) => attendanceMap[s.student_id] === 'absent').length;
  const leaveCount   = students.filter((s) => attendanceMap[s.student_id] === 'leave').length;

  return (
    <DashboardLayout title="Mark Attendance">
      {/* Date Selector */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-ink/70 mb-1">Date</label>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-sm border border-ink/20 px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none"
          />
        </div>

        {isLocked && (
          <div className="flex items-center gap-2 rounded-sm border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
            <span>🔒</span>
            <span>Attendance for this date is <strong>locked</strong>. To make changes, send an edit request.</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total',   value: students.length, color: 'bg-white border-ink/15' },
            { label: 'Present', value: isLocked ? summary.present : presentCount, color: 'bg-green-50 border-green-200' },
            { label: 'Absent',  value: isLocked ? summary.absent  : absentCount,  color: 'bg-red-50   border-red-200' },
            { label: 'Leave',   value: isLocked ? summary.leave   : leaveCount,   color: 'bg-yellow-50 border-yellow-200' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-sm border ${color} p-4 text-center`}>
              <div className="text-2xl font-display text-ink">{value ?? 0}</div>
              <div className="text-xs text-ink/60 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Error / Success */}
      {error      && <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      {successMsg && <div className="mb-4 rounded-sm border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{successMsg}</div>}
      {editSuccess && <div className="mb-4 rounded-sm border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">{editSuccess}</div>}

      {/* Bulk Actions */}
      {!isLocked && students.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink/60">Mark all:</span>
          {['present', 'absent', 'leave'].map((s) => (
            <button
              key={s}
              onClick={() => handleMarkAll(s)}
              className={`rounded-sm border px-3 py-1 text-xs font-medium capitalize ${STATUS_COLORS[s]}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Student Table */}
      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : students.length === 0 ? (
        <div className="py-16 text-center text-ink/40">No active students found.</div>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-ink/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/3 text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Status</th>
                {isLocked && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {students.map((s) => {
                const status = attendanceMap[s.student_id] || 'present';
                return (
                  <tr key={s.student_id} className="hover:bg-ink/2">
                    <td className="px-4 py-3 font-mono text-xs text-ink/60">{s.student_code}</td>
                    <td className="px-4 py-3 font-medium text-ink">{s.full_name}</td>
                    <td className="px-4 py-3 text-ink/70">{s.class_name}</td>
                    <td className="px-4 py-3 text-ink/70">{s.section}</td>
                    <td className="px-4 py-3">
                      {isLocked ? (
                        <span className={`inline-block rounded-sm border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[s.attendance_status] || 'bg-gray-100 text-gray-500'}`}>
                          {s.attendance_status || '—'}
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          {['present', 'absent', 'leave'].map((opt) => (
                            <label key={opt} className="flex cursor-pointer items-center gap-1 text-xs">
                              <input
                                type="radio"
                                name={`status-${s.student_id}`}
                                value={opt}
                                checked={status === opt}
                                onChange={() => handleStatusChange(s.student_id, opt)}
                                className="accent-accent"
                              />
                              <span className="capitalize">{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </td>
                    {isLocked && (
                      <td className="px-4 py-3">
                        {s.attendance_id && (
                          <button
                            onClick={() => {
                              setEditRequestModal({ attendanceId: s.attendance_id, studentName: s.full_name });
                              setEditReason('');
                              setEditSuccess('');
                            }}
                            className="rounded-sm border border-ink/20 px-2 py-0.5 text-xs text-ink/70 hover:border-accent hover:text-accent transition"
                          >
                            Request Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Submit Button */}
      {!isLocked && students.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-sm bg-ink px-6 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit & Lock Attendance'}
          </button>
        </div>
      )}

      {/* Edit Request Modal */}
      {editRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-sm border border-ink/15 bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg text-ink mb-1">Request Attendance Edit</h2>
            <p className="text-sm text-ink/60 mb-4">
              Student: <strong>{editRequestModal.studentName}</strong>
            </p>
            <label className="block text-sm font-medium text-ink/70 mb-1">Reason for edit</label>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={3}
              placeholder="Explain why this attendance record needs correction…"
              className="w-full rounded-sm border border-ink/20 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditRequestModal(null)}
                className="rounded-sm border border-ink/20 px-4 py-1.5 text-sm text-ink/70 hover:bg-ink/5"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestEdit}
                disabled={requestingEdit || !editReason.trim()}
                className="rounded-sm bg-ink px-4 py-1.5 text-sm font-medium text-canvas transition hover:bg-ink/80 disabled:opacity-50"
              >
                {requestingEdit ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default MarkAttendancePage;
