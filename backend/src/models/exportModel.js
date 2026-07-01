const pool = require('../config/db');
const ProfitLossModel = require('./profitLossModel');

const toNumber = (v) => parseFloat(v || 0);
const fmtMoney = (v) => toNumber(v).toFixed(2);

const ExportModel = {
  // -------------------------------------------------------
  // STUDENT REPORT
  // -------------------------------------------------------

  async getStudentReport({ class: className, batch, status } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (className) {
      conditions.push(`class = $${idx}`);
      params.push(className);
      idx++;
    }
    if (batch) {
      conditions.push(`batch = $${idx}`);
      params.push(batch);
      idx++;
    }
    if (status) {
      conditions.push(`status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT student_id, roll_number, student_name, father_name, contact_number,
              class, batch, admission_date, monthly_fee, status
       FROM students
       ${whereClause}
       ORDER BY class ASC, batch ASC, student_name ASC`,
      params
    );

    const rows = result.rows.map((r) => ({
      studentId: r.student_id,
      rollNumber: r.roll_number,
      studentName: r.student_name,
      fatherName: r.father_name,
      contactNumber: r.contact_number,
      class: r.class,
      batch: r.batch,
      admissionDate: r.admission_date ? r.admission_date.toISOString().slice(0, 10) : '',
      monthlyFee: fmtMoney(r.monthly_fee),
      status: r.status,
    }));

    return {
      rows,
      summary: [`Total Students: ${rows.length}`],
    };
  },

  // -------------------------------------------------------
  // TEACHER REPORT
  // -------------------------------------------------------

  async getTeacherReport({ subject, status } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (subject) {
      conditions.push(`subject ILIKE $${idx}`);
      params.push(`%${subject}%`);
      idx++;
    }
    if (status) {
      conditions.push(`status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT teacher_id, teacher_name, contact_number, subject, salary, joining_date, status
       FROM teachers
       ${whereClause}
       ORDER BY teacher_name ASC`,
      params
    );

    const rows = result.rows.map((r) => ({
      teacherId: r.teacher_id,
      teacherName: r.teacher_name,
      contactNumber: r.contact_number,
      subject: r.subject,
      salary: fmtMoney(r.salary),
      joiningDate: r.joining_date ? r.joining_date.toISOString().slice(0, 10) : '',
      status: r.status,
    }));

    const totalSalary = rows.reduce((sum, r) => sum + toNumber(r.salary), 0);

    return {
      rows,
      summary: [`Total Teachers: ${rows.length}`, `Total Monthly Salary: Rs ${fmtMoney(totalSalary)}`],
    };
  },

  // -------------------------------------------------------
  // ATTENDANCE REPORT
  // Per-student attendance summary for a given month.
  // -------------------------------------------------------

  async getAttendanceReport({ month, class: className, batch } = {}) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const conditions = [`s.status = 'active'`];
    const params = [targetMonth];
    let idx = 2;

    if (className) {
      conditions.push(`s.class = $${idx}`);
      params.push(className);
      idx++;
    }
    if (batch) {
      conditions.push(`s.batch = $${idx}`);
      params.push(batch);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT
         s.student_id, s.student_name, s.class, s.batch,
         COUNT(a.id) FILTER (WHERE a.status = 'present') AS present_days,
         COUNT(a.id) FILTER (WHERE a.status = 'absent')  AS absent_days,
         COUNT(a.id) FILTER (WHERE a.status = 'leave')   AS leave_days,
         COUNT(a.id) AS total_marked,
         ROUND(
           COUNT(a.id) FILTER (WHERE a.status = 'present')::NUMERIC
           / NULLIF(COUNT(a.id), 0) * 100,
           2
         ) AS attendance_pct
       FROM students s
       LEFT JOIN attendance a
         ON a.student_id = s.id AND TO_CHAR(a.attendance_date, 'YYYY-MM') = $1
       ${whereClause}
       GROUP BY s.id, s.student_id, s.student_name, s.class, s.batch
       ORDER BY s.class ASC, s.batch ASC, s.student_name ASC`,
      params
    );

    const rows = result.rows.map((r) => ({
      studentId: r.student_id,
      studentName: r.student_name,
      class: r.class,
      batch: r.batch,
      presentDays: parseInt(r.present_days, 10),
      absentDays: parseInt(r.absent_days, 10),
      leaveDays: parseInt(r.leave_days, 10),
      totalMarked: parseInt(r.total_marked, 10),
      attendancePct: r.attendance_pct === null ? 'N/A' : `${parseFloat(r.attendance_pct)}%`,
    }));

    const totalPresent = rows.reduce((sum, r) => sum + r.presentDays, 0);
    const totalAbsent = rows.reduce((sum, r) => sum + r.absentDays, 0);
    const totalLeave = rows.reduce((sum, r) => sum + r.leaveDays, 0);

    return {
      month: targetMonth,
      rows,
      summary: [
        `Month: ${targetMonth}`,
        `Total Students: ${rows.length}`,
        `Total Present Days: ${totalPresent}`,
        `Total Absent Days: ${totalAbsent}`,
        `Total Leave Days: ${totalLeave}`,
      ],
    };
  },

  // -------------------------------------------------------
  // FEE REPORT
  // -------------------------------------------------------

  async getFeeReport({ month, status, class: className, batch } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (month) {
      conditions.push(`TO_CHAR(f.fee_month, 'YYYY-MM') = $${idx}`);
      params.push(month);
      idx++;
    }
    if (status) {
      conditions.push(`f.status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (className) {
      conditions.push(`s.class = $${idx}`);
      params.push(className);
      idx++;
    }
    if (batch) {
      conditions.push(`s.batch = $${idx}`);
      params.push(batch);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT
         s.student_id AS student_code, s.student_name, s.class, s.batch,
         TO_CHAR(f.fee_month, 'YYYY-MM') AS fee_month,
         f.amount, f.amount_paid, f.status, f.paid_at, f.receipt_number
       FROM fees f
       JOIN students s ON s.id = f.student_id
       ${whereClause}
       ORDER BY f.fee_month DESC, s.class ASC, s.student_name ASC`,
      params
    );

    const rows = result.rows.map((r) => ({
      studentId: r.student_code,
      studentName: r.student_name,
      class: r.class,
      batch: r.batch,
      feeMonth: r.fee_month,
      amount: fmtMoney(r.amount),
      amountPaid: fmtMoney(r.amount_paid),
      balance: fmtMoney(toNumber(r.amount) - toNumber(r.amount_paid)),
      status: r.status,
      paidAt: r.paid_at ? new Date(r.paid_at).toISOString().slice(0, 10) : '',
      receiptNumber: r.receipt_number || '',
    }));

    const totalAmount = rows.reduce((sum, r) => sum + toNumber(r.amount), 0);
    const totalPaid = rows.reduce((sum, r) => sum + toNumber(r.amountPaid), 0);
    const totalBalance = totalAmount - totalPaid;

    return {
      rows,
      summary: [
        `Total Fee Records: ${rows.length}`,
        `Total Amount: Rs ${fmtMoney(totalAmount)}`,
        `Total Collected: Rs ${fmtMoney(totalPaid)}`,
        `Total Outstanding: Rs ${fmtMoney(totalBalance)}`,
      ],
    };
  },

  // -------------------------------------------------------
  // EXPENSE REPORT
  // -------------------------------------------------------

  async getExpenseReport({ month, category, startDate, endDate } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (month) {
      conditions.push(`TO_CHAR(e.expense_date, 'YYYY-MM') = $${idx}`);
      params.push(month);
      idx++;
    }
    if (category) {
      conditions.push(`e.category = $${idx}`);
      params.push(category);
      idx++;
    }
    if (startDate) {
      conditions.push(`e.expense_date >= $${idx}`);
      params.push(startDate);
      idx++;
    }
    if (endDate) {
      conditions.push(`e.expense_date <= $${idx}`);
      params.push(endDate);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT e.expense_date, e.category, e.description, e.amount,
              u.full_name AS recorded_by
       FROM expenses e
       LEFT JOIN users u ON u.id = e.created_by
       ${whereClause}
       ORDER BY e.expense_date DESC`,
      params
    );

    const rows = result.rows.map((r) => ({
      expenseDate: r.expense_date ? r.expense_date.toISOString().slice(0, 10) : '',
      category: r.category,
      description: r.description,
      amount: fmtMoney(r.amount),
      recordedBy: r.recorded_by || '',
    }));

    const totalAmount = rows.reduce((sum, r) => sum + toNumber(r.amount), 0);

    return {
      rows,
      summary: [`Total Expense Records: ${rows.length}`, `Total Expenses: Rs ${fmtMoney(totalAmount)}`],
    };
  },

  // -------------------------------------------------------
  // PROFIT REPORT
  // Monthly Profit/Loss for a given year, built on Phase 9's
  // Profit & Loss views (collection - expenses = profit).
  // -------------------------------------------------------

  async getProfitReport({ year } = {}) {
    const { year: targetYear, months, totals } = await ProfitLossModel.getMonthlyReport(year);

    const rows = months.map((m) => ({
      month: m.month,
      totalCollection: fmtMoney(m.totalCollection),
      totalExpenses: fmtMoney(m.totalExpenses),
      profit: fmtMoney(m.profit),
    }));

    return {
      year: targetYear,
      rows,
      summary: [
        `Year: ${targetYear}`,
        `Total Collection: Rs ${fmtMoney(totals.totalCollection)}`,
        `Total Expenses: Rs ${fmtMoney(totals.totalExpenses)}`,
        `Net Profit / Loss: Rs ${fmtMoney(totals.profit)}`,
      ],
    };
  },
};

module.exports = ExportModel;
