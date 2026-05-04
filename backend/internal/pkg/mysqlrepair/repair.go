package mysqlrepair

import (
	"context"
	"database/sql"
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
	if err := ensureStagingColumns(ctx, sqlDB); err != nil {
		return err
	}
	for i, stmt := range stagingBackfillStatements {
		if strings.TrimSpace(stmt) == "" {
			continue
		}
		if _, err := sqlDB.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("mysql staging schema backfill statement %d failed: %w", i+1, err)
		}
	}
	if err := verifyStagingSchema(ctx, sqlDB); err != nil {
		return err
	}
	return nil
}

type columnRepair struct {
	table  string
	column string
	ddl    string
}

type requiredColumn struct {
	table  string
	column string
}

func ensureStagingColumns(ctx context.Context, db *sql.DB) error {
	for _, repair := range stagingColumnRepairs {
		exists, err := columnExists(ctx, db, repair.table, repair.column)
		if err != nil {
			return fmt.Errorf("mysql staging schema column check failed for %s.%s: %w", repair.table, repair.column, err)
		}
		if exists {
			continue
		}
		stmt := fmt.Sprintf("ALTER TABLE `%s` ADD COLUMN %s", repair.table, repair.ddl)
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("mysql staging schema column repair failed for %s.%s: %w", repair.table, repair.column, err)
		}
	}
	return nil
}

