import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { listStudents, deleteStudent, getFilterOptions, STATUS_OPTIONS } from '../utils/studentApi';

const StudentListPage = () => {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [filterOptions, setFilterOptions] = useState({ classes: [], batches: [] });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listStudents({
        search: search || undefined,
        class: classFilter || undefined,
        batch: batchFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      setStudents(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load students');
    } finally {
      setLoading(false);
    }
  }, [search, classFilter, batchFilter, statusFilter, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const data = await getFilterOptions();
        setFilterOptions(data);
      } catch {
        // non-critical
      }
    };
    loadFilters();
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
      await deleteStudent(deleteTarget.id);
      setDeleteTarget(null);
      // If last item on page deleted, go back a page if needed
      if (students.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete student');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Students">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-md gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, ID, roll no., or contact"
            className="w-full rounded-sm border border-ink/15 bg-white px-4 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button
            type="submit"
            className="rounded-sm border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition hover:bg-ink/5"
          >
            Search
          </button>
        </form>

        <Link
          to="/students/new"
          className="inline-flex items-center justify-center rounded-sm bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/90"
        >
          + Add Student
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={classFilter}
          onChange={(e) => {
            setPage(1);
            setClassFilter(e.target.value);
          }}
          className="rounded-sm border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All classes</option>
          {filterOptions.classes.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={batchFilter}
          onChange={(e) => {
            setPage(1);
            setBatchFilter(e.target.value);
          }}
          className="rounded-sm border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All batches</option>
          {filterOptions.batches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
          className="rounded-sm border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink capitalize focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>

        {(classFilter || batchFilter || statusFilter || search) && (
          <button
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setClassFilter('');
              setBatchFilter('');
              setStatusFilter('');
              setPage(1);
            }}
            className="text-sm font-medium text-accent hover:text-accent/80"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-sm border border-ink/10 bg-white">
        <table className="min-w-full divide-y divide-ink/10 text-sm">
          <thead className="bg-ink/[0.03]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Student ID</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Name</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Roll No.</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Class</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Batch</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Monthly Fee</th>
              <th className="px-4 py-3 text-left font-semibold uppercase tracking-wider text-xs text-ink/60">Status</th>
              <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider text-xs text-ink/60">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink/50">
                  Loading students…
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink/50">
                  No students found.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 font-mono text-xs text-ink/70">{student.student_id}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/students/${student.id}`)}
                      className="font-medium text-ink hover:text-accent"
                    >
                      {student.student_name}
                    </button>
                    <p className="text-xs text-ink/40">{student.father_name}</p>
                  </td>
                  <td className="px-4 py-3 text-ink/80">{student.roll_number}</td>
                  <td className="px-4 py-3 text-ink/80">{student.class}</td>
                  <td className="px-4 py-3 text-ink/80">{student.batch}</td>
                  <td className="px-4 py-3 text-ink/80">
                    {Number(student.monthly_fee).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        to={`/students/${student.id}`}
                        className="text-xs font-medium text-ink/60 hover:text-ink"
                      >
                        View
                      </Link>
                      <Link
                        to={`/students/${student.id}/edit`}
                        className="text-xs font-medium text-accent hover:text-accent/80"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(student)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
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
        <div className="mt-4 flex items-center justify-between text-sm text-ink/60">
          <p>
            Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} students
          </p>
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
          title="Delete student"
          message={`Are you sure you want to delete ${deleteTarget.student_name}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          isLoading={isDeleting}
        />
      )}
    </DashboardLayout>
  );
};

export default StudentListPage;
