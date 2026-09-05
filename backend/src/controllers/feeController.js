const FeeModel = require('../models/feeModel');

// -------------------------------------------------------
// TEACHER VISIBILITY (Phase 14 — Teacher Portal)
// Teachers can see whether a student's fee is paid/unpaid, but never amounts.
// -------------------------------------------------------
const AMOUNT_FIELDS = ['amount', 'amount_paid', 'monthly_fee', 'outstanding_balance', 'total_billed', 'total_paid'];

const sanitizeFeeForTeacher = (fee) => {
  if (!fee) return fee;
  const clean = { ...fee };
  AMOUNT_FIELDS.forEach((field) => delete clean[field]);
  return clean;
};

const sanitizeFeeListForTeacher = (fees) => (Array.isArray(fees) ? fees.map(sanitizeFeeForTeacher) : fees);

// -------------------------------------------------------
// GET /api/fees/dashboard
// Financial totals — owner/admin only (see feeRoutes.js).
// -------------------------------------------------------
const getDashboard = async (req, res) => {
  try {
    const stats = await FeeModel.getDashboardStats();
    return res.status(200).json({ stats });
  } catch (err) {
    console.error('Fee dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/fees
// List fees with filters
// -------------------------------------------------------
const listFees = async (req, res) => {
  try {
    const { studentId, month, paidDate, paidMonth, status, class: className, batch, search, sortBy, sortDir, page, limit } =
      req.query;

    const isTeacher = req.user.role === 'teacher';
    let classIn;
    if (isTeacher) {
      const assignedClasses = req.user.classes || [];
      classIn = className ? assignedClasses.filter((c) => c === className) : assignedClasses;
    }

    const result = await FeeModel.list({
      studentId,
      month,
      paidDate,
      paidMonth,
      status,
      class: classIn ? undefined : className,
      classIn,
      batch,
      search,
      sortBy,
      sortDir,
      page,
      limit,
    });

    if (isTeacher) {
      result.data = sanitizeFeeListForTeacher(result.data);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('List fees error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/fees/:id
// -------------------------------------------------------
const getFee = async (req, res) => {
  try {
    const fee = await FeeModel.findById(req.params.id);
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    if (req.user.role === 'teacher') {
      if (!(req.user.classes || []).includes(fee.class)) {
        return res.status(403).json({ message: 'You do not have access to this record' });
      }
      return res.status(200).json({ fee: sanitizeFeeForTeacher(fee) });
    }

    return res.status(200).json({ fee });
  } catch (err) {
    console.error('Get fee error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/fees/receipt/:receiptNumber
// -------------------------------------------------------
const getByReceipt = async (req, res) => {
  try {
    const fee = await FeeModel.findByReceipt(req.params.receiptNumber);
    if (!fee) return res.status(404).json({ message: 'Receipt not found' });

    if (req.user.role === 'teacher') {
      if (!(req.user.classes || []).includes(fee.class)) {
        return res.status(403).json({ message: 'You do not have access to this record' });
      }
      return res.status(200).json({ fee: sanitizeFeeForTeacher(fee) });
    }

    return res.status(200).json({ fee });
  } catch (err) {
    console.error('Get by receipt error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/fees/due/:studentId
// Due months for a single student
// -------------------------------------------------------
const getDueMonths = async (req, res) => {
  try {
    const months = await FeeModel.getDueMonths(req.params.studentId);

    if (req.user.role === 'teacher') {
      const assignedClasses = req.user.classes || [];
      const studentClass = months[0]?.class;
      if (studentClass && !assignedClasses.includes(studentClass)) {
        return res.status(403).json({ message: 'You do not have access to this student' });
      }
      return res.status(200).json({ dueMonths: sanitizeFeeListForTeacher(months) });
    }

    return res.status(200).json({ dueMonths: months });
  } catch (err) {
    console.error('Get due months error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// POST /api/fees/ensure
// Ensure a fee record exists for student + month
// -------------------------------------------------------
const ensureFeeRecord = async (req, res) => {
  try {
    const { studentId, feeMonth } = req.body;

    const fee = await FeeModel.ensureFeeRecord(studentId, feeMonth, req.user.id);
    if (!fee) return res.status(404).json({ message: 'Student not found' });

    return res.status(200).json({ fee });
  } catch (err) {
    console.error('Ensure fee record error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// POST /api/fees/bulk-generate
// Generate records for all active students for a month
// -------------------------------------------------------
const bulkGenerate = async (req, res) => {
  try {
    const { feeMonth } = req.body;

    if (!feeMonth || !/^\d{4}-\d{2}$/.test(feeMonth)) {
      return res.status(400).json({ message: 'feeMonth must be in YYYY-MM format' });
    }

    const result = await FeeModel.bulkGenerateForMonth(feeMonth, req.user.id);
    return res.status(200).json({
      message: `Generated ${result.created} records, skipped ${result.skipped} existing records`,
      ...result,
    });
  } catch (err) {
    console.error('Bulk generate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// PATCH /api/fees/:id/mark-paid
// -------------------------------------------------------
const markPaid = async (req, res) => {
  try {
    const { amountPaid } = req.body;
    const fee = await FeeModel.markPaid(req.params.id, req.user.id, amountPaid ?? null);

    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    return res.status(200).json({ message: 'Fee marked as paid', fee });
  } catch (err) {
    console.error('Mark paid error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// PATCH /api/fees/:id/mark-unpaid
// -------------------------------------------------------
const markUnpaid = async (req, res) => {
  try {
    const fee = await FeeModel.markUnpaid(req.params.id, req.user.id);
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    return res.status(200).json({ message: 'Fee marked as unpaid', fee });
  } catch (err) {
    console.error('Mark unpaid error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// PATCH /api/fees/:id/mark-partial
// -------------------------------------------------------
const markPartial = async (req, res) => {
  try {
    const { amountPaid } = req.body;

    if (amountPaid === undefined || amountPaid === null) {
      return res.status(400).json({ message: 'amountPaid is required for partial payment' });
    }

    const fee = await FeeModel.markPartial(req.params.id, amountPaid, req.user.id);
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    return res.status(200).json({ message: 'Fee marked as partial', fee });
  } catch (err) {
    console.error('Mark partial error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// PATCH /api/fees/:id/mark-waived
// -------------------------------------------------------
const markWaived = async (req, res) => {
  try {
    const { notes } = req.body;
    const fee = await FeeModel.markWaived(req.params.id, notes || null, req.user.id);
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    return res.status(200).json({ message: 'Fee marked as waived', fee });
  } catch (err) {
    console.error('Mark waived error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// POST /api/fees/family-pay
// Pay fees for two or more students (e.g. siblings) together and
// generate a single combined receipt.
// -------------------------------------------------------
const payFamilyFees = async (req, res) => {
  try {
    const { payments, guardianName, contactNumber, notes } = req.body;

    if (!Array.isArray(payments) || payments.length < 2) {
      return res.status(400).json({ message: 'Select at least two fee records to create a family voucher' });
    }

    for (const p of payments) {
      if (!p || typeof p.feeId !== 'string') {
        return res.status(400).json({ message: 'Each payment entry must include a valid feeId' });
      }
      if (p.amountPaid !== undefined && p.amountPaid !== null && Number(p.amountPaid) < 0) {
        return res.status(400).json({ message: 'amountPaid must be a non-negative number' });
      }
    }

    const feeIds = payments.map((p) => p.feeId);
    if (new Set(feeIds).size !== feeIds.length) {
      return res.status(400).json({ message: 'Duplicate fee record selected' });
    }

    const result = await FeeModel.payFamilyFees(payments, req.user.id, { guardianName, contactNumber, notes });

    return res.status(200).json({
      message: `Combined payment recorded for ${result.group.student_count} students`,
      receiptNumber: result.group.receipt_number,
      group: result.group,
      fees: result.fees,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    console.error('Family pay error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// GET /api/fees/family-receipt/:receiptNumber
// -------------------------------------------------------
const getFamilyReceipt = async (req, res) => {
  try {
    const receipt = await FeeModel.findFamilyReceipt(req.params.receiptNumber);
    if (!receipt) return res.status(404).json({ message: 'Family receipt not found' });

    return res.status(200).json(receipt);
  } catch (err) {
    console.error('Get family receipt error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDashboard,
  listFees,
  getFee,
  getByReceipt,
  getDueMonths,
  ensureFeeRecord,
  bulkGenerate,
  markPaid,
  markUnpaid,
  markPartial,
  markWaived,
  payFamilyFees,
  getFamilyReceipt,
};
