-- EduCore Hostinger MySQL bridge schema
-- Target: MySQL/MariaDB managed through Hostinger hPanel/phpMyAdmin.
-- This is a temporary bridge schema. PostgreSQL migrations remain the source
-- for the final RLS-enabled architecture.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS tenants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT NULL,
  status ENUM('active','trial','suspended','cancelled') NOT NULL DEFAULT 'trial',
  plan VARCHAR(50) NOT NULL DEFAULT 'basic',
  settings JSON NULL,
  trial_ends_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modules_catalog (
  id CHAR(36) NOT NULL PRIMARY KEY,
  `key` VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  category VARCHAR(80) NOT NULL,
  is_core BOOLEAN NOT NULL DEFAULT FALSE,
  global_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  supported_now BOOLEAN NOT NULL DEFAULT TRUE,
  educational_level VARCHAR(80) NULL,
  plan_required VARCHAR(80) NULL,
  dependencies JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS educational_levels_catalog (
  `key` VARCHAR(80) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT FALSE,
  supported_now BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_modules (
  tenant_id CHAR(36) NOT NULL,
  module_key VARCHAR(80) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  activated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  PRIMARY KEY (tenant_id, module_key),
  CONSTRAINT fk_tenant_modules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_tenant_modules_catalog FOREIGN KEY (module_key) REFERENCES modules_catalog(`key`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_annual DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  max_students INT NOT NULL DEFAULT 0,
  max_teachers INT NOT NULL DEFAULT 0,
  modules JSON NULL,
  features JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('SUPER_ADMIN','SCHOOL_ADMIN','TEACHER','PARENT') NOT NULL,
  avatar_url TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  password_must_change BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at DATETIME NULL,
  invitation_token TEXT NULL,
  invitation_expires_at DATETIME NULL,
  last_login_at DATETIME NULL,
  global_tenant_key VARCHAR(80) NOT NULL DEFAULT '__global__',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_users_tenant_email (tenant_id, email),
  UNIQUE KEY uq_users_scope_email (global_tenant_key, email),
  KEY idx_users_email (email),
  KEY idx_users_tenant (tenant_id),
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS trg_users_global_key_bi;
DROP TRIGGER IF EXISTS trg_users_global_key_bu;

DELIMITER $$
CREATE TRIGGER trg_users_global_key_bi
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SET NEW.global_tenant_key = '__global__';
  ELSE
    SET NEW.global_tenant_key = NEW.tenant_id;
  END IF;
END$$

CREATE TRIGGER trg_users_global_key_bu
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SET NEW.global_tenant_key = '__global__';
  ELSE
    SET NEW.global_tenant_key = NEW.tenant_id;
  END IF;
END$$
DELIMITER ;

CREATE TABLE IF NOT EXISTS school_years (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active','closed','archived') NOT NULL DEFAULT 'active',
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_school_years_tenant (tenant_id),
  CONSTRAINT fk_school_years_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grade_levels (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  level ENUM('preescolar','kinder','primaria','secundaria_general','secundaria_tecnica','prepa_general','prepa_tecnica','universidad') NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  custom_fields JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_grade_levels_tenant (tenant_id),
  CONSTRAINT fk_grade_levels_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS groups (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  grade_level_id CHAR(36) NULL,
  school_year_id CHAR(36) NULL,
  name VARCHAR(80) NOT NULL,
  capacity INT NULL,
  room VARCHAR(100) NULL,
  description TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_groups_tenant (tenant_id),
  CONSTRAINT fk_groups_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_groups_grade FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE SET NULL,
  CONSTRAINT fk_groups_year FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subjects (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  grade_level_id CHAR(36) NULL,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(30) NULL,
  description TEXT NULL,
  credits INT NOT NULL DEFAULT 1,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_subjects_tenant (tenant_id),
  CONSTRAINT fk_subjects_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_subjects_grade FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  unique_student_code VARCHAR(60) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  paternal_last_name VARCHAR(100) NOT NULL,
  maternal_last_name VARCHAR(100) NULL,
  last_name VARCHAR(200) GENERATED ALWAYS AS (TRIM(CONCAT(paternal_last_name, ' ', COALESCE(maternal_last_name, '')))) STORED,
  birth_date DATE NULL,
  curp VARCHAR(30) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(40) NULL,
  address TEXT NULL,
  photo_url TEXT NULL,
  group_id CHAR(36) NULL,
  status ENUM('active','inactive','graduated','withdrawn') NOT NULL DEFAULT 'active',
  allergies TEXT NULL,
  medical_conditions TEXT NULL,
  special_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_students_tenant_code (tenant_id, unique_student_code),
  KEY idx_students_tenant (tenant_id),
  KEY idx_students_group (group_id),
  CONSTRAINT fk_students_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_students_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_student (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  relationship ENUM('mother','father','guardian','other') NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  pickup_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  payment_responsible BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parent_student (parent_id, student_id),
  KEY idx_parent_student_tenant (tenant_id),
  CONSTRAINT fk_parent_student_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_student_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_student_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  group_id CHAR(36) NULL,
  date DATE NOT NULL,
  status ENUM('present','absent','late','excused','sick') NOT NULL,
  recorded_by CHAR(36) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_student_date (student_id, date),
  KEY idx_attendance_tenant (tenant_id),
  CONSTRAINT fk_attendance_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grade_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NULL,
  group_id CHAR(36) NULL,
  period VARCHAR(80) NOT NULL,
  school_year VARCHAR(40) NOT NULL,
  score DECIMAL(5,2) NULL,
  qualitative_value VARCHAR(80) NULL,
  recorded_by CHAR(36) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_grades_tenant (tenant_id),
  KEY idx_grades_student (student_id),
  CONSTRAINT fk_grades_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_grades_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(80) NOT NULL,
  file_name VARCHAR(255) NULL,
  file_url TEXT NULL,
  mime_type VARCHAR(120) NULL,
  file_size BIGINT NULL,
  storage_status ENUM('physical_only','digital_only','both') NOT NULL DEFAULT 'digital_only',
  status ENUM('pending','verified','rejected','deleted') NOT NULL DEFAULT 'pending',
  version INT NOT NULL DEFAULT 1,
  notes TEXT NULL,
  verified_by CHAR(36) NULL,
  verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_documents_tenant (tenant_id),
  KEY idx_documents_student (student_id),
  CONSTRAINT fk_documents_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_documents_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  tutor_id CHAR(36) NULL,
  concept VARCHAR(120) NOT NULL,
  description TEXT NULL,
  amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  due_date DATE NULL,
  paid_at DATETIME NULL,
  payment_method ENUM('card','cash','transfer','manual') NULL,
  status ENUM('pending','paid','overdue','cancelled','partial') NOT NULL DEFAULT 'pending',
  receipt_number VARCHAR(80) NULL,
  receipt_url TEXT NULL,
  registered_by CHAR(36) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_payment_receipt (tenant_id, receipt_number),
  KEY idx_payments_tenant (tenant_id),
  KEY idx_payments_student (student_id),
  CONSTRAINT chk_payment_amount CHECK (amount >= 0),
  CONSTRAINT chk_payment_paid_amount CHECK (paid_amount >= 0),
  CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_receipts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  payment_id CHAR(36) NOT NULL,
  receipt_number VARCHAR(80) NOT NULL,
  student_id CHAR(36) NOT NULL,
  tutor_id CHAR(36) NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  payment_method ENUM('card','cash','transfer','manual') NOT NULL,
  status ENUM('issued','cancelled') NOT NULL DEFAULT 'issued',
  receipt_url TEXT NULL,
  issued_by CHAR(36) NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL,
  UNIQUE KEY uq_receipts_tenant_number (tenant_id, receipt_number),
  KEY idx_receipts_tenant (tenant_id),
  KEY idx_receipts_payment (payment_id),
  CONSTRAINT fk_receipts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_receipts_payment FOREIGN KEY (payment_id) REFERENCES student_payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_receipts_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_attachments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  payment_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  mime_type VARCHAR(120) NULL,
  file_size BIGINT NULL,
  uploaded_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_payment_attachments_tenant (tenant_id),
  CONSTRAINT fk_payment_attachments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_attachments_payment FOREIGN KEY (payment_id) REFERENCES student_payments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  payment_id CHAR(36) NULL,
  actor_id CHAR(36) NULL,
  action VARCHAR(80) NOT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_payment_audit_tenant (tenant_id),
  CONSTRAINT fk_payment_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_audit_payment FOREIGN KEY (payment_id) REFERENCES student_payments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NULL,
  user_id CHAR(36) NULL,
  user_name VARCHAR(255) NULL,
  action VARCHAR(120) NOT NULL,
  resource VARCHAR(120) NULL,
  resource_id CHAR(36) NULL,
  type VARCHAR(80) NULL,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_tenant (tenant_id),
  KEY idx_audit_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO educational_levels_catalog (`key`, name, enabled, visible, supported_now, sort_order, notes)
VALUES
  ('preescolar', 'Preescolar', TRUE, TRUE, TRUE, 10, 'Nivel activo del enfoque actual.'),
  ('kinder', 'Kinder', TRUE, TRUE, TRUE, 20, 'Nivel activo del enfoque actual.'),
  ('primaria', 'Primaria', TRUE, TRUE, TRUE, 30, 'Nivel activo del enfoque actual.'),
  ('secundaria_general', 'Secundaria', FALSE, FALSE, FALSE, 40, 'Conservado en catalogo interno para activacion futura.'),
  ('secundaria_tecnica', 'Secundaria tecnica', FALSE, FALSE, FALSE, 50, 'Conservado en catalogo interno para activacion futura.'),
  ('prepa_general', 'Prepa', FALSE, FALSE, FALSE, 60, 'Conservado en catalogo interno para activacion futura.'),
  ('prepa_tecnica', 'Prepa tecnica', FALSE, FALSE, FALSE, 70, 'Conservado en catalogo interno para activacion futura.'),
  ('universidad', 'Universidad', FALSE, FALSE, FALSE, 80, 'Conservado en catalogo interno para activacion futura.')
ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), visible = VALUES(visible), supported_now = VALUES(supported_now), notes = VALUES(notes);

INSERT INTO modules_catalog (id, `key`, name, category, is_core, global_enabled, visible, supported_now, educational_level, plan_required, dependencies)
VALUES
  (UUID(), 'auth', 'Auth + RBAC', 'core', TRUE, TRUE, TRUE, TRUE, NULL, 'basic', JSON_ARRAY()),
  (UUID(), 'users', 'Usuarios', 'core', TRUE, TRUE, TRUE, TRUE, NULL, 'basic', JSON_ARRAY('auth')),
  (UUID(), 'academic_core', 'Nucleo academico', 'core', TRUE, TRUE, TRUE, TRUE, NULL, 'basic', JSON_ARRAY('auth','users')),
  (UUID(), 'grading', 'Calificaciones', 'core', TRUE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('academic_core')),
  (UUID(), 'attendance', 'Asistencia', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('academic_core')),
  (UUID(), 'documents', 'Documentos digitales', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('users')),
  (UUID(), 'payments', 'Pagos y cobranza', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'enterprise', JSON_ARRAY('users')),
  (UUID(), 'report_cards', 'Boletas', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('grading')),
  (UUID(), 'schedules', 'Horarios', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('academic_core')),
  (UUID(), 'communications', 'Comunicaciones', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('users')),
  (UUID(), 'qr_access', 'QR y accesos', 'extension', FALSE, TRUE, TRUE, FALSE, NULL, 'enterprise', JSON_ARRAY('users')),
  (UUID(), 'credentials', 'Credenciales', 'extension', FALSE, TRUE, TRUE, FALSE, NULL, 'enterprise', JSON_ARRAY('documents','qr_access')),
  (UUID(), 'secondary_track', 'Secundaria', 'future_level', FALSE, FALSE, FALSE, FALSE, 'secundaria_general', 'custom', JSON_ARRAY('academic_core')),
  (UUID(), 'secondary_technical_track', 'Secundaria tecnica', 'future_level', FALSE, FALSE, FALSE, FALSE, 'secundaria_tecnica', 'custom', JSON_ARRAY('academic_core')),
  (UUID(), 'high_school_track', 'Prepa', 'future_level', FALSE, FALSE, FALSE, FALSE, 'prepa_general', 'custom', JSON_ARRAY('academic_core')),
  (UUID(), 'technical_high_school_track', 'Prepa tecnica', 'future_level', FALSE, FALSE, FALSE, FALSE, 'prepa_tecnica', 'custom', JSON_ARRAY('academic_core')),
  (UUID(), 'university_track', 'Universidad', 'future_level', FALSE, FALSE, FALSE, FALSE, 'universidad', 'custom', JSON_ARRAY('academic_core'))
ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category), visible = VALUES(visible), supported_now = VALUES(supported_now), educational_level = VALUES(educational_level), plan_required = VALUES(plan_required);

INSERT INTO plans (id, name, description, price_monthly, price_annual, currency, max_students, max_teachers, modules, features, is_active, is_featured)
VALUES
  ('plan-basic', 'Basic', 'Operacion escolar base.', 899, 8990, 'MXN', 120, 12, JSON_ARRAY('auth','users','academic_core','grading'), JSON_ARRAY('Usuarios','Academico','Calificaciones'), TRUE, FALSE),
  ('plan-pro', 'Pro', 'Operacion academica completa.', 1899, 18990, 'MXN', 500, 45, JSON_ARRAY('auth','users','academic_core','grading','attendance','documents','schedules','report_cards','communications'), JSON_ARRAY('Asistencia','Documentos','Horarios','Boletas'), TRUE, TRUE),
  ('plan-enterprise', 'Enterprise', 'Instituciones con modulos avanzados.', 3499, 34990, 'MXN', 0, 0, JSON_ARRAY('auth','users','academic_core','grading','attendance','documents','schedules','report_cards','communications','payments','qr_access','credentials'), JSON_ARRAY('Todos los modulos','Soporte dedicado'), TRUE, FALSE)
ON DUPLICATE KEY UPDATE name = VALUES(name), modules = VALUES(modules), features = VALUES(features);
