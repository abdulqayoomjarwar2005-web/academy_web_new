const InstituteModel = require('../models/instituteModel');

const listInstitutes = async (req, res) => {
  try {
    const { status } = req.query;
    const institutes = await InstituteModel.list({ status });
    return res.status(200).json({ institutes });
  } catch (err) {
    console.error('List institutes error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getInstitute = async (req, res) => {
  try {
    const institute = await InstituteModel.findById(req.params.id);
    if (!institute) return res.status(404).json({ message: 'Institute not found' });
    return res.status(200).json({ institute });
  } catch (err) {
    console.error('Get institute error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const createInstitute = async (req, res) => {
  try {
    const { name } = req.body;

    const existing = await InstituteModel.findByName(name.trim());
    if (existing) return res.status(409).json({ message: 'An institute with this name already exists' });

    const institute = await InstituteModel.create({ name: name.trim(), createdBy: req.user.id });
    return res.status(201).json({ message: 'Institute added', institute });
  } catch (err) {
    console.error('Create institute error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const updateInstitute = async (req, res) => {
  try {
    const existing = await InstituteModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Institute not found' });

    const { name, status } = req.body;
    const institute = await InstituteModel.update(req.params.id, { name, status });
    return res.status(200).json({ message: 'Institute updated', institute });
  } catch (err) {
    console.error('Update institute error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteInstitute = async (req, res) => {
  try {
    const existing = await InstituteModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Institute not found' });

    const candidateCount = await InstituteModel.countCandidates(req.params.id);
    if (candidateCount > 0) {
      return res.status(409).json({
        message: `Cannot delete — ${candidateCount} candidate(s) are linked to this institute`,
      });
    }

    await InstituteModel.remove(req.params.id);
    return res.status(200).json({ message: 'Institute deleted' });
  } catch (err) {
    console.error('Delete institute error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { listInstitutes, getInstitute, createInstitute, updateInstitute, deleteInstitute };
