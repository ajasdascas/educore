-- EduCore — esquema Postgres consolidado (generado 2026-07-21)
-- Aplicar UNA sola vez en una base Postgres NUEVA (Neon SQL Editor).

-- ================= 001_initial.sql =================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(100) UNIQUE NOT NULL,
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

CREATE TABLE tenant_modules (
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_key   VARCHAR(50) NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT true,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ,
    PRIMARY KEY (tenant_id, module_key)
);

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
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
CREATE POLICY users_tenant_iso ON users USING (tenant_id IS NULL OR tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE TABLE grade_levels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    level       VARCHAR(50) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_grade_levels_tenant ON grade_levels(tenant_id);
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY grade_levels_tenant_iso ON grade_levels USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE TABLE groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grade_id    UUID NOT NULL REFERENCES grade_levels(id),
    name        VARCHAR(10) NOT NULL,
    school_year VARCHAR(10) NOT NULL,
    capacity    INT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_groups_tenant ON groups(tenant_id);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY groups_tenant_iso ON groups USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE TABLE subjects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    grade_id    UUID NOT NULL REFERENCES grade_levels(id),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subjects_tenant ON subjects(tenant_id);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY subjects_tenant_iso ON subjects USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

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
CREATE INDEX idx_students_name ON students USING gin((first_name || ' ' || last_name) gin_trgm_ops);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_tenant_iso ON students USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

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

CREATE TABLE group_students (
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, student_id)
);

CREATE TABLE group_teachers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    teacher_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id  UUID REFERENCES subjects(id)
);
CREATE UNIQUE INDEX uq_group_teachers ON group_teachers (group_id, teacher_id, COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::UUID));

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
    UNIQUE (student_id, group_id, date)
);
CREATE INDEX idx_attendance_tenant ON attendance_records(tenant_id);
CREATE INDEX idx_attendance_student_date ON attendance_records(student_id, date);
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_tenant_iso ON attendance_records USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE TABLE grade_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id  UUID NOT NULL REFERENCES subjects(id),
    group_id    UUID NOT NULL REFERENCES groups(id),
    period      VARCHAR(50) NOT NULL,
    school_year VARCHAR(10) NOT NULL,
    score       NUMERIC(5,2),
    recorded_by UUID NOT NULL REFERENCES users(id),
    published_at TIMESTAMPTZ,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, subject_id, period, school_year)
);
CREATE INDEX idx_grades_tenant ON grade_records(tenant_id);
CREATE INDEX idx_grades_student ON grade_records(student_id);
ALTER TABLE grade_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY grades_tenant_iso ON grade_records USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

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
CREATE POLICY notifications_tenant_iso ON notifications USING (tenant_id = current_setting('app.current_tenant', true)::UUID);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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


-- ================= 002_add_modules_settings.sql =================
-- EduCore MVP — Schema Update for educore_dev
-- Run this AFTER the initial 001_up.sql migration

-- Add missing tables and columns

-- modules_catalog (if not exists)
CREATE TABLE IF NOT EXISTS modules_catalog (
  key VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_core BOOLEAN DEFAULT FALSE,
  price_monthly_mxn DECIMAL(10,2) DEFAULT 0
);

INSERT INTO modules_catalog (key, name, is_core, price_monthly_mxn) VALUES
  ('academic_core', 'Académico Básico', TRUE, 0),
  ('parent_portal', 'Portal de Padres', TRUE, 0),
  ('teacher_portal', 'Portal de Profesores', TRUE, 0),
  ('communication', 'Mensajería y Comunicación', TRUE, 0),
  ('payments_basic', 'Pagos y Colegiaturas', TRUE, 0),
  ('cafeteria', 'Cafetería y Saldo Recargable', FALSE, 8),
  ('transport', 'Transporte Escolar', FALSE, 10),
  ('uniforms_store', 'Tienda de Uniformes', FALSE, 1500),
  ('events', 'Eventos y Talleres', FALSE, 500),
  ('qr_checkin', 'Check-in/out con QR', FALSE, 500),
  ('behavior', 'Reportes de Comportamiento', FALSE, 500),
  ('ai_reports', 'Reportes con IA', FALSE, 2000),
  ('cfdi', 'Facturación CFDI', FALSE, 1500)
ON CONFLICT (key) DO NOTHING;

-- school_settings (if not exists)
CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  school_year VARCHAR(20),
  periods JSONB DEFAULT '[]',
  grading_scale JSONB DEFAULT '{"min":0,"max":10,"passing":6}',
  primary_color VARCHAR(7) DEFAULT '#1A3C6E',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_settings_tenant_iso ON school_settings;
CREATE POLICY school_settings_tenant_iso ON school_settings
  USING (tenant_id = current_setting('app.current_tenant', TRUE)::UUID
         OR current_setting('app.current_tenant', TRUE) = '');

-- Add last_login_at to users if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add invitation_expires_at alias
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;

