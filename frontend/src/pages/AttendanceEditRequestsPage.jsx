import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  listEditRequests,
  approveEditRequest,
  rejectEditRequest,
  EDIT_REQUEST_STATUS_OPTIONS,
} from '../utils/attendanceApi';

const REQUEST_STATUS_COLORS = {
  pending:  'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-green-100  text-green-800  border-green-300',
  rejected: 'bg-red-100    text-red-800    border-red-300',
};

const AttendanceEditRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // requestId being actioned

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listEditRequests({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setRequests(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load edit requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    setError('');
    try {
      await approveEditRequest(requestId);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(requestId);
    setError('');
    try {
      await rejectEditRequest(requestId);
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DashboardLayout title="Attendance Edit Requests">
      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        {['pending', 'approved', 'rejected', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-sm border px-3 py-1.5 text-sm font-medium capitalize transition
              ${statusFilter === s
                ? 'border-ink bg-ink text-canvas'
                : 'border-ink/20 text-ink/70 hover:bg-ink/5'
              }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-sm border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-16 text-center text-ink/40">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center text-ink/40">No edit requests found.</div>
      ) : (
        <>
          <div className="space-y-4">
            {requests.map((r) => (
              <div key={r.id} className="rounded-sm border border-ink/10 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-ink">{r.student_name}</span>
                      <span className="text-xs text-ink/40">({r.student_code})</span>
                      <span className="text-xs text-ink/50">
                        {r.class_name} {r.section && `· ${r.section}`}
                      </span>
                    </div>
                    <div className="text-sm text-ink/70 mb-2">
                      Attendance date: <strong>{r.attendance_date}</strong> &nbsp;|&nbsp;
                      Current status:{' '}
                      <span className={`inline-block rounded-sm px-1.5 py-0.5 text-xs font-medium capitalize
                        ${r.current_status === 'present' ? 'bg-green-100 text-green-800' :
                          r.current_status === 'absent'  ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'}`}>
                        {r.current_status}
                      </span>
                    </div>
                    <div className="text-sm text-ink/60 mb-1">
                      <span className="font-medium text-ink/80">Reason:</span> {r.reason}
                    </div>
                    <div className="text-xs text-ink/40">
                      Requested by <strong className="text-ink/60">{r.requested_by_name}</strong>{' '}
                      · {new Date(r.created_at).toLocaleString()}
                    </div>
                    {r.reviewed_by_name && (
                      <div className="text-xs text-ink/40 mt-0.5">
                        Reviewed by {r.reviewed_by_name} · {new Date(r.reviewed_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Status + Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-sm border px-2 py-0.5 text-xs font-medium capitalize ${REQUEST_STATUS_COLORS[r.status] || ''}`}>
                      {r.status}
                    </span>
                    {r.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading === r.id}
                          onClick={() => handleApprove(r.id)}
                          className="rounded-sm border border-green-300 bg-green-50 px-3 py-1 text-xs font-medium text-green-800 transition hover:bg-green-100 disabled:opacity-50"
                        >
                          {actionLoading === r.id ? '…' : 'Approve'}
                        </button>
                        <button
                          disabled={actionLoading === r.id}
                          onClick={() => handleReject(r.id)}
                          className="rounded-sm border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {actionLoading === r.id ? '…' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between text-sm text-ink/60">
            <span>{pagination.total} requests total</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-sm border border-ink/20 px-3 py-1 hover:bg-ink/5 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-1">Page {page} of {pagination.totalPages}</span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-sm border border-ink/20 px-3 py-1 hover:bg-ink/5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default AttendanceEditRequestsPage;
