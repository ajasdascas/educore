# SKILL: Database — PostgreSQL + RLS
# Lee esto ANTES de crear migraciones o queries

## SCHEMA COMPLETO CON RLS

```sql
-- ═══════════════════════════════════════
-- INFRAESTRUCTURA MULTI-TENANT
-- ═══════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsqueda por texto

-- TABLA MAESTRA DE TENANTS (sin RLS — accesible globalmente)
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(100) UNIQUE NOT NULL,    -- colegio-la-paz
    name        VARCHAR(255) NOT NULL,
    logo_url    TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'trial'
                CHECK (status IN ('active','trial','suspended','cancelled')),
    plan        VARCHAR(20) NOT NULL DEFAULT 'starter'
                CHECK (plan IN ('starter','pro','enterprise')),
    settings    JSONB NOT NULL DEFAULT '{}',
    trial_ends_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FEATURE FLAGS POR TENANT
CREATE TABLE tenant_modules (
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_key   VARCHAR(50) NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ,
    PRIMARY KEY (tenant_id, module_key)
);

-- ═══════════════════════════════════════
-- USUARIOS (con RLS)
-- ═══════════════════════════════════════

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL para SUPER_ADMIN
    email               VARCHAR(255) NOT NULL,
    password_hash       TEXT,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    role                VARCHAR(20) NOT NULL
                        CHECK (role IN ('SUPER_ADMIN','SCHOOL_ADMIN','TEACHER','PARENT')),
    avatar_url          TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT true,
    email_verified_at   TIMESTAMPTZ,
    invitation_token    TEXT,
    invitation_expires  TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_users_email ON users(email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_iso ON users
    USING (
        tenant_id IS NULL  -- SUPER_ADMIN es visible globalmente
        OR tenant_id = current_setting('app.current_tenant', true)::UUID
    );

-- ═══════════════════════════════════════
-- ESTRUCTURA ACADÉMICA (con RLS en todas)
-- ═══════════════════════════════════════

CREATE TABLE grade_levels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,   -- "1er Grado"
    level       VARCHAR(50) NOT NULL,    -- "primaria"
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_grade_levels_tenant ON grade_levels(tenant_id);
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY grade_levels_tenant_iso ON grade_levels
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE TABLE groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grade_id    UUID NOT NULL REFERENCES grade_levels(id),
    name        VARCHAR(10) NOT NULL,    -- "A", "B"
    school_year VARCHAR(10) NOT NULL,    -- "2024-2025"
    capacity    INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_groups_tenant ON groups(tenant_id);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY groups_tenant_iso ON groups
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE TABLE subjects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grade_id    UUID NOT NULL REFERENCES grade_levels(id),
    name        VARCHAR(100) NOT NULL,   -- "Matemáticas"
    code        VARCHAR(20),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subjects_tenant ON subjects(tenant_id);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY subjects_tenant_iso ON subjects
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ═══════════════════════════════════════
-- ALUMNOS Y PADRES (con RLS)
-- ═══════════════════════════════════════

CREATE TABLE students (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    enrollment_number   VARCHAR(50),
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    birth_date          DATE,
    gender              CHAR(1) CHECK (gender IN ('M','F','O')),
    photo_url           TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive','graduated','withdrawn')),
    notes               TEXT,
    enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_students_tenant ON students(tenant_id);
CREATE INDEX idx_students_name ON students USING gin(
    (first_name || ' ' || last_name) gin_trgm_ops
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_tenant_iso ON students
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE TABLE teacher_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    employee_id     VARCHAR(50),
    specialization  VARCHAR(100),
    phone           VARCHAR(20)
);

CREATE TABLE parent_student (
    parent_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship    VARCHAR(20) NOT NULL CHECK (relationship IN ('mother','father','guardian','other')),
    is_primary      BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (parent_id, student_id)
);
CREATE INDEX idx_parent_student_parent ON parent_student(parent_id);
CREATE INDEX idx_parent_student_student ON parent_student(student_id);

-- Relaciones grupo-alumno y grupo-profesor
CREATE TABLE group_students (
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, student_id)
);

CREATE TABLE group_teachers (
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id  UUID REFERENCES subjects(id)
);
CREATE UNIQUE INDEX idx_group_teachers_unique ON group_teachers (
    group_id, 
    teacher_id, 
    COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::UUID)
);

-- ═══════════════════════════════════════
-- OPERACIÓN DIARIA (con RLS)
-- ═══════════════════════════════════════

CREATE TABLE attendance_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id    UUID NOT NULL REFERENCES groups(id),
    date        DATE NOT NULL,
    status      VARCHAR(10) NOT NULL CHECK (status IN ('present','absent','late','excused')),
    recorded_by UUID NOT NULL REFERENCES users(id),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, group_id, date)  -- 1 registro por alumno por día
);
CREATE INDEX idx_attendance_tenant ON attendance_records(tenant_id);
CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, date);
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_tenant_iso ON attendance_records
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE TABLE grade_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id  UUID NOT NULL REFERENCES subjects(id),
    group_id    UUID NOT NULL REFERENCES groups(id),
    period      VARCHAR(50) NOT NULL,   -- "1er Bimestre"
    school_year VARCHAR(10) NOT NULL,
    score       NUMERIC(5,2),
    recorded_by UUID NOT NULL REFERENCES users(id),
    published_at TIMESTAMPTZ,          -- NULL = borrador, NOT NULL = publicado
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, subject_id, period, school_year)
);
CREATE INDEX idx_grades_tenant ON grade_records(tenant_id);
CREATE INDEX idx_grades_student ON grade_records(student_id);
ALTER TABLE grade_records ENABLE ROW LEVEL SECURITY;
-- Padres solo ven calificaciones publicadas
CREATE POLICY grades_tenant_iso ON grade_records
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

-- ═══════════════════════════════════════
-- NOTIFICACIONES (con RLS)
-- ═══════════════════════════════════════

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(30) NOT NULL CHECK (type IN ('absence','grade_published','announcement','system')),
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    data        JSONB NOT NULL DEFAULT '{}',
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_tenant_iso ON notifications
    USING (tenant_id = current_setting('app.current_tenant', true)::UUID);
```

## FUNCIÓN HELPER PARA UPDATED_AT

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplica a todas las tablas que tienen updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users','tenants','students','groups','grade_levels',
                              'subjects','attendance_records','grade_records'] LOOP
        EXECUTE format('CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()', t, t);
    END LOOP;
END $$;
```
