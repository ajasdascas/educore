-- 018 Part 08: preschool_qualitative_assessments
-- Qualitative evaluation per student per formative field
CREATE TABLE IF NOT EXISTS preschool_qualitative_assessments (
  id                   CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id            CHAR(36)     NOT NULL,
  student_id           CHAR(36)     NOT NULL,
  teacher_id           CHAR(36)     NOT NULL,
  period               VARCHAR(80)  NOT NULL DEFAULT 'current',
  campo_formativo      VARCHAR(120) NOT NULL,
  aprendizaje_esperado VARCHAR(400) NULL,
  nivel                VARCHAR(40)  NOT NULL DEFAULT 'en_proceso',
  notes                TEXT         NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pqa_tenant_student (tenant_id, student_id),
  INDEX idx_pqa_period (tenant_id, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
