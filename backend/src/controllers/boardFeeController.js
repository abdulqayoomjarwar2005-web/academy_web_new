const BoardFeeModel = require('../models/boardFeeModel');
const BoardCandidateModel = require('../models/boardCandidateModel');

const getDashboard = async (req, res) => {
  try {
    const stats = await BoardFeeModel.getDashboardStats();
    return res.status(200).json({ stats });
  } catch (err) {
    console.error('Board fee dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listFees = async (req, res) => {
  try {
    const { candidateId, batchId, feeType, status, search, page, limit } = req.query;
    const result = await BoardFeeModel.list({ candidateId, batchId, feeType, status, search, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    console.error('List board fees error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getFee = async (req, res) => {
  try {
    const fee = await BoardFeeModel.findById(req.params.id);
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });
    return res.status(200).json({ fee });
  } catch (err) {
    console.error('Get board fee error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listForCandidate = async (req, res) => {
  try {
    const candidate = await BoardCandidateModel.findById(req.params.candidateId);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const fees = await BoardFeeModel.listForCandidate(req.params.candidateId);
    return res.status(200).json({ candidate, fees });
  } catch (err) {
    console.error('List candidate board fees error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const setFeeItem = async (req, res) => {
  try {
    const { candidateId, feeType, amount, dueDate, notes } = req.body;

    const candidate = await BoardCandidateModel.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const fee = await BoardFeeModel.setFeeItem({
      candidateId,
      feeType,
      amount,
      dueDate,
      notes,
      createdBy: req.user.id,
    });

    return res.status(200).json({ message: 'Fee item saved', fee });
  } catch (err) {
    console.error('Set board fee item error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const markPaid = async (req, res) => {
  try {
    const existing = await BoardFeeModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Fee record not found' });

    const { amountPaid } = req.body;
    const fee = await BoardFeeModel.markPaid(req.params.id, req.user.id, amountPaid ?? null);
    return res.status(200).json({ message: 'Marked as paid', fee });
  } catch (err) {
    console.error('Mark board fee paid error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const markPartial = async (req, res) => {
  try {
    const existing = await BoardFeeModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Fee record not found' });

    const { amountPaid } = req.body;
    if (amountPaid === undefined || amountPaid === null) {
      return res.status(400).json({ message: 'amountPaid is required' });
    }

    const fee = await BoardFeeModel.markPartial(req.params.id, amountPaid, req.user.id);
    return res.status(200).json({ message: 'Marked as partially paid', fee });
  } catch (err) {
    console.error('Mark board fee partial error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const markUnpaid = async (req, res) => {
  try {
    const existing = await BoardFeeModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Fee record not found' });

    const fee = await BoardFeeModel.markUnpaid(req.params.id, req.user.id);
    return res.status(200).json({ message: 'Marked as unpaid', fee });
  } catch (err) {
    console.error('Mark board fee unpaid error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDashboard,
  listFees,
  getFee,
  listForCandidate,
  setFeeItem,
  markPaid,
  markPartial,
  markUnpaid,
};
