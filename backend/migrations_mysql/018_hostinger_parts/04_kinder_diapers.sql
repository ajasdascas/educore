-- 018 Part 04: kinder_diapers
-- Diaper change records
CREATE TABLE IF NOT EXISTS kinder_diapers (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id     CHAR(36)     NOT NULL,
  student_id    CHAR(36)     NOT NULL,
  teacher_id    CHAR(36)     NOT NULL,
  changed_at    DATETIME     NOT NULL,
  diaper_type   VARCHAR(40)  NOT NULL DEFAULT 'wet',
  notes         VARCHAR(300) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kd_tenant_student (tenant_id, student_id),
  INDEX idx_kd_date (tenant_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