-- ================= 004_infrastructure_tables.sql =================
-- Migration 004: Infrastructure tables for sessions, email, audit
-- Adds support for session management, email queue, invitations, and audit logging

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    device_info VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Email Queue Table
CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    is_html BOOLEAN DEFAULT true,
    email_type VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Invitations Table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT')),
    token VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_id ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_email_type ON email_queue(email_type);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
CREATE POLICY user_sessions_tenant_iso ON user_sessions
    USING (
        tenant_id IS NULL OR
        tenant_id = current_setting('app.current_tenant', true)::UUID
    );

-- RLS Policies for email_queue (system table, no tenant isolation needed)
CREATE POLICY email_queue_all ON email_queue
    USING (true);

-- RLS Policies for invitations
CREATE POLICY invitations_tenant_iso ON invitations
    USING (
        tenant_id IS NULL OR
        tenant_id = current_setting('app.current_tenant', true)::UUID
    );

-- RLS Policies for audit_logs
CREATE POLICY audit_logs_tenant_iso ON audit_logs
    USING (
        tenant_id IS NULL OR
        tenant_id = current_setting('app.current_tenant', true)::UUID
    );

-- Functions for cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE user_sessions
    SET is_active = false
    WHERE expires_at <= NOW() AND is_active = true;

    DELETE FROM user_sessions
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    DELETE FROM invitations
    WHERE expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;
-- ================= 005_subscription_plans.sql =================
-- Migration: 005_subscription_plans.sql
-- Description: Crea la tabla de planes de suscripción para gestionar los planes (Básico, Pro, etc.)

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    price_annual DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    max_students INT NOT NULL DEFAULT 0, -- 0 = Ilimitado
    max_teachers INT NOT NULL DEFAULT 0, -- 0 = Ilimitado
    modules JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lista de module_keys (ej. ["parent_portal", "reports"])
    features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Lista de bullets de texto para mostrar en frontend
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Seed de planes iniciales por defecto
INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, max_students, max_teachers, modules, features, is_active, is_featured)
VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'Básico', 
    'Plan ideal para escuelas pequeñas o de un solo nivel.', 
    999.00, 
    9990.00, 
    100, 
    10, 
    '["academic_management", "attendance", "grades", "communications"]'::jsonb, 
    '["Hasta 100 alumnos", "Gestión académica básica", "Control de asistencia", "Boletas de calificaciones", "Comunicados generales"]'::jsonb,
    true, 
    false
) ON CONFLICT DO NOTHING;

INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, max_students, max_teachers, modules, features, is_active, is_featured)
VALUES 
(
    '00000000-0000-0000-0000-000000000002',
    'Profesional', 
    'Nuestro plan más popular para colegios con requerimientos completos.', 
    2499.00, 
    24990.00, 
    500, 
    50, 
    '["academic_management", "attendance", "grades", "communications", "parent_portal", "reports"]'::jsonb, 
    '["Hasta 500 alumnos", "Todo lo del plan Básico", "Portal para Padres de Familia", "Reportes y estadísticas", "Soporte prioritario"]'::jsonb,
    true, 
    true
) ON CONFLICT DO NOTHING;

INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, max_students, max_teachers, modules, features, is_active, is_featured)
VALUES 
(
    '00000000-0000-0000-0000-000000000003',
    'Enterprise', 
    'Para colegios grandes con múltiples campus o necesidades avanzadas.', 
    5999.00, 
    59990.00, 
    0, 
    0, 
    '["academic_management", "attendance", "grades", "communications", "parent_portal", "reports", "payments", "access_control"]'::jsonb, 
    '["Alumnos ilimitados", "Profesores ilimitados", "Todo lo del plan Profesional", "Módulo de pagos en línea", "Control de acceso", "Soporte 24/7"]'::jsonb,
    true, 
    false
) ON CONFLICT DO NOTHING;

-- ================= 006_alter_tenants_plan.sql =================
-- Migration: 006_alter_tenants_plan.sql

-- Eliminar el constraint CHECK de la columna plan
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;

-- Cambiar la columna plan a UUID y establecer la referencia
-- Como ya hay datos con 'starter', etc., primero creamos una nueva columna, migramos y eliminamos la vieja, o simplemente cambiamos el tipo.
-- Para simplificar y mantener la integridad, vamos a cambiarla a VARCHAR(100) para permitir IDs o nombres,
-- pero idealmente debería ser un UUID.
-- Vamos a permitir cualquier texto por ahora para no romper los mocks existentes.
ALTER TABLE tenants ALTER COLUMN plan TYPE VARCHAR(100);

-- ================= 007_school_admin_academic_structure.sql =================
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

-- ================= 008_students_parents_history_imports.sql =================
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

-- ================= 009_modular_core_activation.sql =================
-- EduCore modular core activation.
-- Additive migration: extends tenant_modules and seeds core module contracts.

ALTER TABLE tenant_modules
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE tenant_modules
SET enabled = is_active
WHERE enabled IS NULL;

ALTER TABLE tenant_modules
  ALTER COLUMN enabled SET DEFAULT true,
  ALTER COLUMN enabled SET NOT NULL;

