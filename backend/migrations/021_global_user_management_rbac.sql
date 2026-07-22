-- Migration 021: Global user management and tenant RBAC hardening.
-- Additive/idempotent. It does not overwrite permissions already customized.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tenant_roles
  ADD COLUMN IF NOT EXISTS policy_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT')) NOT VALID;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_scope_check;

-- NOT VALID preserves legacy rows for audit while enforcing the invariant for
-- every new or modified row. Legacy violations can then be repaired explicitly.
ALTER TABLE users
  ADD CONSTRAINT users_role_scope_check
  CHECK (
    (role = 'SUPER_ADMIN' AND tenant_id IS NULL)
    OR
    (role <> 'SUPER_ADMIN' AND tenant_id IS NOT NULL)
  ) NOT VALID;

INSERT INTO tenant_roles (tenant_id, key, name, description, permissions, is_system, policy_version)
SELECT t.id, role.key, role.name, role.description, role.permissions::jsonb, true, 2
FROM tenants t
CROSS JOIN (
  VALUES
    ('admin', 'Director / Administrador', 'Administración operativa de la escuela.', '["dashboard:read","modules:read","users:*","academic:*","groups:read","groups:write","schedule:read","schedule:write","attendance:read","attendance:write","grades:read","grades:write","documents:read","documents:write","communications:read","communications:write","notifications:read","notifications:write","reports:read","reports:write","payments:read","payments:write","settings:*","database:tenant"]'),
    ('teacher', 'Profesor', 'Gestión docente limitada a grupos y alumnos asignados.', '["dashboard:read","groups:read","schedule:read","attendance:read","attendance:write","grades:read","grades:write","communications:read","communications:write","notifications:read","notifications:write","reports:read","reports:write"]'),
    ('parent', 'Padre / Tutor', 'Consulta de estudiantes vinculados y comunicación escolar.', '["dashboard:read","children:read","grades:read","attendance:read","schedule:read","assignments:read","payments:read","messages:read","messages:write","notifications:read","notifications:write","events:read","documents:read","consents:read","consents:write","reports:read","profile:read","profile:write"]'),
    ('student', 'Estudiante', 'Consulta de su propia información académica.', '["dashboard:read","profile:read","profile:write","grades:read","attendance:read","schedule:read","assignments:read","messages:read","notifications:read","notifications:write","documents:read"]')
) AS role(key, name, description, permissions)
WHERE t.deleted_at IS NULL
ON CONFLICT (tenant_id, key)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
	permissions = CASE
		WHEN tenant_roles.policy_version < 2 AND tenant_roles.permissions IN (
			'["users:*", "academic:*", "database:tenant"]'::jsonb,
			'["users:*","academic:*","groups:read","groups:write","attendance:read","attendance:write","grades:read","grades:write","communications:read","communications:write","reports:read","payments:read","payments:write","settings:*","database:tenant"]'::jsonb,
			'["groups:read", "attendance:write", "grades:write"]'::jsonb,
			'["groups:read","attendance:read","attendance:write","grades:read","grades:write","communications:read","communications:write","reports:read"]'::jsonb,
			'["children:read", "messages:write"]'::jsonb,
			'["children:read","grades:read","attendance:read","payments:read","messages:read","messages:write","events:read","documents:read"]'::jsonb,
			'["profile:read", "grades:read"]'::jsonb,
			'["profile:read","grades:read","attendance:read","schedule:read","messages:read","documents:read"]'::jsonb
		) THEN EXCLUDED.permissions
		ELSE tenant_roles.permissions
	END,
  is_system = true,
  policy_version = GREATEST(tenant_roles.policy_version, EXCLUDED.policy_version),
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_users_global_management
  ON users (tenant_id, role, is_active, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_email_search_ci
  ON users (LOWER(email))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_portal_user
  ON students (user_id)
  WHERE user_id IS NOT NULL AND deleted_at IS NULL;
