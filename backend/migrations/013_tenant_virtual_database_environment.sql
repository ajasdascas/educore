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
