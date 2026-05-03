-- EduCore Hostinger MySQL bridge schema
-- Target: MySQL/MariaDB managed through Hostinger hPanel/phpMyAdmin.
-- This is a temporary bridge schema. PostgreSQL migrations remain the source
-- for the final RLS-enabled architecture.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS tenants (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT NULL,
  status ENUM('active','trial','suspended','cancelled') NOT NULL DEFAULT 'trial',
  plan VARCHAR(50) NOT NULL DEFAULT 'basic',
  storage_limit_mb INT NOT NULL DEFAULT 5120,
  settings JSON NULL,
  trial_ends_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS modules_catalog (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  `key` VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  category VARCHAR(80) NOT NULL,
  is_core BOOLEAN NOT NULL DEFAULT FALSE,
  price_monthly_mxn DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  version VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  required_level VARCHAR(80) NULL,
  feature_flags JSON NULL,
  global_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  supported_now BOOLEAN NOT NULL DEFAULT TRUE,
  educational_level VARCHAR(80) NULL,
  plan_required VARCHAR(80) NULL,
  dependencies JSON NULL,
  metadata JSON NULL,
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
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  source VARCHAR(40) NOT NULL DEFAULT 'manual',
  level VARCHAR(80) NULL,
  activated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, module_key),
  CONSTRAINT fk_tenant_modules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_tenant_modules_catalog FOREIGN KEY (module_key) REFERENCES modules_catalog(`key`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plans (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
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

CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
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
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_subscription_plans_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('SUPER_ADMIN','SCHOOL_ADMIN','TEACHER','PARENT') NOT NULL,
  phone VARCHAR(30) NULL,
  address TEXT NULL,
  emergency_contact VARCHAR(255) NULL,
  emergency_phone VARCHAR(30) NULL,
  notification_preferences JSON NULL,
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

CREATE TABLE IF NOT EXISTS tenant_roles (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  `key` VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  permissions JSON NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_tenant_roles_key (tenant_id, `key`),
  KEY idx_tenant_roles_tenant (tenant_id),
  CONSTRAINT fk_tenant_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
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
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
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

CREATE TABLE IF NOT EXISTS school_settings (
  tenant_id CHAR(36) NOT NULL PRIMARY KEY,
  school_year VARCHAR(40) NULL,
  periods JSON NULL,
  grading_scale JSON NULL,
  primary_color VARCHAR(20) NOT NULL DEFAULT '#4f46e5',
  notification_settings JSON NULL,
  security_settings JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_school_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grade_levels (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
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
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  grade_id CHAR(36) NULL,
  grade_level_id CHAR(36) NULL,
  school_year_id CHAR(36) NULL,
  school_year VARCHAR(40) NULL,
  main_teacher_id CHAR(36) NULL,
  name VARCHAR(80) NOT NULL,
  capacity INT NULL,
  max_students INT NULL,
  room VARCHAR(100) NULL,
  description TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_groups_tenant (tenant_id),
  CONSTRAINT fk_groups_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_groups_main_teacher FOREIGN KEY (main_teacher_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_groups_grade_id FOREIGN KEY (grade_id) REFERENCES grade_levels(id) ON DELETE SET NULL,
  CONSTRAINT fk_groups_grade FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE SET NULL,
  CONSTRAINT fk_groups_year FOREIGN KEY (school_year_id) REFERENCES school_years(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subjects (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  grade_id CHAR(36) NULL,
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
  CONSTRAINT fk_subjects_grade_id FOREIGN KEY (grade_id) REFERENCES grade_levels(id) ON DELETE SET NULL,
  CONSTRAINT fk_subjects_grade FOREIGN KEY (grade_level_id) REFERENCES grade_levels(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_teachers (
  group_id CHAR(36) NOT NULL,
  teacher_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NULL,
  role VARCHAR(80) NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, teacher_id),
  CONSTRAINT fk_group_teachers_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_group_teachers_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_group_teachers_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_subjects (
  group_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, subject_id),
  CONSTRAINT fk_group_subjects_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_group_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  specialization VARCHAR(160) NULL,
  phone VARCHAR(40) NULL,
  employee_id VARCHAR(80) NULL,
  professional_id VARCHAR(80) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_teacher_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS class_schedule_blocks (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  group_id CHAR(36) NULL,
  subject_id CHAR(36) NULL,
  teacher_id CHAR(36) NULL,
  room VARCHAR(120) NULL,
  day VARCHAR(20) NULL,
  day_of_week INT NOT NULL DEFAULT 1,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  notes TEXT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_schedule_tenant (tenant_id),
  CONSTRAINT fk_schedule_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_schedule_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
  CONSTRAINT fk_schedule_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  CONSTRAINT fk_schedule_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS students (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  unique_student_code VARCHAR(60) NOT NULL DEFAULT (UUID()),
  enrollment_number VARCHAR(80) NULL,
  enrollment_id VARCHAR(80) NULL,
  first_name VARCHAR(100) NOT NULL,
  paternal_last_name VARCHAR(100) NOT NULL,
  maternal_last_name VARCHAR(100) NULL,
  last_name VARCHAR(200) NOT NULL DEFAULT '',
  birth_date DATE NULL,
  birth_day INT NULL,
  birth_month INT NULL,
  birth_year INT NULL,
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
  notes TEXT NULL,
  source_sheet VARCHAR(120) NULL,
  created_by CHAR(36) NULL,
  metadata JSON NULL,
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
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NULL,
  parent_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  relationship ENUM('mother','father','guardian','other') NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  pickup_authorized BOOLEAN NOT NULL DEFAULT FALSE,
  payment_responsible BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(40) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parent_student (parent_id, student_id),
  KEY idx_parent_student_tenant (tenant_id),
  CONSTRAINT fk_parent_student_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_student_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_student_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS group_students (
  group_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, student_id),
  CONSTRAINT fk_group_students_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  CONSTRAINT fk_group_students_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_academic_history (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  school_year_id CHAR(36) NULL,
  grade_id CHAR(36) NULL,
  group_id CHAR(36) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_student_history_tenant (tenant_id, student_id),
  CONSTRAINT fk_student_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_student_history_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_batches (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  source_sheet VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'completed',
  total_rows INT NOT NULL DEFAULT 0,
  imported_rows INT NOT NULL DEFAULT 0,
  errors JSON NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_import_batches_tenant (tenant_id, created_at),
  CONSTRAINT fk_import_batches_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_import_batches_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_records (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
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
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
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
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  uploaded_by CHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  category VARCHAR(80) NOT NULL,
  file_name VARCHAR(255) NULL,
  file_url TEXT NULL,
  mime_type VARCHAR(120) NULL,
  file_size BIGINT NULL,
  storage_status ENUM('physical_only','digital_only','both') NOT NULL DEFAULT 'digital_only',
  audience VARCHAR(40) NOT NULL DEFAULT 'staff',
  status ENUM('pending','verified','rejected','deleted','active') NOT NULL DEFAULT 'pending',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
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
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
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
  created_by CHAR(36) NULL,
  notes TEXT NULL,
  metadata JSON NULL,
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
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
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
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
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
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
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

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  message TEXT NULL,
  content TEXT NULL,
  priority ENUM('low','normal','medium','high','urgent') NOT NULL DEFAULT 'normal',
  status ENUM('unread','read','archived') NOT NULL DEFAULT 'unread',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  related_student_id CHAR(36) NULL,
  sender_name VARCHAR(255) NULL,
  action_url TEXT NULL,
  action_label VARCHAR(120) NULL,
  data JSON NULL,
  metadata JSON NULL,
  expires_at DATETIME NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_notifications_tenant_user (tenant_id, user_id, created_at),
  KEY idx_notifications_unread (tenant_id, user_id, is_read, created_at),
  CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_student FOREIGN KEY (related_student_id) REFERENCES students(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_conversations (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  status ENUM('open','closed','archived') NOT NULL DEFAULT 'open',
  last_message_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_parent_conversations_parent (parent_id, last_message_at),
  KEY idx_parent_conversations_recipient (recipient_id, last_message_at),
  KEY idx_parent_conversations_tenant (tenant_id),
  CONSTRAINT fk_parent_conversations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_conversations_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_conversations_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_messages (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('low','normal','medium','high','urgent') NOT NULL DEFAULT 'normal',
  parent_message_id CHAR(36) NULL,
  has_attachments BOOLEAN NOT NULL DEFAULT FALSE,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_parent_messages_conversation (conversation_id, created_at),
  KEY idx_parent_messages_user (recipient_id, read_at, created_at),
  KEY idx_parent_messages_tenant (tenant_id),
  CONSTRAINT fk_parent_messages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_messages_conversation FOREIGN KEY (conversation_id) REFERENCES parent_conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_messages_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_messages_parent FOREIGN KEY (parent_message_id) REFERENCES parent_messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_events (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'event',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  location VARCHAR(255) NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  student_id CHAR(36) NULL,
  group_id CHAR(36) NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'school',
  priority ENUM('low','normal','medium','high','urgent') NOT NULL DEFAULT 'normal',
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_school_events_tenant_date (tenant_id, start_date),
  KEY idx_school_events_student (student_id),
  KEY idx_school_events_group (group_id),
  CONSTRAINT fk_school_events_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_school_events_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  CONSTRAINT fk_school_events_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
  CONSTRAINT fk_school_events_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_assignments (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  student_id CHAR(36) NULL,
  group_id CHAR(36) NULL,
  subject_id CHAR(36) NULL,
  teacher_id CHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'homework',
  due_date DATE NOT NULL,
  status ENUM('pending','submitted','graded','overdue','cancelled') NOT NULL DEFAULT 'pending',
  grade DECIMAL(5,2) NULL,
  max_grade DECIMAL(5,2) NOT NULL DEFAULT 100,
  priority ENUM('low','normal','medium','high','urgent') NOT NULL DEFAULT 'normal',
  submitted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_student_assignments_tenant (tenant_id),
  KEY idx_student_assignments_student (student_id, due_date),
  KEY idx_student_assignments_group (group_id, due_date),
  CONSTRAINT fk_assignments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL,
  CONSTRAINT fk_assignments_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
  CONSTRAINT fk_assignments_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_consents (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'activity',
  due_date DATE NULL,
  status ENUM('pending','approved','rejected','expired','cancelled') NOT NULL DEFAULT 'pending',
  signed_by CHAR(36) NULL,
  signed_at DATETIME NULL,
  signature_ip VARCHAR(80) NULL,
  notes TEXT NULL,
  metadata JSON NULL,
  deleted_at DATETIME NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_parent_consents_tenant (tenant_id, status, due_date),
  KEY idx_parent_consents_student (student_id, status),
  CONSTRAINT fk_consents_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_consents_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_consents_signed_by FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_consents_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  participant_ids JSON NOT NULL,
  subject VARCHAR(255) NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_conversations_tenant (tenant_id),
  CONSTRAINT fk_conversations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  conversation_id CHAR(36) NOT NULL,
  sender_id CHAR(36) NOT NULL,
  recipient_id CHAR(36) NOT NULL,
  recipient_type VARCHAR(40) NOT NULL DEFAULT 'user',
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'message',
  priority ENUM('low','normal','medium','high','urgent') NOT NULL DEFAULT 'normal',
  status ENUM('draft','sent','read','archived','deleted') NOT NULL DEFAULT 'sent',
  scheduled_for DATETIME NULL,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_messages_tenant_user (tenant_id, sender_id, recipient_id, created_at),
  KEY idx_messages_conversation (conversation_id, created_at),
  CONSTRAINT fk_messages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_attachments (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  message_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type VARCHAR(120) NULL,
  mime_type VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_message_attachments_tenant (tenant_id),
  CONSTRAINT fk_message_attachments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_message_attachments_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('low','normal','medium','high','urgent') NOT NULL DEFAULT 'normal',
  status ENUM('draft','published','archived','deleted') NOT NULL DEFAULT 'published',
  publish_at DATETIME NULL,
  expires_at DATETIME NULL,
  recipients JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_announcements_tenant (tenant_id, created_at),
  CONSTRAINT fk_announcements_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_announcements_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(80) NOT NULL,
  status ENUM('pending','processing','completed','failed','deleted') NOT NULL DEFAULT 'pending',
  format VARCHAR(30) NOT NULL DEFAULT 'pdf',
  filters JSON NULL,
  file_url TEXT NULL,
  generated_by CHAR(36) NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_reports_tenant (tenant_id, created_at),
  CONSTRAINT fk_reports_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_user FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_templates (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(80) NOT NULL,
  description TEXT NULL,
  fields JSON NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_report_templates_tenant (tenant_id, type),
  CONSTRAINT fk_report_templates_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS grades (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  student_id CHAR(36) NOT NULL,
  subject_id CHAR(36) NULL,
  group_id CHAR(36) NULL,
  teacher_id CHAR(36) NULL,
  grade DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_grade DECIMAL(5,2) NOT NULL DEFAULT 100,
  evaluation_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_grades_report_tenant (tenant_id, evaluation_date),
  CONSTRAINT fk_report_grades_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_grades_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS database_admin_table_states (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  table_name VARCHAR(128) NOT NULL UNIQUE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_database_admin_states_hidden (is_hidden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS database_admin_operation_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  table_name VARCHAR(128) NULL,
  row_id VARCHAR(128) NULL,
  severity VARCHAR(40) NOT NULL DEFAULT 'info',
  details JSON NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_database_admin_logs_action (action, created_at),
  CONSTRAINT fk_database_admin_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_custom_fields (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  table_name VARCHAR(128) NOT NULL,
  field_key VARCHAR(128) NOT NULL,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(60) NOT NULL DEFAULT 'text',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSON NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_custom_field (tenant_id, table_name, field_key),
  CONSTRAINT fk_custom_fields_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_fields_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_custom_tables (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  table_key VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  `schema` JSON NULL,
  tenant_scoped BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_custom_table (tenant_id, table_key),
  CONSTRAINT fk_custom_tables_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_tables_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_custom_rows (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  custom_table_id CHAR(36) NOT NULL,
  data JSON NULL,
  created_by CHAR(36) NULL,
  updated_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_custom_rows_tenant (tenant_id, custom_table_id, deleted_at),
  CONSTRAINT fk_custom_rows_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_rows_table FOREIGN KEY (custom_table_id) REFERENCES tenant_custom_tables(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_rows_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_custom_rows_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_database_operation_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  table_name VARCHAR(128) NOT NULL,
  row_id VARCHAR(128) NULL,
  details JSON NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tenant_db_logs_tenant (tenant_id, created_at),
  CONSTRAINT fk_tenant_db_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_tenant_db_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_sessions_active (is_active, expires_at),
  CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_tickets (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  priority VARCHAR(40) NOT NULL DEFAULT 'medium',
  module_key VARCHAR(80) NULL,
  assigned_to CHAR(36) NULL,
  created_by CHAR(36) NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_support_tickets_tenant (tenant_id, status),
  CONSTRAINT fk_support_tickets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  CONSTRAINT fk_support_tickets_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  plan_id VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(40) NOT NULL DEFAULT 'monthly',
  price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_students INT NOT NULL DEFAULT 0,
  max_teachers INT NOT NULL DEFAULT 0,
  storage_limit_mb INT NOT NULL DEFAULT 0,
  current_period_end DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  KEY idx_subscriptions_tenant (tenant_id, status),
  CONSTRAINT fk_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoices (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  folio VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'MXN',
  due_date DATE NULL,
  paid_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uq_invoices_folio (folio),
  KEY idx_invoices_tenant (tenant_id, status),
  CONSTRAINT fk_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS manual_payments (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  invoice_id CHAR(36) NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(40) NOT NULL DEFAULT 'transfer',
  reference VARCHAR(120) NULL,
  recorded_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_manual_payments_tenant (tenant_id, created_at),
  CONSTRAINT fk_manual_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_manual_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  CONSTRAINT fk_manual_payments_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS storage_usage_snapshots (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  module_key VARCHAR(80) NULL,
  used_mb DECIMAL(12,2) NOT NULL DEFAULT 0,
  file_count INT NOT NULL DEFAULT 0,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_storage_usage_tenant (tenant_id, captured_at),
  CONSTRAINT fk_storage_usage_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS module_usage_snapshots (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  module_key VARCHAR(80) NOT NULL,
  tenant_id CHAR(36) NULL,
  event_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_module_usage_key (module_key, captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS platform_settings (
  `key` VARCHAR(120) NOT NULL PRIMARY KEY,
  category VARCHAR(80) NOT NULL DEFAULT 'general',
  value JSON NULL,
  is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_platform_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feature_flags (
  `key` VARCHAR(120) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INT NOT NULL DEFAULT 0,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS feature_flag_scopes (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  flag_key VARCHAR(120) NOT NULL,
  tenant_id CHAR(36) NULL,
  level VARCHAR(80) NULL,
  plan VARCHAR(80) NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_feature_flag_scope (flag_key, tenant_id, level, plan),
  CONSTRAINT fk_flag_scope_flag FOREIGN KEY (flag_key) REFERENCES feature_flags(`key`) ON DELETE CASCADE,
  CONSTRAINT fk_flag_scope_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS backup_jobs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'full',
  status VARCHAR(40) NOT NULL DEFAULT 'queued',
  size_mb DECIMAL(12,2) NOT NULL DEFAULT 0,
  requested_by CHAR(36) NULL,
  error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  CONSTRAINT fk_backup_jobs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  CONSTRAINT fk_backup_jobs_user FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_versions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  version VARCHAR(80) NOT NULL,
  changelog TEXT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'deployed',
  deployed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS system_deploy_events (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  version_id CHAR(36) NULL,
  action VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'queued',
  requested_by CHAR(36) NULL,
  confirmation_text VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deploy_events_version FOREIGN KEY (version_id) REFERENCES system_versions(id) ON DELETE SET NULL,
  CONSTRAINT fk_deploy_events_user FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS module_health_events (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  module_key VARCHAR(80) NOT NULL,
  tenant_id CHAR(36) NULL,
  severity VARCHAR(40) NOT NULL DEFAULT 'info',
  status VARCHAR(40) NOT NULL DEFAULT 'healthy',
  message TEXT NULL,
  error_rate DECIMAL(8,4) NOT NULL DEFAULT 0,
  latency_ms INT NOT NULL DEFAULT 0,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_module_health_events (module_key, created_at),
  CONSTRAINT fk_module_health_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NULL,
  user_id CHAR(36) NULL,
  acting_user_id CHAR(36) NULL,
  user_name VARCHAR(255) NULL,
  action VARCHAR(120) NOT NULL,
  resource VARCHAR(120) NULL,
  resource_id CHAR(36) NULL,
  type VARCHAR(80) NULL,
  severity VARCHAR(40) NOT NULL DEFAULT 'info',
  module_key VARCHAR(80) NULL,
  title VARCHAR(255) NULL,
  description TEXT NULL,
  metadata JSON NULL,
  details JSON NULL,
  ip_address VARCHAR(64) NULL,
  user_agent TEXT NULL,
  confirmation_text VARCHAR(255) NULL,
  request_id VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_tenant (tenant_id),
  KEY idx_audit_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS parent_teacher_audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  tenant_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NULL,
  actor_role VARCHAR(40) NOT NULL,
  action VARCHAR(120) NOT NULL,
  resource VARCHAR(120) NOT NULL,
  resource_id CHAR(36) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_parent_teacher_audit_tenant (tenant_id),
  CONSTRAINT fk_parent_teacher_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
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
  (UUID(), 'students', 'Alumnos', 'core', TRUE, TRUE, TRUE, TRUE, NULL, 'basic', JSON_ARRAY('users')),
  (UUID(), 'groups', 'Grupos', 'core', TRUE, TRUE, TRUE, TRUE, NULL, 'basic', JSON_ARRAY('academic_core')),
  (UUID(), 'grades', 'Calificaciones operativas', 'core', TRUE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('grading')),
  (UUID(), 'attendance', 'Asistencia', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('academic_core')),
  (UUID(), 'documents', 'Documentos digitales', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('users')),
  (UUID(), 'payments', 'Pagos y cobranza', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'enterprise', JSON_ARRAY('users')),
  (UUID(), 'payments_basic', 'Pagos basicos', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('users')),
  (UUID(), 'report_cards', 'Boletas', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('grading')),
  (UUID(), 'reports', 'Reportes', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('academic_core')),
  (UUID(), 'schedules', 'Horarios', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('academic_core')),
  (UUID(), 'communications', 'Comunicaciones', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('users')),
  (UUID(), 'communication', 'Comunicacion basica', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('users')),
  (UUID(), 'parent_portal', 'Portal de padres', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('users')),
  (UUID(), 'teacher_portal', 'Portal de maestros', 'extension', FALSE, TRUE, TRUE, TRUE, NULL, 'pro', JSON_ARRAY('users')),
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

INSERT INTO subscription_plans (id, name, description, price_monthly, price_annual, currency, max_students, max_teachers, modules, features, is_active, is_featured)
VALUES
  ('plan-basic', 'Basic', 'Operacion escolar base.', 899, 8990, 'MXN', 120, 12, JSON_ARRAY('auth','users','academic_core','grading'), JSON_ARRAY('Usuarios','Academico','Calificaciones'), TRUE, FALSE),
  ('plan-pro', 'Pro', 'Operacion academica completa.', 1899, 18990, 'MXN', 500, 45, JSON_ARRAY('auth','users','academic_core','grading','attendance','documents','schedules','report_cards','communications'), JSON_ARRAY('Asistencia','Documentos','Horarios','Boletas'), TRUE, TRUE),
  ('plan-enterprise', 'Enterprise', 'Instituciones con modulos avanzados.', 3499, 34990, 'MXN', 0, 0, JSON_ARRAY('auth','users','academic_core','grading','attendance','documents','schedules','report_cards','communications','payments','qr_access','credentials'), JSON_ARRAY('Todos los modulos','Soporte dedicado'), TRUE, FALSE)
ON DUPLICATE KEY UPDATE name = VALUES(name), modules = VALUES(modules), features = VALUES(features);
