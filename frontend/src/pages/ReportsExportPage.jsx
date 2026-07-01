import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { getFilterOptions, STATUS_OPTIONS as STUDENT_STATUS_OPTIONS } from '../utils/studentApi';
import { EXPENSE_CATEGORIES } from '../utils/expenseApi';
import {
  downloadStudentReport,
  downloadTeacherReport,
  downloadAttendanceReport,
  downloadFeeReport,
  downloadExpenseReport,
  downloadProfitReport,
} from '../utils/exportApi';

const FEE_STATUS_OPTIONS = ['unpaid', 'paid', 'partial', 'waived'];
const TEACHER_STATUS_OPTIONS = ['active', 'inactive', 'on_leave', 'terminated'];

const currentMonth = () => new Date().toISOString().slice(0, 7);
const currentYear = () => new Date().getFullYear().toString();

// -------------------------------------------------------
// Reusable bits
// -------------------------------------------------------

const Select = ({ label, value, onChange, options, includeAll = true, allLabel = 'All' }) => (
  <label className="flex flex-col gap-1 text-xs text-ink/60">
    {label}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-sm border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink"
    >
      {includeAll && <option value="">{allLabel}</option>}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </label>
);

const MonthInput = ({ label, value, onChange }) => (
  <label className="flex flex-col gap-1 text-xs text-ink/60">
    {label}
    <input
      type="month"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-sm border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink"
    />
  </label>
);

const YearInput = ({ label, value, onChange }) => (
  <label className="flex flex-col gap-1 text-xs text-ink/60">
    {label}
    <input
      type="number"
      min="2000"
      max="2100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-24 rounded-sm border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink"
    />
  </label>
);

