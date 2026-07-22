-- Migration 022: persist the student identity required by the student portal.
-- The STUDENT role constraint is managed by migration 021.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_tenant_email_ci
  ON students(tenant_id, LOWER(email))
  WHERE email IS NOT NULL AND BTRIM(email) <> '';
