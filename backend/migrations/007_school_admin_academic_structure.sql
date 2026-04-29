-- Migration: 007_school_admin_academic_structure.sql
-- Estructura academica extendida para School Admin: ciclos, materias globales,
-- asignaciones de grupos y horarios.

CREATE TABLE IF NOT EXISTS school_years (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','active','closed','archived')),
    is_current  BOOLEAN NOT NULL DEFAULT false,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT school_years_dates_check CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_school_years_tenant ON school_years(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_years_current
    ON school_years(tenant_id)
    WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_school_years_name
    ON school_years(tenant_id, lower(name));

ALTER TABLE school_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_years_tenant_iso ON school_years;
CREATE POLICY school_years_tenant_iso ON school_years
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

ALTER TABLE subjects
    ALTER COLUMN grade_id DROP NOT NULL;

ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS credits INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','inactive')),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_tenant_code
    ON subjects(tenant_id, lower(COALESCE(code, '')))
    WHERE code IS NOT NULL AND code <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_subjects_tenant_name
    ON subjects(tenant_id, lower(name));

ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS school_year_id UUID REFERENCES school_years(id),
    ADD COLUMN IF NOT EXISTS room VARCHAR(50),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','inactive','archived'));

CREATE INDEX IF NOT EXISTS idx_groups_school_year ON groups(school_year_id);

CREATE TABLE IF NOT EXISTS group_subjects (
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_group_subjects_subject ON group_subjects(subject_id);

CREATE TABLE IF NOT EXISTS class_schedule_blocks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    subject_id  UUID REFERENCES subjects(id),
    teacher_id  UUID REFERENCES users(id),
    day         VARCHAR(20) NOT NULL CHECK (day IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL,
    room        VARCHAR(50),
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive')),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT class_schedule_time_check CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_class_schedule_tenant ON class_schedule_blocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_class_schedule_group_day ON class_schedule_blocks(group_id, day);
ALTER TABLE class_schedule_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS class_schedule_tenant_iso ON class_schedule_blocks;
CREATE POLICY class_schedule_tenant_iso ON class_schedule_blocks
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

DROP TRIGGER IF EXISTS update_school_years_updated_at ON school_years;
CREATE TRIGGER update_school_years_updated_at
    BEFORE UPDATE ON school_years
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_class_schedule_blocks_updated_at ON class_schedule_blocks;
CREATE TRIGGER update_class_schedule_blocks_updated_at
    BEFORE UPDATE ON class_schedule_blocks
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
