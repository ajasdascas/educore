-- Migration 010: Deployment history for Super Admin
-- Run manually on Hostinger production MySQL:
--   mysql -h HOST -u USER -p DATABASE < backend/migrations_mysql/010_deployment_history.sql
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS deployment_history (
  id               CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  environment      VARCHAR(50)   NOT NULL DEFAULT 'production',
  service          VARCHAR(50)   NOT NULL,
  provider         VARCHAR(50)   NOT NULL DEFAULT 'github_actions',
  status           VARCHAR(30)   NOT NULL,
  title            VARCHAR(255)  NOT NULL,
  description      TEXT          NULL,
  commit_sha       VARCHAR(64)   NULL,
  commit_short_sha VARCHAR(12)   NULL,
  branch           VARCHAR(100)  NULL,
  actor            VARCHAR(100)  NULL,
  repository       VARCHAR(150)  NULL,
  workflow_name    VARCHAR(150)  NULL,
  run_id           VARCHAR(100)  NULL,
  run_number       VARCHAR(50)   NULL,
  run_attempt      VARCHAR(50)   NULL,
  run_url          TEXT          NULL,
  deployed_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_deployment_history_environment (environment),
  KEY idx_deployment_history_service (service),
  KEY idx_deployment_history_status (status),
  KEY idx_deployment_history_deployed_at (deployed_at),
  KEY idx_deployment_history_commit_sha (commit_sha),
  KEY idx_deployment_history_run_id (run_id),
  UNIQUE KEY uq_deployment_history_run_service_attempt (run_id, run_attempt, service)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