const ReportCard = ({ title, description, filters, onDownload }) => {
  const [busy, setBusy] = useState(null); // 'pdf' | 'excel' | null
  const [error, setError] = useState('');

  const handleDownload = async (format) => {
    setBusy(format);
    setError('');
    try {
      await onDownload(format);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-sm border border-ink/10 bg-white p-5">
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink/50">{description}</p>

      {filters && <div className="mt-4 flex flex-wrap gap-3">{filters}</div>}

      {error && <p className="mt-3 text-xs text-red-700">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => handleDownload('pdf')}
          disabled={busy !== null}
          className="rounded-sm border border-ink/20 bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/80 disabled:opacity-50"
        >
          {busy === 'pdf' ? 'Generating…' : 'Download PDF'}
        </button>
        <button
          type="button"
          onClick={() => handleDownload('excel')}
          disabled={busy !== null}
          className="rounded-sm border border-ink/20 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5 disabled:opacity-50"
        >
          {busy === 'excel' ? 'Generating…' : 'Download Excel'}
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------
// Page
// -------------------------------------------------------

const ReportsExportPage = () => {
  const { user } = useAuth();
  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  const [classes, setClasses] = useState([]);
  const [batches, setBatches] = useState([]);

  // Student report filters
  const [studentClass, setStudentClass] = useState('');
  const [studentBatch, setStudentBatch] = useState('');
  const [studentStatus, setStudentStatus] = useState('');

  // Teacher report filters
  const [teacherSubject, setTeacherSubject] = useState('');
  const [teacherStatus, setTeacherStatus] = useState('');

  // Attendance report filters
  const [attendanceMonth, setAttendanceMonth] = useState(currentMonth());
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceBatch, setAttendanceBatch] = useState('');

  // Fee report filters
  const [feeMonth, setFeeMonth] = useState(currentMonth());
  const [feeStatus, setFeeStatus] = useState('');
  const [feeClass, setFeeClass] = useState('');
  const [feeBatch, setFeeBatch] = useState('');

  // Expense report filters
  const [expenseMonth, setExpenseMonth] = useState(currentMonth());
  const [expenseCategory, setExpenseCategory] = useState('');

  // Profit report filters
  const [profitYear, setProfitYear] = useState(currentYear());

  useEffect(() => {
    getFilterOptions()
      .then((d) => {
        setClasses(d.classes || []);
        setBatches(d.batches || []);
      })
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout title="Reports &amp; Exports">
      <p className="mb-8 text-sm text-ink/60">
        Generate and download reports as PDF or Excel files for record-keeping, sharing, or
        printing.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Student Reports */}
        <ReportCard
          title="Student Reports"
          description="All student records with class, batch, contact, and fee details."
          filters={
            <>
              <Select label="Class" value={studentClass} onChange={setStudentClass} options={classes} />
              <Select label="Batch" value={studentBatch} onChange={setStudentBatch} options={batches} />
              <Select
                label="Status"
                value={studentStatus}
                onChange={setStudentStatus}
                options={STUDENT_STATUS_OPTIONS}
              />
            </>
          }
          onDownload={(format) =>
            downloadStudentReport(format, { class: studentClass, batch: studentBatch, status: studentStatus })
          }
        />

        {/* Teacher Reports */}
        {isOwnerOrAdmin && (
          <ReportCard
            title="Teacher Reports"
            description="All teaching staff with subject, contact, salary, and status."
            filters={
              <>
                <label className="flex flex-col gap-1 text-xs text-ink/60">
                  Subject
                  <input
                    type="text"
                    value={teacherSubject}
                    onChange={(e) => setTeacherSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="rounded-sm border border-ink/15 bg-white px-2 py-1.5 text-sm text-ink"
                  />
                </label>
                <Select
                  label="Status"
                  value={teacherStatus}
                  onChange={setTeacherStatus}
                  options={TEACHER_STATUS_OPTIONS}
                />
              </>
            }
            onDownload={(format) =>
              downloadTeacherReport(format, { subject: teacherSubject, status: teacherStatus })
            }
          />
        )}

        {/* Attendance Reports */}
        <ReportCard
          title="Attendance Reports"
          description="Monthly present/absent/leave summary per student."
          filters={
            <>
              <MonthInput label="Month" value={attendanceMonth} onChange={setAttendanceMonth} />
              <Select label="Class" value={attendanceClass} onChange={setAttendanceClass} options={classes} />
              <Select label="Batch" value={attendanceBatch} onChange={setAttendanceBatch} options={batches} />
            </>
          }
          onDownload={(format) =>
            downloadAttendanceReport(format, {
              month: attendanceMonth,
              class: attendanceClass,
              batch: attendanceBatch,
            })
          }
        />

        {/* Fee Reports */}
        <ReportCard
          title="Fee Reports"
          description="Fee records with amount, paid, balance, status, and receipts."
          filters={
            <>
              <MonthInput label="Fee Month" value={feeMonth} onChange={setFeeMonth} />
              <Select label="Status" value={feeStatus} onChange={setFeeStatus} options={FEE_STATUS_OPTIONS} />
              <Select label="Class" value={feeClass} onChange={setFeeClass} options={classes} />
              <Select label="Batch" value={feeBatch} onChange={setFeeBatch} options={batches} />
            </>
          }
          onDownload={(format) =>
            downloadFeeReport(format, { month: feeMonth, status: feeStatus, class: feeClass, batch: feeBatch })
          }
        />

        {/* Expense Reports */}
        {isOwnerOrAdmin && (
          <ReportCard
            title="Expense Reports"
            description="Recorded expenses with category, description, and amount."
            filters={
              <>
                <MonthInput label="Month" value={expenseMonth} onChange={setExpenseMonth} />
                <Select
                  label="Category"
                  value={expenseCategory}
                  onChange={setExpenseCategory}
                  options={EXPENSE_CATEGORIES}
                />
              </>
            }
            onDownload={(format) =>
              downloadExpenseReport(format, { month: expenseMonth, category: expenseCategory })
            }
          />
        )}

        {/* Profit Reports */}
        {isOwnerOrAdmin && (
          <ReportCard
            title="Profit Reports"
            description="Monthly Profit &amp; Loss for the selected year (Collection − Expenses = Profit)."
            filters={<YearInput label="Year" value={profitYear} onChange={setProfitYear} />}
            onDownload={(format) => downloadProfitReport(format, { year: profitYear })}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReportsExportPage;
