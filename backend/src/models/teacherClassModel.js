const pool = require('../config/db');

const TeacherClassModel = {
  /**
   * Replace the full set of classes assigned to a teacher's user account.
   * Pass an empty array to unassign everything.
   */
  async setClasses(userId, classes, assignedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM teacher_class_assignments WHERE user_id = $1`, [userId]);

      const uniqueClasses = [...new Set((classes || []).filter((c) => c && c.trim()))];

      if (uniqueClasses.length > 0) {
        const values = [];
        const params = [];
        let idx = 1;
        for (const cls of uniqueClasses) {
          values.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
          params.push(userId, cls, assignedBy);
          idx += 3;
        }

        await client.query(
          `INSERT INTO teacher_class_assignments (user_id, class, assigned_by)
           VALUES ${values.join(', ')}`,
          params
        );
      }

      await client.query('COMMIT');
      return uniqueClasses;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get the list of classes assigned to a teacher's user account.
   */
  async getClassesForUser(userId) {
    const result = await pool.query(
      `SELECT class FROM teacher_class_assignments WHERE user_id = $1 ORDER BY class ASC`,
      [userId]
    );
    return result.rows.map((r) => r.class);
  },

  /**
   * Get the teacher user accounts assigned to a given class.
   */
  async getTeachersForClass(className) {
    const result = await pool.query(
      `SELECT u.id, u.full_name, u.email
       FROM teacher_class_assignments tca
       JOIN users u ON u.id = tca.user_id
       WHERE tca.class = $1`,
      [className]
    );
    return result.rows;
  },
};

module.exports = TeacherClassModel;
