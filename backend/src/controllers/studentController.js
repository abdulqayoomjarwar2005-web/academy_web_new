const StudentModel = require('../models/studentModel');
const StudentDeletionModel = require('../models/studentDeletionModel');
const NotificationModel = require('../models/notificationModel');
const UserModel = require('../models/userModel');
const FeeModel = require('../models/feeModel');
const AuditModel = require('../models/auditModel');

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
      instituteId,
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
        instituteId,
      },
      req.user.id
    );

    notifyStudentAdded(student, req.user); // fire-and-forget, does not block the response

    if (student.status === 'active') {
      generateFeeForNewStudent(student, req.user); // fire-and-forget, does not block the response
    }

    return res.status(201).json({ message: 'Student created successfully', student });
  } catch (err) {
    console.error('Create student error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Fire-and-forget: notify owner + admin whenever a student is added.
 * Called after the response so it never delays or breaks the request.
 */
const notifyStudentAdded = async (student, actor) => {
  try {
    const actorUser = await UserModel.findById(actor.id);
    const actorName = actorUser?.full_name || 'Someone';
    await NotificationModel.dispatch(
      NotificationModel.TYPES.STUDENT_ADDED,
      {
        title: 'New student added',
        body: `${actorName} (${actor.role}) added ${student.student_name} to ${student.class}`,
        entityType: 'student',
        entityId: student.id,
        entityLabel: student.student_name,
      },
      actor.id
    );
  } catch (err) {
    console.error('[Notifications] STUDENT_ADDED dispatch failed:', err.message);
  }
};

/**
 * GET /api/students
 * List students with search, filters, sorting, and pagination.
 * Allowed: owner, admin, teacher (read access for all roles)
 */
const listStudents = async (req, res) => {
  try {
    const { search, class: className, batch, status, instituteId, sortBy, sortDir, page, limit } = req.query;

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
      instituteId,
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
      instituteId,
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
      instituteId,
    });

    return res.status(200).json({ message: 'Student updated successfully', student: updated });
  } catch (err) {
    console.error('Update student error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * DELETE /api/students/:id
 * Allowed: owner, admin only. Teachers must use the deletion-request flow below.
 */
const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

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

/**
 * POST /api/students/:id/deletion-request
 * A teacher requests that a student be deleted, instead of deleting directly.
 * Allowed: teacher (owner/admin already have direct delete access above)
 */
const requestStudentDeletion = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const student = await StudentModel.findById(id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    if (!(req.user.classes || []).includes(student.class)) {
      return res.status(403).json({ message: 'You do not have access to this student' });
    }

    let request;
    try {
      request = await StudentDeletionModel.createRequest(id, req.user.id, reason);
    } catch (err) {
      return res.status(409).json({ message: err.message });
    }

    try {
      const actorUser = await UserModel.findById(req.user.id);
      await NotificationModel.dispatch(
        NotificationModel.TYPES.STUDENT_DELETION_REQUESTED,
        {
          title: 'Student deletion requested',
          body: `${actorUser?.full_name || 'A teacher'} requested deletion of ${student.student_name} — reason: ${reason}`,
          entityType: 'student',
          entityId: student.id,
          entityLabel: student.student_name,
        },
        req.user.id
      );
    } catch (err) {
      console.error('[Notifications] STUDENT_DELETION_REQUESTED dispatch failed:', err.message);
    }

    return res.status(201).json({ message: 'Deletion request submitted for admin/owner review', request });
  } catch (err) {
    console.error('Request student deletion error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/students/deletion-requests
 * Allowed: owner, admin
 */
const listStudentDeletionRequests = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await StudentDeletionModel.listRequests({ status, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    console.error('List student deletion requests error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/students/deletion-requests/:id/approve
 * Deletes the student and marks the request approved.
 * Allowed: owner, admin
 */
const approveStudentDeletionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    let result;
    try {
      result = await StudentDeletionModel.approveRequest(id, req.user.id);
    } catch (err) {
      return res.status(409).json({ message: err.message });
    }
    return res.status(200).json({
      message: `Approved. ${result.deletedStudentName || 'The student'} has been deleted.`,
      request: result.request,
    });
  } catch (err) {
    console.error('Approve student deletion request error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/students/deletion-requests/:id/reject
 * Allowed: owner, admin
 */
const rejectStudentDeletionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    let request;
    try {
      request = await StudentDeletionModel.rejectRequest(id, req.user.id);
    } catch (err) {
      return res.status(409).json({ message: err.message });
    }
    return res.status(200).json({ message: 'Deletion request rejected. Student was not deleted.', request });
  } catch (err) {
    console.error('Reject student deletion request error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/students/stats/new
 * Count of students added today and this month (plus today's list).
 * Allowed: owner, admin, teacher (teachers get counts scoped to their classes)
 */
const getNewStudentStats = async (req, res) => {
  try {
    const classIn = req.user.role === 'teacher' ? (req.user.classes || []) : undefined;
    const stats = await StudentModel.getNewStudentStats(classIn);
    return res.status(200).json(stats);
  } catch (err) {
    console.error('Get new student stats error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Fire-and-forget: auto-generate the current month's fee record for a
 * newly added student, so admins never have to remember to do it manually.
 * Called after the response so it never delays or breaks the request.
 */
const generateFeeForNewStudent = async (student, actor) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const fee = await FeeModel.ensureFeeRecord(student.id, currentMonth, actor.id);
    if (fee) {
      await AuditModel.log({
        userId: actor.id,
        action: 'FEE_AUTO_GENERATED',
        category: 'Fees',
        description: `Auto-generated ${currentMonth} fee record for new student ${student.student_name}`,
        entityType: 'fee',
        entityId: fee.id,
        entityLabel: student.student_name,
      });
    }
  } catch (err) {
    console.error('[Fees] Auto-generate fee for new student failed:', err.message);
  }
};

module.exports = {
  createStudent,
  listStudents,
  getFilterOptions,
  getStudent,
  updateStudent,
  deleteStudent,
  requestStudentDeletion,
  listStudentDeletionRequests,
  approveStudentDeletionRequest,
  rejectStudentDeletionRequest,
  getNewStudentStats,
};
