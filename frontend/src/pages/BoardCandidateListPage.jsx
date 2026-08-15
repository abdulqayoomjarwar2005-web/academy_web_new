import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  listBoardCandidates,
  deleteBoardCandidate,
  listBoardBatches,
  BOARD_CANDIDATE_STATUSES,
} from '../utils/boardApi';

const fmt = (n) =>
  new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(
    parseFloat(n || 0)
  );

const StatusBadge = ({ status }) => {
  const map = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-ink/10 text-ink/60',
    dropped: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-medium capitalize ${map[status] || 'bg-ink/10 text-ink'}`}>
      {status}
    </span>
  );
};

const BoardCandidateListPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listBoardCandidates({
        search: search || undefined,
        batchId: batchFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setCandidates(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load candidates');
    } finally {
      setLoading(false);
    }
  }, [search, batchFilter, statusFilter, page]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  useEffect(() => {
    listBoardBatches().then(setBatches).catch(() => {});
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBoardCandidate(deleteTarget.id);
      setDeleteTarget(null);
      if (candidates.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchCandidates();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete candidate');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Board Candidates">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-md gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, code, or father's name"
            className="w-full rounded-sm border border-ink/15 bg-white px-4 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button type="submit" className="rounded-sm border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/5">
            Search
          </button>
        </form>

        <Link to="/board/candidates/new" className="inline-flex items-center justify-center rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/90">
          + Enroll Candidate
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={batchFilter}
          onChange={(e) => { setPage(1); setBatchFilter(e.target.value); }}
          className="rounded-sm border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.batch_name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
          className="rounded-sm border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink capitalize focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All statuses</option>
          {BOARD_CANDIDATE_STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>

        {(batchFilter || statusFilter || search) && (
          <button
            onClick={() => { setSearch(''); setSearchInput(''); setBatchFilter(''); setStatusFilter(''); setPage(1); }}
            className="text-sm font-medium text-accent hover:text-accent/80"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Mobile card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {loading ? (
          <div className="rounded-sm border border-ink/10 bg-white px-4 py-8 text-center text-sm text-ink/50">Loading candidates…</div>
        ) : candidates.length === 0 ? (
          <div className="rounded-sm border border-ink/10 bg-white px-4 py-8 text-center text-sm text-ink/50">No candidates found.</div>
        ) : (
          candidates.map((c) => (
            <div key={c.id} className="rounded-sm border border-ink/10 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button onClick={() => navigate(`/board/candidates/${c.id}`)} className="text-left font-medium text-ink hover:text-accent">
                    {c.candidate_name}
                  </button>
                  <p className="text-xs text-ink/40">S/O-D/O {c.father_name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-ink/50">{c.candidate_code}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div><p className="text-ink/40">Batch</p><p className="text-ink/80">{c.batch_name || '—'}</p></div>
                <div><p className="text-ink/40">Due</p><p className="font-medium text-red-600">Rs {fmt(c.total_due)}</p></div>
              </div>
              <div className="mt-3 flex justify-end gap-4 border-t border-ink/5 pt-3">
                <Link to={`/board/candidates/${c.id}`} className="text-xs font-medium text-ink/60 hover:text-ink">View</Link>
                <Link to={`/board/candidates/${c.id}/edit`} className="text-xs font-medium text-accent hover:text-accent/80">Edit</Link>
                <button onClick={() => setDeleteTarget(c)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table */}
      <div className="mt-6 hidden overflow-x-auto rounded-sm border border-ink/10 bg-white md:block">
        <table className="min-w-full divide-y divide-ink/10 text-sm">
          <thead className="bg-ink/[0.03]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Code</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Name</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Batch</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Billed</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Paid</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Due</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Status</th>
              <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-xs text-ink/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-ink/50">Loading candidates…</td></tr>
            ) : candidates.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-ink/50">No candidates found.</td></tr>
            ) : (
              candidates.map((c) => (
                <tr key={c.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs text-ink/70">{c.candidate_code}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/board/candidates/${c.id}`)} className="font-medium text-ink hover:text-accent">
                      {c.candidate_name}
                    </button>
                    <p className="text-xs text-ink/40">{c.father_name}</p>
                  </td>
                  <td className="px-4 py-3 text-ink/80">{c.batch_name || '—'}</td>
                  <td className="px-4 py-3 text-ink/80">Rs {fmt(c.total_billed)}</td>
                  <td className="px-4 py-3 text-ink/80">Rs {fmt(c.total_paid)}</td>
                  <td className="px-4 py-3 font-medium text-red-600">Rs {fmt(c.total_due)}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link to={`/board/candidates/${c.id}`} className="text-xs font-medium text-ink/60 hover:text-ink">View</Link>
                      <Link to={`/board/candidates/${c.id}/edit`} className="text-xs font-medium text-accent hover:text-accent/80">Edit</Link>
                      <button onClick={() => setDeleteTarget(c)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-3 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} candidates</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-sm border border-ink/15 px-3 py-1.5 font-medium text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded-sm border border-ink/15 px-3 py-1.5 font-medium text-ink transition hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete candidate"
          message={`Are you sure you want to delete ${deleteTarget.candidate_name}? This also removes their fee records. This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={isDeleting}
        />
      )}
    </DashboardLayout>
  );
};

export default BoardCandidateListPage;
