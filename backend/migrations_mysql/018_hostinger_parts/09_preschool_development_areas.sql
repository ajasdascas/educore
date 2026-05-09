-- 018 Part 09: preschool_development_areas
-- Formative field tracking per student
CREATE TABLE IF NOT EXISTS preschool_development_areas (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id         CHAR(36)     NOT NULL,
  student_id        CHAR(36)     NOT NULL,
  teacher_id        CHAR(36)     NOT NULL,
  area_name         VARCHAR(120) NOT NULL,
  area_description  TEXT         NULL,
  evaluation_period VARCHAR(80)  NOT NULL DEFAULT 'current',
  achievement_level VARCHAR(40)  NOT NULL DEFAULT 'en_proceso',
  observations      TEXT         NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pda_tenant_student (tenant_id, student_id),
  INDEX idx_pda_area (tenant_id, area_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
