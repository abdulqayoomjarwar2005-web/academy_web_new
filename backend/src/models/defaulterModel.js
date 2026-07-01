const pool = require('../config/db');

const DefaulterModel = {

  // -------------------------------------------------------
  // LIST DEFAULTERS (filterable + paginated)
  // -------------------------------------------------------
  /**
   * Returns all active students with at least one unpaid/partial
   * fee record, with optional filters and pagination.
   *
   * @param {object} opts
   * @param {string}  [opts.class]       - Filter by class
   * @param {string}  [opts.batch]       - Filter by batch
   * @param {string}  [opts.month]       - YYYY-MM — only students due for THIS month
   * @param {string}  [opts.search]      - Name / student-code / father-name search
   * @param {string}  [opts.sortBy]      - outstanding_balance | due_months_count | student_name | oldest_due_month
   * @param {string}  [opts.sortDir]     - asc | desc
   * @param {number}  [opts.page]
   * @param {number}  [opts.limit]
   */
  async listDefaulters({
    class: className,
    batch,
    month,
    search,
    sortBy = 'outstanding_balance',
    sortDir = 'desc',
    page = 1,
    limit = 25,
  } = {}) {
    const conditions = [`f.status IN ('unpaid', 'partial')`, `s.status = 'active'`];
    const params = [];
    let idx = 1;

    if (className) {
      conditions.push(`s.class = $${idx}`);
      params.push(className);
      idx++;
    }

    if (batch) {
      conditions.push(`s.batch = $${idx}`);
      params.push(batch);
      idx++;
    }

    if (month) {
      // Only students who have an unpaid record for THIS specific month
      conditions.push(`TO_CHAR(f.fee_month, 'YYYY-MM') = $${idx}`);
      params.push(month);
      idx++;
    }

    if (search) {
      conditions.push(
        `(s.student_name ILIKE $${idx} OR s.student_id ILIKE $${idx} OR s.father_name ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const ALLOWED_SORT = {
      outstanding_balance: 'outstanding_balance',
      due_months_count:    'due_months_count',
      student_name:        's.student_name',
      oldest_due_month:    'oldest_due_month',
    };

    const sortColumn   = ALLOWED_SORT[sortBy] || 'outstanding_balance';
    const sortDirection = sortDir.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const safePage  = Math.max(parseInt(page, 10) || 1, 1);
    const offset    = (safePage - 1) * safeLimit;

    const baseQuery = `
      FROM students s
      JOIN fees f ON f.student_id = s.id
      ${whereClause}
    `;

    // Count distinct defaulting students
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT s.id) AS total ${baseQuery}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataParams = [...params, safeLimit, offset];
    const dataResult = await pool.query(
      `SELECT
         s.id                                        AS student_id,
         s.student_id                                AS student_code,
         s.student_name,
         s.father_name,
         s.class,
         s.batch,
         s.contact_number,
         s.monthly_fee,

         COUNT(f.id)                                 AS due_months_count,
         MIN(f.fee_month)                            AS oldest_due_month,
         MAX(f.fee_month)                            AS latest_due_month,

         COALESCE(SUM(f.amount), 0)                  AS total_billed,
         COALESCE(SUM(f.amount_paid), 0)             AS total_paid_partial,
         COALESCE(SUM(f.amount - f.amount_paid), 0)  AS outstanding_balance,

         ARRAY_AGG(
           TO_CHAR(f.fee_month, 'Mon YYYY')
           ORDER BY f.fee_month ASC
         )                                           AS due_month_labels,

         COUNT(f.id) FILTER (WHERE f.status = 'unpaid')  AS unpaid_count,
         COUNT(f.id) FILTER (WHERE f.status = 'partial') AS partial_count

       ${baseQuery}
       GROUP BY s.id, s.student_id, s.student_name, s.father_name,
                s.class, s.batch, s.contact_number, s.monthly_fee
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

  // -------------------------------------------------------
  // SUMMARY STATS for the KPI cards
  // -------------------------------------------------------
  /**
   * Returns aggregate defaulter stats, with optional class/batch filters.
   */
  async getSummaryStats({ class: className, batch, month } = {}) {
    const conditions = [`f.status IN ('unpaid', 'partial')`, `s.status = 'active'`];
    const params = [];
    let idx = 1;

    if (className) {
      conditions.push(`s.class = $${idx}`);
      params.push(className);
      idx++;
    }
    if (batch) {
      conditions.push(`s.batch = $${idx}`);
      params.push(batch);
      idx++;
    }
    if (month) {
      conditions.push(`TO_CHAR(f.fee_month, 'YYYY-MM') = $${idx}`);
      params.push(month);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT s.id)                          AS total_defaulters,
         COALESCE(SUM(f.amount - f.amount_paid), 0)    AS total_outstanding,
         COUNT(f.id)                                   AS total_due_records,
         COUNT(f.id) FILTER (WHERE f.status = 'unpaid')  AS unpaid_records,
         COUNT(f.id) FILTER (WHERE f.status = 'partial') AS partial_records
       FROM students s
       JOIN fees f ON f.student_id = s.id
       ${whereClause}`,
      params
    );

    const row = result.rows[0];
    return {
      totalDefaulters:   parseInt(row.total_defaulters   || 0, 10),
      totalOutstanding:  parseFloat(row.total_outstanding  || 0),
      totalDueRecords:   parseInt(row.total_due_records   || 0, 10),
      unpaidRecords:     parseInt(row.unpaid_records      || 0, 10),
      partialRecords:    parseInt(row.partial_records     || 0, 10),
    };
  },

  // -------------------------------------------------------
  // FILTER OPTIONS — distinct classes & batches
  // -------------------------------------------------------
  async getFilterOptions() {
    const result = await pool.query(
      `SELECT DISTINCT s.class, s.batch
       FROM students s
       JOIN fees f ON f.student_id = s.id
       WHERE f.status IN ('unpaid', 'partial')
         AND s.status = 'active'
       ORDER BY s.class, s.batch`
    );

    const classes = [...new Set(result.rows.map((r) => r.class).filter(Boolean))];
    const batches = [...new Set(result.rows.map((r) => r.batch).filter(Boolean))];

    return { classes, batches };
  },
};

module.exports = DefaulterModel;
