-- 018 Part 03: kinder_naps
-- Nap records per student per day
CREATE TABLE IF NOT EXISTS kinder_naps (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id        CHAR(36)     NOT NULL,
  student_id       CHAR(36)     NOT NULL,
  teacher_id       CHAR(36)     NOT NULL,
  nap_date         DATE         NOT NULL,
  start_time       TIME         NULL,
  end_time         TIME         NULL,
  duration_minutes INT          NULL,
  quality          VARCHAR(40)  NOT NULL DEFAULT 'good',
  notes            VARCHAR(300) NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_kn_tenant_student_date (tenant_id, student_id, nap_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
