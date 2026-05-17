-- Migration 012: account_settings table for per-user UI preferences
-- Safe to run multiple times — all statements are idempotent.

CREATE TABLE IF NOT EXISTS account_settings (
  user_id              CHAR(36)  NOT NULL PRIMARY KEY,
  email_notifications  BOOLEAN   NOT NULL DEFAULT TRUE,
  push_notifications   BOOLEAN   NOT NULL DEFAULT TRUE,
  compact_mode         BOOLEAN   NOT NULL DEFAULT FALSE,
  updated_at           DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_account_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure users table has all columns needed by account endpoints.
-- ADD COLUMN IF NOT EXISTS is supported in MySQL 8.0+ and MariaDB 10.0+.
ALTER TABLE users
  MODIFY COLUMN password_hash    TEXT          NULL,
  MODIFY COLUMN avatar_url       TEXT          NULL,
  MODIFY COLUMN email_verified_at DATETIME     NULL,
  MODIFY COLUMN last_login_at    DATETIME      NULL;
