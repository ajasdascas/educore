-- Migration 007: Create school_reports table
-- Run manually on Hostinger production MySQL:
--   mysql -h HOST -u USER -p DATABASE < backend/migrations_mysql/007_school_reports.sql
-- Safe to run multiple times (IF NOT EXISTS guard).

CREATE TABLE IF NOT EXISTS school_reports (
  id            CHAR(36)     NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id     CHAR(36)     NOT NULL,
  name          VARCHAR(255) NOT NULL,
  type          VARCHAR(50)  NOT NULL DEFAULT 'academic_summary',
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
  format        VARCHAR(20)  NOT NULL DEFAULT 'pdf',
  group_id      VARCHAR(100) NULL,
  start_date    DATE         NOT NULL,
  end_date      DATE         NOT NULL,
  generated_by  CHAR(36)     NULL,
  summary       JSON         NULL,
  insights      JSON         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  DATETIME     NULL,
  deleted_at    DATETIME     NULL,
  KEY idx_school_reports_tenant  (tenant_id),
  KEY idx_school_reports_type    (tenant_id, type),
  KEY idx_school_reports_status  (tenant_id, status),
  KEY idx_school_reports_created (tenant_id, created_at),
  CONSTRAINT fk_school_reports_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
