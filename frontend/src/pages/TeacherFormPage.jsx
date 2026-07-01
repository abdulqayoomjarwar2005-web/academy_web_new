import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { getTeacher, createTeacher, updateTeacher, TEACHER_STATUS_OPTIONS } from '../utils/teacherApi';

const emptyForm = {
  teacherName: '',
  contactNumber: '',
  subject: '',
  salary: '',
  joiningDate: '',
  status: 'active',
};

const TeacherFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [teacherCode, setTeacherCode] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;

    const loadTeacher = async () => {
      try {
        const teacher = await getTeacher(id);
        setForm({
          teacherName: teacher.teacher_name,
          contactNumber: teacher.contact_number,
          subject: teacher.subject,
          salary: teacher.salary,
          joiningDate: teacher.joining_date?.slice(0, 10) || '',
          status: teacher.status,
        });
        setTeacherCode(teacher.teacher_id);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load teacher');
      } finally {
        setLoading(false);
      }
    };

    loadTeacher();
  }, [id, isEdit]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    const payload = {
      ...form,
      salary: form.salary === '' ? '' : Number(form.salary),
    };

    try {
      if (isEdit) {
        await updateTeacher(id, payload);
      } else {
        await createTeacher(payload);
      }
      navigate('/teachers');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const mapped = {};
        data.errors.forEach((e) => {
          mapped[e.field] = e.message;
        });
        setFieldErrors(mapped);
      }
      setError(data?.message || 'Unable to save teacher. Please check the form and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title={isEdit ? 'Edit Teacher' : 'Add Teacher'}>
        <p className="text-sm text-ink/60">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={isEdit ? 'Edit Teacher' : 'Add Teacher'}>
      <div className="max-w-3xl">
        {isEdit && (
          <p className="mb-4 text-sm text-ink/50">
            Teacher ID: <span className="font-mono text-ink/70">{teacherCode}</span>
          </p>
        )}

        {error && (
          <div className="mb-6 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Teacher Name" error={fieldErrors.teacherName}>
            <input
              type="text"
              required
              value={form.teacherName}
              onChange={handleChange('teacherName')}
              className={inputClass(fieldErrors.teacherName)}
            />
          </Field>

          <Field label="Contact Number" error={fieldErrors.contactNumber}>
            <input
              type="text"
              required
              placeholder="e.g. 0300-1234567"
              value={form.contactNumber}
              onChange={handleChange('contactNumber')}
              className={inputClass(fieldErrors.contactNumber)}
            />
          </Field>

          <Field label="Subject" error={fieldErrors.subject}>
            <input
              type="text"
              required
              placeholder="e.g. Mathematics"
              value={form.subject}
              onChange={handleChange('subject')}
              className={inputClass(fieldErrors.subject)}
            />
          </Field>

          <Field label="Salary" error={fieldErrors.salary}>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.salary}
              onChange={handleChange('salary')}
              className={inputClass(fieldErrors.salary)}
            />
          </Field>

          <Field label="Joining Date" error={fieldErrors.joiningDate}>
            <input
              type="date"
              required
              value={form.joiningDate}
              onChange={handleChange('joiningDate')}
              className={inputClass(fieldErrors.joiningDate)}
            />
          </Field>

          <Field label="Status" error={fieldErrors.status}>
            <select
              value={form.status}
              onChange={handleChange('status')}
              className={`${inputClass(fieldErrors.status)} capitalize`}
            >
              {TEACHER_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>

          <div className="col-span-full mt-2 flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-sm bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add teacher'}
            </button>
            <Link
              to="/teachers"
              className="rounded-sm border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/5"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-ink/60">
      {label}
    </label>
    <div className="mt-2">{children}</div>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const inputClass = (error) =>
  `w-full rounded-sm border bg-white px-4 py-2.5 text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 ${
    error ? 'border-red-300 focus:ring-red-200' : 'border-ink/15 focus:border-accent focus:ring-accent/30'
  }`;

export default TeacherFormPage;
