const ClassModel = require('../models/classModel');

/**
 * GET /api/classes
 * List all classes, alphabetically.
 * Allowed: all authenticated roles (needed when assigning classes, adding
 * students, marking attendance, etc.)
 */
const listClasses = async (req, res) => {
  try {
    const classes = await ClassModel.list();
    return res.status(200).json({ classes });
  } catch (err) {
    console.error('List classes error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/classes
 * Body: { name }
 * Allowed: owner, admin
 */
const createClass = async (req, res) => {
  try {
    const { name } = req.body;
    const trimmed = name.trim();

    const existing = await ClassModel.findByName(trimmed);
    if (existing) {
      return res.status(409).json({ message: 'A class with this name already exists' });
    }

    const created = await ClassModel.create(trimmed);
    return res.status(201).json({ message: 'Class added successfully', class: created });
  } catch (err) {
    console.error('Create class error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /api/classes/:id
 * Allowed: owner, admin
 * Blocked if any students are currently assigned to this class.
 */
const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ClassModel.getById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const studentCount = await ClassModel.countStudentsInClass(existing.name);
    if (studentCount > 0) {
      return res.status(409).json({
        message: `Cannot delete — ${studentCount} student(s) are currently assigned to this class.`,
      });
    }

    await ClassModel.delete(id);
    return res.status(200).json({ message: 'Class deleted successfully' });
  } catch (err) {
    console.error('Delete class error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { listClasses, createClass, deleteClass };
