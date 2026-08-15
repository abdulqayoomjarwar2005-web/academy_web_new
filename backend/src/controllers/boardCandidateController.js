const BoardCandidateModel = require('../models/boardCandidateModel');
const BoardBatchModel = require('../models/boardBatchModel');

const getDashboard = async (req, res) => {
  try {
    const stats = await BoardCandidateModel.getDashboardStats();
    return res.status(200).json({ stats });
  } catch (err) {
    console.error('Board candidate dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const listCandidates = async (req, res) => {
  try {
    const { batchId, status, search, page, limit } = req.query;
    const result = await BoardCandidateModel.list({ batchId, status, search, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    console.error('List board candidates error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getCandidate = async (req, res) => {
  try {
    const candidate = await BoardCandidateModel.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    return res.status(200).json({ candidate });
  } catch (err) {
    console.error('Get board candidate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createCandidate = async (req, res) => {
  try {
    const { candidateName, fatherName, contactNumber, batchId, enrollmentDate } = req.body;

    const batch = await BoardBatchModel.findById(batchId);
    if (!batch) return res.status(400).json({ message: 'Selected batch does not exist' });

    const candidate = await BoardCandidateModel.create({
      candidateName,
      fatherName,
      contactNumber,
      batchId,
      enrollmentDate,
      createdBy: req.user.id,
    });

    return res.status(201).json({ message: 'Candidate enrolled', candidate });
  } catch (err) {
    console.error('Create board candidate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateCandidate = async (req, res) => {
  try {
    const existing = await BoardCandidateModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Candidate not found' });

    const { candidateName, fatherName, contactNumber, batchId, enrollmentDate, status } = req.body;

    if (batchId !== undefined) {
      const batch = await BoardBatchModel.findById(batchId);
      if (!batch) return res.status(400).json({ message: 'Selected batch does not exist' });
    }

    const candidate = await BoardCandidateModel.update(req.params.id, {
      candidateName,
      fatherName,
      contactNumber,
      batchId,
      enrollmentDate,
      status,
    });

    return res.status(200).json({ message: 'Candidate updated', candidate });
  } catch (err) {
    console.error('Update board candidate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteCandidate = async (req, res) => {
  try {
    const existing = await BoardCandidateModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Candidate not found' });

    await BoardCandidateModel.remove(req.params.id);
    return res.status(200).json({ message: 'Candidate removed' });
  } catch (err) {
    console.error('Delete board candidate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getDashboard,
  listCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  deleteCandidate,
};
