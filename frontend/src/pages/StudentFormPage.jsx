import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { getStudent, createStudent, updateStudent, STATUS_OPTIONS } from '../utils/studentApi';

const emptyForm = {
  rollNumber: '',
  studentName: '',
  fatherName: '',
  contactNumber: '',
  class: '',
  batch: '',
  admissionDate: '',
  monthlyFee: '',
  status: 'active',
};

const StudentFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [studentCode, setStudentCode] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!isEdit) return;

    const loadStudent = async () => {
      try {
        const student = await getStudent(id);
        setForm({
          rollNumber: student.roll_number,
          studentName: student.student_name,
          fatherName: student.father_name,
          contactNumber: student.contact_number,
          class: student.class,
          batch: student.batch,
          admissionDate: student.admission_date?.slice(0, 10) || '',
          monthlyFee: student.monthly_fee,
          status: student.status,
        });
        setStudentCode(student.student_id);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load student');
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
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
      monthlyFee: form.monthlyFee === '' ? '' : Number(form.monthlyFee),
    };

    try {
      if (isEdit) {
        await updateStudent(id, payload);
      } else {
        await createStudent(payload);
      }
      navigate('/students');
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const mapped = {};
        data.errors.forEach((e) => {
          mapped[e.field] = e.message;
        });
        setFieldErrors(mapped);
      }
      setError(data?.message || 'Unable to save student. Please check the form and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title={isEdit ? 'Edit Student' : 'Add Student'}>
        <p className="text-sm text-ink/60">Loading…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={isEdit ? 'Edit Student' : 'Add Student'}>
      <div className="max-w-3xl">
        {isEdit && (
          <p className="mb-4 text-sm text-ink/50">
            Student ID: <span className="font-mono text-ink/70">{studentCode}</span>
          </p>
        )}

        {error && (
          <div className="mb-6 rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Roll Number" error={fieldErrors.rollNumber}>
            <input
              type="text"
              required
              value={form.rollNumber}
              onChange={handleChange('rollNumber')}
              className={inputClass(fieldErrors.rollNumber)}
            />
          </Field>

          <Field label="Student Name" error={fieldErrors.studentName}>
            <input
              type="text"
              required
              value={form.studentName}
              onChange={handleChange('studentName')}
              className={inputClass(fieldErrors.studentName)}
            />
          </Field>

          <Field label="Father's Name" error={fieldErrors.fatherName}>
            <input
              type="text"
              required
              value={form.fatherName}
              onChange={handleChange('fatherName')}
              className={inputClass(fieldErrors.fatherName)}
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

          <Field label="Class" error={fieldErrors.class}>
            <input
              type="text"
              required
              placeholder="e.g. Grade 9"
              value={form.class}
              onChange={handleChange('class')}
              className={inputClass(fieldErrors.class)}
            />
          </Field>

          <Field label="Batch" error={fieldErrors.batch}>
            <input
              type="text"
              required
              placeholder="e.g. 2026-Morning"
              value={form.batch}
              onChange={handleChange('batch')}
              className={inputClass(fieldErrors.batch)}
            />
          </Field>

          <Field label="Admission Date" error={fieldErrors.admissionDate}>
            <input
              type="date"
              required
              value={form.admissionDate}
              onChange={handleChange('admissionDate')}
              className={inputClass(fieldErrors.admissionDate)}
            />
          </Field>

          <Field label="Monthly Fee" error={fieldErrors.monthlyFee}>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.monthlyFee}
              onChange={handleChange('monthlyFee')}
              className={inputClass(fieldErrors.monthlyFee)}
            />
          </Field>

          <Field label="Status" error={fieldErrors.status}>
            <select
              value={form.status}
              onChange={handleChange('status')}
              className={`${inputClass(fieldErrors.status)} capitalize`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
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
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add student'}
            </button>
            <Link
              to="/students"
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

export default StudentFormPage;
