import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { getTeacher, deleteTeacher } from '../utils/teacherApi';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const TeacherProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getTeacher(id);
        setTeacher(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load teacher profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTeacher(id);
      navigate('/teachers');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete teacher');
      setShowDelete(false);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Teacher Profile">
        <p className="text-sm text-ink/60">Loading…</p>
      </DashboardLayout>
    );
  }

  if (error || !teacher) {
    return (
      <DashboardLayout title="Teacher Profile">
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Teacher not found'}
        </div>
        <Link to="/teachers" className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent/80">
          &larr; Back to teachers
        </Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Teacher Profile">
      <div className="max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink">{teacher.teacher_name}</h2>
            <p className="mt-1 text-sm text-ink/50">
              Teacher ID: <span className="font-mono text-ink/70">{teacher.teacher_id}</span>
            </p>
          </div>
          <StatusBadge status={teacher.status} />
        </div>

        <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail label="Subject" value={teacher.subject} />
          <Detail label="Contact Number" value={teacher.contact_number} />
          <Detail
            label="Salary"
            value={Number(teacher.salary).toLocaleString(undefined, { minimumFractionDigits: 0 })}
          />
          <Detail label="Joining Date" value={formatDate(teacher.joining_date)} />
          <Detail
            label="Status"
            value={<span className="capitalize">{teacher.status.replace('_', ' ')}</span>}
          />
        </dl>

        <div className="mt-10 flex gap-3 border-t border-ink/10 pt-6">
          <Link
            to={`/teachers/${teacher.id}/edit`}
            className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:bg-ink/90"
          >
            Edit teacher
          </Link>
          <button
            onClick={() => setShowDelete(true)}
            className="rounded-sm border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Delete teacher
          </button>
          <Link
            to="/teachers"
            className="ml-auto rounded-sm border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
          >
            Back to list
          </Link>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete teacher"
          message={`Are you sure you want to delete ${teacher.teacher_name}? This action cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          isLoading={isDeleting}
        />
      )}
    </DashboardLayout>
  );
};

const Detail = ({ label, value }) => (
  <div>
    <dt className="text-xs font-semibold uppercase tracking-wider text-ink/40">{label}</dt>
    <dd className="mt-1 text-sm text-ink">{value || '—'}</dd>
  </div>
);

export default TeacherProfilePage;
