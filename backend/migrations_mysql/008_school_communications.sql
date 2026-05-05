-- Migration 008: Create school_communications table
-- Run manually on Hostinger production MySQL:
--   mysql -h HOST -u USER -p DATABASE < backend/migrations_mysql/008_school_communications.sql
-- Safe to run multiple times (IF NOT EXISTS guard).

CREATE TABLE IF NOT EXISTS school_communications (
  id               CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id        CHAR(36)      NOT NULL,
  title            VARCHAR(255)  NOT NULL,
  content          TEXT          NOT NULL,
  type             VARCHAR(50)   NOT NULL DEFAULT 'announcement',
  priority         VARCHAR(20)   NOT NULL DEFAULT 'normal',
  status           VARCHAR(20)   NOT NULL DEFAULT 'draft',
  recipient_type   VARCHAR(50)   NOT NULL DEFAULT 'role',
  recipient_id     VARCHAR(100)  NOT NULL DEFAULT 'parents',
  recipient_label  VARCHAR(255)  NOT NULL DEFAULT '',
  channels         JSON          NULL,
  total_recipients INT           NOT NULL DEFAULT 0,
  delivered_count  INT           NOT NULL DEFAULT 0,
  read_count       INT           NOT NULL DEFAULT 0,
  created_by       CHAR(36)      NULL,
  scheduled_for    DATETIME      NULL,
  sent_at          DATETIME      NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME      NULL,
  KEY idx_school_comms_tenant        (tenant_id),
  KEY idx_school_comms_status        (tenant_id, status),
  KEY idx_school_comms_created       (tenant_id, created_at),
  KEY idx_school_comms_scheduled     (tenant_id, scheduled_for),
  CONSTRAINT fk_school_comms_tenant  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
