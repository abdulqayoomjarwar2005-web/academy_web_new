const FeeModel = require('../models/feeModel');

// -------------------------------------------------------
// GET /api/fees/dashboard
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
    const { studentId, month, status, class: className, batch, search, sortBy, sortDir, page, limit } =
      req.query;

    const result = await FeeModel.list({
      studentId,
      month,
      status,
      class: className,
      batch,
      search,
      sortBy,
      sortDir,
      page,
      limit,
    });

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
};
