import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { getStudent, deleteStudent } from '../utils/studentApi';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const StudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getStudent(id);
        setStudent(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load student profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteStudent(id);
      navigate('/students');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to delete student');
      setShowDelete(false);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Student Profile">
        <p className="text-sm text-ink/60">Loading…</p>
      </DashboardLayout>
    );
  }

  if (error || !student) {
    return (
      <DashboardLayout title="Student Profile">
        <div className="rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'Student not found'}
        </div>
        <Link to="/students" className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent/80">
          &larr; Back to students
        </Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Student Profile">
      <div className="max-w-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink">{student.student_name}</h2>
            <p className="mt-1 text-sm text-ink/50">
              Student ID: <span className="font-mono text-ink/70">{student.student_id}</span>
            </p>
          </div>
          <StatusBadge status={student.status} />
        </div>

        <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Detail label="Roll Number" value={student.roll_number} />
          <Detail label="Father's Name" value={student.father_name} />
          <Detail label="Contact Number" value={student.contact_number} />
          <Detail label="Class" value={student.class} />
          <Detail label="Batch" value={student.batch} />
          <Detail label="Admission Date" value={formatDate(student.admission_date)} />
          <Detail
            label="Monthly Fee"
            value={Number(student.monthly_fee).toLocaleString(undefined, { minimumFractionDigits: 0 })}
          />
          <Detail label="Status" value={<span className="capitalize">{student.status}</span>} />
        </dl>

        <div className="mt-10 flex gap-3 border-t border-ink/10 pt-6">
          <Link
            to={`/students/${student.id}/edit`}
            className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:bg-ink/90"
          >
            Edit student
          </Link>
          <button
            onClick={() => setShowDelete(true)}
            className="rounded-sm border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Delete student
          </button>
          <Link
            to="/students"
            className="ml-auto rounded-sm border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
          >
            Back to list
          </Link>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete student"
          message={`Are you sure you want to delete ${student.student_name}? This action cannot be undone.`}
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

export default StudentProfilePage;
