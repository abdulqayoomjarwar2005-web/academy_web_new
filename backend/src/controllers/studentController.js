const StudentModel = require('../models/studentModel');

/**
 * POST /api/students
 * Create a new student.
 * Allowed: owner, admin, teacher
 */
const createStudent = async (req, res) => {
  try {
    const {
      rollNumber,
      studentName,
      fatherName,
      contactNumber,
      class: className,
      batch,
      admissionDate,
      monthlyFee,
      status,
    } = req.body;

    if (req.user.role === 'teacher') {
      const assignedClasses = req.user.classes || [];
      if (assignedClasses.length === 0) {
        return res.status(403).json({ message: 'You have not been assigned to any class yet. Contact the administrator.' });
      }
      if (!assignedClasses.includes(className)) {
        return res.status(403).json({ message: `You can only add students to your assigned class(es): ${assignedClasses.join(', ')}` });
      }
    }

    const duplicate = await StudentModel.existsByRollClassBatch(rollNumber, className, batch);
    if (duplicate) {
      return res.status(409).json({
        message: 'A student with this roll number already exists in the given class and batch',
      });
    }

    const student = await StudentModel.create(
      {
        rollNumber,
        studentName,
        fatherName,
        contactNumber,
        class: className,
        batch,
        admissionDate,
        monthlyFee,
        status,
      },
      req.user.id
    );

    return res.status(201).json({ message: 'Student created successfully', student });
  } catch (err) {
    console.error('Create student error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/students
 * List students with search, filters, sorting, and pagination.
 * Allowed: owner, admin, teacher (read access for all roles)
 */
const listStudents = async (req, res) => {
  try {
    const { search, class: className, batch, status, sortBy, sortDir, page, limit } = req.query;

    let classIn;
    if (req.user.role === 'teacher') {
      const assignedClasses = req.user.classes || [];
      // If the teacher requested a specific class filter, only honor it when
      // it's one of their own classes; otherwise scope to all their classes.
      classIn = className ? assignedClasses.filter((c) => c === className) : assignedClasses;
    }

    const result = await StudentModel.list({
      search,
      class: classIn ? undefined : className,
      classIn,
      batch,
      status,
      sortBy,
      sortDir,
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('List students error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/students/filters
 * Returns distinct class and batch values for building filter dropdowns.
 */
const getFilterOptions = async (req, res) => {
  try {
    const isTeacher = req.user.role === 'teacher';
    const assignedClasses = isTeacher ? (req.user.classes || []) : undefined;

    const options = await StudentModel.getDistinctClassesAndBatches(assignedClasses);

    // For teachers, always offer their full assigned-class list (even for
    // classes that don't have students yet), not just classes with existing students.
    if (isTeacher) {
      options.classes = assignedClasses;
    }

    return res.status(200).json({
      ...options,
      statuses: StudentModel.ALLOWED_STATUSES,
    });
  } catch (err) {
    console.error('Get filter options error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/students/:id
 * View a single student profile.
 * Allowed: owner, admin, teacher (read access for all roles)
 */
const getStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await StudentModel.findById(id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (req.user.role === 'teacher' && !(req.user.classes || []).includes(student.class)) {
      return res.status(403).json({ message: 'You do not have access to this student' });
    }

    return res.status(200).json({ student });
  } catch (err) {
    console.error('Get student error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/students/:id
 * Update a student record.
 * Allowed: owner, admin, teacher
 */
const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await StudentModel.findById(id);

    if (!existing) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const {
      rollNumber,
      studentName,
      fatherName,
      contactNumber,
      class: className,
      batch,
      admissionDate,
      monthlyFee,
      status,
    } = req.body;

    if (req.user.role === 'teacher') {
      const assignedClasses = req.user.classes || [];
      if (!assignedClasses.includes(existing.class)) {
        return res.status(403).json({ message: 'You do not have access to this student' });
      }
      if (className !== undefined && !assignedClasses.includes(className)) {
        return res.status(403).json({ message: `You can only assign students to your assigned class(es): ${assignedClasses.join(', ')}` });
      }
    }

    // If roll number / class / batch is changing, check for duplicates
    const newRoll = rollNumber !== undefined ? rollNumber : existing.roll_number;
    const newClass = className !== undefined ? className : existing.class;
    const newBatch = batch !== undefined ? batch : existing.batch;

    if (
      newRoll !== existing.roll_number ||
      newClass !== existing.class ||
      newBatch !== existing.batch
    ) {
      const duplicate = await StudentModel.existsByRollClassBatch(newRoll, newClass, newBatch, id);
      if (duplicate) {
        return res.status(409).json({
          message: 'A student with this roll number already exists in the given class and batch',
        });
      }
    }

    const updated = await StudentModel.update(id, {
      rollNumber,
      studentName,
      fatherName,
      contactNumber,
      class: className,
      batch,
      admissionDate,
      monthlyFee,
      status,
    });

    return res.status(200).json({ message: 'Student updated successfully', student: updated });
  } catch (err) {
    console.error('Update student error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /api/students/:id
 * Allowed: owner, admin, teacher
 */
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'teacher') {
      const existing = await StudentModel.findById(id);
      if (!existing) {
        return res.status(404).json({ message: 'Student not found' });
      }
      if (!(req.user.classes || []).includes(existing.class)) {
        return res.status(403).json({ message: 'You do not have access to this student' });
      }
    }

    const deleted = await StudentModel.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Delete student error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createStudent,
  listStudents,
  getFilterOptions,
  getStudent,
  updateStudent,
  deleteStudent,
};
