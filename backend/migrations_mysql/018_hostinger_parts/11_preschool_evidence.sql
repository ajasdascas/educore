-- 018 Part 11: preschool_evidence
-- Learning evidence (photos, files) per student
CREATE TABLE IF NOT EXISTS preschool_evidence (
  id                    CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id             CHAR(36)     NOT NULL,
  student_id            CHAR(36)     NOT NULL,
  teacher_id            CHAR(36)     NOT NULL,
  title                 VARCHAR(200) NOT NULL,
  description           TEXT         NULL,
  category              VARCHAR(80)  NULL,
  image_url             VARCHAR(500) NULL,
  file_url              VARCHAR(500) NULL,
  is_visible_to_parent  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pe_tenant_student (tenant_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
