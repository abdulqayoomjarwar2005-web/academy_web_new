-- =========================================================
-- Nation Builders Institute of Learning Larkana - Complete Schema (All Phases)
-- Run this file once to set up the entire database.
-- =========================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- PHASE 1: Users, Roles, Authentication
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (name)
VALUES ('owner'), ('admin'), ('teacher')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- PHASE 2: Student Management
-- =========================================================

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(30) UNIQUE NOT NULL,
    roll_number VARCHAR(30) NOT NULL,
    student_name VARCHAR(150) NOT NULL,
    father_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    class VARCHAR(50) NOT NULL,
    batch VARCHAR(50) NOT NULL,
    admission_date DATE NOT NULL,
    monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_student_status CHECK (status IN ('active', 'inactive', 'graduated', 'suspended'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_roll_class_batch
    ON students(roll_number, class, batch);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS student_id_seq START 1;

CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TEXT AS $$
DECLARE
    next_val INTEGER;
BEGIN
    next_val := nextval('student_id_seq');
    RETURN 'STU-' || LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- PHASE 3: Teacher Management
-- =========================================================

CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id VARCHAR(30) UNIQUE NOT NULL,
    teacher_name VARCHAR(150) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
    joining_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_teacher_status CHECK (status IN ('active', 'inactive', 'on_leave', 'terminated'))
);

CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers(teacher_name);
CREATE INDEX IF NOT EXISTS idx_teachers_subject ON teachers(subject);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

DROP TRIGGER IF EXISTS trg_teachers_updated_at ON teachers;
CREATE TRIGGER trg_teachers_updated_at
BEFORE UPDATE ON teachers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS teacher_id_seq START 1;

CREATE OR REPLACE FUNCTION generate_teacher_id()
RETURNS TEXT AS $$
DECLARE
    next_val INTEGER;
BEGIN
    next_val := nextval('teacher_id_seq');
    RETURN 'TCH-' || LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- PHASE 4: Attendance Management
-- =========================================================

CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id),
    attendance_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'present',
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_attendance_status CHECK (status IN ('present', 'absent', 'leave')),
    CONSTRAINT uq_attendance_student_date UNIQUE (student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher ON attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_locked ON attendance(is_locked);

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON attendance;
CREATE TRIGGER trg_attendance_updated_at
BEFORE UPDATE ON attendance
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS attendance_edit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_edit_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_edit_requests_attendance ON attendance_edit_requests(attendance_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON attendance_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_edit_requests_teacher ON attendance_edit_requests(requested_by);

DROP TRIGGER IF EXISTS trg_edit_requests_updated_at ON attendance_edit_requests;
CREATE TRIGGER trg_edit_requests_updated_at
BEFORE UPDATE ON attendance_edit_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- PHASE 5: Attendance Reports (Views)
-- =========================================================

CREATE OR REPLACE VIEW daily_attendance_report AS
SELECT
    a.attendance_date,
    COUNT(*)                                AS total_students,
    COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
    COUNT(*) FILTER (WHERE a.status = 'absent')  AS absent_count,
    COUNT(*) FILTER (WHERE a.status = 'leave')   AS leave_count,
    ROUND(
        COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC
        / NULLIF(COUNT(*), 0) * 100,
        2
    ) AS attendance_percentage
FROM attendance a
GROUP BY a.attendance_date
ORDER BY a.attendance_date DESC;

CREATE INDEX IF NOT EXISTS idx_attendance_month
    ON attendance (DATE_TRUNC('month', attendance_date));

-- =========================================================
-- PHASE 6: Fee Management
-- =========================================================

CREATE TABLE IF NOT EXISTS fees (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_month        DATE NOT NULL,
    amount           NUMERIC(10, 2) NOT NULL DEFAULT 0,
    amount_paid      NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status           VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    paid_at          TIMESTAMP WITH TIME ZONE,
    due_date         DATE,
    receipt_number   VARCHAR(50) UNIQUE,
    created_by       UUID REFERENCES users(id),
    updated_by       UUID REFERENCES users(id),
    notes            TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_fee_status CHECK (status IN ('unpaid', 'paid', 'partial', 'waived')),
    CONSTRAINT chk_fee_amount CHECK (amount >= 0),
    CONSTRAINT chk_fee_amount_paid CHECK (amount_paid >= 0),
    CONSTRAINT uq_fee_student_month UNIQUE (student_id, fee_month)
);

CREATE INDEX IF NOT EXISTS idx_fees_student    ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_month      ON fees(fee_month);
CREATE INDEX IF NOT EXISTS idx_fees_status     ON fees(status);
CREATE INDEX IF NOT EXISTS idx_fees_paid_at    ON fees(paid_at);
CREATE INDEX IF NOT EXISTS idx_fees_receipt    ON fees(receipt_number);

DROP TRIGGER IF EXISTS trg_fees_updated_at ON fees;
CREATE TRIGGER trg_fees_updated_at
BEFORE UPDATE ON fees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    next_val INTEGER;
BEGIN
    next_val := nextval('receipt_number_seq');
    RETURN 'RCP-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW fee_summary_per_student AS
SELECT
    s.id                              AS student_id,
    s.student_id                      AS student_code,
    s.student_name,
    s.father_name,
    s.class,
    s.batch,
    s.monthly_fee,
    s.status                          AS student_status,
    COUNT(f.id)                        AS total_months,
    COUNT(f.id) FILTER (WHERE f.status = 'paid')    AS paid_months,
    COUNT(f.id) FILTER (WHERE f.status = 'unpaid')  AS unpaid_months,
    COUNT(f.id) FILTER (WHERE f.status = 'partial') AS partial_months,
    COUNT(f.id) FILTER (WHERE f.status = 'waived')  AS waived_months,
    COALESCE(SUM(f.amount),       0)   AS total_billed,
    COALESCE(SUM(f.amount_paid),  0)   AS total_paid,
    COALESCE(SUM(f.amount) FILTER (WHERE f.status IN ('unpaid', 'partial')), 0) AS total_due,
    COALESCE(SUM(f.amount - f.amount_paid) FILTER (WHERE f.status IN ('unpaid', 'partial')), 0) AS outstanding_balance
FROM students s
LEFT JOIN fees f ON f.student_id = s.id
GROUP BY s.id, s.student_id, s.student_name, s.father_name, s.class, s.batch, s.monthly_fee, s.status;

-- =========================================================
-- PHASE 7: Fee Defaulters (Views)
-- =========================================================

CREATE OR REPLACE VIEW fee_defaulters AS
SELECT
    s.id                                    AS student_id,
    s.student_id                            AS student_code,
    s.student_name,
    s.father_name,
    s.class,
    s.batch,
    s.contact_number,
    s.monthly_fee,
    s.status                                AS student_status,
    COUNT(f.id)                             AS due_months_count,
    MIN(f.fee_month)                        AS oldest_due_month,
    MAX(f.fee_month)                        AS latest_due_month,
    COALESCE(SUM(f.amount), 0)              AS total_billed,
    COALESCE(SUM(f.amount_paid), 0)         AS total_paid_partial,
    COALESCE(SUM(f.amount - f.amount_paid), 0) AS outstanding_balance,
    ARRAY_AGG(TO_CHAR(f.fee_month, 'Mon YYYY') ORDER BY f.fee_month ASC) AS due_month_labels,
    COUNT(f.id) FILTER (WHERE f.status = 'unpaid')  AS unpaid_count,
    COUNT(f.id) FILTER (WHERE f.status = 'partial') AS partial_count
FROM students s
JOIN fees f ON f.student_id = s.id
WHERE f.status IN ('unpaid', 'partial')
  AND s.status = 'active'
GROUP BY s.id, s.student_id, s.student_name, s.father_name, s.class, s.batch, s.contact_number, s.monthly_fee, s.status;

CREATE OR REPLACE VIEW defaulter_summary_stats AS
SELECT
    COUNT(DISTINCT student_id)             AS total_defaulters,
    COALESCE(SUM(outstanding_balance), 0)  AS total_outstanding,
    COALESCE(AVG(outstanding_balance), 0)  AS avg_outstanding_per_defaulter,
    COALESCE(MAX(due_months_count), 0)     AS max_due_months,
    COALESCE(AVG(due_months_count), 0)     AS avg_due_months
FROM fee_defaulters;

-- =========================================================
-- PHASE 8: Expense Management
-- =========================================================

CREATE TABLE IF NOT EXISTS expenses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date     DATE NOT NULL,
    category         VARCHAR(20) NOT NULL,
    description      TEXT,
    amount           NUMERIC(10, 2) NOT NULL,
    created_by       UUID REFERENCES users(id),
    updated_by       UUID REFERENCES users(id),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_expense_category CHECK (
        category IN ('rent', 'electricity', 'internet', 'salaries', 'maintenance', 'other')
    ),
    CONSTRAINT chk_expense_amount CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE VIEW expense_summary_by_category AS
SELECT
    category,
    COUNT(*)                AS record_count,
    COALESCE(SUM(amount), 0) AS total_amount
FROM expenses
GROUP BY category;

CREATE OR REPLACE VIEW expense_summary_stats AS
SELECT
    COALESCE(SUM(amount) FILTER (WHERE expense_date >= CURRENT_DATE AND expense_date < CURRENT_DATE + INTERVAL '1 day'), 0) AS today_total,
    COALESCE(SUM(amount) FILTER (WHERE expense_date >= DATE_TRUNC('week', CURRENT_DATE)), 0) AS weekly_total,
    COALESCE(SUM(amount) FILTER (WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS monthly_total,
    COALESCE(SUM(amount) FILTER (WHERE expense_date >= DATE_TRUNC('year', CURRENT_DATE)), 0) AS yearly_total,
    COALESCE(SUM(amount), 0) AS all_time_total,
    COUNT(*) AS total_records
FROM expenses;

-- =========================================================
-- PHASE 9: Profit & Loss (Views)
-- =========================================================

CREATE OR REPLACE VIEW monthly_collections AS
SELECT
    TO_CHAR(paid_at, 'YYYY-MM') AS month,
    COALESCE(SUM(amount_paid), 0) AS total_collection
FROM fees
WHERE paid_at IS NOT NULL
GROUP BY TO_CHAR(paid_at, 'YYYY-MM');

CREATE OR REPLACE VIEW monthly_expenses AS
SELECT
    TO_CHAR(expense_date, 'YYYY-MM') AS month,
    COALESCE(SUM(amount), 0) AS total_expenses
FROM expenses
GROUP BY TO_CHAR(expense_date, 'YYYY-MM');

CREATE OR REPLACE VIEW pnl_monthly AS
SELECT
    COALESCE(c.month, e.month) AS month,
    COALESCE(c.total_collection, 0) AS total_collection,
    COALESCE(e.total_expenses, 0) AS total_expenses,
    COALESCE(c.total_collection, 0) - COALESCE(e.total_expenses, 0) AS profit
FROM monthly_collections c
FULL OUTER JOIN monthly_expenses e ON c.month = e.month;

CREATE OR REPLACE VIEW yearly_collections AS
SELECT
    TO_CHAR(paid_at, 'YYYY') AS year,
    COALESCE(SUM(amount_paid), 0) AS total_collection
FROM fees
WHERE paid_at IS NOT NULL
GROUP BY TO_CHAR(paid_at, 'YYYY');

CREATE OR REPLACE VIEW yearly_expenses AS
SELECT
    TO_CHAR(expense_date, 'YYYY') AS year,
    COALESCE(SUM(amount), 0) AS total_expenses
FROM expenses
GROUP BY TO_CHAR(expense_date, 'YYYY');

CREATE OR REPLACE VIEW pnl_yearly AS
SELECT
    COALESCE(c.year, e.year) AS year,
    COALESCE(c.total_collection, 0) AS total_collection,
    COALESCE(e.total_expenses, 0) AS total_expenses,
    COALESCE(c.total_collection, 0) - COALESCE(e.total_expenses, 0) AS profit
FROM yearly_collections c
FULL OUTER JOIN yearly_expenses e ON c.year = e.year;

-- =========================================================
-- PHASE 12: Audit Log
-- (audit_logs table is created via auditModel.createTable() at startup)
-- =========================================================

-- =========================================================
-- PHASE 13: Notifications
-- (notifications table is created via notificationModel.createTable() at startup)
-- =========================================================

-- =========================================================
-- Seed: Default Owner Account
-- Run: node src/config/seed.js to create the first owner.
-- =========================================================
-- INSERT INTO users (full_name, email, password_hash, role_id, must_change_password)
-- VALUES ('System Owner', 'owner@nbil.edu', '<bcrypt_hash_here>', 1, TRUE);
