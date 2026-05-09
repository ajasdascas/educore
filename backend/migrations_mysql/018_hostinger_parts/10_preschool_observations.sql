-- 018 Part 10: preschool_observations
-- Teacher observations per student
CREATE TABLE IF NOT EXISTS preschool_observations (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id             CHAR(36)     NOT NULL,
  student_id            CHAR(36)     NOT NULL,
  teacher_id            CHAR(36)     NOT NULL,
  observed_at           DATE         NOT NULL,
  category              VARCHAR(40)  NOT NULL DEFAULT 'general',
  content               TEXT         NOT NULL,
  is_visible_to_parent  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_po_tenant_student (tenant_id, student_id),
  INDEX idx_po_date (tenant_id, observed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
