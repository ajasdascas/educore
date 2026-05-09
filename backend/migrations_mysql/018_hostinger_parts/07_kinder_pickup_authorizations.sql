-- 018 Part 07: pickup_authorizations
-- Authorized persons to pick up students
CREATE TABLE IF NOT EXISTS pickup_authorizations (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  tenant_id        CHAR(36)     NOT NULL,
  student_id       CHAR(36)     NOT NULL,
  authorized_name  VARCHAR(200) NOT NULL,
  relationship     VARCHAR(80)  NOT NULL DEFAULT 'family',
  phone            VARCHAR(30)  NULL,
  notes            TEXT         NULL,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pa_tenant_student (tenant_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
