-- 018 Part 06: kinder_incidents
-- Safety incidents and events
CREATE TABLE IF NOT EXISTS kinder_incidents (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id        CHAR(36)     NOT NULL,
  student_id       CHAR(36)     NOT NULL,
  teacher_id       CHAR(36)     NOT NULL,
  occurred_at      DATETIME     NOT NULL,
  incident_type    VARCHAR(40)  NOT NULL DEFAULT 'other',
  description      TEXT         NOT NULL,
  action_taken     TEXT         NULL,
  notified_parent  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ki_tenant_student (tenant_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
