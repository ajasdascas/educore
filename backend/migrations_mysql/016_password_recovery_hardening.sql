-- Migration 016 (MySQL/MariaDB parity): one-time, tenant-scoped password recovery.
-- Raw reset tokens are never persisted; only their SHA-256 digest is stored.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  delivered_at DATETIME NULL,
  used_at DATETIME NULL,
  revoked_at DATETIME NULL,
  provider_message_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
  KEY idx_password_reset_tokens_user_active (user_id, expires_at),
  KEY idx_password_reset_tokens_cleanup (expires_at, delivered_at, used_at, revoked_at),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_password_reset_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

