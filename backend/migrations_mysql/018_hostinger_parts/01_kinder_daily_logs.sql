-- 018 Part 01: kinder_daily_logs
-- One daily log per student per day
CREATE TABLE IF NOT EXISTS kinder_daily_logs (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id     CHAR(36)     NOT NULL,
  student_id    CHAR(36)     NOT NULL,
  teacher_id    CHAR(36)     NOT NULL,
  log_date      DATE         NOT NULL,
  general_mood  VARCHAR(40)  NULL,
  notes         TEXT         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kinder_daily_log (tenant_id, student_id, log_date),
  INDEX idx_kdl_tenant_student (tenant_id, student_id),
  INDEX idx_kdl_date (tenant_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
