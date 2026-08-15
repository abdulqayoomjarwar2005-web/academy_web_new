const BoardBatchModel = require('../models/boardBatchModel');

const listBatches = async (req, res) => {
  try {
    const { status } = req.query;
    const batches = await BoardBatchModel.list({ status });
    return res.status(200).json({ batches });
  } catch (err) {
    console.error('List board batches error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getBatch = async (req, res) => {
  try {
    const batch = await BoardBatchModel.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    return res.status(200).json({ batch });
  } catch (err) {
    console.error('Get board batch error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createBatch = async (req, res) => {
  try {
    const { batchName } = req.body;

    const existing = await BoardBatchModel.findByName(batchName.trim());
    if (existing) return res.status(409).json({ message: 'A batch with this name already exists' });

    const batch = await BoardBatchModel.create({ batchName: batchName.trim(), createdBy: req.user.id });
    return res.status(201).json({ message: 'Batch created', batch });
  } catch (err) {
    console.error('Create board batch error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateBatch = async (req, res) => {
  try {
    const existing = await BoardBatchModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Batch not found' });

    const { batchName, status } = req.body;
    const batch = await BoardBatchModel.update(req.params.id, { batchName, status });
    return res.status(200).json({ message: 'Batch updated', batch });
  } catch (err) {
    console.error('Update board batch error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteBatch = async (req, res) => {
  try {
    const existing = await BoardBatchModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Batch not found' });

    const candidateCount = await BoardBatchModel.countCandidatesInBatch(req.params.id);
    if (candidateCount > 0) {
      return res.status(409).json({
        message: `Cannot delete — ${candidateCount} candidate(s) are enrolled in this batch`,
      });
    }

    await BoardBatchModel.remove(req.params.id);
    return res.status(200).json({ message: 'Batch deleted' });
  } catch (err) {
    console.error('Delete board batch error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { listBatches, getBatch, createBatch, updateBatch, deleteBatch };