INSERT INTO modules_catalog (key, name, description, is_core, price_monthly_mxn) VALUES
  ('users', 'Usuarios', 'Alumnos, padres, docentes y personal administrativo.', true, 0),
  ('students', 'Alumnos', 'Expedientes, inscripciones, padres vinculados e historial academico.', true, 0),
  ('attendance', 'Asistencias', 'Registro diario, asistencia por grupo y reportes mensuales.', true, 0),
  ('grades', 'Calificaciones', 'Captura de evaluaciones, promedios y boletas.', true, 0),
  ('reports', 'Reportes', 'Indicadores academicos, operativos y exportaciones.', true, 0),
  ('communications', 'Comunicaciones', 'Avisos, mensajes, notificaciones y comunicados.', true, 0),
  ('groups', 'Grupos', 'Organizacion de grupos, asignaciones y generaciones.', true, 0),
  ('schedules', 'Horarios', 'Constructor y visor de horarios por grupo, profesor y materia.', true, 0)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = EXCLUDED.is_core,
  price_monthly_mxn = EXCLUDED.price_monthly_mxn;

INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, is_required, source, created_at, updated_at)
SELECT t.id, mc.key, true, true, true, 'core', NOW(), NOW()
FROM tenants t
CROSS JOIN modules_catalog mc
WHERE mc.is_core = true
ON CONFLICT (tenant_id, module_key)
DO UPDATE SET
  is_active = true,
  enabled = true,
  is_required = true,
  source = CASE WHEN tenant_modules.source = 'manual' THEN 'core' ELSE tenant_modules.source END,
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_tenant_modules_tenant_active
  ON tenant_modules (tenant_id, module_key)
  WHERE is_active = true;

ALTER TABLE tenant_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_modules_tenant_iso ON tenant_modules;
CREATE POLICY tenant_modules_tenant_iso ON tenant_modules
  USING (NULLIF(current_setting('app.current_tenant', TRUE), '') IS NULL
         OR tenant_id = NULLIF(current_setting('app.current_tenant', TRUE), '')::UUID);

-- ================= 010_superadmin_enterprise_control_plane.sql =================
-- EduCore SuperAdmin Enterprise Control Plane.
-- Additive migration: SaaS operations, billing, health, support and feature flags.

ALTER TABLE modules_catalog
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS version VARCHAR(30) NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required_level VARCHAR(50),
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS global_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE tenant_modules
  ADD COLUMN IF NOT EXISTS submodule_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS override_source VARCHAR(30),
  ADD COLUMN IF NOT EXISTS plan_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER NOT NULL DEFAULT 5120;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER NOT NULL DEFAULT 5120,
  ADD COLUMN IF NOT EXISTS trial_days INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS module_key VARCHAR(80),
  ADD COLUMN IF NOT EXISTS acting_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmation_text TEXT,
  ADD COLUMN IF NOT EXISTS request_id VARCHAR(120);

CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(120) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  category VARCHAR(40) NOT NULL DEFAULT 'general',
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key VARCHAR(120) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feature_flag_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(120) NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  level VARCHAR(50),
  plan VARCHAR(100),
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(flag_key, tenant_id, level, plan)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'trial',
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_students INTEGER NOT NULL DEFAULT 0,
  max_teachers INTEGER NOT NULL DEFAULT 0,
  storage_limit_mb INTEGER NOT NULL DEFAULT 5120,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  canceled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  folio VARCHAR(80) UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
  method VARCHAR(40) NOT NULL DEFAULT 'transfer',
  reference VARCHAR(160),
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  title VARCHAR(220) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'open',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  module_key VARCHAR(80),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS support_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(40) NOT NULL,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS storage_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  module_key VARCHAR(80),
  used_mb DECIMAL(12,2) NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS module_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(80) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  status VARCHAR(30) NOT NULL DEFAULT 'healthy',
  message TEXT NOT NULL DEFAULT '',
  error_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS module_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(80) NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  active_users INTEGER NOT NULL DEFAULT 0,
  event_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acting_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'full',
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  size_mb DECIMAL(12,2) NOT NULL DEFAULT 0,
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(60) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'current',
  changelog TEXT NOT NULL DEFAULT '',
  deployed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS system_deploy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID REFERENCES system_versions(id) ON DELETE SET NULL,
  action VARCHAR(40) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmation_text TEXT,
  logs TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_storage_usage_tenant ON storage_usage_snapshots(tenant_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_health_key ON module_health_events(module_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_module_usage_key ON module_usage_snapshots(module_key, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_active ON impersonation_sessions(acting_user_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_created ON backup_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_superadmin ON audit_logs(created_at DESC, module_key, severity);

INSERT INTO platform_settings (key, category, value) VALUES
  ('general', 'general', '{"platform_name":"EduCore","default_language":"es-MX","timezone":"America/Mexico_City","maintenance_mode":false}'::jsonb),
  ('security', 'security', '{"password_min_length":8,"session_timeout_minutes":120,"require_2fa":false,"max_sessions":5}'::jsonb),
  ('email', 'email', '{"provider":"manual","from_email":"soporte@educore.mx","templates_enabled":true}'::jsonb),
  ('api', 'api', '{"rate_limit_per_minute":120,"api_keys_enabled":false}'::jsonb),
  ('integrations', 'integrations', '{"twilio":false,"sendgrid":false,"stripe":false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage) VALUES
  ('superadmin_impersonation', 'Impersonation Mode', 'Permite al SuperAdmin entrar temporalmente como otro usuario con auditoria.', true, 100),
  ('health_monitor', 'Health Monitor', 'Monitoreo de salud por modulo.', true, 100),
  ('usage_scoring', 'Usage Scoring', 'Score de riesgo de churn por institucion.', true, 100)
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_versions (version, status, changelog)
SELECT '1.0.0-superadmin-enterprise', 'current', 'SuperAdmin Enterprise Control Plane inicial.'
WHERE NOT EXISTS (SELECT 1 FROM system_versions WHERE status = 'current');

-- ================= 011_parent_portal_messages_events.sql =================
-- Migration: 011_parent_portal_messages_events.sql
-- Completa el Portal de Padres con mensajes, eventos, tareas y columnas
-- compatibles para perfil/notificaciones sin borrar datos existentes.

ALTER TABLE parent_student
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

UPDATE parent_student ps
SET tenant_id = s.tenant_id
FROM students s
WHERE ps.student_id = s.id
  AND ps.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_parent_student_tenant ON parent_student(tenant_id);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255),
    ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(30),
    ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low','normal','medium','high','urgent')),
    ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS related_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS action_url TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE notifications
SET message = COALESCE(message, body),
    is_read = COALESCE(is_read, read_at IS NOT NULL),
    metadata = COALESCE(NULLIF(metadata, '{}'::jsonb), data, '{}'::jsonb)
WHERE message IS NULL
   OR metadata = '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(related_student_id);

CREATE TABLE IF NOT EXISTS parent_conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject       VARCHAR(200) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','closed','archived')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_conversations_parent ON parent_conversations(parent_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_conversations_recipient ON parent_conversations(recipient_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_conversations_tenant ON parent_conversations(tenant_id);

ALTER TABLE parent_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_conversations_tenant_iso ON parent_conversations;
CREATE POLICY parent_conversations_tenant_iso ON parent_conversations
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS parent_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id     UUID NOT NULL REFERENCES parent_conversations(id) ON DELETE CASCADE,
    sender_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject             VARCHAR(200) NOT NULL,
    content             TEXT NOT NULL,
    priority            VARCHAR(20) NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low','normal','medium','high','urgent')),
    parent_message_id   UUID REFERENCES parent_messages(id) ON DELETE SET NULL,
    has_attachments     BOOLEAN NOT NULL DEFAULT false,
    read_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_messages_conversation ON parent_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_messages_user ON parent_messages(recipient_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_messages_tenant ON parent_messages(tenant_id);

ALTER TABLE parent_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_messages_tenant_iso ON parent_messages;
CREATE POLICY parent_messages_tenant_iso ON parent_messages
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS school_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    type          VARCHAR(50) NOT NULL DEFAULT 'event',
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    start_time    TIME,
    end_time      TIME,
    location      VARCHAR(255),
    is_all_day    BOOLEAN NOT NULL DEFAULT false,
    is_recurring  BOOLEAN NOT NULL DEFAULT false,
    student_id    UUID REFERENCES students(id) ON DELETE SET NULL,
    group_id      UUID REFERENCES groups(id) ON DELETE SET NULL,
    category      VARCHAR(50) NOT NULL DEFAULT 'school',
    priority      VARCHAR(20) NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low','normal','medium','high','urgent')),
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT school_events_dates_check CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_school_events_tenant_date ON school_events(tenant_id, start_date);
CREATE INDEX IF NOT EXISTS idx_school_events_student ON school_events(student_id);
CREATE INDEX IF NOT EXISTS idx_school_events_group ON school_events(group_id);

ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_events_tenant_iso ON school_events;
CREATE POLICY school_events_tenant_iso ON school_events
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS student_assignments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id    UUID REFERENCES students(id) ON DELETE CASCADE,
    group_id      UUID REFERENCES groups(id) ON DELETE SET NULL,
    subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    type          VARCHAR(50) NOT NULL DEFAULT 'homework',
    due_date      DATE NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','submitted','graded','overdue','cancelled')),
    grade         NUMERIC(5,2),
    max_grade     NUMERIC(5,2) NOT NULL DEFAULT 100,
    priority      VARCHAR(20) NOT NULL DEFAULT 'normal'
                  CHECK (priority IN ('low','normal','medium','high','urgent')),
    submitted_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_assignments_tenant ON student_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_assignments_student ON student_assignments(student_id, due_date);
CREATE INDEX IF NOT EXISTS idx_student_assignments_group ON student_assignments(group_id, due_date);

ALTER TABLE student_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_assignments_tenant_iso ON student_assignments;
CREATE POLICY student_assignments_tenant_iso ON student_assignments
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

DROP TRIGGER IF EXISTS update_parent_conversations_updated_at ON parent_conversations;
CREATE TRIGGER update_parent_conversations_updated_at
    BEFORE UPDATE ON parent_conversations
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_school_events_updated_at ON school_events;
CREATE TRIGGER update_school_events_updated_at
    BEFORE UPDATE ON school_events
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_assignments_updated_at ON student_assignments;
CREATE TRIGGER update_student_assignments_updated_at
    BEFORE UPDATE ON student_assignments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ================= 012_database_admin_control_panel.sql =================
-- Database Admin Control Panel metadata
-- Non-destructive: stores UI/state/audit metadata for SuperAdmin database operations.

CREATE TABLE IF NOT EXISTS database_admin_table_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(128) NOT NULL UNIQUE,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS database_admin_operation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(120) NOT NULL,
    table_name VARCHAR(128),
    row_id UUID,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_database_admin_table_states_table_name
    ON database_admin_table_states(table_name);

CREATE INDEX IF NOT EXISTS idx_database_admin_operation_logs_table_name
    ON database_admin_operation_logs(table_name);

CREATE INDEX IF NOT EXISTS idx_database_admin_operation_logs_created_at
    ON database_admin_operation_logs(created_at DESC);

-- ================= 013_tenant_virtual_database_environment.sql =================
-- Migration: 013_tenant_virtual_database_environment.sql
-- Tenant-scoped virtual database environment for School Admin.

ALTER TABLE students
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE school_years
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE grade_levels
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE groups
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE class_schedule_blocks
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE attendance_records
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE grade_records
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE student_academic_history
    ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS tenant_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key         VARCHAR(50) NOT NULL,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, key)
);

CREATE TABLE IF NOT EXISTS tenant_custom_fields (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_name  VARCHAR(100) NOT NULL,
    field_key   VARCHAR(100) NOT NULL,
    label       VARCHAR(150) NOT NULL,
    field_type  VARCHAR(30) NOT NULL DEFAULT 'text'
                CHECK (field_type IN ('text','number','date','boolean','select','email','phone')),
    required    BOOLEAN NOT NULL DEFAULT false,
    options     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, table_name, field_key)
);

CREATE TABLE IF NOT EXISTS tenant_custom_tables (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_key     VARCHAR(100) NOT NULL,
    name          VARCHAR(150) NOT NULL,
    description   TEXT,
    schema        JSONB NOT NULL DEFAULT '[]'::jsonb,
    tenant_scoped BOOLEAN NOT NULL DEFAULT true,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_by    UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, table_key)
);

CREATE TABLE IF NOT EXISTS tenant_custom_rows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    custom_table_id UUID NOT NULL REFERENCES tenant_custom_tables(id) ON DELETE CASCADE,
    data            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by      UUID REFERENCES users(id),
    updated_by      UUID REFERENCES users(id),
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_database_operation_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(80) NOT NULL,
    table_name  VARCHAR(100) NOT NULL,
    row_id      TEXT,
    details     JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant ON tenant_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_custom_fields_tenant_table ON tenant_custom_fields(tenant_id, table_name);
CREATE INDEX IF NOT EXISTS idx_tenant_custom_tables_tenant ON tenant_custom_tables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_custom_rows_tenant_table ON tenant_custom_rows(tenant_id, custom_table_id);
CREATE INDEX IF NOT EXISTS idx_tenant_database_logs_tenant ON tenant_database_operation_logs(tenant_id, created_at DESC);

ALTER TABLE tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_custom_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_custom_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_database_operation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_roles_iso ON tenant_roles;
CREATE POLICY tenant_roles_iso ON tenant_roles
    USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL
           OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS tenant_custom_fields_iso ON tenant_custom_fields;
CREATE POLICY tenant_custom_fields_iso ON tenant_custom_fields
    USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL
           OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS tenant_custom_tables_iso ON tenant_custom_tables;
CREATE POLICY tenant_custom_tables_iso ON tenant_custom_tables
    USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL
           OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS tenant_custom_rows_iso ON tenant_custom_rows;
CREATE POLICY tenant_custom_rows_iso ON tenant_custom_rows
    USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL
           OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS tenant_database_operation_logs_iso ON tenant_database_operation_logs;
CREATE POLICY tenant_database_operation_logs_iso ON tenant_database_operation_logs
    USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL
           OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP TRIGGER IF EXISTS update_tenant_roles_updated_at ON tenant_roles;
CREATE TRIGGER update_tenant_roles_updated_at
    BEFORE UPDATE ON tenant_roles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_custom_fields_updated_at ON tenant_custom_fields;
CREATE TRIGGER update_tenant_custom_fields_updated_at
    BEFORE UPDATE ON tenant_custom_fields
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_custom_tables_updated_at ON tenant_custom_tables;
CREATE TRIGGER update_tenant_custom_tables_updated_at
    BEFORE UPDATE ON tenant_custom_tables
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenant_custom_rows_updated_at ON tenant_custom_rows;
CREATE TRIGGER update_tenant_custom_rows_updated_at
    BEFORE UPDATE ON tenant_custom_rows
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

INSERT INTO tenant_roles (tenant_id, key, name, description, permissions, is_system)
SELECT t.id, role.key, role.name, role.description, role.permissions::jsonb, true
FROM tenants t
CROSS JOIN (
    VALUES
    ('admin', 'Administrador', 'Control operativo de la escuela', '["users:*","academic:*","database:tenant"]'),
    ('teacher', 'Profesor', 'Gestion docente y captura academica', '["groups:read","attendance:write","grades:write"]'),
    ('parent', 'Padre/Tutor', 'Consulta de hijos y comunicacion escolar', '["children:read","messages:write"]'),
    ('student', 'Alumno', 'Consulta de informacion academica propia', '["profile:read","grades:read"]')
) AS role(key, name, description, permissions)
ON CONFLICT (tenant_id, key) DO NOTHING;

-- ================= 014_parent_teacher_portal_completion.sql =================
-- Migration: 014_parent_teacher_portal_completion.sql
-- Completa flujos Padres/Profesores con documentos, pagos, consentimientos
-- y auditoria tenant-scoped sin crear modulos tenant-facing nuevos.

CREATE TABLE IF NOT EXISTS school_documents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id    UUID REFERENCES students(id) ON DELETE CASCADE,
    group_id      UUID REFERENCES groups(id) ON DELETE SET NULL,
    uploaded_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    category      VARCHAR(50) NOT NULL DEFAULT 'general'
                  CHECK (category IN ('general','homework','report_card','circular','medical','consent','receipt')),
    file_name     VARCHAR(255),
    file_url      TEXT,
    file_size     BIGINT NOT NULL DEFAULT 0,
    mime_type     VARCHAR(120),
    audience      VARCHAR(30) NOT NULL DEFAULT 'parents'
                  CHECK (audience IN ('parents','teachers','staff','all')),
    status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','archived','deleted')),
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_documents_tenant ON school_documents(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_documents_student ON school_documents(student_id, category);
CREATE INDEX IF NOT EXISTS idx_school_documents_group ON school_documents(group_id);

ALTER TABLE school_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS school_documents_tenant_iso ON school_documents;
CREATE POLICY school_documents_tenant_iso ON school_documents
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS student_payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept        VARCHAR(255) NOT NULL,
    description    TEXT,
    amount         NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency       VARCHAR(3) NOT NULL DEFAULT 'MXN',
    due_date       DATE NOT NULL,
    paid_at        TIMESTAMPTZ,
    payment_method VARCHAR(50),
    receipt_number VARCHAR(100),
    receipt_url    TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','overdue','cancelled','partial')),
    created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_payments_tenant ON student_payments(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_student_payments_student ON student_payments(student_id, due_date DESC);

ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS student_payments_tenant_iso ON student_payments;
CREATE POLICY student_payments_tenant_iso ON student_payments
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS parent_consents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT NOT NULL,
    category      VARCHAR(50) NOT NULL DEFAULT 'activity'
                  CHECK (category IN ('activity','medical','image_rights','transport','privacy','other')),
    due_date      DATE,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
    signed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    signed_at     TIMESTAMPTZ,
    signature_ip  INET,
    notes         TEXT,
    metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at    TIMESTAMPTZ,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_consents_tenant ON parent_consents(tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_parent_consents_student ON parent_consents(student_id, status);

ALTER TABLE parent_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_consents_tenant_iso ON parent_consents;
CREATE POLICY parent_consents_tenant_iso ON parent_consents
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

CREATE TABLE IF NOT EXISTS parent_teacher_audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role  VARCHAR(30) NOT NULL,
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(100) NOT NULL,
    resource_id UUID,
    metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parent_teacher_audit_tenant ON parent_teacher_audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_teacher_audit_actor ON parent_teacher_audit_logs(actor_id, created_at DESC);

ALTER TABLE parent_teacher_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parent_teacher_audit_tenant_iso ON parent_teacher_audit_logs;
CREATE POLICY parent_teacher_audit_tenant_iso ON parent_teacher_audit_logs
    USING (
        tenant_id = current_setting('app.current_tenant', true)::UUID
        OR current_setting('app.current_tenant', true) = ''
    );

DROP TRIGGER IF EXISTS update_school_documents_updated_at ON school_documents;
CREATE TRIGGER update_school_documents_updated_at
    BEFORE UPDATE ON school_documents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_payments_updated_at ON student_payments;
CREATE TRIGGER update_student_payments_updated_at
    BEFORE UPDATE ON student_payments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_parent_consents_updated_at ON parent_consents;
CREATE TRIGGER update_parent_consents_updated_at
    BEFORE UPDATE ON parent_consents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ================= 015_school_admin_panel_completion.sql =================

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


-- ================= 016_modular_saas_catalog_and_plans.sql =================
-- EduCore modular SaaS catalog and monetization alignment.
-- This migration does not create tenant-facing features; it classifies existing
-- capabilities so SuperAdmin can package, sell and gate them per tenant.

ALTER TABLE modules_catalog
  ADD COLUMN IF NOT EXISTS category VARCHAR(60) NOT NULL DEFAULT 'extension';

CREATE TABLE IF NOT EXISTS module_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(80) UNIQUE NOT NULL,
  name VARCHAR(140) NOT NULL,
  description TEXT,
  category VARCHAR(60) NOT NULL DEFAULT 'addon',
  price_monthly_mxn DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS module_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key VARCHAR(80) NOT NULL REFERENCES module_packages(key) ON DELETE CASCADE,
  module_key VARCHAR(80) NOT NULL REFERENCES modules_catalog(key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(package_key, module_key)
);

INSERT INTO modules_catalog
  (key, name, description, is_core, price_monthly_mxn, status, version, dependencies, global_enabled, metadata, category)
VALUES
  ('auth', 'Auth + Tenant + RBAC', 'Login, sesiones, roles, permisos y tenant context.', true, 0, 'active', '1.0.0', '[]'::jsonb, true, '{"layer":"core"}'::jsonb, 'core'),
  ('users', 'Usuarios', 'Personas unificadas: alumnos, padres, docentes y staff.', true, 0, 'active', '1.0.0', '["auth"]'::jsonb, true, '{"layer":"core"}'::jsonb, 'core'),
  ('academic_core', 'Academic Core', 'Ciclos, grados, grupos, materias, inscripciones e historial.', true, 0, 'active', '1.0.0', '["auth","users"]'::jsonb, true, '{"layer":"core"}'::jsonb, 'core'),
  ('grading', 'Grading System', 'Calificaciones, promedios, evaluaciones y comentarios.', true, 0, 'active', '1.0.0', '["academic_core"]'::jsonb, true, '{"layer":"core"}'::jsonb, 'core'),
  ('schedules', 'Horarios', 'Agenda semanal por grupo, profesor, salon y materia.', false, 249, 'active', '1.0.0', '["academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'academic_extension'),
  ('attendance', 'Asistencias', 'Registro rapido, ausencias, retardos y alertas.', false, 299, 'active', '1.0.0', '["academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'academic_extension'),
  ('documents', 'Expedientes digitales', 'PDF/JPG/PNG por alumno con preview y verificacion.', false, 349, 'active', '1.0.0', '["users"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'operations'),
  ('report_cards', 'Boletas', 'Preview y export de boletas con calificaciones y asistencia.', false, 299, 'active', '1.0.0', '["grading","attendance"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'grading_extension'),
  ('communications', 'Comunicaciones', 'Avisos, mensajes y notificaciones por segmento.', false, 249, 'active', '1.0.0', '["users"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'operations'),
  ('parent_portal', 'Portal de Padres', 'Hijos, asistencia, calificaciones, pagos, documentos y mensajes.', false, 399, 'active', '1.0.0', '["users","academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'portal'),
  ('teacher_portal', 'Portal de Profesores', 'Clases, asistencia, calificaciones y mensajes docentes.', false, 399, 'active', '1.0.0', '["users","academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'portal'),
  ('payments', 'Pagos y cobranza escolar', 'Adeudos, recibos, recordatorios y reportes de cobranza.', false, 499, 'active', '0.9.0', '["users"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'monetization'),
  ('qr_access', 'QR acceso y salida', 'Entrada, salida y pickup auditado por QR.', false, 449, 'planned', '0.8.0', '["users"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'operations'),
  ('credentials', 'Credenciales', 'Credenciales imprimibles con foto, logo y QR.', false, 299, 'planned', '0.8.0', '["users","qr_access"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'operations'),
  ('workshops', 'Talleres', 'Catalogo, inscripcion, horarios, asistencia y cobros de talleres.', false, 399, 'planned', '0.8.0', '["academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'academic_extension'),
  ('analytics', 'Analytics', 'Indicadores operativos, academic risk y uso por modulo.', false, 499, 'active', '0.9.0', '["academic_core"]'::jsonb, true, '{"layer":"extension"}'::jsonb, 'analytics'),
  ('database_admin', 'Database Admin', 'Herramienta interna SuperAdmin para inspeccion/export/import.', false, 0, 'active', '1.0.0', '[]'::jsonb, true, '{"layer":"internal","internal":true}'::jsonb, 'internal')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = EXCLUDED.is_core,
  price_monthly_mxn = EXCLUDED.price_monthly_mxn,
  status = EXCLUDED.status,
  version = EXCLUDED.version,
  dependencies = EXCLUDED.dependencies,
  global_enabled = EXCLUDED.global_enabled,
  metadata = modules_catalog.metadata || EXCLUDED.metadata,
  category = EXCLUDED.category,
  updated_at = NOW();

INSERT INTO module_packages (key, name, description, category, price_monthly_mxn, metadata)
VALUES
  ('core_basic', 'Core Basic', 'Base obligatoria para operar una escuela.', 'plan_bundle', 0, '{"plan":"basic"}'::jsonb),
  ('academic_pro', 'Academic Pro', 'Asistencia, horarios, expedientes, boletas y portales.', 'plan_bundle', 1199, '{"plan":"professional"}'::jsonb),
  ('operations_enterprise', 'Operations Enterprise', 'Pagos, QR, credenciales, talleres y analytics.', 'addon_bundle', 1699, '{"plan":"enterprise"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_monthly_mxn = EXCLUDED.price_monthly_mxn,
  metadata = EXCLUDED.metadata,
  updated_at = NOW(),
  deleted_at = NULL;

INSERT INTO module_package_items (package_key, module_key)
VALUES
  ('core_basic', 'auth'),
  ('core_basic', 'users'),
  ('core_basic', 'academic_core'),
  ('core_basic', 'grading'),
  ('academic_pro', 'schedules'),
  ('academic_pro', 'attendance'),
  ('academic_pro', 'documents'),
  ('academic_pro', 'report_cards'),
  ('academic_pro', 'communications'),
  ('academic_pro', 'parent_portal'),
  ('academic_pro', 'teacher_portal'),
  ('operations_enterprise', 'payments'),
  ('operations_enterprise', 'qr_access'),
  ('operations_enterprise', 'credentials'),
  ('operations_enterprise', 'workshops'),
  ('operations_enterprise', 'analytics')
ON CONFLICT (package_key, module_key) DO NOTHING;

UPDATE subscription_plans
SET modules = '["auth","users","academic_core","grading"]'::jsonb,
    features = '["Auth + RBAC","Usuarios y alumnos","Nucleo academico","Calificaciones base","Soporte por email"]'::jsonb,
    storage_limit_mb = COALESCE(storage_limit_mb, 5120),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE subscription_plans
SET modules = '["auth","users","academic_core","grading","schedules","attendance","documents","report_cards","communications","parent_portal","teacher_portal"]'::jsonb,
    features = '["Todo Basic","Asistencia rapida","Horarios","Boletas","Expedientes digitales","Portal de padres"]'::jsonb,
    storage_limit_mb = COALESCE(storage_limit_mb, 10240),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000002';

UPDATE subscription_plans
SET modules = '["auth","users","academic_core","grading","schedules","attendance","documents","report_cards","communications","parent_portal","teacher_portal","payments","qr_access","credentials","workshops","analytics"]'::jsonb,
    features = '["Alumnos ilimitados","Todos los modulos vendibles","SLA empresarial","Integraciones a medida","Acompanamiento dedicado"]'::jsonb,
    storage_limit_mb = COALESCE(storage_limit_mb, 51200),
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000003';


-- ================= 017_payments_security_hardening.sql =================
-- Migration: 017_payments_security_hardening.sql
-- Endurece cobranza escolar: folios unicos y RLS sin fallback abierto.

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_payments_receipt_unique
    ON student_payments(receipt_number)
    WHERE receipt_number IS NOT NULL AND receipt_number <> '';

DROP POLICY IF EXISTS student_payments_tenant_iso ON student_payments;
CREATE POLICY student_payments_tenant_iso ON student_payments
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS school_documents_tenant_iso ON school_documents;
CREATE POLICY school_documents_tenant_iso ON school_documents
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS parent_consents_tenant_iso ON parent_consents;
CREATE POLICY parent_consents_tenant_iso ON parent_consents
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS parent_teacher_audit_tenant_iso ON parent_teacher_audit_logs;
CREATE POLICY parent_teacher_audit_tenant_iso ON parent_teacher_audit_logs
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

-- ================= 018_owner_super_admins_hardening.sql =================
-- Migration 018: Owner Super Admin hardening
-- Adds password reset posture and prevents duplicate global SuperAdmin emails.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_global_email
  ON users (LOWER(email))
  WHERE tenant_id IS NULL;

-- ================= 019_school_communications_reports.sql =================
-- 019: School Communications and Reports tables

CREATE TABLE IF NOT EXISTS school_communications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL,
    type            VARCHAR(50) NOT NULL DEFAULT 'announcement',
    priority        VARCHAR(20) NOT NULL DEFAULT 'normal',
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    recipient_type  VARCHAR(20) NOT NULL DEFAULT 'role',
    recipient_id    VARCHAR(100) NOT NULL DEFAULT 'parents',
    recipient_label VARCHAR(100) NOT NULL DEFAULT 'Padres',
    channels        JSON NOT NULL DEFAULT '["email"]',
    total_recipients INT NOT NULL DEFAULT 0,
    delivered_count INT NOT NULL DEFAULT 0,
    read_count      INT NOT NULL DEFAULT 0,
    created_by      UUID REFERENCES users(id),
    scheduled_for   TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_school_comm_tenant ON school_communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_school_comm_status ON school_communications(tenant_id, status);

CREATE TABLE IF NOT EXISTS school_reports (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    type         VARCHAR(50) NOT NULL DEFAULT 'academic_summary',
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    format       VARCHAR(20) NOT NULL DEFAULT 'pdf',
    group_id     VARCHAR(100),
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    generated_by UUID REFERENCES users(id),
    summary      JSON NOT NULL DEFAULT '{}',
    insights     JSON NOT NULL DEFAULT '[]',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_school_reports_tenant ON school_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_school_reports_status ON school_reports(tenant_id, status);