func verifyStagingSchema(ctx context.Context, db *sql.DB) error {
	var missing []string
	for _, required := range stagingRequiredColumns {
		exists, err := columnExists(ctx, db, required.table, required.column)
		if err != nil {
			return fmt.Errorf("mysql staging schema verification failed for %s.%s: %w", required.table, required.column, err)
		}
		if !exists {
			missing = append(missing, required.table+"."+required.column)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("mysql staging schema still missing required columns: %s", strings.Join(missing, ", "))
	}
	return nil
}

func columnExists(ctx context.Context, db *sql.DB, table, column string) (bool, error) {
	var exists bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE TABLE_SCHEMA = DATABASE()
			  AND TABLE_NAME = ?
			  AND COLUMN_NAME = ?
		)`, table, column).Scan(&exists)
	return exists, err
}

var stagingColumnRepairs = []columnRepair{
	// Core provisioning tables. Hostinger imports may contain older versions of
	// these tables, so CREATE TABLE IF NOT EXISTS is not enough.
	{"tenants", "logo_url", "logo_url TEXT NULL"},
	{"tenants", "status", "status ENUM('active','trial','suspended','cancelled') NOT NULL DEFAULT 'trial'"},
	{"tenants", "plan", "plan VARCHAR(50) NOT NULL DEFAULT 'basic'"},
	{"tenants", "storage_limit_mb", "storage_limit_mb INT NOT NULL DEFAULT 5120"},
	{"tenants", "settings", "settings JSON NULL"},
	{"tenants", "trial_ends_at", "trial_ends_at DATETIME NULL"},
	{"tenants", "deleted_at", "deleted_at DATETIME NULL"},

	{"modules_catalog", "category", "category VARCHAR(80) NOT NULL DEFAULT 'core'"},
	{"modules_catalog", "is_core", "is_core BOOLEAN NOT NULL DEFAULT FALSE"},
	{"modules_catalog", "price_monthly_mxn", "price_monthly_mxn DECIMAL(12,2) NOT NULL DEFAULT 0"},
	{"modules_catalog", "status", "status VARCHAR(40) NOT NULL DEFAULT 'active'"},
	{"modules_catalog", "version", "version VARCHAR(40) NOT NULL DEFAULT '1.0.0'"},
	{"modules_catalog", "required_level", "required_level VARCHAR(80) NULL"},
	{"modules_catalog", "feature_flags", "feature_flags JSON NULL"},
	{"modules_catalog", "global_enabled", "global_enabled BOOLEAN NOT NULL DEFAULT TRUE"},
	{"modules_catalog", "visible", "visible BOOLEAN NOT NULL DEFAULT TRUE"},
	{"modules_catalog", "supported_now", "supported_now BOOLEAN NOT NULL DEFAULT TRUE"},
	{"modules_catalog", "educational_level", "educational_level VARCHAR(80) NULL"},
	{"modules_catalog", "plan_required", "plan_required VARCHAR(80) NULL"},
	{"modules_catalog", "dependencies", "dependencies JSON NULL"},
	{"modules_catalog", "metadata", "metadata JSON NULL"},

	{"tenant_modules", "enabled", "enabled BOOLEAN NOT NULL DEFAULT TRUE"},
	{"tenant_modules", "is_active", "is_active BOOLEAN NOT NULL DEFAULT TRUE"},
	{"tenant_modules", "is_required", "is_required BOOLEAN NOT NULL DEFAULT FALSE"},
	{"tenant_modules", "source", "source VARCHAR(40) NOT NULL DEFAULT 'manual'"},
	{"tenant_modules", "level", "level VARCHAR(80) NULL"},
	{"tenant_modules", "activated_at", "activated_at DATETIME NULL"},
	{"tenant_modules", "expires_at", "expires_at DATETIME NULL"},
	{"tenant_modules", "updated_at", "updated_at DATETIME NULL"},

	{"users", "phone", "phone VARCHAR(30) NULL"},
	{"users", "address", "address TEXT NULL"},
	{"users", "emergency_contact", "emergency_contact VARCHAR(255) NULL"},
	{"users", "emergency_phone", "emergency_phone VARCHAR(30) NULL"},
	{"users", "notification_preferences", "notification_preferences JSON NULL"},
	{"users", "password_must_change", "password_must_change BOOLEAN NOT NULL DEFAULT FALSE"},
	{"users", "email_verified_at", "email_verified_at DATETIME NULL"},
	{"users", "invitation_token", "invitation_token TEXT NULL"},
	{"users", "invitation_expires_at", "invitation_expires_at DATETIME NULL"},
	{"users", "last_login_at", "last_login_at DATETIME NULL"},
	{"users", "global_tenant_key", "global_tenant_key VARCHAR(80) NOT NULL DEFAULT '__global__'"},
	{"users", "deleted_at", "deleted_at DATETIME NULL"},

	{"subscription_plans", "description", "description TEXT NULL"},
	{"subscription_plans", "price_monthly", "price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0"},
	{"subscription_plans", "price_annual", "price_annual DECIMAL(12,2) NOT NULL DEFAULT 0"},
	{"subscription_plans", "currency", "currency CHAR(3) NOT NULL DEFAULT 'MXN'"},
	{"subscription_plans", "max_students", "max_students INT NOT NULL DEFAULT 0"},
	{"subscription_plans", "max_teachers", "max_teachers INT NOT NULL DEFAULT 0"},
	{"subscription_plans", "modules", "modules JSON NULL"},
	{"subscription_plans", "features", "features JSON NULL"},
	{"subscription_plans", "is_active", "is_active BOOLEAN NOT NULL DEFAULT TRUE"},
	{"subscription_plans", "is_featured", "is_featured BOOLEAN NOT NULL DEFAULT FALSE"},
	{"subscription_plans", "deleted_at", "deleted_at DATETIME NULL"},

	{"tenant_roles", "tenant_id", "tenant_id CHAR(36) NULL"},
	{"tenant_roles", "key", "`key` VARCHAR(80) NOT NULL DEFAULT ''"},
	{"tenant_roles", "name", "name VARCHAR(120) NOT NULL DEFAULT ''"},
	{"tenant_roles", "description", "description TEXT NULL"},
	{"tenant_roles", "permissions", "permissions JSON NULL"},
	{"tenant_roles", "is_system", "is_system BOOLEAN NOT NULL DEFAULT FALSE"},
	{"tenant_roles", "deleted_at", "deleted_at DATETIME NULL"},

	{"school_years", "status", "status ENUM('active','closed','archived') NOT NULL DEFAULT 'active'"},
	{"school_years", "is_current", "is_current BOOLEAN NOT NULL DEFAULT FALSE"},
	{"school_years", "notes", "notes TEXT NULL"},
	{"school_years", "deleted_at", "deleted_at DATETIME NULL"},

	{"school_settings", "school_year", "school_year VARCHAR(40) NULL"},
	{"school_settings", "periods", "periods JSON NULL"},
	{"school_settings", "grading_scale", "grading_scale JSON NULL"},
	{"school_settings", "primary_color", "primary_color VARCHAR(20) NOT NULL DEFAULT '#4f46e5'"},
	{"school_settings", "notification_settings", "notification_settings JSON NULL"},
	{"school_settings", "security_settings", "security_settings JSON NULL"},

	{"grade_levels", "level", "level VARCHAR(80) NOT NULL DEFAULT 'primaria'"},
	{"grade_levels", "sort_order", "sort_order INT NOT NULL DEFAULT 0"},
	{"grade_levels", "custom_fields", "custom_fields JSON NULL"},
	{"grade_levels", "deleted_at", "deleted_at DATETIME NULL"},

	{"subjects", "grade_id", "grade_id CHAR(36) NULL"},
	{"subjects", "grade_level_id", "grade_level_id CHAR(36) NULL"},
	{"subjects", "code", "code VARCHAR(30) NULL"},
	{"subjects", "description", "description TEXT NULL"},
	{"subjects", "credits", "credits INT NOT NULL DEFAULT 1"},
	{"subjects", "status", "status VARCHAR(40) NOT NULL DEFAULT 'active'"},
	{"subjects", "deleted_at", "deleted_at DATETIME NULL"},

	{"groups", "grade_id", "grade_id CHAR(36) NULL"},
	{"groups", "grade_level_id", "grade_level_id CHAR(36) NULL"},
	{"groups", "school_year_id", "school_year_id CHAR(36) NULL"},
	{"groups", "school_year", "school_year VARCHAR(40) NULL"},
	{"groups", "main_teacher_id", "main_teacher_id CHAR(36) NULL"},
	{"groups", "capacity", "capacity INT NULL"},
	{"groups", "max_students", "max_students INT NULL"},
	{"groups", "room", "room VARCHAR(100) NULL"},
	{"groups", "description", "description TEXT NULL"},
	{"groups", "status", "status VARCHAR(40) NOT NULL DEFAULT 'active'"},
	{"groups", "deleted_at", "deleted_at DATETIME NULL"},

	{"students", "unique_student_code", "unique_student_code VARCHAR(60) NULL"},
	{"students", "enrollment_id", "enrollment_id VARCHAR(80) NULL"},
	{"students", "paternal_last_name", "paternal_last_name VARCHAR(100) NOT NULL DEFAULT ''"},
	{"students", "maternal_last_name", "maternal_last_name VARCHAR(100) NULL"},
	{"students", "last_name", "last_name VARCHAR(200) NOT NULL DEFAULT ''"},
	{"students", "birth_day", "birth_day INT NULL"},
	{"students", "birth_month", "birth_month INT NULL"},
	{"students", "birth_year", "birth_year INT NULL"},
	{"students", "group_id", "group_id CHAR(36) NULL"},
	{"students", "metadata", "metadata JSON NULL"},
	{"students", "deleted_at", "deleted_at DATETIME NULL"},

	{"student_payments", "tutor_id", "tutor_id CHAR(36) NULL"},
	{"student_payments", "paid_amount", "paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0"},
	{"student_payments", "currency", "currency CHAR(3) NOT NULL DEFAULT 'MXN'"},
	{"student_payments", "due_date", "due_date DATE NULL"},
	{"student_payments", "paid_at", "paid_at DATETIME NULL"},
	{"student_payments", "payment_method", "payment_method VARCHAR(40) NULL"},
	{"student_payments", "status", "status VARCHAR(40) NOT NULL DEFAULT 'pending'"},
	{"student_payments", "receipt_number", "receipt_number VARCHAR(80) NULL"},
	{"student_payments", "receipt_url", "receipt_url TEXT NULL"},
	{"student_payments", "registered_by", "registered_by CHAR(36) NULL"},
	{"student_payments", "created_by", "created_by CHAR(36) NULL"},
	{"student_payments", "metadata", "metadata JSON NULL"},
	{"student_payments", "deleted_at", "deleted_at DATETIME NULL"},
}

var stagingRequiredColumns = []requiredColumn{
	{"tenants", "id"},
	{"tenants", "slug"},
	{"tenants", "name"},
	{"tenants", "plan"},
	{"modules_catalog", "key"},
	{"modules_catalog", "is_core"},
	{"tenant_modules", "tenant_id"},
	{"tenant_modules", "module_key"},
	{"tenant_modules", "enabled"},
	{"tenant_modules", "is_active"},
	{"tenant_modules", "is_required"},
	{"tenant_modules", "source"},
	{"tenant_modules", "level"},
	{"tenant_modules", "updated_at"},
	{"tenant_roles", "tenant_id"},
	{"tenant_roles", "key"},
	{"users", "tenant_id"},
	{"users", "email"},
	{"school_years", "tenant_id"},
	{"school_settings", "tenant_id"},
	{"grade_levels", "tenant_id"},
	{"subjects", "tenant_id"},
	{"groups", "tenant_id"},
	{"students", "tenant_id"},
	{"attendance_records", "tenant_id"},
	{"student_payments", "tenant_id"},
	{"payment_receipts", "tenant_id"},
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

var stagingBackfillStatements = []string{
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
}
