-- Migration: 008_students_parents_history_imports.sql
-- Expande expedientes de alumnos con apellidos separados, fecha por partes,
-- multiples padres/tutores, historial academico e importaciones masivas.

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS paternal_last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS maternal_last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS birth_day INT CHECK (birth_day BETWEEN 1 AND 31),
    ADD COLUMN IF NOT EXISTS birth_month INT CHECK (birth_month BETWEEN 1 AND 12),
    ADD COLUMN IF NOT EXISTS birth_year INT CHECK (birth_year BETWEEN 1900 AND 2100),
    ADD COLUMN IF NOT EXISTS import_source TEXT;

UPDATE students
SET paternal_last_name = COALESCE(paternal_last_name, NULLIF(split_part(last_name, ' ', 1), '')),
    maternal_last_name = COALESCE(maternal_last_name, NULLIF(regexp_replace(last_name, '^[^ ]+ ?', ''), '')),
    birth_day = COALESCE(birth_day, EXTRACT(DAY FROM birth_date)::INT),
    birth_month = COALESCE(birth_month, EXTRACT(MONTH FROM birth_date)::INT),
    birth_year = COALESCE(birth_year, EXTRACT(YEAR FROM birth_date)::INT)
WHERE paternal_last_name IS NULL
   OR maternal_last_name IS NULL
   OR birth_day IS NULL
   OR birth_month IS NULL
   OR birth_year IS NULL;

ALTER TABLE parent_student
    ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS student_academic_history (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_year_id   UUID REFERENCES school_years(id),
    school_year      VARCHAR(100) NOT NULL,
    grade_name       VARCHAR(100),
    group_name       VARCHAR(100),
    status           VARCHAR(30) NOT NULL DEFAULT 'active',
    average_grade    NUMERIC(5,2) NOT NULL DEFAULT 0,
    attendance_rate  NUMERIC(5,2) NOT NULL DEFAULT 0,
    absences         INT NOT NULL DEFAULT 0,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_academic_history_tenant ON student_academic_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_history_student ON student_academic_history(student_id);
CREATE INDEX IF NOT EXISTS idx_student_academic_history_year ON student_academic_history(school_year_id);

ALTER TABLE student_academic_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_academic_history_tenant_iso ON student_academic_history;
CREATE POLICY student_academic_history_tenant_iso ON student_academic_history
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS import_batches (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type           VARCHAR(50) NOT NULL,
    source_sheet   VARCHAR(255),
    mapping        JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_rows     INT NOT NULL DEFAULT 0,
    imported_rows  INT NOT NULL DEFAULT 0,
    error_rows     INT NOT NULL DEFAULT 0,
    created_by     UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_tenant ON import_batches(tenant_id);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS import_batches_tenant_iso ON import_batches;
CREATE POLICY import_batches_tenant_iso ON import_batches
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

DROP TRIGGER IF EXISTS update_student_academic_history_updated_at ON student_academic_history;
CREATE TRIGGER update_student_academic_history_updated_at
    BEFORE UPDATE ON student_academic_history
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
