const TeacherClassModel = require('../models/teacherClassModel');

/**
 * Must run AFTER `authenticate`. If the logged-in user is a teacher,
 * attaches the list of classes they're allowed to work with as req.user.classes.
 * Other roles (owner, admin) are left untouched — they are not class-scoped.
 */
const attachTeacherClasses = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'teacher') {
      req.user.classes = await TeacherClassModel.getClassesForUser(req.user.id);
    }
    next();
  } catch (err) {
    console.error('Attach teacher classes error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = attachTeacherClasses;
