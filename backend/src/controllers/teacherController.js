const TeacherModel = require('../models/teacherModel');

/**
 * POST /api/teachers
 * Create a new teacher.
 * Allowed: owner, admin
 */
const createTeacher = async (req, res) => {
  try {
    const { teacherName, contactNumber, subject, salary, joiningDate, status } = req.body;

    const teacher = await TeacherModel.create(
      { teacherName, contactNumber, subject, salary, joiningDate, status },
      req.user.id
    );

    return res.status(201).json({ message: 'Teacher created successfully', teacher });
  } catch (err) {
    console.error('Create teacher error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/teachers
 * List teachers with search, filters, sorting, and pagination.
 * Allowed: owner, admin
 */
const listTeachers = async (req, res) => {
  try {
    const { search, subject, status, sortBy, sortDir, page, limit } = req.query;

    const result = await TeacherModel.list({ search, subject, status, sortBy, sortDir, page, limit });

    return res.status(200).json(result);
  } catch (err) {
    console.error('List teachers error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/teachers/filters
 * Returns distinct subject values and status options for filter dropdowns.
 * Allowed: owner, admin
 */
const getFilterOptions = async (req, res) => {
  try {
    const subjects = await TeacherModel.getDistinctSubjects();
    return res.status(200).json({
      subjects,
      statuses: TeacherModel.ALLOWED_STATUSES,
    });
  } catch (err) {
    console.error('Get teacher filter options error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/teachers/:id
 * View a single teacher profile.
 * Allowed: owner, admin
 */
const getTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await TeacherModel.findById(id);

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    return res.status(200).json({ teacher });
  } catch (err) {
    console.error('Get teacher error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/teachers/:id
 * Update a teacher record.
 * Allowed: owner, admin
 */
const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await TeacherModel.findById(id);

    if (!existing) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const { teacherName, contactNumber, subject, salary, joiningDate, status } = req.body;

    const updated = await TeacherModel.update(id, {
      teacherName,
      contactNumber,
      subject,
      salary,
      joiningDate,
      status,
    });

    return res.status(200).json({ message: 'Teacher updated successfully', teacher: updated });
  } catch (err) {
    console.error('Update teacher error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /api/teachers/:id
 * Allowed: owner, admin
 */
const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TeacherModel.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    return res.status(200).json({ message: 'Teacher deleted successfully' });
  } catch (err) {
    console.error('Delete teacher error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createTeacher,
  listTeachers,
  getFilterOptions,
  getTeacher,
  updateTeacher,
  deleteTeacher,
};
