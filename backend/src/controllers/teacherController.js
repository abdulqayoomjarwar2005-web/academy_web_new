const bcrypt = require('bcryptjs');
const TeacherModel = require('../models/teacherModel');
const UserModel = require('../models/userModel');
const TeacherClassModel = require('../models/teacherClassModel');

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

/**
 * POST /api/teachers/:id/account
 * Create a login account for an existing teacher.
 * Body: { email, password, classes: [] }
 * Allowed: owner, admin
 */
const createTeacherAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, classes } = req.body;

    const teacher = await TeacherModel.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    if (teacher.user_id) {
      return res.status(409).json({ message: 'This teacher already has a login account' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await UserModel.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      fullName: teacher.teacher_name,
      email: normalizedEmail,
      passwordHash,
      role: 'teacher',
      mustChangePassword: true,
    });

    await TeacherModel.linkUserAccount(id, user.id);

    let assignedClasses = [];
    if (Array.isArray(classes) && classes.length > 0) {
      assignedClasses = await TeacherClassModel.setClasses(user.id, classes, req.user.id);
    }

    return res.status(201).json({
      message: 'Login account created. Share this email and temporary password with the teacher — they will be asked to change it on first login.',
      account: { email: user.email, userId: user.id },
      classes: assignedClasses,
    });
  } catch (err) {
    console.error('Create teacher account error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/teachers/:id/account
 * View a teacher's login account status and assigned classes.
 * Allowed: owner, admin
 */
const getTeacherAccount = async (req, res) => {
  try {
    const info = await TeacherModel.getAccountInfo(req.params.id);
    if (!info) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    let classes = [];
    if (info.user_id) {
      classes = await TeacherClassModel.getClassesForUser(info.user_id);
    }

    return res.status(200).json({
      hasAccount: !!info.user_id,
      email: info.email || null,
      isActive: info.is_active ?? null,
      mustChangePassword: info.must_change_password ?? null,
      classes,
    });
  } catch (err) {
    console.error('Get teacher account error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/teachers/:id/classes
 * Replace the set of classes a teacher's login is scoped to.
 * Body: { classes: [] }
 * Allowed: owner, admin
 */
const updateTeacherClasses = async (req, res) => {
  try {
    const { id } = req.params;
    const { classes } = req.body;

    const teacher = await TeacherModel.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    if (!teacher.user_id) {
      return res.status(400).json({ message: 'This teacher does not have a login account yet. Create one first.' });
    }

    const assignedClasses = await TeacherClassModel.setClasses(teacher.user_id, classes || [], req.user.id);

    return res.status(200).json({ message: 'Class assignments updated successfully', classes: assignedClasses });
  } catch (err) {
    console.error('Update teacher classes error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/teachers/:id/account/activate
 * PATCH /api/teachers/:id/account/deactivate
 * Allowed: owner, admin
 */
const setTeacherAccountStatus = (isActive) => async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await TeacherModel.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    if (!teacher.user_id) {
      return res.status(400).json({ message: 'This teacher does not have a login account yet' });
    }

    await UserModel.setActive(teacher.user_id, isActive);
    return res.status(200).json({ message: `Login account ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (err) {
    console.error('Set teacher account status error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/teachers/:id/account/reset-password
 * Admin issues a new temporary password for a teacher (e.g. they're locked out).
 * Body: { newPassword }
 * Allowed: owner, admin
 */
const resetTeacherPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const teacher = await TeacherModel.findById(id);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    if (!teacher.user_id) {
      return res.status(400).json({ message: 'This teacher does not have a login account yet' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await UserModel.adminSetPassword(teacher.user_id, passwordHash);

    return res.status(200).json({ message: 'Temporary password set. Share it with the teacher — they will be asked to change it on next login.' });
  } catch (err) {
    console.error('Reset teacher password error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/teachers/me/classes
 * The logged-in teacher's own assigned classes.
 * Allowed: teacher
 */
const getMyClasses = async (req, res) => {
  try {
    const classes = await TeacherClassModel.getClassesForUser(req.user.id);
    return res.status(200).json({ classes });
  } catch (err) {
    console.error('Get my classes error:', err);
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
  createTeacherAccount,
  getTeacherAccount,
  updateTeacherClasses,
  activateTeacherAccount: setTeacherAccountStatus(true),
  deactivateTeacherAccount: setTeacherAccountStatus(false),
  resetTeacherPassword,
  getMyClasses,
};
