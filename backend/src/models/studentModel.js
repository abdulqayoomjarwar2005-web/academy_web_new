const pool = require('../config/db');

const ALLOWED_STATUSES = ['active', 'inactive', 'graduated', 'suspended'];
const ALLOWED_SORT_COLUMNS = {
  student_id: 'student_id',
  roll_number: 'roll_number',
  student_name: 'student_name',
  class: 'class',
  batch: 'batch',
  admission_date: 'admission_date',
  monthly_fee: 'monthly_fee',
  status: 'status',
  created_at: 'created_at',
};

const StudentModel = {
  ALLOWED_STATUSES,

  /**
   * Generate the next human-friendly student ID (e.g. STU-00001).
   */
  async generateStudentId() {
    const result = await pool.query(`SELECT generate_student_id() AS student_id`);
    return result.rows[0].student_id;
  },

  /**
   * Create a new student record.
   */
  async create(data, createdBy) {
    const {
      rollNumber,
      studentName,
      fatherName,
      contactNumber,
      class: className,
      batch,
      admissionDate,
      monthlyFee,
      status = 'active',
    } = data;

    const studentId = await this.generateStudentId();

    const result = await pool.query(
      `INSERT INTO students
        (student_id, roll_number, student_name, father_name, contact_number,
         class, batch, admission_date, monthly_fee, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        studentId,
        rollNumber,
        studentName,
        fatherName,
        contactNumber,
        className,
        batch,
        admissionDate,
        monthlyFee,
        status,
        createdBy,
      ]
    );

    return result.rows[0];
  },

  /**
   * Find a student by their internal UUID.
   */
  async findById(id) {
    const result = await pool.query(`SELECT * FROM students WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find a student by their public student_id (e.g. STU-00001).
   */
  async findByStudentId(studentId) {
    const result = await pool.query(`SELECT * FROM students WHERE student_id = $1`, [studentId]);
    return result.rows[0] || null;
  },

  /**
   * Check whether roll_number is already used within the same class/batch
   * (excluding a given student id, useful for updates).
   */
  async existsByRollClassBatch(rollNumber, className, batch, excludeId = null) {
    const params = [rollNumber, className, batch];
    let query = `SELECT id FROM students WHERE roll_number = $1 AND class = $2 AND batch = $3`;

    if (excludeId) {
      params.push(excludeId);
      query += ` AND id != $4`;
    }

    const result = await pool.query(query, params);
    return result.rows.length > 0;
  },

  /**
   * List students with optional search, filters, sorting, and pagination.
   */
  async list({ search, class: className, batch, status, sortBy = 'created_at', sortDir = 'desc', page = 1, limit = 20 }) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(
        `(student_name ILIKE $${idx} OR father_name ILIKE $${idx} OR student_id ILIKE $${idx} OR roll_number ILIKE $${idx} OR contact_number ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    if (className) {
      conditions.push(`class = $${idx}`);
      params.push(className);
      idx++;
    }

    if (batch) {
      conditions.push(`batch = $${idx}`);
      params.push(batch);
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
      `SELECT COUNT(*) AS total FROM students ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataParams = [...params, safeLimit, offset];
    const dataResult = await pool.query(
      `SELECT * FROM students
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
   * Update a student record. Only provided fields are updated.
   */
  async update(id, data) {
    const fieldMap = {
      rollNumber: 'roll_number',
      studentName: 'student_name',
      fatherName: 'father_name',
      contactNumber: 'contact_number',
      class: 'class',
      batch: 'batch',
      admissionDate: 'admission_date',
      monthlyFee: 'monthly_fee',
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
      `UPDATE students SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    return result.rows[0] || null;
  },

  /**
   * Delete a student record by UUID.
   */
  async delete(id) {
    const result = await pool.query(`DELETE FROM students WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0] || null;
  },

  /**
   * Get distinct class and batch values for filter dropdowns.
   */
  async getDistinctClassesAndBatches() {
    const classesResult = await pool.query(
      `SELECT DISTINCT class FROM students ORDER BY class ASC`
    );
    const batchesResult = await pool.query(
      `SELECT DISTINCT batch FROM students ORDER BY batch ASC`
    );

    return {
      classes: classesResult.rows.map((r) => r.class),
      batches: batchesResult.rows.map((r) => r.batch),
    };
  },

  // -------------------------------------------------------
  // COUNTS — used by dashboards (Phase 10)
  // -------------------------------------------------------

  /**
   * Count active students (default) or all students.
   */
  async countActive(onlyActive = true) {
    const result = await pool.query(
      onlyActive
        ? `SELECT COUNT(*) AS total FROM students WHERE status = 'active'`
        : `SELECT COUNT(*) AS total FROM students`
    );
    return parseInt(result.rows[0].total, 10);
  },
};

module.exports = StudentModel;
