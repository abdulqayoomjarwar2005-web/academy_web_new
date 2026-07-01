const AttendanceModel = require('../models/attendanceModel');

// -------------------------------------------------------
// MARK / SUBMIT ATTENDANCE
// -------------------------------------------------------

/**
 * GET /api/attendance/mark?date=YYYY-MM-DD
 * Load the list of active students with their attendance status for a given date.
 * Teacher can see if attendance is already submitted (locked).
 * Allowed: teacher, admin, owner
 */
const getMarkPage = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'date query parameter is required (YYYY-MM-DD)' });
    }

    const students = await AttendanceModel.getStudentsForDate(date);
    const summary = await AttendanceModel.getDaySummary(date);
    const isLocked = await AttendanceModel.isDateLocked(date);

    return res.status(200).json({ date, students, summary, isLocked });
  } catch (err) {
    console.error('Get mark page error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * POST /api/attendance/submit
 * Body: { date: 'YYYY-MM-DD', entries: [{ studentId, status }] }
 * Saves and locks attendance for the given date.
 * Once submitted, teacher cannot edit without an approved request.
 * Allowed: teacher, admin, owner
 */
const submitAttendance = async (req, res) => {
  try {
    const { date, entries } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'date is required' });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'entries must be a non-empty array' });
    }

    // Check if already locked
    const alreadyLocked = await AttendanceModel.isDateLocked(date);
    if (alreadyLocked) {
      return res.status(409).json({
        message: 'Attendance for this date is already submitted and locked. Submit an edit request to make changes.',
      });
    }

    // Validate statuses
    for (const entry of entries) {
      if (!AttendanceModel.ALLOWED_STATUSES.includes(entry.status)) {
        return res.status(400).json({
          message: `Invalid status "${entry.status}". Allowed: ${AttendanceModel.ALLOWED_STATUSES.join(', ')}`,
        });
      }
    }

    await AttendanceModel.bulkSaveAndSubmit(entries, req.user.id, date);

    return res.status(200).json({ message: 'Attendance submitted and locked successfully' });
  } catch (err) {
    console.error('Submit attendance error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/attendance/:attendanceId
 * Update a single attendance record after admin approval.
 * Only works when the record is unlocked (approved edit request).
 * After saving, it re-locks the record automatically.
 * Allowed: teacher (own records), admin, owner
 */
const updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status } = req.body;

    if (!status || !AttendanceModel.ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed: ${AttendanceModel.ALLOWED_STATUSES.join(', ')}`,
      });
    }

    const updated = await AttendanceModel.updateOne(attendanceId, status);
    if (!updated) {
      return res.status(404).json({ message: 'Attendance record not found or still locked' });
    }

    // Re-lock immediately after teacher edits
    await AttendanceModel.relockOne(attendanceId);

    return res.status(200).json({ message: 'Attendance updated successfully', attendance: updated });
  } catch (err) {
    console.error('Update attendance error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// HISTORY
// -------------------------------------------------------

/**
 * GET /api/attendance/history
 * Query: date, studentId, status, className, section, page, limit
 * Allowed: admin, owner (full history); teacher (own-marked records only via role check below)
 */
const getHistory = async (req, res) => {
  try {
    const { date, studentId, status, className, section, page, limit } = req.query;

    const result = await AttendanceModel.getHistory({
      date,
      studentId,
      status,
      className,
      section,
      page,
      limit,
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Get attendance history error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/attendance/summary?date=YYYY-MM-DD
 * Returns present/absent/leave counts for a date.
 * Allowed: all authenticated roles
 */
const getDaySummary = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'date is required' });
    }

    const summary = await AttendanceModel.getDaySummary(date);
    return res.status(200).json({ date, summary });
  } catch (err) {
    console.error('Get day summary error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/attendance/student-summary/:studentId?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Student attendance summary over a period.
 * Allowed: admin, owner
 */
const getStudentSummary = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: 'from and to date query parameters are required' });
    }

    const summary = await AttendanceModel.getStudentSummary(studentId, from, to);
    return res.status(200).json({ studentId, from, to, summary });
  } catch (err) {
    console.error('Get student summary error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// -------------------------------------------------------
// EDIT REQUESTS
// -------------------------------------------------------

/**
 * POST /api/attendance/edit-requests
 * Body: { attendanceId, reason }
 * Teacher requests to edit a locked attendance record.
 * Allowed: teacher
 */
const createEditRequest = async (req, res) => {
  try {
    const { attendanceId, reason } = req.body;

    if (!attendanceId) return res.status(400).json({ message: 'attendanceId is required' });
    if (!reason || !reason.trim()) return res.status(400).json({ message: 'reason is required' });

    const request = await AttendanceModel.createEditRequest(attendanceId, req.user.id, reason.trim());
    return res.status(201).json({ message: 'Edit request submitted successfully', request });
  } catch (err) {
    if (err.message.includes('pending edit request')) {
      return res.status(409).json({ message: err.message });
    }
    console.error('Create edit request error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/attendance/edit-requests
 * Query: status (pending|approved|rejected), page, limit
 * Allowed: admin, owner
 */
const listEditRequests = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await AttendanceModel.listEditRequests({ status, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    console.error('List edit requests error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/attendance/edit-requests/:requestId/approve
 * Admin approves the edit request — unlocks the attendance record.
 * Allowed: admin, owner
 */
const approveEditRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await AttendanceModel.approveEditRequest(requestId, req.user.id);
    return res.status(200).json({ message: 'Edit request approved. Attendance record is now editable.', request });
  } catch (err) {
    if (err.message.includes('not found or already reviewed')) {
      return res.status(404).json({ message: err.message });
    }
    console.error('Approve edit request error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PATCH /api/attendance/edit-requests/:requestId/reject
 * Admin rejects the edit request.
 * Allowed: admin, owner
 */
const rejectEditRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await AttendanceModel.rejectEditRequest(requestId, req.user.id);
    return res.status(200).json({ message: 'Edit request rejected', request });
  } catch (err) {
    if (err.message.includes('not found or already reviewed')) {
      return res.status(404).json({ message: err.message });
    }
    console.error('Reject edit request error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getMarkPage,
  submitAttendance,
  updateAttendance,
  getHistory,
  getDaySummary,
  getStudentSummary,
  createEditRequest,
  listEditRequests,
  approveEditRequest,
  rejectEditRequest,
};
