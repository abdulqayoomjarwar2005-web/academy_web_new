const pool = require('../config/db');

const ALLOWED_STATUSES = ['active', 'inactive', 'on_leave', 'terminated'];

const ALLOWED_SORT_COLUMNS = {
  teacher_id: 'teacher_id',
  teacher_name: 'teacher_name',
  subject: 'subject',
  salary: 'salary',
  joining_date: 'joining_date',
  status: 'status',
  created_at: 'created_at',
};

const TeacherModel = {
  ALLOWED_STATUSES,

  /**
   * Generate the next human-friendly teacher ID (e.g. TCH-00001).
   */
  async generateTeacherId() {
    const result = await pool.query(`SELECT generate_teacher_id() AS teacher_id`);
    return result.rows[0].teacher_id;
  },

  /**
   * Create a new teacher record.
   */
  async create(data, createdBy) {
    const {
      teacherName,
      contactNumber,
      subject,
      salary,
      joiningDate,
      status = 'active',
    } = data;

    const teacherId = await this.generateTeacherId();

    const result = await pool.query(
      `INSERT INTO teachers
        (teacher_id, teacher_name, contact_number, subject, salary, joining_date, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [teacherId, teacherName, contactNumber, subject, salary, joiningDate, status, createdBy]
    );

    return result.rows[0];
  },

  /**
   * Find a teacher by their internal UUID.
   */
  async findById(id) {
    const result = await pool.query(`SELECT * FROM teachers WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find a teacher by their public teacher_id (e.g. TCH-00001).
   */
  async findByTeacherId(teacherId) {
    const result = await pool.query(`SELECT * FROM teachers WHERE teacher_id = $1`, [teacherId]);
    return result.rows[0] || null;
  },

  /**
   * List teachers with optional search, filters, sorting, and pagination.
   */
  async list({ search, subject, status, sortBy = 'created_at', sortDir = 'desc', page = 1, limit = 20 }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(
        `(teacher_name ILIKE $${idx} OR teacher_id ILIKE $${idx} OR contact_number ILIKE $${idx} OR subject ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    if (subject) {
      conditions.push(`subject ILIKE $${idx}`);
      params.push(`%${subject}%`);
      idx++;
    }

    if (status) {
      conditions.push(`status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortColumn = ALLOWED_SORT_COLUMNS[sortBy] || 'created_at';
    const sortDirection = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM teachers ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataParams = [...params, safeLimit, offset];
    const dataResult = await pool.query(
      `SELECT * FROM teachers
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      dataParams
    );

    return {
      data: dataResult.rows,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  },

  /**
   * Update a teacher record. Only provided fields are updated.
   */
  async update(id, data) {
    const fieldMap = {
      teacherName: 'teacher_name',
      contactNumber: 'contact_number',
      subject: 'subject',
      salary: 'salary',
      joiningDate: 'joining_date',
      status: 'status',
    };

    const updates = [];
    const params = [];
    let idx = 1;

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updates.push(`${column} = $${idx}`);
        params.push(data[key]);
        idx++;
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const result = await pool.query(
      `UPDATE teachers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return result.rows[0] || null;
  },

  /**
   * Delete a teacher record by UUID.
   */
  async delete(id) {
    const result = await pool.query(`DELETE FROM teachers WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Get distinct subject values for filter dropdowns.
   */
  async getDistinctSubjects() {
    const result = await pool.query(
      `SELECT DISTINCT subject FROM teachers ORDER BY subject ASC`
    );
    return result.rows.map((r) => r.subject);
  },

  // -------------------------------------------------------
  // COUNTS — used by dashboards (Phase 10)
  // -------------------------------------------------------

  /**
   * Count active teachers (default) or all teachers.
   */
  async countActive(onlyActive = true) {
    const result = await pool.query(
      onlyActive
        ? `SELECT COUNT(*) AS total FROM teachers WHERE status = 'active'`
        : `SELECT COUNT(*) AS total FROM teachers`
    );
    return parseInt(result.rows[0].total, 10);
  },
};

module.exports = TeacherModel;
