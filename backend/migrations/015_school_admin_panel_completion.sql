-- migrate:up

-- School Admin production completion: safer attendance states, document categories,
-- report-card/document indexes, and audit-friendly metadata.

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'attendance_records'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%present%'
      AND pg_get_constraintdef(oid) LIKE '%excused%'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE attendance_records DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE attendance_records
    ALTER COLUMN status TYPE VARCHAR(20);

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('present','absent','late','sick','excused'));

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'school_documents'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%report_card%'
      AND pg_get_constraintdef(oid) LIKE '%receipt%'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE school_documents DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE school_documents
    ADD CONSTRAINT school_documents_category_check
    CHECK (category IN (
        'general','homework','report_card','circular','medical','consent','receipt',
        'enrollment','identification','academic_history','other'
    ));

ALTER TABLE school_documents
    ADD COLUMN IF NOT EXISTS storage_status VARCHAR(24) NOT NULL DEFAULT 'digital_only',
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id);

ALTER TABLE school_documents
    DROP CONSTRAINT IF EXISTS school_documents_storage_status_check;

ALTER TABLE school_documents
    ADD CONSTRAINT school_documents_storage_status_check
    CHECK (storage_status IN ('physical_only','digital_only','both'));

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS observations JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_attendance_tenant_group_date
    ON attendance_records(tenant_id, group_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_grades_tenant_student_period
    ON grade_records(tenant_id, student_id, period);

CREATE INDEX IF NOT EXISTS idx_school_documents_tenant_student_status
    ON school_documents(tenant_id, student_id, status, created_at DESC);

-- migrate:down

DROP INDEX IF EXISTS idx_school_documents_tenant_student_status;
DROP INDEX IF EXISTS idx_grades_tenant_student_period;
DROP INDEX IF EXISTS idx_attendance_tenant_group_date;

ALTER TABLE students
    DROP COLUMN IF EXISTS observations;

ALTER TABLE school_documents
    DROP CONSTRAINT IF EXISTS school_documents_storage_status_check;

ALTER TABLE school_documents
    DROP COLUMN IF EXISTS verified_by,
    DROP COLUMN IF EXISTS verified_at,
    DROP COLUMN IF EXISTS is_verified,
    DROP COLUMN IF EXISTS storage_status;

ALTER TABLE school_documents
    DROP CONSTRAINT IF EXISTS school_documents_category_check;

ALTER TABLE attendance_records
    DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE attendance_records
    ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('present','absent','late','excused'));
