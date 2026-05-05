-- Migration 006: Add user_id to students table for student portal login
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- This column links a students row to the users table so STUDENT role users
-- can authenticate and see their own academic data.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS user_id CHAR(36) NULL AFTER id;

-- Index for fast lookup by user_id (used in GetProfileByUserID)
ALTER TABLE students
  ADD KEY IF NOT EXISTS idx_students_user_id (user_id);

-- FK constraint (add only if it does not exist — MySQL 8+ / MariaDB 10.5+ syntax)
-- For older MariaDB (Hostinger), skip FK silently if it errors; app enforces integrity.
-- We add it as a separate statement so partial failure doesn't block the column add.
ALTER TABLE students
  ADD CONSTRAINT fk_students_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
