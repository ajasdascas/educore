-- Migration 012 (MySQL): Global user management and tenant RBAC hardening.
-- Safe to run repeatedly. Existing customized permissions are preserved.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_version INT NOT NULL DEFAULT 1;

ALTER TABLE tenant_roles
  ADD COLUMN IF NOT EXISTS policy_version INT NOT NULL DEFAULT 1;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS user_id CHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL;

ALTER TABLE students
  ADD UNIQUE KEY IF NOT EXISTS uq_students_portal_user (user_id);

ALTER TABLE users
  MODIFY COLUMN role ENUM('SUPER_ADMIN','SCHOOL_ADMIN','TEACHER','PARENT','STUDENT') NOT NULL;

INSERT INTO tenant_roles (id, tenant_id, `key`, name, description, permissions, is_system, policy_version)
SELECT UUID(), t.id, role_def.role_key, role_def.role_name, role_def.description, role_def.permissions, TRUE, 2
FROM tenants t
CROSS JOIN (
  SELECT 'admin' AS role_key, 'Director / Administrador' AS role_name,
         'Administración operativa de la escuela.' AS description,
         JSON_ARRAY('dashboard:read','modules:read','users:*','academic:*','groups:read','groups:write','schedule:read','schedule:write','attendance:read','attendance:write','grades:read','grades:write','documents:read','documents:write','communications:read','communications:write','notifications:read','notifications:write','reports:read','reports:write','payments:read','payments:write','settings:*','database:tenant') AS permissions
  UNION ALL
  SELECT 'teacher', 'Profesor', 'Gestión docente limitada a grupos y alumnos asignados.',
         JSON_ARRAY('dashboard:read','groups:read','schedule:read','attendance:read','attendance:write','grades:read','grades:write','communications:read','communications:write','notifications:read','notifications:write','reports:read','reports:write')
  UNION ALL
  SELECT 'parent', 'Padre / Tutor', 'Consulta de estudiantes vinculados y comunicación escolar.',
         JSON_ARRAY('dashboard:read','children:read','grades:read','attendance:read','schedule:read','assignments:read','payments:read','messages:read','messages:write','notifications:read','notifications:write','events:read','documents:read','consents:read','consents:write','reports:read','profile:read','profile:write')
  UNION ALL
  SELECT 'student', 'Estudiante', 'Consulta de su propia información académica.',
         JSON_ARRAY('dashboard:read','profile:read','profile:write','grades:read','attendance:read','schedule:read','assignments:read','messages:read','notifications:read','notifications:write','documents:read')
) role_def
WHERE t.deleted_at IS NULL
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
	permissions = CASE
		WHEN policy_version < 2 AND JSON_CONTAINS(permissions, JSON_ARRAY('users:*','academic:*','database:tenant')) AND JSON_LENGTH(permissions) = 3 THEN VALUES(permissions)
		WHEN policy_version < 2 AND JSON_CONTAINS(permissions, JSON_ARRAY('users:*','academic:*','groups:read','groups:write','attendance:read','attendance:write','grades:read','grades:write','communications:read','communications:write','reports:read','payments:read','payments:write','settings:*','database:tenant')) AND JSON_LENGTH(permissions) = 15 THEN VALUES(permissions)
		WHEN policy_version < 2 AND JSON_CONTAINS(permissions, JSON_ARRAY('groups:read','attendance:write','grades:write')) AND JSON_LENGTH(permissions) = 3 THEN VALUES(permissions)
		WHEN policy_version < 2 AND JSON_CONTAINS(permissions, JSON_ARRAY('groups:read','attendance:read','attendance:write','grades:read','grades:write','communications:read','communications:write','reports:read')) AND JSON_LENGTH(permissions) = 8 THEN VALUES(permissions)
		WHEN policy_version < 2 AND JSON_CONTAINS(permissions, JSON_ARRAY('children:read','messages:write')) AND JSON_LENGTH(permissions) = 2 THEN VALUES(permissions)
		WHEN policy_version < 2 AND JSON_CONTAINS(permissions, JSON_ARRAY('children:read','grades:read','attendance:read','payments:read','messages:read','messages:write','events:read','documents:read')) AND JSON_LENGTH(permissions) = 8 THEN VALUES(permissions)
		WHEN policy_version < 2 AND JSON_CONTAINS(permissions, JSON_ARRAY('profile:read','grades:read')) AND JSON_LENGTH(permissions) = 2 THEN VALUES(permissions)
		WHEN policy_version < 2 AND JSON_CONTAINS(permissions, JSON_ARRAY('profile:read','grades:read','attendance:read','schedule:read','messages:read','documents:read')) AND JSON_LENGTH(permissions) = 6 THEN VALUES(permissions)
		ELSE permissions
	END,
  is_system = TRUE,
  policy_version = GREATEST(policy_version, VALUES(policy_version)),
  updated_at = CURRENT_TIMESTAMP;
