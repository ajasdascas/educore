-- Migration 018: Owner Super Admin hardening
-- Adds password reset posture and prevents duplicate global SuperAdmin emails.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_must_change BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_global_email
  ON users (LOWER(email))
  WHERE tenant_id IS NULL;
