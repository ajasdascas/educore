package mysqlrepair

import (
	"context"
	"fmt"
	"strings"

	"educore/internal/pkg/database"
)

// EnsureStagingSchema repairs older/partial Hostinger imports in the MySQL
// staging bridge. It is additive only: CREATE TABLE IF NOT EXISTS and
// backfills from existing catalog tables. It must never run in production.
func EnsureStagingSchema(ctx context.Context, db *database.DB, appEnv string) error {
	if db == nil || !database.IsMySQL(db.Driver()) || !strings.EqualFold(strings.TrimSpace(appEnv), "staging") {
		return nil
	}
	sqlDB := db.SQLDB()
	if sqlDB == nil {
		return fmt.Errorf("mysql staging schema repair requires sql db")
	}
	for i, stmt := range stagingSchemaStatements {
		if strings.TrimSpace(stmt) == "" {
			continue
		}
		if _, err := sqlDB.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("mysql staging schema repair statement %d failed: %w", i+1, err)
		}
	}
	return nil
}

var stagingSchemaStatements = []string{
	`CREATE TABLE IF NOT EXISTS subscription_plans (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`INSERT INTO subscription_plans (
		id, name, description, price_monthly, price_annual, currency,
		max_students, max_teachers, modules, features, is_active, is_featured
	)
	SELECT
		id, name, description, price_monthly, price_annual, currency,
		max_students, max_teachers, modules, features, is_active, is_featured
	FROM plans
	ON DUPLICATE KEY UPDATE
		name = VALUES(name),
		description = VALUES(description),
		price_monthly = VALUES(price_monthly),
		price_annual = VALUES(price_annual),
		currency = VALUES(currency),
		max_students = VALUES(max_students),
		max_teachers = VALUES(max_teachers),
		modules = VALUES(modules),
		features = VALUES(features),
		is_active = VALUES(is_active),
		is_featured = VALUES(is_featured),
		updated_at = CURRENT_TIMESTAMP`,
	`CREATE TABLE IF NOT EXISTS tenant_roles (
		id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
		tenant_id CHAR(36) NOT NULL,
		` + "`key`" + ` VARCHAR(80) NOT NULL,
		name VARCHAR(120) NOT NULL,
		description TEXT NULL,
		permissions JSON NULL,
		is_system BOOLEAN NOT NULL DEFAULT FALSE,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		deleted_at DATETIME NULL,
		UNIQUE KEY uq_tenant_roles_key (tenant_id, ` + "`key`" + `),
		KEY idx_tenant_roles_tenant (tenant_id),
		CONSTRAINT fk_tenant_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS school_years (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS school_settings (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS grade_levels (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS groups (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS subjects (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS teacher_profiles (
		user_id CHAR(36) NOT NULL PRIMARY KEY,
		specialization VARCHAR(160) NULL,
		phone VARCHAR(40) NULL,
		employee_id VARCHAR(80) NULL,
		professional_id VARCHAR(80) NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		CONSTRAINT fk_teacher_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS group_teachers (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS group_subjects (
		group_id CHAR(36) NOT NULL,
		subject_id CHAR(36) NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (group_id, subject_id),
		CONSTRAINT fk_group_subjects_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
		CONSTRAINT fk_group_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS students (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS parent_student (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS group_students (
		group_id CHAR(36) NOT NULL,
		student_id CHAR(36) NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (group_id, student_id),
		CONSTRAINT fk_group_students_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
		CONSTRAINT fk_group_students_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS attendance_records (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS student_payments (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
	`CREATE TABLE IF NOT EXISTS payment_receipts (
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
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
}
