package school_admin

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
	"time"

	"educore/internal/pkg/database"
	"golang.org/x/crypto/bcrypt"
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{
		db: db,
	}
}

func defaultStagingPortalPasswordHash() string {
	if !strings.EqualFold(os.Getenv("APP_ENV"), "staging") && !strings.EqualFold(os.Getenv("EDUCORE_ENABLE_STAGING_PORTAL_PASSWORDS"), "true") {
		return ""
	}
	password := cleanStagingSecret(os.Getenv("EDUCORE_DEFAULT_SCHOOL_ADMIN_PASSWORD"))
	if len(password) < minimumStagingPortalPasswordLength() {
		return ""
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return ""
	}
	return string(hash)
}

func cleanStagingSecret(value string) string {
	cleaned := strings.TrimSpace(value)
	if len(cleaned) >= 2 {
		first := cleaned[0]
		last := cleaned[len(cleaned)-1]
		if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
			cleaned = strings.TrimSpace(cleaned[1 : len(cleaned)-1])
		}
	}
	return cleaned
}

func minimumStagingPortalPasswordLength() int {
	if strings.EqualFold(os.Getenv("APP_ENV"), "staging") {
		return 10
	}
	return 12
}

func (r *Repository) IsModuleEnabled(ctx context.Context, tenantID, moduleKey string) bool {
	var enabled bool
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(tm.enabled, tm.is_active, false)
		FROM tenant_modules tm
		INNER JOIN modules_catalog mc ON mc.key = tm.module_key
		WHERE tm.tenant_id = $1
		  AND tm.module_key = $2
		  AND COALESCE(mc.global_enabled, true) = true
		LIMIT 1
	`, tenantID, moduleKey).Scan(&enabled)
	return err == nil && enabled
}

func mapBoolStatus(isActive bool) string {
	if isActive {
		return "active"
	}
	return "inactive"
}

func splitFullName(fullName string) (string, string) {
	parts := strings.Fields(fullName)
	if len(parts) == 0 {
		return "Tutor", ""
	}
	if len(parts) == 1 {
		return parts[0], ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

func parseIntOrZero(value string) int {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}
	parsed, _ := strconv.Atoi(value)
	return parsed
}

func parseFloatOrZero(value string) float64 {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0
	}
	parsed, _ := strconv.ParseFloat(value, 64)
	return parsed
}

func letterGrade(score float64) string {
	switch {
	case score >= 90:
		return "A"
	case score >= 80:
		return "B"
	case score >= 70:
		return "C"
	case score >= 60:
		return "D"
	default:
		return "F"
	}
}

func roundFloat(value float64, precision int) float64 {
	pow := math.Pow(10, float64(precision))
	return math.Round(value*pow) / pow
}

func addAttendanceSummary(summary *AttendanceSummary, status string) {
	addAttendanceSummaryCount(summary, status, 1)
}

func addAttendanceSummaryCount(summary *AttendanceSummary, status string, count int) {
	switch status {
	case "present":
		summary.Present += count
	case "absent":
		summary.Absent += count
	case "late":
		summary.Late += count
	case "sick":
		summary.Sick += count
	case "excused":
		summary.Excused += count
	}
}

func attendanceRate(summary AttendanceSummary, total int) float64 {
	if total <= 0 {
		return 0
	}
	return roundFloat(float64(summary.Present+summary.Late+summary.Sick+summary.Excused)/float64(total)*100, 1)
}

func effortLabel(score float64) string {
	switch {
	case score >= 90:
		return "Excelente"
	case score >= 80:
		return "Bueno"
	case score >= 70:
		return "Suficiente"
	default:
		return "Requiere apoyo"
	}
}

func behaviorLabel(score float64) string {
	if score >= 70 {
		return "Adecuado"
	}
	return "Seguimiento requerido"
}

func parseJSONMap(raw []byte) map[string]interface{} {
	result := map[string]interface{}{}
	if len(raw) == 0 {
		return result
	}
	_ = json.Unmarshal(raw, &result)
	return result
}

func mergeMaps(base map[string]interface{}, updates map[string]interface{}) map[string]interface{} {
	if base == nil {
		base = map[string]interface{}{}
	}
	for key, value := range updates {
		base[key] = value
	}
	return base
}

// Dashboard & Stats queries
func (r *Repository) GetDashboardStats(ctx context.Context, tenantID string) (*DashboardStats, error) {
	query := `
		SELECT
			(SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND status = 'active') as total_students,
			(SELECT COUNT(*) FROM users u
			 INNER JOIN teacher_profiles tp ON u.id = tp.user_id
			 WHERE u.tenant_id = $1 AND u.is_active = true) as total_teachers,
			(SELECT COUNT(*) FROM groups WHERE tenant_id = $1) as total_groups,
			(SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND status = 'active') as active_students,
			(SELECT COALESCE(AVG(
				CASE WHEN status = 'present' THEN 100.0
					 WHEN status = 'late' THEN 100.0
					 ELSE 0.0 END
			), 0) FROM attendance_records
			 WHERE tenant_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days') as attendance_rate,
			(SELECT COALESCE(AVG(score), 0) FROM grade_records
			 WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as average_grade,
			(SELECT COUNT(*) FROM students
			 WHERE tenant_id = $1 AND created_at >= date_trunc('month', CURRENT_DATE)) as new_students_month
	`

	var stats DashboardStats
	err := r.db.QueryRow(ctx, query, tenantID).Scan(
		&stats.TotalStudents,
		&stats.TotalTeachers,
		&stats.TotalGroups,
		&stats.ActiveStudents,
		&stats.AttendanceRate,
		&stats.AverageGrade,
		&stats.NewStudentsMonth,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get dashboard stats: %w", err)
	}

	return &stats, nil
}

func (r *Repository) GetRecentActivity(ctx context.Context, tenantID string, limit int) ([]ActivityItem, error) {
	query := `
		SELECT id, type, title, description, user_name, created_at, metadata
		FROM audit_logs
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Query(ctx, query, tenantID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent activity: %w", err)
	}
	defer rows.Close()

	var activities []ActivityItem
	for rows.Next() {
		var activity ActivityItem
		var metadata map[string]interface{}

		err := rows.Scan(
			&activity.ID,
			&activity.Type,
			&activity.Title,
			&activity.Description,
			&activity.UserName,
			&activity.Timestamp,
			&metadata,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan activity: %w", err)
		}

		activity.Metadata = metadata
		activities = append(activities, activity)
	}

	return activities, nil
}

func (r *Repository) GetSettings(ctx context.Context, tenantID string) (*SchoolSettingsResponse, error) {
	query := `
		SELECT t.name, COALESCE(t.logo_url, ''), COALESCE(t.settings, '{}'::jsonb),
		       COALESCE(ss.school_year, ''), COALESCE(ss.periods, '[]'::jsonb),
		       COALESCE(ss.grading_scale, '{"min":0,"max":100,"passing":60}'::jsonb),
		       COALESCE(ss.primary_color, '#4f46e5'), COALESCE(ss.updated_at, t.updated_at)
		FROM tenants t
		LEFT JOIN school_settings ss ON ss.tenant_id = t.id
		WHERE t.id = $1
	`
	var name, logoURL, schoolYear, primaryColor string
	var tenantSettingsRaw, periodsRaw, gradingRaw []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, query, tenantID).Scan(&name, &logoURL, &tenantSettingsRaw, &schoolYear, &periodsRaw, &gradingRaw, &primaryColor, &updatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to get settings: %w", err)
	}

	tenantSettings := parseJSONMap(tenantSettingsRaw)
	notifications, _ := tenantSettings["notifications"].(map[string]interface{})
	security, _ := tenantSettings["security"].(map[string]interface{})
	schoolExtra, _ := tenantSettings["school"].(map[string]interface{})

	school := mergeMaps(map[string]interface{}{
		"name":          name,
		"logo_url":      logoURL,
		"primary_color": primaryColor,
		"timezone":      "America/Mexico_City",
		"language":      "es-MX",
	}, schoolExtra)

	academic := map[string]interface{}{
		"school_year":      schoolYear,
		"periods":          parseJSONMap([]byte(`{"items":` + string(periodsRaw) + `}`))["items"],
		"grading_scale":    parseJSONMap(gradingRaw),
		"attendance_mode":  "daily",
		"default_capacity": 30,
	}
	if academicExtra, ok := tenantSettings["academic"].(map[string]interface{}); ok {
		academic = mergeMaps(academic, academicExtra)
	}

	if notifications == nil {
		notifications = map[string]interface{}{
			"email_enabled":  true,
			"push_enabled":   true,
			"absence_alerts": true,
			"grade_alerts":   true,
			"weekly_summary": true,
		}
	}
	if security == nil {
		security = map[string]interface{}{
			"require_2fa_admins":      false,
			"session_timeout_minutes": 120,
			"allow_parent_invites":    true,
			"audit_log_enabled":       true,
		}
	}

	return &SchoolSettingsResponse{
		School:        school,
		Academic:      academic,
		Notifications: notifications,
		Security:      security,
		UpdatedAt:     updatedAt,
	}, nil
}

func (r *Repository) UpdateSettings(ctx context.Context, tenantID string, req UpdateSchoolSettingsRequest) (*SchoolSettingsResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	settings := map[string]interface{}{}
	if req.School != nil {
		settings["school"] = req.School
		if name, ok := req.School["name"].(string); ok && strings.TrimSpace(name) != "" {
			_, err = tx.Exec(ctx, "UPDATE tenants SET name = $1, updated_at = NOW() WHERE id = $2", strings.TrimSpace(name), tenantID)
			if err != nil {
				return nil, fmt.Errorf("failed to update tenant name: %w", err)
			}
		}
		if logoURL, ok := req.School["logo_url"].(string); ok {
			_, err = tx.Exec(ctx, "UPDATE tenants SET logo_url = $1, updated_at = NOW() WHERE id = $2", logoURL, tenantID)
			if err != nil {
				return nil, fmt.Errorf("failed to update tenant logo: %w", err)
			}
		}
	}
	if req.Academic != nil {
		settings["academic"] = req.Academic
	}
	if req.Notifications != nil {
		settings["notifications"] = req.Notifications
	}
	if req.Security != nil {
		settings["security"] = req.Security
	}
	settingsJSON, _ := json.Marshal(settings)
	_, err = tx.Exec(ctx, `
		UPDATE tenants
		SET settings = settings || $1::jsonb, updated_at = NOW()
		WHERE id = $2
	`, string(settingsJSON), tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to update tenant settings: %w", err)
	}

	if req.Academic != nil || req.School != nil {
		schoolYear := ""
		periods := "[]"
		gradingScale := `{"min":0,"max":100,"passing":60}`
		primaryColor := "#4f46e5"
		if req.Academic != nil {
			if value, ok := req.Academic["school_year"].(string); ok {
				schoolYear = value
			}
			if value, ok := req.Academic["periods"]; ok {
				if raw, err := json.Marshal(value); err == nil {
					periods = string(raw)
				}
			}
			if value, ok := req.Academic["grading_scale"]; ok {
				if raw, err := json.Marshal(value); err == nil {
					gradingScale = string(raw)
				}
			}
		}
		if req.School != nil {
			if value, ok := req.School["primary_color"].(string); ok && value != "" {
				primaryColor = value
			}
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO school_settings (tenant_id, school_year, periods, grading_scale, primary_color, updated_at)
			VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, NOW())
			ON CONFLICT (tenant_id)
			DO UPDATE SET school_year = EXCLUDED.school_year,
			              periods = EXCLUDED.periods,
			              grading_scale = EXCLUDED.grading_scale,
			              primary_color = EXCLUDED.primary_color,
			              updated_at = NOW()
		`, tenantID, schoolYear, periods, gradingScale, primaryColor)
		if err != nil {
			return nil, fmt.Errorf("failed to upsert school settings: %w", err)
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetSettings(ctx, tenantID)
}

func (r *Repository) GetEnabledModules(ctx context.Context, tenantID string) ([]EnabledModuleResponse, error) {
	query := `
		SELECT mc.key, mc.name, COALESCE(mc.description, ''),
		       CASE
		         WHEN mc.is_core THEN 'core'
		         WHEN mc.key = 'database_admin' THEN 'internal'
		         ELSE COALESCE(mc.metadata->>'layer', 'extension')
		       END AS layer,
		       COALESCE(tm.level, ''),
		       mc.is_core,
		       COALESCE(tm.is_required, mc.is_core, false),
		       COALESCE(tm.enabled, tm.is_active, false),
		       COALESCE(tm.source, CASE WHEN mc.is_core THEN 'core' ELSE 'manual' END),
		       COALESCE(mc.price_monthly_mxn, 0)
		FROM tenant_modules tm
		INNER JOIN modules_catalog mc ON mc.key = tm.module_key
		WHERE tm.tenant_id = $1
		  AND COALESCE(tm.enabled, tm.is_active, false) = true
		ORDER BY mc.is_core DESC, mc.name
	`
	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get enabled modules: %w", err)
	}
	defer rows.Close()

	modules := []EnabledModuleResponse{}
	for rows.Next() {
		var module EnabledModuleResponse
		if err := rows.Scan(
			&module.Key,
			&module.Name,
			&module.Description,
			&module.Layer,
			&module.Level,
			&module.IsCore,
			&module.IsRequired,
			&module.Enabled,
			&module.Source,
			&module.PriceMonthlyMXN,
		); err != nil {
			return nil, fmt.Errorf("failed to scan enabled module: %w", err)
		}
		modules = append(modules, module)
	}

	return modules, nil
}

// Student queries
func (r *Repository) GetStudentsPaginated(ctx context.Context, tenantID string, params GetStudentsParams) ([]StudentResponse, int, error) {
	whereClause := "WHERE s.tenant_id = $1"
	args := []interface{}{tenantID}
	argCount := 1

	if params.Search != "" {
		argCount++
		whereClause += fmt.Sprintf(" AND (s.first_name ILIKE $%d OR s.last_name ILIKE $%d OR s.paternal_last_name ILIKE $%d OR s.maternal_last_name ILIKE $%d OR s.enrollment_number ILIKE $%d)", argCount, argCount, argCount, argCount, argCount)
		args = append(args, "%"+params.Search+"%")
	}

	if params.GroupID != "" {
		argCount++
		whereClause += fmt.Sprintf(" AND gs.group_id = $%d", argCount)
		args = append(args, params.GroupID)
	}

	if params.GradeID != "" {
		argCount++
		whereClause += fmt.Sprintf(" AND g.grade_id = $%d", argCount)
		args = append(args, params.GradeID)
	}

	if params.Status != "" {
		argCount++
		whereClause += fmt.Sprintf(" AND s.status = $%d", argCount)
		args = append(args, params.Status)
	}

	// Count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT s.id)
		FROM students s
		LEFT JOIN group_students gs ON s.id = gs.student_id
		LEFT JOIN groups g ON gs.group_id = g.id
		%s
	`, whereClause)

	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count students: %w", err)
	}

	// Data query
	offset := (params.Page - 1) * params.PerPage
	sortColumn := "s.created_at DESC"
	switch params.SortBy {
	case "name":
		sortColumn = "s.last_name ASC, s.first_name ASC"
	case "grade":
		sortColumn = "grade_name ASC, group_name ASC, last_name ASC"
	case "attendance":
		sortColumn = "attendance_rate DESC NULLS LAST, s.last_name ASC"
	case "average":
		sortColumn = "average_grade DESC NULLS LAST, s.last_name ASC"
	}
	if strings.EqualFold(params.SortDir, "desc") && (params.SortBy == "name" || params.SortBy == "grade") {
		sortColumn = strings.ReplaceAll(sortColumn, " ASC", " DESC")
	}
	dataQuery := fmt.Sprintf(`
		SELECT DISTINCT s.id, s.first_name, s.last_name, '' as email, '' as phone,
			   COALESCE(s.enrollment_number, '') as enrollment_id, s.status,
			   COALESCE(g.name, '') as group_name,
			   COALESCE(gl.name, '') as grade_name,
			   COALESCE((SELECT AVG(score) FROM grade_records gr WHERE gr.tenant_id = s.tenant_id AND gr.student_id = s.id), 0) as average_grade,
			   COALESCE((SELECT AVG(CASE WHEN ar.status IN ('present','late','sick','excused') THEN 100 ELSE 0 END) FROM attendance_records ar WHERE ar.tenant_id = s.tenant_id AND ar.student_id = s.id), 0) as attendance_rate,
			   COALESCE((
			   	SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name))
			   	FROM parent_student ps
			   	INNER JOIN users u ON ps.parent_id = u.id
			   	WHERE ps.student_id = s.id
			   	ORDER BY ps.is_primary DESC
			   	LIMIT 1
			   ), '') as parent_name,
			   COALESCE((
			   	SELECT u.email
			   	FROM parent_student ps
			   	INNER JOIN users u ON ps.parent_id = u.id
			   	WHERE ps.student_id = s.id
			   	ORDER BY ps.is_primary DESC
			   	LIMIT 1
			   ), '') as parent_email,
			   s.created_at, s.updated_at
		FROM students s
		LEFT JOIN group_students gs ON s.id = gs.student_id
		LEFT JOIN groups g ON gs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_id = gl.id
		%s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortColumn, argCount+1, argCount+2)

	args = append(args, params.PerPage, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get students: %w", err)
	}
	defer rows.Close()

	var students []StudentResponse
	for rows.Next() {
		var student StudentResponse
		var averageGrade, attendanceRate float64
		err := rows.Scan(
			&student.ID,
			&student.FirstName,
			&student.LastName,
			&student.Email,
			&student.Phone,
			&student.EnrollmentID,
			&student.Status,
			&student.GroupName,
			&student.GradeName,
			&averageGrade,
			&attendanceRate,
			&student.ParentName,
			&student.ParentEmail,
			&student.CreatedAt,
			&student.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan student: %w", err)
		}
		students = append(students, student)
	}

	return students, total, nil
}

func (r *Repository) CreateStudent(ctx context.Context, tenantID string, req CreateStudentRequest) (*StudentResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	status := req.Status
	if status == "" {
		status = "active"
	}

	lastName := req.LastName
	if lastName == "" {
		lastName = strings.TrimSpace(req.PaternalLastName + " " + req.MaternalLastName)
	}
	birthDay := parseIntOrZero(req.BirthDay)
	birthMonth := parseIntOrZero(req.BirthMonth)
	birthYear := parseIntOrZero(req.BirthYear)
	parents := req.Parents
	if len(parents) == 0 && req.ParentEmail != "" {
		firstName, lastName := splitFullName(req.ParentName)
		parents = []ParentInput{{
			FirstName:        firstName,
			PaternalLastName: lastName,
			Email:            req.ParentEmail,
			Phone:            req.ParentPhone,
			Relationship:     "guardian",
			IsPrimary:        true,
		}}
	}

	var student StudentResponse
	err = tx.QueryRow(ctx, `
		INSERT INTO students (
			tenant_id, enrollment_number, first_name, last_name, paternal_last_name,
			maternal_last_name, birth_date, birth_day, birth_month, birth_year, status, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::date, NULLIF($8, 0), NULLIF($9, 0), NULLIF($10, 0), $11, $12)
		RETURNING id, first_name, COALESCE(paternal_last_name, ''), COALESCE(maternal_last_name, ''), last_name, COALESCE(enrollment_number, ''), status, created_at, updated_at
	`,
		tenantID, req.EnrollmentID, req.FirstName, lastName, req.PaternalLastName,
		req.MaternalLastName, req.BirthDate, birthDay, birthMonth, birthYear, status, req.Address,
	).Scan(
		&student.ID, &student.FirstName, &student.PaternalLastName, &student.MaternalLastName, &student.LastName, &student.EnrollmentID,
		&student.Status, &student.CreatedAt, &student.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create student: %w", err)
	}

	student.Email = req.Email
	student.Phone = req.Phone
	if len(parents) > 0 {
		student.ParentName = strings.TrimSpace(parents[0].FirstName + " " + parents[0].PaternalLastName + " " + parents[0].MaternalLastName)
		student.ParentEmail = parents[0].Email
		student.ParentPhone = parents[0].Phone
	}

	if req.GroupID != "" {
		_, err = tx.Exec(ctx, `
			INSERT INTO group_students (group_id, student_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, req.GroupID, student.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign student to group: %w", err)
		}
	}

	for index, parent := range parents {
		if parent.Email == "" {
			continue
		}
		parentLastName := strings.TrimSpace(parent.PaternalLastName + " " + parent.MaternalLastName)
		relationship := parent.Relationship
		if relationship == "" {
			relationship = "guardian"
		}
		var parentID string
		parentPasswordHash := defaultStagingPortalPasswordHash()
		err = tx.QueryRow(ctx, `
			INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
			VALUES ($1, $2, $3, $4, $5, 'PARENT', true)
			ON CONFLICT (tenant_id, email)
			DO UPDATE SET password_hash = CASE WHEN EXCLUDED.password_hash <> '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
			              first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, updated_at = NOW()
			RETURNING id
		`, tenantID, parent.Email, parentPasswordHash, parent.FirstName, parentLastName).Scan(&parentID)
		if err != nil {
			return nil, fmt.Errorf("failed to create parent user: %w", err)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO parent_student (parent_id, student_id, relationship, is_primary, phone, notes)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (parent_id, student_id)
			DO UPDATE SET relationship = EXCLUDED.relationship, is_primary = EXCLUDED.is_primary, phone = EXCLUDED.phone, notes = EXCLUDED.notes, updated_at = NOW()
		`, parentID, student.ID, relationship, parent.IsPrimary || index == 0, parent.Phone, parent.Notes)
		if err != nil {
			return nil, fmt.Errorf("failed to link parent to student: %w", err)
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return &student, nil
}

func (r *Repository) GetStudentByID(ctx context.Context, tenantID, studentID string) (*StudentDetailResponse, error) {
	query := `
		SELECT s.id, s.first_name, s.last_name, '' as email, '' as phone,
			   COALESCE(to_char(s.birth_date, 'YYYY-MM-DD'), '') as birth_date,
			   COALESCE(s.notes, '') as address,
			   COALESCE(s.enrollment_number, '') as enrollment_id,
			   s.status,
			   COALESCE((
			   	SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name))
			   	FROM parent_student ps
			   	INNER JOIN users u ON ps.parent_id = u.id
			   	WHERE ps.student_id = s.id
			   	ORDER BY ps.is_primary DESC
			   	LIMIT 1
			   ), '') as parent_name,
			   COALESCE((
			   	SELECT u.email
			   	FROM parent_student ps
			   	INNER JOIN users u ON ps.parent_id = u.id
			   	WHERE ps.student_id = s.id
			   	ORDER BY ps.is_primary DESC
			   	LIMIT 1
			   ), '') as parent_email,
			   '' as parent_phone, COALESCE(g.name, '') as group_name,
			   COALESCE(gl.name, '') as grade_name, s.created_at, s.updated_at
		FROM students s
		LEFT JOIN group_students gs ON s.id = gs.student_id
		LEFT JOIN groups g ON gs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_id = gl.id
		WHERE s.tenant_id = $1 AND s.id = $2
	`

	var student StudentDetailResponse
	student.StudentResponse = &StudentResponse{}
	err := r.db.QueryRow(ctx, query, tenantID, studentID).Scan(
		&student.ID, &student.FirstName, &student.LastName, &student.Email,
		&student.Phone, &student.BirthDate, &student.Address, &student.EnrollmentID,
		&student.Status, &student.ParentName, &student.ParentEmail, &student.ParentPhone,
		&student.GroupName, &student.GradeName, &student.CreatedAt, &student.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get student: %w", err)
	}

	// Get attendance rate
	attendanceQuery := `
		SELECT COALESCE(AVG(
			CASE WHEN status IN ('present', 'late') THEN 100.0 ELSE 0.0 END
		), 0) as attendance_rate,
		COUNT(CASE WHEN status = 'absent' THEN 1 END) as total_absences
		FROM attendance_records
		WHERE tenant_id = $1 AND student_id = $2 AND date >= CURRENT_DATE - INTERVAL '30 days'
	`

	err = r.db.QueryRow(ctx, attendanceQuery, tenantID, studentID).Scan(
		&student.AttendanceRate, &student.TotalAbsences,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get attendance stats: %w", err)
	}

	// Get average grade
	gradeQuery := `
		SELECT COALESCE(AVG(score), 0) as average_grade
		FROM grade_records
		WHERE tenant_id = $1 AND student_id = $2
	`

	err = r.db.QueryRow(ctx, gradeQuery, tenantID, studentID).Scan(&student.AverageGrade)
	if err != nil {
		return nil, fmt.Errorf("failed to get grade average: %w", err)
	}

	return &student, nil
}

func (r *Repository) UpdateStudent(ctx context.Context, tenantID, studentID string, req UpdateStudentRequest) (*StudentResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	setParts := []string{}
	args := []interface{}{tenantID, studentID}
	argCount := 2

	if req.FirstName != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("first_name = $%d", argCount))
		args = append(args, req.FirstName)
	}
	if req.LastName != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("last_name = $%d", argCount))
		args = append(args, req.LastName)
	}
	if req.Address != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("notes = $%d", argCount))
		args = append(args, req.Address)
	}
	if req.EnrollmentID != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("enrollment_number = $%d", argCount))
		args = append(args, req.EnrollmentID)
	}
	if req.Status != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("status = $%d", argCount))
		args = append(args, req.Status)
	}

	if len(setParts) > 0 {
		argCount++
		setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argCount))
		args = append(args, time.Now())

		query := fmt.Sprintf(`
			UPDATE students
			SET %s
			WHERE tenant_id = $1 AND id = $2
		`, strings.Join(setParts, ", "))

		_, err = tx.Exec(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("failed to update student: %w", err)
		}
	}

	if req.GroupID != "" {
		_, err = tx.Exec(ctx, "DELETE FROM group_students WHERE student_id = $1", studentID)
		if err != nil {
			return nil, fmt.Errorf("failed to remove student from current group: %w", err)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO group_students (group_id, student_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, req.GroupID, studentID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign student to new group: %w", err)
		}
	}

	if len(setParts) == 0 && req.GroupID == "" {
		return nil, fmt.Errorf("no fields to update")
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	detail, err := r.GetStudentByID(ctx, tenantID, studentID)
	if err != nil {
		return nil, err
	}

	return detail.StudentResponse, nil
}

func (r *Repository) DeleteStudent(ctx context.Context, tenantID, studentID string) error {
	// Start transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete from related tables first
	_, err = tx.Exec(ctx, "DELETE FROM group_students WHERE student_id = $1", studentID)
	if err != nil {
		return fmt.Errorf("failed to delete group assignments: %w", err)
	}

	_, err = tx.Exec(ctx, "DELETE FROM parent_student WHERE student_id = $1", studentID)
	if err != nil {
		return fmt.Errorf("failed to delete parent relationships: %w", err)
	}

	// Delete student
	result, err := tx.Exec(ctx, "DELETE FROM students WHERE id = $1 AND tenant_id = $2", studentID, tenantID)
	if err != nil {
		return fmt.Errorf("failed to delete student: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("student not found")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

func (r *Repository) GetStudentAcademicHistory(ctx context.Context, tenantID, studentID string) ([]AcademicHistoryItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, student_id, COALESCE(school_year_id::text, ''), school_year,
		       COALESCE(grade_name, ''), COALESCE(group_name, ''), status,
		       average_grade, attendance_rate, absences, COALESCE(notes, ''), created_at
		FROM student_academic_history
		WHERE tenant_id = $1 AND student_id = $2
		ORDER BY created_at DESC
	`, tenantID, studentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get student academic history: %w", err)
	}
	defer rows.Close()

	history := []AcademicHistoryItem{}
	for rows.Next() {
		var item AcademicHistoryItem
		if err := rows.Scan(
			&item.ID, &item.StudentID, &item.SchoolYearID, &item.SchoolYear,
			&item.GradeName, &item.GroupName, &item.Status, &item.AverageGrade,
			&item.AttendanceRate, &item.Absences, &item.Notes, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan academic history: %w", err)
		}
		history = append(history, item)
	}
	return history, nil
}

func (r *Repository) CommitStudentImport(ctx context.Context, tenantID, userID string, req StudentImportCommitRequest) (*StudentImportCommitResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	mappingRaw, _ := json.Marshal(req.Mapping)
	var batchID string
	err = tx.QueryRow(ctx, `
		INSERT INTO import_batches (tenant_id, type, source_sheet, mapping, total_rows, imported_rows, error_rows, created_by)
		VALUES ($1, 'students', $2, $3, $4, 0, 0, NULLIF($5, '')::uuid)
		RETURNING id
	`, tenantID, req.SourceSheet, string(mappingRaw), len(req.Rows), userID).Scan(&batchID)
	if err != nil {
		return nil, fmt.Errorf("failed to create import batch: %w", err)
	}

	imported := 0
	for _, row := range req.Rows {
		firstName := strings.TrimSpace(row["first_name"])
		paternal := strings.TrimSpace(row["paternal_last_name"])
		maternal := strings.TrimSpace(row["maternal_last_name"])
		enrollment := strings.TrimSpace(row["enrollment_id"])
		if firstName == "" || paternal == "" || maternal == "" || enrollment == "" {
			continue
		}

		birthDate := ""
		if row["birth_year"] != "" && row["birth_month"] != "" && row["birth_day"] != "" {
			birthDate = fmt.Sprintf("%04d-%02d-%02d", parseIntOrZero(row["birth_year"]), parseIntOrZero(row["birth_month"]), parseIntOrZero(row["birth_day"]))
		}

		groupID := ""
		groupName := strings.TrimSpace(row["group_name"])
		if groupName != "" {
			_ = tx.QueryRow(ctx, `
				SELECT id FROM groups
				WHERE tenant_id = $1 AND (lower(name) = lower($2) OR lower(school_year || ' ' || name) = lower($2))
				ORDER BY created_at DESC
				LIMIT 1
			`, tenantID, groupName).Scan(&groupID)
		}

		var studentID string
		err = tx.QueryRow(ctx, `
			INSERT INTO students (
				tenant_id, enrollment_number, first_name, last_name, paternal_last_name,
				maternal_last_name, birth_date, birth_day, birth_month, birth_year, status, notes, import_source
			)
			VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::date, NULLIF($8, 0), NULLIF($9, 0), NULLIF($10, 0), 'active', $11, $12)
			ON CONFLICT DO NOTHING
			RETURNING id
		`, tenantID, enrollment, firstName, strings.TrimSpace(paternal+" "+maternal), paternal, maternal,
			birthDate, parseIntOrZero(row["birth_day"]), parseIntOrZero(row["birth_month"]), parseIntOrZero(row["birth_year"]),
			row["address"], req.SourceSheet).Scan(&studentID)
		if err != nil || studentID == "" {
			continue
		}

		if groupID != "" {
			_, _ = tx.Exec(ctx, `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, groupID, studentID)
		}

		parentRows := []ParentInput{
			{FirstName: row["parent1_first_name"], PaternalLastName: row["parent1_paternal_last_name"], MaternalLastName: row["parent1_maternal_last_name"], Email: row["parent1_email"], Phone: row["parent1_phone"], Relationship: "mother", IsPrimary: true},
			{FirstName: row["parent2_first_name"], PaternalLastName: row["parent2_paternal_last_name"], MaternalLastName: row["parent2_maternal_last_name"], Email: row["parent2_email"], Phone: row["parent2_phone"], Relationship: "father", IsPrimary: false},
		}
		for _, parent := range parentRows {
			if strings.TrimSpace(parent.Email) == "" {
				continue
			}
			parentLastName := strings.TrimSpace(parent.PaternalLastName + " " + parent.MaternalLastName)
			var parentID string
			err = tx.QueryRow(ctx, `
				INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
				VALUES ($1, $2, '', $3, $4, 'PARENT', true)
				ON CONFLICT (tenant_id, email)
				DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, updated_at = NOW()
				RETURNING id
			`, tenantID, parent.Email, parent.FirstName, parentLastName).Scan(&parentID)
			if err == nil {
				_, _ = tx.Exec(ctx, `
					INSERT INTO parent_student (parent_id, student_id, relationship, is_primary, phone)
					VALUES ($1, $2, $3, $4, $5)
					ON CONFLICT (parent_id, student_id)
					DO UPDATE SET relationship = EXCLUDED.relationship, is_primary = EXCLUDED.is_primary, phone = EXCLUDED.phone, updated_at = NOW()
				`, parentID, studentID, parent.Relationship, parent.IsPrimary, parent.Phone)
			}
		}

		schoolYearID := ""
		schoolYear := strings.TrimSpace(row["school_year"])
		if schoolYear != "" {
			_ = tx.QueryRow(ctx, `
				SELECT id FROM school_years WHERE tenant_id = $1 AND lower(name) = lower($2) LIMIT 1
			`, tenantID, schoolYear).Scan(&schoolYearID)
		}
		if schoolYear == "" {
			schoolYear = time.Now().Format("2006")
		}
		_, _ = tx.Exec(ctx, `
			INSERT INTO student_academic_history (
				tenant_id, student_id, school_year_id, school_year, grade_name, group_name,
				status, average_grade, attendance_rate, absences, notes
			)
			VALUES ($1, $2, NULLIF($3, '')::uuid, $4, $5, $6, 'imported', $7, $8, $9, $10)
		`, tenantID, studentID, schoolYearID, schoolYear, row["history_grade_name"], row["history_group_name"],
			parseFloatOrZero(row["history_average_grade"]), parseFloatOrZero(row["history_attendance_rate"]),
			parseIntOrZero(row["history_absences"]), "Importado desde Excel")

		imported++
	}

	_, err = tx.Exec(ctx, `
		UPDATE import_batches SET imported_rows = $1, error_rows = $2 WHERE id = $3 AND tenant_id = $4
	`, imported, len(req.Rows)-imported, batchID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to update import batch: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit import: %w", err)
	}

	return &StudentImportCommitResponse{
		BatchID:      batchID,
		ImportedRows: imported,
		TotalRows:    len(req.Rows),
		ErrorRows:    len(req.Rows) - imported,
	}, nil
}

// Teacher queries
func (r *Repository) GetTeachers(ctx context.Context, tenantID string) ([]TeacherResponse, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, u.email, COALESCE(tp.phone, '') as phone,
			   COALESCE(tp.employee_id, '') as employee_id,
			   CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END as status,
			   COALESCE(tp.specialization, '') as specialization,
			   to_char(u.created_at, 'YYYY-MM-DD') as hire_date,
			   (SELECT COUNT(*)
			    FROM group_teachers gt
			    INNER JOIN groups g ON gt.group_id = g.id
			    WHERE gt.teacher_id = u.id AND g.tenant_id = $1) as group_count,
			   u.created_at
		FROM users u
		INNER JOIN teacher_profiles tp ON u.id = tp.user_id
		WHERE u.tenant_id = $1 AND u.role = 'TEACHER'
		ORDER BY u.first_name, u.last_name
	`

	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get teachers: %w", err)
	}
	defer rows.Close()

	var teachers []TeacherResponse
	for rows.Next() {
		var teacher TeacherResponse
		var specialization string

		err := rows.Scan(
			&teacher.ID, &teacher.FirstName, &teacher.LastName, &teacher.Email,
			&teacher.Phone, &teacher.EmployeeID, &teacher.Status, &specialization,
			&teacher.HireDate, &teacher.GroupCount, &teacher.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan teacher: %w", err)
		}

		if specialization != "" {
			teacher.Specialties = []string{specialization}
		} else {
			teacher.Specialties = []string{}
		}
		teachers = append(teachers, teacher)
	}

	return teachers, nil
}

func (r *Repository) CreateTeacher(ctx context.Context, tenantID string, req CreateTeacherRequest) (*TeacherResponse, error) {
	// Start transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Create user
	var userID string
	isActive := req.Status != "inactive"
	teacherPasswordHash := defaultStagingPortalPasswordHash()
	err = tx.QueryRow(ctx, `
		INSERT INTO users (tenant_id, first_name, last_name, email,
						  password_hash, role, is_active)
		VALUES ($1, $2, $3, $4, $5, 'TEACHER', $6)
		RETURNING id
	`, tenantID, req.FirstName, req.LastName, req.Email, teacherPasswordHash, isActive).Scan(&userID)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create teacher profile
	specialization := strings.Join(req.Specialties, ", ")
	_, err = tx.Exec(ctx, `
		INSERT INTO teacher_profiles (user_id, employee_id, specialization, phone)
		VALUES ($1, $2, $3, $4)
	`, userID, req.EmployeeID, specialization, req.Phone)
	if err != nil {
		return nil, fmt.Errorf("failed to create teacher profile: %w", err)
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return teacher data
	teacher := &TeacherResponse{
		ID:          userID,
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Email:       req.Email,
		Phone:       req.Phone,
		EmployeeID:  req.EmployeeID,
		Status:      mapBoolStatus(isActive),
		Specialties: req.Specialties,
		HireDate:    req.HireDate,
		CreatedAt:   time.Now(),
	}

	return teacher, nil
}

// Validation helper functions
func (r *Repository) StudentEmailExists(ctx context.Context, tenantID, email string) (bool, error) {
	return false, nil
}

func (r *Repository) StudentEmailExistsExcluding(ctx context.Context, tenantID, email, studentID string) (bool, error) {
	return false, nil
}

func (r *Repository) GroupExists(ctx context.Context, tenantID, groupID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM groups WHERE tenant_id = $1 AND id = $2)",
		tenantID, groupID).Scan(&exists)
	return exists, err
}

func (r *Repository) StudentHasGrades(ctx context.Context, tenantID, studentID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM grade_records WHERE tenant_id = $1 AND student_id = $2)",
		tenantID, studentID).Scan(&exists)
	return exists, err
}

func (r *Repository) TeacherEmailExists(ctx context.Context, tenantID, email string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM users WHERE tenant_id = $1 AND email = $2 AND role = 'TEACHER')",
		tenantID, email).Scan(&exists)
	return exists, err
}

func (r *Repository) TeacherEmailExistsExcluding(ctx context.Context, tenantID, email, teacherID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM users WHERE tenant_id = $1 AND email = $2 AND role = 'TEACHER' AND id != $3)",
		tenantID, email, teacherID).Scan(&exists)
	return exists, err
}

func (r *Repository) GroupNameExists(ctx context.Context, tenantID, name, gradeLevelID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM groups WHERE tenant_id = $1 AND name = $2 AND grade_id = $3)",
		tenantID, name, gradeLevelID).Scan(&exists)
	return exists, err
}

func (r *Repository) SubjectNameExists(ctx context.Context, tenantID, name string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM subjects WHERE tenant_id = $1 AND name = $2)",
		tenantID, name).Scan(&exists)
	return exists, err
}

func (r *Repository) StudentBelongsToGroup(ctx context.Context, tenantID, studentID, groupID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM group_students gs
			INNER JOIN groups g ON gs.group_id = g.id
			WHERE g.tenant_id = $1 AND gs.student_id = $2 AND gs.group_id = $3
		)
	`, tenantID, studentID, groupID).Scan(&exists)
	return exists, err
}

func (r *Repository) StudentBelongsToSubject(ctx context.Context, tenantID, studentID, subjectID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM group_students gs
			INNER JOIN groups g ON gs.group_id = g.id
			INNER JOIN group_teachers gt ON gs.group_id = gt.group_id
			WHERE g.tenant_id = $1 AND gs.student_id = $2 AND gt.subject_id = $3
		)
	`, tenantID, studentID, subjectID).Scan(&exists)
	return exists, err
}

// Placeholder implementations for remaining methods
func (r *Repository) GetDetailedStats(ctx context.Context, tenantID string) (*StatsResponse, error) {
	return &StatsResponse{}, nil
}

func (r *Repository) GetTeacherByID(ctx context.Context, tenantID, teacherID string) (*TeacherDetailResponse, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, u.email, COALESCE(tp.phone, '') as phone,
			   COALESCE(tp.employee_id, '') as employee_id,
			   CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END as status,
			   COALESCE(tp.specialization, '') as specialization,
			   to_char(u.created_at, 'YYYY-MM-DD') as hire_date,
			   (SELECT COUNT(*)
			    FROM group_teachers gt
			    INNER JOIN groups g ON gt.group_id = g.id
			    WHERE gt.teacher_id = u.id AND g.tenant_id = $1) as group_count,
			   u.created_at
		FROM users u
		INNER JOIN teacher_profiles tp ON u.id = tp.user_id
		WHERE u.tenant_id = $1 AND u.id = $2 AND u.role = 'TEACHER'
	`

	var teacher TeacherDetailResponse
	teacher.TeacherResponse = &TeacherResponse{}
	var specialization string
	err := r.db.QueryRow(ctx, query, tenantID, teacherID).Scan(
		&teacher.ID, &teacher.FirstName, &teacher.LastName, &teacher.Email,
		&teacher.Phone, &teacher.EmployeeID, &teacher.Status, &specialization,
		&teacher.HireDate, &teacher.GroupCount, &teacher.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get teacher: %w", err)
	}

	if specialization != "" {
		teacher.Specialties = []string{specialization}
	} else {
		teacher.Specialties = []string{}
	}

	teacher.Address = ""
	teacher.Salary = 0
	teacher.Groups = []GroupResponse{}
	teacher.Subjects = []SubjectResponse{}
	teacher.Performance = &TeacherPerformance{
		StudentCount:        0,
		AttendanceRate:      0,
		AverageGrade:        0,
		StudentSatisfaction: 0,
	}

	return &teacher, nil
}

func (r *Repository) UpdateTeacher(ctx context.Context, tenantID, teacherID string, req UpdateTeacherRequest) (*TeacherResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	userSetParts := []string{}
	userArgs := []interface{}{tenantID, teacherID}
	userArgCount := 2

	if req.FirstName != "" {
		userArgCount++
		userSetParts = append(userSetParts, fmt.Sprintf("first_name = $%d", userArgCount))
		userArgs = append(userArgs, req.FirstName)
	}
	if req.LastName != "" {
		userArgCount++
		userSetParts = append(userSetParts, fmt.Sprintf("last_name = $%d", userArgCount))
		userArgs = append(userArgs, req.LastName)
	}
	if req.Email != "" {
		userArgCount++
		userSetParts = append(userSetParts, fmt.Sprintf("email = $%d", userArgCount))
		userArgs = append(userArgs, req.Email)
	}
	if req.Status != "" {
		userArgCount++
		userSetParts = append(userSetParts, fmt.Sprintf("is_active = $%d", userArgCount))
		userArgs = append(userArgs, req.Status != "inactive")
	}
	if len(userSetParts) > 0 {
		userArgCount++
		userSetParts = append(userSetParts, fmt.Sprintf("updated_at = $%d", userArgCount))
		userArgs = append(userArgs, time.Now())
		_, err = tx.Exec(ctx, fmt.Sprintf(`
			UPDATE users
			SET %s
			WHERE tenant_id = $1 AND id = $2 AND role = 'TEACHER'
		`, strings.Join(userSetParts, ", ")), userArgs...)
		if err != nil {
			return nil, fmt.Errorf("failed to update teacher user: %w", err)
		}
	}

	profileSetParts := []string{}
	profileArgs := []interface{}{teacherID}
	profileArgCount := 1

	if req.Phone != "" {
		profileArgCount++
		profileSetParts = append(profileSetParts, fmt.Sprintf("phone = $%d", profileArgCount))
		profileArgs = append(profileArgs, req.Phone)
	}
	if req.Specialties != nil {
		profileArgCount++
		profileSetParts = append(profileSetParts, fmt.Sprintf("specialization = $%d", profileArgCount))
		profileArgs = append(profileArgs, strings.Join(req.Specialties, ", "))
	}
	if len(profileSetParts) > 0 {
		_, err = tx.Exec(ctx, fmt.Sprintf(`
			UPDATE teacher_profiles
			SET %s
			WHERE user_id = $1
		`, strings.Join(profileSetParts, ", ")), profileArgs...)
		if err != nil {
			return nil, fmt.Errorf("failed to update teacher profile: %w", err)
		}
	}

	if len(userSetParts) == 0 && len(profileSetParts) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	detail, err := r.GetTeacherByID(ctx, tenantID, teacherID)
	if err != nil {
		return nil, err
	}
	return detail.TeacherResponse, nil
}

func (r *Repository) GetGroups(ctx context.Context, tenantID string) ([]GroupResponse, error) {
	query := `
		SELECT g.id, g.name, g.grade_id, COALESCE(gl.name, '') as grade_name,
			   COALESCE(g.school_year_id::text, '') as school_year_id,
			   COALESCE(sy.name, g.school_year) as school_year,
			   COALESCE((
			       SELECT gt.teacher_id::text
			       FROM group_teachers gt
			       WHERE gt.group_id = g.id
			       LIMIT 1
			   ), '') as teacher_id,
			   COALESCE((
			   	SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name))
			   	FROM group_teachers gt
			   	INNER JOIN users u ON gt.teacher_id = u.id
			   	WHERE gt.group_id = g.id
			   	LIMIT 1
			   ), '') as teacher_name,
			   (SELECT COUNT(*) FROM group_students gs WHERE gs.group_id = g.id) as student_count,
			   COALESCE(g.capacity, 0) as max_students,
			   COALESCE(g.room, '') as room,
			   g.school_year as schedule,
			   COALESCE(g.status, 'active') as status,
			   g.created_at
		FROM groups g
		INNER JOIN grade_levels gl ON g.grade_id = gl.id
		LEFT JOIN school_years sy ON g.school_year_id = sy.id
		WHERE g.tenant_id = $1
		ORDER BY gl.sort_order, g.name
	`

	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get groups: %w", err)
	}
	defer rows.Close()

	var groups []GroupResponse
	for rows.Next() {
		var group GroupResponse
		err := rows.Scan(
			&group.ID, &group.Name, &group.GradeLevelID, &group.GradeName,
			&group.SchoolYearID, &group.SchoolYear, &group.TeacherID, &group.TeacherName,
			&group.StudentCount, &group.MaxStudents, &group.Room, &group.Schedule,
			&group.Status, &group.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan group: %w", err)
		}
		groups = append(groups, group)
	}

	return groups, nil
}

func (r *Repository) CreateGroup(ctx context.Context, tenantID string, req CreateGroupRequest) (*GroupResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	schoolYear := time.Now().Format("2006")
	maxStudents := req.MaxStudents
	if maxStudents == 0 {
		maxStudents = 30
	}
	status := req.Status
	if status == "" {
		status = "active"
	}

	var groupID string
	err = tx.QueryRow(ctx, `
		INSERT INTO groups (tenant_id, grade_id, name, school_year, capacity, school_year_id, room, description, status)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6, '')::uuid, $7, $8, $9)
		RETURNING id
	`, tenantID, req.GradeLevelID, req.Name, schoolYear, maxStudents, req.SchoolYearID, req.Room, req.Description, status).Scan(&groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to create group: %w", err)
	}

	teacherIDs := req.TeacherIDs
	if req.TeacherID != "" && len(teacherIDs) == 0 {
		teacherIDs = []string{req.TeacherID}
	}
	for _, teacherID := range teacherIDs {
		_, err = tx.Exec(ctx, `
			INSERT INTO group_teachers (group_id, teacher_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, groupID, teacherID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign teacher to group: %w", err)
		}
	}
	for _, studentID := range req.StudentIDs {
		_, err = tx.Exec(ctx, `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, groupID, studentID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign student to group: %w", err)
		}
	}
	for _, subjectID := range req.SubjectIDs {
		_, err = tx.Exec(ctx, `INSERT INTO group_subjects (group_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, groupID, subjectID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign subject to group: %w", err)
		}
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	detail, err := r.GetGroupByID(ctx, tenantID, groupID)
	if err != nil {
		return nil, err
	}
	return detail.GroupResponse, nil
}

func (r *Repository) GetGroupByID(ctx context.Context, tenantID, groupID string) (*GroupDetailResponse, error) {
	query := `
		SELECT g.id, g.name, g.grade_id, COALESCE(gl.name, '') as grade_name,
			   COALESCE(g.school_year_id::text, '') as school_year_id,
			   COALESCE(sy.name, g.school_year) as school_year,
			   COALESCE((
			       SELECT gt.teacher_id::text
			       FROM group_teachers gt
			       WHERE gt.group_id = g.id
			       LIMIT 1
			   ), '') as teacher_id,
			   COALESCE((
			   	SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name))
			   	FROM group_teachers gt
			   	INNER JOIN users u ON gt.teacher_id = u.id
			   	WHERE gt.group_id = g.id
			   	LIMIT 1
			   ), '') as teacher_name,
			   (SELECT COUNT(*) FROM group_students gs WHERE gs.group_id = g.id) as student_count,
			   COALESCE(g.capacity, 0) as max_students,
			   COALESCE(g.room, '') as room,
			   g.school_year as schedule,
			   COALESCE(g.status, 'active') as status,
			   g.created_at,
			   COALESCE(g.description, '') as description
		FROM groups g
		INNER JOIN grade_levels gl ON g.grade_id = gl.id
		LEFT JOIN school_years sy ON g.school_year_id = sy.id
		WHERE g.tenant_id = $1 AND g.id = $2
	`

	var group GroupDetailResponse
	group.GroupResponse = &GroupResponse{}
	err := r.db.QueryRow(ctx, query, tenantID, groupID).Scan(
		&group.ID, &group.Name, &group.GradeLevelID, &group.GradeName,
		&group.SchoolYearID, &group.SchoolYear, &group.TeacherID, &group.TeacherName,
		&group.StudentCount, &group.MaxStudents, &group.Room, &group.Schedule,
		&group.Status, &group.CreatedAt, &group.Description,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get group: %w", err)
	}

	group.Students, _ = r.getGroupStudents(ctx, tenantID, groupID)
	group.Teachers, _ = r.getGroupTeachers(ctx, tenantID, groupID)
	group.Subjects, _ = r.getGroupSubjects(ctx, tenantID, groupID)
	group.RecentActivity = []ActivityItem{}
	return &group, nil
}

func (r *Repository) UpdateGroup(ctx context.Context, tenantID, groupID string, req UpdateGroupRequest) (*GroupResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	setParts := []string{}
	args := []interface{}{tenantID, groupID}
	argCount := 2

	if req.Name != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("name = $%d", argCount))
		args = append(args, req.Name)
	}
	if req.GradeLevelID != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("grade_id = $%d", argCount))
		args = append(args, req.GradeLevelID)
	}
	if req.SchoolYearID != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("school_year_id = $%d", argCount))
		args = append(args, req.SchoolYearID)
	}
	if req.MaxStudents > 0 {
		argCount++
		setParts = append(setParts, fmt.Sprintf("capacity = $%d", argCount))
		args = append(args, req.MaxStudents)
	}
	if req.Room != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("room = $%d", argCount))
		args = append(args, req.Room)
	}
	if req.Description != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("description = $%d", argCount))
		args = append(args, req.Description)
	}
	if req.Status != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("status = $%d", argCount))
		args = append(args, req.Status)
	}

	if len(setParts) > 0 {
		argCount++
		setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argCount))
		args = append(args, time.Now())
		_, err = tx.Exec(ctx, fmt.Sprintf(`
			UPDATE groups
			SET %s
			WHERE tenant_id = $1 AND id = $2
		`, strings.Join(setParts, ", ")), args...)
		if err != nil {
			return nil, fmt.Errorf("failed to update group: %w", err)
		}
	}

	teacherIDs := req.TeacherIDs
	if req.TeacherID != "" && len(teacherIDs) == 0 {
		teacherIDs = []string{req.TeacherID}
	}
	if len(teacherIDs) > 0 {
		_, err = tx.Exec(ctx, "DELETE FROM group_teachers WHERE group_id = $1", groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to clear group teacher: %w", err)
		}
		for _, teacherID := range teacherIDs {
			_, err = tx.Exec(ctx, `INSERT INTO group_teachers (group_id, teacher_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, groupID, teacherID)
			if err != nil {
				return nil, fmt.Errorf("failed to assign teacher to group: %w", err)
			}
		}
	}
	if req.StudentIDs != nil {
		_, err = tx.Exec(ctx, "DELETE FROM group_students WHERE group_id = $1", groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to clear group students: %w", err)
		}
		for _, studentID := range req.StudentIDs {
			_, err = tx.Exec(ctx, `INSERT INTO group_students (group_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, groupID, studentID)
			if err != nil {
				return nil, fmt.Errorf("failed to assign student to group: %w", err)
			}
		}
	}
	if req.SubjectIDs != nil {
		_, err = tx.Exec(ctx, "DELETE FROM group_subjects WHERE group_id = $1", groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to clear group subjects: %w", err)
		}
		for _, subjectID := range req.SubjectIDs {
			_, err = tx.Exec(ctx, `INSERT INTO group_subjects (group_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, groupID, subjectID)
			if err != nil {
				return nil, fmt.Errorf("failed to assign subject to group: %w", err)
			}
		}
	}

	if len(setParts) == 0 && len(teacherIDs) == 0 && req.StudentIDs == nil && req.SubjectIDs == nil {
		return nil, fmt.Errorf("no fields to update")
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	detail, err := r.GetGroupByID(ctx, tenantID, groupID)
	if err != nil {
		return nil, err
	}
	return detail.GroupResponse, nil
}

func (r *Repository) DeleteGroup(ctx context.Context, tenantID, groupID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "DELETE FROM group_teachers WHERE group_id = $1", groupID)
	if err != nil {
		return fmt.Errorf("failed to delete group teachers: %w", err)
	}
	_, err = tx.Exec(ctx, "DELETE FROM group_subjects WHERE group_id = $1", groupID)
	if err != nil {
		return fmt.Errorf("failed to delete group subjects: %w", err)
	}

	_, err = tx.Exec(ctx, "DELETE FROM group_students WHERE group_id = $1", groupID)
	if err != nil {
		return fmt.Errorf("failed to delete group students: %w", err)
	}

	result, err := tx.Exec(ctx, "DELETE FROM groups WHERE tenant_id = $1 AND id = $2", tenantID, groupID)
	if err != nil {
		return fmt.Errorf("failed to delete group: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("group not found")
	}

	if err = tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	return nil
}

func (r *Repository) getGroupStudents(ctx context.Context, tenantID, groupID string) ([]StudentResponse, error) {
	query := `
		SELECT s.id, s.first_name, s.last_name, '' as email, '' as phone,
		       COALESCE(s.enrollment_number, ''), s.status, COALESCE(g.name, ''), COALESCE(gl.name, ''),
		       '' as parent_name, '' as parent_email, s.created_at, s.updated_at
		FROM group_students gs
		INNER JOIN students s ON gs.student_id = s.id
		INNER JOIN groups g ON gs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_id = gl.id
		WHERE g.tenant_id = $1 AND gs.group_id = $2
		ORDER BY s.first_name, s.last_name
	`
	rows, err := r.db.Query(ctx, query, tenantID, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	students := []StudentResponse{}
	for rows.Next() {
		var student StudentResponse
		if err := rows.Scan(&student.ID, &student.FirstName, &student.LastName, &student.Email, &student.Phone, &student.EnrollmentID, &student.Status, &student.GroupName, &student.GradeName, &student.ParentName, &student.ParentEmail, &student.CreatedAt, &student.UpdatedAt); err != nil {
			return nil, err
		}
		students = append(students, student)
	}
	return students, nil
}

func (r *Repository) getGroupTeachers(ctx context.Context, tenantID, groupID string) ([]TeacherResponse, error) {
	query := `
		SELECT u.id, u.first_name, u.last_name, u.email, COALESCE(tp.phone, ''),
		       COALESCE(tp.employee_id, ''), CASE WHEN u.is_active THEN 'active' ELSE 'inactive' END,
		       COALESCE(tp.specialization, ''), to_char(u.created_at, 'YYYY-MM-DD'), u.created_at
		FROM group_teachers gt
		INNER JOIN users u ON gt.teacher_id = u.id
		LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
		INNER JOIN groups g ON gt.group_id = g.id
		WHERE g.tenant_id = $1 AND gt.group_id = $2
		ORDER BY u.first_name, u.last_name
	`
	rows, err := r.db.Query(ctx, query, tenantID, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	teachers := []TeacherResponse{}
	for rows.Next() {
		var teacher TeacherResponse
		var specialization string
		if err := rows.Scan(&teacher.ID, &teacher.FirstName, &teacher.LastName, &teacher.Email, &teacher.Phone, &teacher.EmployeeID, &teacher.Status, &specialization, &teacher.HireDate, &teacher.CreatedAt); err != nil {
			return nil, err
		}
		if specialization != "" {
			teacher.Specialties = []string{specialization}
		} else {
			teacher.Specialties = []string{}
		}
		teachers = append(teachers, teacher)
	}
	return teachers, nil
}

func (r *Repository) getGroupSubjects(ctx context.Context, tenantID, groupID string) ([]SubjectResponse, error) {
	query := `
		SELECT s.id, s.name, COALESCE(s.code, ''), COALESCE(s.description, ''),
		       COALESCE(s.credits, 1), COALESCE(s.grade_id::text, ''),
		       COALESCE(gl.name, ''), COALESCE(s.status, 'active'), 0, 0, s.created_at
		FROM group_subjects gs
		INNER JOIN subjects s ON gs.subject_id = s.id
		LEFT JOIN grade_levels gl ON s.grade_id = gl.id
		WHERE s.tenant_id = $1 AND gs.group_id = $2
		ORDER BY s.name
	`
	rows, err := r.db.Query(ctx, query, tenantID, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	subjects := []SubjectResponse{}
	for rows.Next() {
		var subject SubjectResponse
		if err := rows.Scan(&subject.ID, &subject.Name, &subject.Code, &subject.Description, &subject.Credits, &subject.GradeLevelID, &subject.GradeName, &subject.Status, &subject.TeacherCount, &subject.StudentCount, &subject.CreatedAt); err != nil {
			return nil, err
		}
		subjects = append(subjects, subject)
	}
	return subjects, nil
}

func (r *Repository) GetSubjects(ctx context.Context, tenantID string) ([]SubjectResponse, error) {
	query := `
		SELECT s.id, s.name, COALESCE(s.code, ''), COALESCE(s.description, ''),
		       COALESCE(s.credits, 1), COALESCE(s.grade_id::text, ''),
		       COALESCE(gl.name, ''), COALESCE(s.status, 'active'),
		       (SELECT COUNT(DISTINCT gt.teacher_id) FROM group_teachers gt WHERE gt.subject_id = s.id) as teacher_count,
		       (SELECT COUNT(DISTINCT gs.student_id)
		        FROM group_subjects gsub
		        INNER JOIN group_students gs ON gsub.group_id = gs.group_id
		        WHERE gsub.subject_id = s.id) as student_count,
		       s.created_at
		FROM subjects s
		LEFT JOIN grade_levels gl ON s.grade_id = gl.id
		WHERE s.tenant_id = $1
		ORDER BY s.name
	`
	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get subjects: %w", err)
	}
	defer rows.Close()
	var subjects []SubjectResponse
	for rows.Next() {
		var subject SubjectResponse
		if err := rows.Scan(&subject.ID, &subject.Name, &subject.Code, &subject.Description, &subject.Credits, &subject.GradeLevelID, &subject.GradeName, &subject.Status, &subject.TeacherCount, &subject.StudentCount, &subject.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan subject: %w", err)
		}
		subjects = append(subjects, subject)
	}
	return subjects, nil
}

func (r *Repository) CreateSubject(ctx context.Context, tenantID string, req CreateSubjectRequest) (*SubjectResponse, error) {
	status := req.Status
	if status == "" {
		status = "active"
	}
	credits := req.Credits
	if credits == 0 {
		credits = 1
	}
	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO subjects (tenant_id, grade_id, name, code, description, credits, status)
		VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7)
		RETURNING id
	`, tenantID, req.GradeLevelID, req.Name, req.Code, req.Description, credits, status).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create subject: %w", err)
	}
	return r.GetSubjectByID(ctx, tenantID, id)
}

func (r *Repository) GetSubjectByID(ctx context.Context, tenantID, subjectID string) (*SubjectResponse, error) {
	query := `
		SELECT s.id, s.name, COALESCE(s.code, ''), COALESCE(s.description, ''),
		       COALESCE(s.credits, 1), COALESCE(s.grade_id::text, ''),
		       COALESCE(gl.name, ''), COALESCE(s.status, 'active'), 0, 0, s.created_at
		FROM subjects s
		LEFT JOIN grade_levels gl ON s.grade_id = gl.id
		WHERE s.tenant_id = $1 AND s.id = $2
	`
	var subject SubjectResponse
	if err := r.db.QueryRow(ctx, query, tenantID, subjectID).Scan(&subject.ID, &subject.Name, &subject.Code, &subject.Description, &subject.Credits, &subject.GradeLevelID, &subject.GradeName, &subject.Status, &subject.TeacherCount, &subject.StudentCount, &subject.CreatedAt); err != nil {
		return nil, fmt.Errorf("failed to get subject: %w", err)
	}
	return &subject, nil
}

func (r *Repository) UpdateSubject(ctx context.Context, tenantID, subjectID string, req UpdateSubjectRequest) (*SubjectResponse, error) {
	setParts := []string{}
	args := []interface{}{tenantID, subjectID}
	argCount := 2
	if req.Name != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("name = $%d", argCount))
		args = append(args, req.Name)
	}
	if req.Code != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("code = $%d", argCount))
		args = append(args, req.Code)
	}
	if req.Description != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("description = $%d", argCount))
		args = append(args, req.Description)
	}
	if req.Credits > 0 {
		argCount++
		setParts = append(setParts, fmt.Sprintf("credits = $%d", argCount))
		args = append(args, req.Credits)
	}
	if req.GradeLevelID != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("grade_id = $%d", argCount))
		args = append(args, req.GradeLevelID)
	}
	if req.Status != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("status = $%d", argCount))
		args = append(args, req.Status)
	}
	if len(setParts) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}
	argCount++
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argCount))
	args = append(args, time.Now())
	_, err := r.db.Exec(ctx, fmt.Sprintf(`UPDATE subjects SET %s WHERE tenant_id = $1 AND id = $2`, strings.Join(setParts, ", ")), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update subject: %w", err)
	}
	return r.GetSubjectByID(ctx, tenantID, subjectID)
}

func (r *Repository) DeleteSubject(ctx context.Context, tenantID, subjectID string) error {
	result, err := r.db.Exec(ctx, "DELETE FROM subjects WHERE tenant_id = $1 AND id = $2", tenantID, subjectID)
	if err != nil {
		return fmt.Errorf("failed to delete subject: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("subject not found")
	}
	return nil
}

func (r *Repository) GetSchoolYears(ctx context.Context, tenantID string) ([]SchoolYearResponse, error) {
	query := `
		SELECT sy.id, sy.name, to_char(sy.start_date, 'YYYY-MM-DD'), to_char(sy.end_date, 'YYYY-MM-DD'),
		       sy.status, sy.is_current, COALESCE(sy.notes, ''),
		       (SELECT COUNT(*) FROM groups g WHERE g.school_year_id = sy.id),
		       (SELECT COUNT(DISTINCT gs.student_id) FROM groups g INNER JOIN group_students gs ON gs.group_id = g.id WHERE g.school_year_id = sy.id),
		       sy.created_at, sy.updated_at
		FROM school_years sy
		WHERE sy.tenant_id = $1
		ORDER BY sy.is_current DESC, sy.start_date DESC
	`
	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get school years: %w", err)
	}
	defer rows.Close()
	var years []SchoolYearResponse
	for rows.Next() {
		var year SchoolYearResponse
		if err := rows.Scan(&year.ID, &year.Name, &year.StartDate, &year.EndDate, &year.Status, &year.IsCurrent, &year.Notes, &year.GroupCount, &year.StudentCount, &year.CreatedAt, &year.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan school year: %w", err)
		}
		years = append(years, year)
	}
	return years, nil
}

func (r *Repository) CreateSchoolYear(ctx context.Context, tenantID string, req CreateSchoolYearRequest) (*SchoolYearResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if req.IsCurrent {
		if _, err = tx.Exec(ctx, `UPDATE school_years SET is_current = false, status = CASE WHEN status = 'active' THEN 'closed' ELSE status END WHERE tenant_id = $1`, tenantID); err != nil {
			return nil, err
		}
	}
	status := req.Status
	if status == "" {
		if req.IsCurrent {
			status = "active"
		} else {
			status = "planned"
		}
	}
	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO school_years (tenant_id, name, start_date, end_date, status, is_current, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, tenantID, req.Name, req.StartDate, req.EndDate, status, req.IsCurrent, req.Notes).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create school year: %w", err)
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetSchoolYearByID(ctx, tenantID, id)
}

func (r *Repository) GetSchoolYearByID(ctx context.Context, tenantID, yearID string) (*SchoolYearResponse, error) {
	years, err := r.GetSchoolYears(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	for _, year := range years {
		if year.ID == yearID {
			return &year, nil
		}
	}
	return nil, fmt.Errorf("school year not found")
}

func (r *Repository) UpdateSchoolYear(ctx context.Context, tenantID, yearID string, req UpdateSchoolYearRequest) (*SchoolYearResponse, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if req.IsCurrent != nil && *req.IsCurrent {
		if _, err = tx.Exec(ctx, `UPDATE school_years SET is_current = false, status = CASE WHEN status = 'active' THEN 'closed' ELSE status END WHERE tenant_id = $1 AND id <> $2`, tenantID, yearID); err != nil {
			return nil, err
		}
	}
	setParts := []string{}
	args := []interface{}{tenantID, yearID}
	argCount := 2
	if req.Name != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("name = $%d", argCount))
		args = append(args, req.Name)
	}
	if req.StartDate != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("start_date = $%d", argCount))
		args = append(args, req.StartDate)
	}
	if req.EndDate != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("end_date = $%d", argCount))
		args = append(args, req.EndDate)
	}
	if req.Status != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("status = $%d", argCount))
		args = append(args, req.Status)
	}
	if req.IsCurrent != nil {
		argCount++
		setParts = append(setParts, fmt.Sprintf("is_current = $%d", argCount))
		args = append(args, *req.IsCurrent)
	}
	if req.Notes != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("notes = $%d", argCount))
		args = append(args, req.Notes)
	}
	if len(setParts) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}
	_, err = tx.Exec(ctx, fmt.Sprintf(`UPDATE school_years SET %s WHERE tenant_id = $1 AND id = $2`, strings.Join(setParts, ", ")), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update school year: %w", err)
	}
	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.GetSchoolYearByID(ctx, tenantID, yearID)
}

func (r *Repository) GetSchedule(ctx context.Context, tenantID, groupID string) ([]ScheduleBlockResponse, error) {
	where := "WHERE cs.tenant_id = $1"
	args := []interface{}{tenantID}
	if groupID != "" && groupID != "all" {
		where += " AND cs.group_id = $2"
		args = append(args, groupID)
	}
	query := fmt.Sprintf(`
		SELECT cs.id, cs.group_id, g.name, COALESCE(gl.name, ''), COALESCE(cs.subject_id::text, ''),
		       COALESCE(s.name, ''), COALESCE(cs.teacher_id::text, ''),
		       COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
		       cs.day, to_char(cs.start_time, 'HH24:MI'), to_char(cs.end_time, 'HH24:MI'),
		       COALESCE(cs.room, ''), cs.status, COALESCE(cs.notes, ''), cs.created_at, cs.updated_at
		FROM class_schedule_blocks cs
		INNER JOIN groups g ON cs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_id = gl.id
		LEFT JOIN subjects s ON cs.subject_id = s.id
		LEFT JOIN users u ON cs.teacher_id = u.id
		%s
		ORDER BY cs.day, cs.start_time
	`, where)
	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get schedule: %w", err)
	}
	defer rows.Close()
	var blocks []ScheduleBlockResponse
	for rows.Next() {
		var block ScheduleBlockResponse
		if err := rows.Scan(&block.ID, &block.GroupID, &block.GroupName, &block.GradeName, &block.SubjectID, &block.Subject, &block.TeacherID, &block.TeacherName, &block.Day, &block.StartTime, &block.EndTime, &block.Room, &block.Status, &block.Notes, &block.CreatedAt, &block.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan schedule block: %w", err)
		}
		blocks = append(blocks, block)
	}
	return blocks, nil
}

func (r *Repository) CreateScheduleBlock(ctx context.Context, tenantID string, req CreateScheduleBlockRequest) (*ScheduleBlockResponse, error) {
	status := req.Status
	if status == "" {
		status = "active"
	}
	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO class_schedule_blocks (tenant_id, group_id, subject_id, teacher_id, day, start_time, end_time, room, status, notes)
		VALUES ($1, $2, NULLIF($3, '')::uuid, NULLIF($4, '')::uuid, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`, tenantID, req.GroupID, req.SubjectID, req.TeacherID, req.Day, req.StartTime, req.EndTime, req.Room, status, req.Notes).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create schedule block: %w", err)
	}
	return r.GetScheduleBlock(ctx, tenantID, id)
}

func (r *Repository) GetScheduleBlock(ctx context.Context, tenantID, blockID string) (*ScheduleBlockResponse, error) {
	blocks, err := r.GetSchedule(ctx, tenantID, "")
	if err != nil {
		return nil, err
	}
	for _, block := range blocks {
		if block.ID == blockID {
			return &block, nil
		}
	}
	return nil, fmt.Errorf("schedule block not found")
}

func (r *Repository) UpdateScheduleBlock(ctx context.Context, tenantID, blockID string, req UpdateScheduleBlockRequest) (*ScheduleBlockResponse, error) {
	setParts := []string{}
	args := []interface{}{tenantID, blockID}
	argCount := 2
	add := func(column string, value interface{}) {
		argCount++
		setParts = append(setParts, fmt.Sprintf("%s = $%d", column, argCount))
		args = append(args, value)
	}
	if req.GroupID != "" {
		add("group_id", req.GroupID)
	}
	if req.SubjectID != "" {
		add("subject_id", req.SubjectID)
	}
	if req.TeacherID != "" {
		add("teacher_id", req.TeacherID)
	}
	if req.Day != "" {
		add("day", req.Day)
	}
	if req.StartTime != "" {
		add("start_time", req.StartTime)
	}
	if req.EndTime != "" {
		add("end_time", req.EndTime)
	}
	if req.Room != "" {
		add("room", req.Room)
	}
	if req.Status != "" {
		add("status", req.Status)
	}
	if req.Notes != "" {
		add("notes", req.Notes)
	}
	if len(setParts) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}
	_, err := r.db.Exec(ctx, fmt.Sprintf(`UPDATE class_schedule_blocks SET %s WHERE tenant_id = $1 AND id = $2`, strings.Join(setParts, ", ")), args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update schedule block: %w", err)
	}
	return r.GetScheduleBlock(ctx, tenantID, blockID)
}

func (r *Repository) DeleteScheduleBlock(ctx context.Context, tenantID, blockID string) error {
	result, err := r.db.Exec(ctx, "DELETE FROM class_schedule_blocks WHERE tenant_id = $1 AND id = $2", tenantID, blockID)
	if err != nil {
		return fmt.Errorf("failed to delete schedule block: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("schedule block not found")
	}
	return nil
}

func (r *Repository) FindScheduleConflict(ctx context.Context, tenantID, excludeID, groupID, teacherID, room, day, startTime, endTime string) (string, error) {
	var conflictType, conflictLabel string
	err := r.db.QueryRow(ctx, `
		SELECT conflict_type, conflict_label FROM (
			SELECT 'group' AS conflict_type, COALESCE(g.name, 'Grupo') AS conflict_label
			FROM class_schedule_blocks cs
			LEFT JOIN groups g ON g.id = cs.group_id
			WHERE cs.tenant_id = $1 AND cs.status = 'active'
			  AND cs.id <> COALESCE(NULLIF($2, '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
			  AND cs.day = $3 AND cs.start_time < $5::time AND cs.end_time > $4::time
			  AND cs.group_id = NULLIF($6, '')::uuid
			UNION ALL
			SELECT 'teacher', COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), 'Profesor')
			FROM class_schedule_blocks cs
			LEFT JOIN users u ON u.id = cs.teacher_id
			WHERE cs.tenant_id = $1 AND cs.status = 'active' AND NULLIF($7, '') IS NOT NULL
			  AND cs.id <> COALESCE(NULLIF($2, '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
			  AND cs.day = $3 AND cs.start_time < $5::time AND cs.end_time > $4::time
			  AND cs.teacher_id = NULLIF($7, '')::uuid
			UNION ALL
			SELECT 'classroom', COALESCE(cs.room, 'Salon')
			FROM class_schedule_blocks cs
			WHERE cs.tenant_id = $1 AND cs.status = 'active' AND NULLIF(TRIM($8), '') IS NOT NULL
			  AND cs.id <> COALESCE(NULLIF($2, '')::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
			  AND cs.day = $3 AND cs.start_time < $5::time AND cs.end_time > $4::time
			  AND LOWER(TRIM(cs.room)) = LOWER(TRIM($8))
		) conflicts
		LIMIT 1
	`, tenantID, excludeID, day, startTime, endTime, groupID, teacherID, room).Scan(&conflictType, &conflictLabel)
	if err != nil {
		if strings.Contains(err.Error(), "no rows") {
			return "", nil
		}
		return "", fmt.Errorf("failed to validate schedule conflicts: %w", err)
	}
	switch conflictType {
	case "teacher":
		return fmt.Sprintf("teacher overlap detected for %s", conflictLabel), nil
	case "classroom":
		return fmt.Sprintf("classroom conflict detected for %s", conflictLabel), nil
	default:
		return fmt.Sprintf("time conflict detected for %s", conflictLabel), nil
	}
}

func (r *Repository) GetStudentSchedule(ctx context.Context, tenantID, studentID string) ([]ScheduleBlockResponse, error) {
	var groupID string
	if err := r.db.QueryRow(ctx, `
		SELECT gs.group_id::text
		FROM group_students gs
		INNER JOIN students s ON s.id = gs.student_id AND s.tenant_id = $1
		WHERE gs.student_id = $2
		LIMIT 1
	`, tenantID, studentID).Scan(&groupID); err != nil {
		return []ScheduleBlockResponse{}, nil
	}
	return r.GetSchedule(ctx, tenantID, groupID)
}

func (r *Repository) GetTodayAttendance(ctx context.Context, tenantID, groupID, date string) (*AttendanceResponse, error) {
	if strings.TrimSpace(date) == "" {
		date = time.Now().Format("2006-01-02")
	}
	groupName := ""
	_ = r.db.QueryRow(ctx, `SELECT name FROM groups WHERE tenant_id = $1 AND id = $2`, tenantID, groupID).Scan(&groupName)

	rows, err := r.db.Query(ctx, `
		SELECT s.id, s.first_name, s.last_name,
		       COALESCE(ar.status, 'present') as status,
		       COALESCE(ar.notes, '') as notes,
		       COALESCE(ar.updated_at, NOW()) as last_changed
		FROM group_students gs
		INNER JOIN students s ON gs.student_id = s.id
		LEFT JOIN attendance_records ar
		       ON ar.student_id = s.id AND ar.group_id = gs.group_id AND ar.date = $3::date
		WHERE s.tenant_id = $1 AND gs.group_id = $2
		ORDER BY s.last_name, s.first_name
	`, tenantID, groupID, date)
	if err != nil {
		return nil, fmt.Errorf("failed to get today attendance: %w", err)
	}
	defer rows.Close()

	students := []AttendanceStudent{}
	summary := AttendanceSummary{}
	for rows.Next() {
		var student AttendanceStudent
		if err := rows.Scan(&student.StudentID, &student.FirstName, &student.LastName, &student.Status, &student.Notes, &student.LastChanged); err != nil {
			return nil, fmt.Errorf("failed to scan attendance student: %w", err)
		}
		switch student.Status {
		case "present":
			summary.Present++
		case "absent":
			summary.Absent++
		case "late":
			summary.Late++
		case "sick":
			summary.Sick++
		case "excused":
			summary.Excused++
		}
		students = append(students, student)
	}
	total := len(students)
	if total > 0 {
		summary.Rate = roundFloat(float64(summary.Present+summary.Late+summary.Sick+summary.Excused)/float64(total)*100, 1)
	}

	return &AttendanceResponse{
		GroupID:     groupID,
		GroupName:   groupName,
		Date:        date,
		Students:    students,
		Summary:     summary,
		LastUpdated: time.Now(),
	}, nil
}

func (r *Repository) BulkUpdateAttendance(ctx context.Context, tenantID, groupID string, req BulkAttendanceRequest) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin attendance transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// recorded_by is required by the legacy schema. Use the first school admin in tenant as a safe system recorder.
	var recorderID string
	if err := tx.QueryRow(ctx, `SELECT id FROM users WHERE tenant_id = $1 AND role = 'SCHOOL_ADMIN' ORDER BY created_at LIMIT 1`, tenantID).Scan(&recorderID); err != nil {
		return fmt.Errorf("failed to resolve attendance recorder: %w", err)
	}

	for _, record := range req.Records {
		_, err = tx.Exec(ctx, `
			INSERT INTO attendance_records (tenant_id, student_id, group_id, date, status, recorded_by, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (student_id, group_id, date)
			DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW()
		`, tenantID, record.StudentID, groupID, req.Date, record.Status, recorderID, record.Notes)
		if err != nil {
			return fmt.Errorf("failed to upsert attendance record: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetStudentAttendanceHistory(ctx context.Context, tenantID, studentID, startDate, endDate string) (*AttendanceHistoryResponse, error) {
	if strings.TrimSpace(startDate) == "" {
		startDate = time.Now().AddDate(0, -1, 0).Format("2006-01-02")
	}
	if strings.TrimSpace(endDate) == "" {
		endDate = time.Now().Format("2006-01-02")
	}
	studentName := ""
	if err := r.db.QueryRow(ctx, `
		SELECT TRIM(CONCAT(first_name, ' ', paternal_last_name, ' ', maternal_last_name, ' ', last_name))
		FROM students
		WHERE tenant_id = $1 AND id = $2
	`, tenantID, studentID).Scan(&studentName); err != nil {
		return nil, fmt.Errorf("failed to verify student tenant access: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT to_char(date, 'YYYY-MM-DD'), status, COALESCE(notes, '')
		FROM attendance_records
		WHERE tenant_id = $1 AND student_id = $2 AND date BETWEEN $3::date AND $4::date
		ORDER BY date DESC
	`, tenantID, studentID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get attendance history: %w", err)
	}
	defer rows.Close()

	records := []AttendanceItem{}
	summary := AttendanceSummary{}
	for rows.Next() {
		item := AttendanceItem{}
		if err := rows.Scan(&item.Date, &item.Status, &item.Notes); err != nil {
			return nil, fmt.Errorf("failed to scan attendance history: %w", err)
		}
		addAttendanceSummary(&summary, item.Status)
		records = append(records, item)
	}
	summary.Rate = attendanceRate(summary, len(records))
	return &AttendanceHistoryResponse{StudentID: studentID, StudentName: studentName, StartDate: startDate, EndDate: endDate, Records: records, Summary: summary}, nil
}

func (r *Repository) GetMonthlyAttendanceReport(ctx context.Context, tenantID string, year, month int) (*MonthlyAttendanceReport, error) {
	now := time.Now()
	if year == 0 {
		year = now.Year()
	}
	if month == 0 {
		month = int(now.Month())
	}
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0)

	report := &MonthlyAttendanceReport{Year: year, Month: month, ByGroup: []GroupAttendance{}, ByDate: []DailyAttendance{}, Trends: []AttendanceTrend{}}
	rows, err := r.db.Query(ctx, `
		SELECT status, COUNT(*)
		FROM attendance_records
		WHERE tenant_id = $1 AND date >= $2 AND date < $3
		GROUP BY status
	`, tenantID, start.Format("2006-01-02"), end.Format("2006-01-02"))
	if err != nil {
		return nil, fmt.Errorf("failed to get monthly summary: %w", err)
	}
	for rows.Next() {
		status := ""
		count := 0
		if err := rows.Scan(&status, &count); err != nil {
			rows.Close()
			return nil, err
		}
		addAttendanceSummaryCount(&report.Summary, status, count)
	}
	rows.Close()
	report.Summary.Rate = attendanceRate(report.Summary, report.Summary.Present+report.Summary.Absent+report.Summary.Late+report.Summary.Sick+report.Summary.Excused)

	groupRows, err := r.db.Query(ctx, `
		SELECT COALESCE(g.id::text, ''), COALESCE(g.name, 'Sin grupo'), ar.status, COUNT(*)
		FROM attendance_records ar
		LEFT JOIN groups g ON g.id = ar.group_id AND g.tenant_id = ar.tenant_id
		WHERE ar.tenant_id = $1 AND ar.date >= $2 AND ar.date < $3
		GROUP BY g.id, g.name, ar.status
		ORDER BY g.name
	`, tenantID, start.Format("2006-01-02"), end.Format("2006-01-02"))
	if err != nil {
		return nil, fmt.Errorf("failed to get monthly groups: %w", err)
	}
	groupMap := map[string]*GroupAttendance{}
	for groupRows.Next() {
		groupID, groupName, status := "", "", ""
		count := 0
		if err := groupRows.Scan(&groupID, &groupName, &status, &count); err != nil {
			groupRows.Close()
			return nil, err
		}
		item, ok := groupMap[groupID]
		if !ok {
			item = &GroupAttendance{GroupID: groupID, GroupName: groupName}
			groupMap[groupID] = item
		}
		addAttendanceSummaryCount(&item.Summary, status, count)
	}
	groupRows.Close()
	for _, item := range groupMap {
		total := item.Summary.Present + item.Summary.Absent + item.Summary.Late + item.Summary.Sick + item.Summary.Excused
		item.Summary.Rate = attendanceRate(item.Summary, total)
		report.ByGroup = append(report.ByGroup, *item)
	}

	dateRows, err := r.db.Query(ctx, `
		SELECT to_char(date, 'YYYY-MM-DD'), status, COUNT(*)
		FROM attendance_records
		WHERE tenant_id = $1 AND date >= $2 AND date < $3
		GROUP BY date, status
		ORDER BY date
	`, tenantID, start.Format("2006-01-02"), end.Format("2006-01-02"))
	if err != nil {
		return nil, fmt.Errorf("failed to get daily attendance: %w", err)
	}
	dateMap := map[string]*DailyAttendance{}
	for dateRows.Next() {
		date, status := "", ""
		count := 0
		if err := dateRows.Scan(&date, &status, &count); err != nil {
			dateRows.Close()
			return nil, err
		}
		item, ok := dateMap[date]
		if !ok {
			item = &DailyAttendance{Date: date}
			dateMap[date] = item
		}
		addAttendanceSummaryCount(&item.Summary, status, count)
	}
	dateRows.Close()
	for _, item := range dateMap {
		total := item.Summary.Present + item.Summary.Absent + item.Summary.Late + item.Summary.Sick + item.Summary.Excused
		item.Summary.Rate = attendanceRate(item.Summary, total)
		report.ByDate = append(report.ByDate, *item)
		report.Trends = append(report.Trends, AttendanceTrend{Period: item.Date, Rate: item.Summary.Rate})
	}
	return report, nil
}

func (r *Repository) GetGroupGrades(ctx context.Context, tenantID, groupID, subjectID string) (*GroupGradesResponse, error) {
	groupName := ""
	_ = r.db.QueryRow(ctx, `SELECT name FROM groups WHERE tenant_id = $1 AND id = $2`, tenantID, groupID).Scan(&groupName)
	subjectName := ""
	_ = r.db.QueryRow(ctx, `SELECT name FROM subjects WHERE tenant_id = $1 AND id = $2`, tenantID, subjectID).Scan(&subjectName)

	rows, err := r.db.Query(ctx, `
		SELECT s.id, s.first_name, s.last_name
		FROM group_students gs
		INNER JOIN students s ON gs.student_id = s.id
		WHERE s.tenant_id = $1 AND gs.group_id = $2
		ORDER BY s.last_name, s.first_name
	`, tenantID, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get group students for grades: %w", err)
	}
	defer rows.Close()

	students := []StudentGrade{}
	for rows.Next() {
		var student StudentGrade
		if err := rows.Scan(&student.StudentID, &student.FirstName, &student.LastName); err != nil {
			return nil, fmt.Errorf("failed to scan grade student: %w", err)
		}
		gradeRows, err := r.db.Query(ctx, `
			SELECT id, 'exam' as type, COALESCE(score, 0), 100.0 as max_score,
			       COALESCE(notes, 'Evaluacion') as description, 100.0 as weight,
			       COALESCE(to_char(created_at, 'YYYY-MM-DD'), '') as date,
			       'Profesor' as teacher_name, created_at
			FROM grade_records
			WHERE tenant_id = $1 AND student_id = $2 AND subject_id = $3
			ORDER BY created_at DESC
		`, tenantID, student.StudentID, subjectID)
		if err != nil {
			return nil, fmt.Errorf("failed to get student grades: %w", err)
		}
		total := 0.0
		for gradeRows.Next() {
			var grade GradeResponse
			if err := gradeRows.Scan(&grade.ID, &grade.Type, &grade.Score, &grade.MaxScore, &grade.Description, &grade.Weight, &grade.Date, &grade.TeacherName, &grade.CreatedAt); err != nil {
				gradeRows.Close()
				return nil, fmt.Errorf("failed to scan grade: %w", err)
			}
			total += grade.Score
			student.Grades = append(student.Grades, grade)
		}
		gradeRows.Close()
		if len(student.Grades) > 0 {
			student.Average = total / float64(len(student.Grades))
		}
		student.LetterGrade = letterGrade(student.Average)
		students = append(students, student)
	}

	summary := GradeSummary{StudentCount: len(students)}
	if len(students) > 0 {
		lowest := 100.0
		for _, student := range students {
			summary.Average += student.Average
			if student.Average > summary.Highest {
				summary.Highest = student.Average
			}
			if student.Average < lowest {
				lowest = student.Average
			}
			if student.Average >= 60 {
				summary.PassingRate++
			}
			summary.GradeCount += len(student.Grades)
		}
		summary.Average = summary.Average / float64(len(students))
		summary.Lowest = lowest
		summary.PassingRate = summary.PassingRate / float64(len(students)) * 100
	}

	return &GroupGradesResponse{
		GroupID:     groupID,
		GroupName:   groupName,
		SubjectID:   subjectID,
		SubjectName: subjectName,
		Students:    students,
		Summary:     summary,
	}, nil
}

func (r *Repository) BulkUpdateGrades(ctx context.Context, tenantID, userID string, req BulkGradesRequest) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin grades transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, grade := range req.Grades {
		var groupID string
		if err := tx.QueryRow(ctx, `
			SELECT gs.group_id
			FROM group_students gs
			INNER JOIN groups g ON gs.group_id = g.id
			WHERE g.tenant_id = $1 AND gs.student_id = $2
			ORDER BY gs.enrolled_at DESC
			LIMIT 1
		`, tenantID, grade.StudentID).Scan(&groupID); err != nil {
			return fmt.Errorf("failed to resolve grade group: %w", err)
		}
		period := grade.Type
		if period == "" {
			period = "exam"
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO grade_records (tenant_id, student_id, subject_id, group_id, period, school_year, score, recorded_by, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, '')::uuid, $9)
			ON CONFLICT (student_id, subject_id, period, school_year)
			DO UPDATE SET score = EXCLUDED.score, notes = EXCLUDED.notes, updated_at = NOW()
		`, tenantID, grade.StudentID, grade.SubjectID, groupID, period, time.Now().Format("2006"), grade.Score, userID, grade.Description)
		if err != nil {
			return fmt.Errorf("failed to upsert grade: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) GetStudentReportCard(ctx context.Context, tenantID, studentID, period string) (*ReportCardResponse, error) {
	if strings.TrimSpace(period) == "" {
		period = "current"
	}
	card := &ReportCardResponse{StudentID: studentID, Period: period, SubjectGrades: []SubjectGrade{}, Comments: []TeacherComment{}, GeneratedAt: time.Now()}
	if err := r.db.QueryRow(ctx, `
		SELECT TRIM(CONCAT(s.first_name, ' ', s.paternal_last_name, ' ', s.maternal_last_name, ' ', s.last_name)),
		       COALESCE(g.name, 'Sin grupo')
		FROM students s
		LEFT JOIN group_students gs ON gs.student_id = s.id
		LEFT JOIN groups g ON g.id = gs.group_id
		WHERE s.tenant_id = $1 AND s.id = $2
		LIMIT 1
	`, tenantID, studentID).Scan(&card.StudentName, &card.GroupName); err != nil {
		return nil, fmt.Errorf("failed to get report card student: %w", err)
	}

	rows, err := r.db.Query(ctx, `
		SELECT COALESCE(sub.name, 'Materia'), COALESCE(sub.credits, 0),
		       COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), 'Profesor'),
		       COALESCE(AVG(gr.score), 0),
		       COALESCE(MAX(gr.notes), '')
		FROM grade_records gr
		LEFT JOIN subjects sub ON sub.id = gr.subject_id AND sub.tenant_id = gr.tenant_id
		LEFT JOIN class_schedule_blocks cs ON cs.subject_id = gr.subject_id AND cs.group_id = gr.group_id AND cs.tenant_id = gr.tenant_id AND cs.status = 'active'
		LEFT JOIN users u ON u.id = cs.teacher_id
		WHERE gr.tenant_id = $1 AND gr.student_id = $2
		  AND ($3 = 'current' OR gr.period = $3 OR gr.school_year = $3)
		GROUP BY sub.name, sub.credits, u.first_name, u.last_name
		ORDER BY sub.name
	`, tenantID, studentID, period)
	if err != nil {
		return nil, fmt.Errorf("failed to get report card grades: %w", err)
	}
	defer rows.Close()
	total := 0.0
	for rows.Next() {
		subject := SubjectGrade{}
		comment := ""
		if err := rows.Scan(&subject.SubjectName, &subject.Credits, &subject.TeacherName, &subject.Average, &comment); err != nil {
			return nil, err
		}
		subject.Average = roundFloat(subject.Average, 1)
		subject.LetterGrade = letterGrade(subject.Average)
		subject.Effort = effortLabel(subject.Average)
		subject.Behavior = behaviorLabel(subject.Average)
		card.SubjectGrades = append(card.SubjectGrades, subject)
		if strings.TrimSpace(comment) != "" {
			card.Comments = append(card.Comments, TeacherComment{TeacherName: subject.TeacherName, Subject: subject.SubjectName, Comment: comment, Date: time.Now().Format("2006-01-02")})
		}
		total += subject.Average
	}
	if len(card.SubjectGrades) > 0 {
		card.OverallGPA = roundFloat(total/float64(len(card.SubjectGrades)), 1)
	}
	card.OverallGrade = letterGrade(card.OverallGPA)
	history, _ := r.GetStudentAttendanceHistory(ctx, tenantID, studentID, "", "")
	if history != nil {
		card.AttendanceRate = history.Summary.Rate
	}
	return card, nil
}

func (r *Repository) GetGroupFinalGrades(ctx context.Context, tenantID, groupID string) (*GroupFinalGradesResponse, error) {
	groupName := ""
	_ = r.db.QueryRow(ctx, `SELECT name FROM groups WHERE tenant_id = $1 AND id = $2`, tenantID, groupID).Scan(&groupName)
	rows, err := r.db.Query(ctx, `
		SELECT s.id, s.first_name, s.last_name, COALESCE(AVG(gr.score), 0), COUNT(DISTINCT gr.subject_id)
		FROM group_students gs
		INNER JOIN students s ON s.id = gs.student_id AND s.tenant_id = $1
		LEFT JOIN grade_records gr ON gr.student_id = s.id AND gr.group_id = gs.group_id AND gr.tenant_id = s.tenant_id
		WHERE gs.group_id = $2
		GROUP BY s.id, s.first_name, s.last_name
		ORDER BY COALESCE(AVG(gr.score), 0) DESC, s.last_name, s.first_name
	`, tenantID, groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to get group final grades: %w", err)
	}
	defer rows.Close()
	response := &GroupFinalGradesResponse{GroupID: groupID, GroupName: groupName, Students: []StudentFinalGrade{}}
	total := 0.0
	passing := 0
	for rows.Next() {
		student := StudentFinalGrade{}
		subjectCount := 0
		if err := rows.Scan(&student.StudentID, &student.FirstName, &student.LastName, &student.OverallGPA, &subjectCount); err != nil {
			return nil, err
		}
		student.OverallGPA = roundFloat(student.OverallGPA, 1)
		student.OverallGrade = letterGrade(student.OverallGPA)
		student.Status = "active"
		student.Rank = len(response.Students) + 1
		student.Credits = subjectCount
		history, _ := r.GetStudentAttendanceHistory(ctx, tenantID, student.StudentID, "", "")
		if history != nil {
			student.AttendanceRate = history.Summary.Rate
		}
		if student.OverallGPA >= 60 {
			passing++
		}
		if student.OverallGPA >= 90 {
			response.Summary.HonorRoll++
		}
		if student.OverallGPA < 70 || student.AttendanceRate < 85 {
			response.Summary.AtRisk++
		}
		total += student.OverallGPA
		response.Students = append(response.Students, student)
	}
	if len(response.Students) > 0 {
		response.Summary.AverageGPA = roundFloat(total/float64(len(response.Students)), 1)
		response.Summary.PassingRate = roundFloat(float64(passing)/float64(len(response.Students))*100, 1)
	}
	return response, nil
}

func (r *Repository) GetStudentDocuments(ctx context.Context, tenantID, studentID string) ([]StudentDocumentResponse, error) {
	rows, err := r.db.Query(ctx, `
		SELECT d.id::text, d.student_id::text,
		       TRIM(CONCAT(s.first_name, ' ', s.paternal_last_name, ' ', s.maternal_last_name, ' ', s.last_name)) AS student_name,
		       d.title, COALESCE(d.description, ''), d.category, COALESCE(d.file_name, ''),
		       COALESCE(d.file_url, ''), COALESCE(d.file_size, 0), COALESCE(d.mime_type, ''),
		       COALESCE(d.storage_status, 'digital_only'), COALESCE(d.is_verified, FALSE),
		       COALESCE(d.verified_at::text, ''), COALESCE(TRIM(CONCAT(vu.first_name, ' ', vu.last_name)), ''),
		       d.status, COALESCE(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''),
		       d.created_at, d.updated_at
		FROM school_documents d
		INNER JOIN students s ON s.id = d.student_id AND s.tenant_id = d.tenant_id
		LEFT JOIN users u ON u.id = d.uploaded_by
		LEFT JOIN users vu ON vu.id = d.verified_by
		WHERE d.tenant_id = $1 AND d.student_id = $2 AND d.status <> 'deleted'
		ORDER BY d.created_at DESC
	`, tenantID, studentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get student documents: %w", err)
	}
	defer rows.Close()
	documents := []StudentDocumentResponse{}
	for rows.Next() {
		doc := StudentDocumentResponse{}
		if err := rows.Scan(&doc.ID, &doc.StudentID, &doc.StudentName, &doc.Title, &doc.Description, &doc.Category, &doc.FileName, &doc.FileURL, &doc.FileSize, &doc.MimeType, &doc.StorageStatus, &doc.IsVerified, &doc.VerifiedAt, &doc.VerifiedBy, &doc.Status, &doc.UploadedBy, &doc.CreatedAt, &doc.UpdatedAt); err != nil {
			return nil, err
		}
		documents = append(documents, doc)
	}
	return documents, nil
}

func (r *Repository) GetStudentDocument(ctx context.Context, tenantID, documentID string) (*StudentDocumentResponse, error) {
	var studentID string
	if err := r.db.QueryRow(ctx, `SELECT student_id::text FROM school_documents WHERE tenant_id = $1 AND id = $2`, tenantID, documentID).Scan(&studentID); err != nil {
		return nil, err
	}
	documents, err := r.GetStudentDocuments(ctx, tenantID, studentID)
	if err != nil {
		return nil, err
	}
	for _, doc := range documents {
		if doc.ID == documentID {
			return &doc, nil
		}
	}
	return nil, fmt.Errorf("document not found")
}

func (r *Repository) CreateStudentDocument(ctx context.Context, tenantID, userID string, req CreateStudentDocumentRequest) (*StudentDocumentResponse, error) {
	category := req.Category
	if strings.TrimSpace(category) == "" {
		category = "general"
	}
	storageStatus := req.StorageStatus
	if strings.TrimSpace(storageStatus) == "" {
		storageStatus = "digital_only"
	}
	var documentID string
	err := r.db.QueryRow(ctx, `
		INSERT INTO school_documents (tenant_id, student_id, uploaded_by, title, description, category, file_name, file_url, file_size, mime_type, storage_status, audience, status)
		SELECT $1, s.id, NULLIF($3, '')::uuid, $4, $5, $6, $7, $8, $9, $10, $11, 'staff', 'active'
		FROM students s
		WHERE s.tenant_id = $1 AND s.id = $2
		RETURNING id::text
	`, tenantID, req.StudentID, userID, req.Title, req.Description, category, req.FileName, req.FileURL, req.FileSize, req.MimeType, storageStatus).Scan(&documentID)
	if err != nil {
		return nil, fmt.Errorf("failed to create student document: %w", err)
	}
	return r.GetStudentDocument(ctx, tenantID, documentID)
}

func (r *Repository) UpdateStudentDocument(ctx context.Context, tenantID, documentID string, req CreateStudentDocumentRequest) (*StudentDocumentResponse, error) {
	category := req.Category
	if strings.TrimSpace(category) == "" {
		category = "general"
	}
	storageStatus := req.StorageStatus
	if strings.TrimSpace(storageStatus) == "" {
		storageStatus = "digital_only"
	}
	result, err := r.db.Exec(ctx, `
		UPDATE school_documents
		SET title = $3,
		    description = $4,
		    category = $5,
		    file_name = $6,
		    file_url = $7,
		    file_size = $8,
		    mime_type = $9,
		    storage_status = $10,
		    updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
	`, tenantID, documentID, req.Title, req.Description, category, req.FileName, req.FileURL, req.FileSize, req.MimeType, storageStatus)
	if err != nil {
		return nil, fmt.Errorf("failed to update student document: %w", err)
	}
	if result.RowsAffected() == 0 {
		return nil, fmt.Errorf("document not found")
	}
	return r.GetStudentDocument(ctx, tenantID, documentID)
}

func (r *Repository) VerifyStudentDocument(ctx context.Context, tenantID, userID, documentID string) (*StudentDocumentResponse, error) {
	result, err := r.db.Exec(ctx, `
		UPDATE school_documents
		SET is_verified = TRUE,
		    verified_at = NOW(),
		    verified_by = NULLIF($3, '')::uuid,
		    updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
	`, tenantID, documentID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to verify student document: %w", err)
	}
	if result.RowsAffected() == 0 {
		return nil, fmt.Errorf("document not found")
	}
	return r.GetStudentDocument(ctx, tenantID, documentID)
}

func (r *Repository) DeleteStudentDocument(ctx context.Context, tenantID, documentID string) error {
	result, err := r.db.Exec(ctx, `
		UPDATE school_documents
		SET status = 'deleted', updated_at = NOW()
		WHERE tenant_id = $1 AND id = $2 AND status <> 'deleted'
	`, tenantID, documentID)
	if err != nil {
		return fmt.Errorf("failed to delete student document: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("document not found")
	}
	return nil
}

func (r *Repository) AuditSchoolAction(ctx context.Context, tenantID, userID, action, entity, entityID string, metadata map[string]interface{}) error {
	raw, _ := json.Marshal(metadata)
	_, err := r.db.Exec(ctx, `
		INSERT INTO parent_teacher_audit_logs (tenant_id, actor_id, actor_role, action, resource, resource_id, metadata)
		VALUES ($1, NULLIF($2, '')::uuid, 'SCHOOL_ADMIN', $3, $4, NULLIF($5, '')::uuid, $6::jsonb)
	`, tenantID, userID, action, entity, entityID, string(raw))
	return err
}

func (r *Repository) GetPayments(ctx context.Context, tenantID string, params GetPaymentsParams) (*StudentPaymentsResponse, error) {
	where := []string{"p.tenant_id = $1", "p.deleted_at IS NULL"}
	args := []interface{}{tenantID}
	nextArg := 2

	if strings.TrimSpace(params.StudentID) != "" {
		where = append(where, fmt.Sprintf("p.student_id = $%d", nextArg))
		args = append(args, params.StudentID)
		nextArg++
	}
	if strings.TrimSpace(params.GroupID) != "" {
		where = append(where, fmt.Sprintf("g.id = $%d", nextArg))
		args = append(args, params.GroupID)
		nextArg++
	}
	if strings.TrimSpace(params.Status) != "" && params.Status != "all" {
		where = append(where, fmt.Sprintf("p.status = $%d", nextArg))
		args = append(args, params.Status)
		nextArg++
	}
	if strings.TrimSpace(params.Concept) != "" && params.Concept != "all" {
		where = append(where, fmt.Sprintf("LOWER(p.concept) LIKE LOWER($%d)", nextArg))
		args = append(args, "%"+params.Concept+"%")
		nextArg++
	}
	if strings.TrimSpace(params.FromDate) != "" {
		where = append(where, fmt.Sprintf("p.due_date >= NULLIF($%d, '')::date", nextArg))
		args = append(args, params.FromDate)
		nextArg++
	}
	if strings.TrimSpace(params.ToDate) != "" {
		where = append(where, fmt.Sprintf("p.due_date <= NULLIF($%d, '')::date", nextArg))
		args = append(args, params.ToDate)
		nextArg++
	}

	query := fmt.Sprintf(`
		SELECT p.id::text,
		       s.id::text,
		       TRIM(CONCAT(s.first_name, ' ', s.last_name)) AS student_name,
		       COALESCE(s.enrollment_number, '') AS student_code,
		       COALESCE(g.id::text, '') AS group_id,
		       COALESCE(g.name, '') AS group_name,
		       p.concept,
		       COALESCE(p.description, ''),
		       p.amount::float8,
		       p.currency,
		       TO_CHAR(p.due_date, 'YYYY-MM-DD'),
		       p.paid_at,
		       COALESCE(p.payment_method, ''),
		       COALESCE(p.receipt_number, ''),
		       COALESCE(p.receipt_url, ''),
		       p.status,
		       COALESCE(p.metadata->>'notes', ''),
		       p.created_at
		FROM student_payments p
		INNER JOIN students s ON s.id = p.student_id AND s.tenant_id = p.tenant_id
		LEFT JOIN group_students gs ON gs.student_id = s.id
		LEFT JOIN groups g ON g.id = gs.group_id AND g.tenant_id = p.tenant_id
		WHERE %s
		ORDER BY CASE WHEN p.status = 'overdue' THEN 0 WHEN p.status = 'pending' THEN 1 WHEN p.status = 'partial' THEN 2 ELSE 3 END,
		         p.due_date DESC, p.created_at DESC
	`, strings.Join(where, " AND "))

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	resp := &StudentPaymentsResponse{Payments: []StudentPaymentResponse{}, Summary: StudentPaymentSummary{Currency: "MXN"}}
	for rows.Next() {
		var item StudentPaymentResponse
		var paidAt sql.NullTime
		if err := rows.Scan(&item.ID, &item.StudentID, &item.StudentName, &item.StudentCode, &item.GroupID, &item.GroupName, &item.Concept, &item.Description, &item.Amount, &item.Currency, &item.DueDate, &paidAt, &item.PaymentMethod, &item.ReceiptNumber, &item.ReceiptURL, &item.Status, &item.Notes, &item.CreatedAt); err != nil {
			return nil, err
		}
		if paidAt.Valid {
			item.PaidAt = &paidAt.Time
		}
		if item.Currency != "" {
			resp.Summary.Currency = item.Currency
		}
		switch item.Status {
		case "paid":
			resp.Summary.TotalPaid += item.Amount
			resp.Summary.PaidCount++
		case "overdue":
			resp.Summary.TotalDue += item.Amount
			resp.Summary.TotalOverdue += item.Amount
			resp.Summary.OverdueCount++
		case "partial":
			resp.Summary.TotalDue += item.Amount
			resp.Summary.PartialCount++
		case "cancelled":
			resp.Summary.CancelledCount++
		default:
			resp.Summary.TotalDue += item.Amount
			resp.Summary.PendingCount++
		}
		resp.Payments = append(resp.Payments, item)
	}
	return resp, rows.Err()
}

func (r *Repository) GetPayment(ctx context.Context, tenantID, paymentID string) (*StudentPaymentResponse, error) {
	resp, err := r.GetPayments(ctx, tenantID, GetPaymentsParams{})
	if err != nil {
		return nil, err
	}
	for _, item := range resp.Payments {
		if item.ID == paymentID {
			return &item, nil
		}
	}
	return nil, fmt.Errorf("payment not found")
}

func (r *Repository) CreateStudentCharge(ctx context.Context, tenantID, userID string, req CreateStudentChargeRequest) (*StudentPaymentResponse, error) {
	metadata, _ := json.Marshal(map[string]interface{}{"notes": req.Notes})
	id := database.NewID()
	_, err := r.db.Exec(ctx, `
		INSERT INTO student_payments (id, tenant_id, student_id, concept, description, amount, currency, due_date, status, created_by, metadata)
		SELECT $1, $2, s.id, $4, $5, $6, $7, NULLIF($8, '')::date, 'pending', NULLIF($9, '')::uuid, $10::jsonb
		FROM students s
		WHERE s.tenant_id = $2 AND s.id = $3
	`, id, tenantID, req.StudentID, req.Concept, req.Description, req.Amount, req.Currency, req.DueDate, userID, string(metadata))
	if err != nil {
		return nil, err
	}
	return r.GetPayment(ctx, tenantID, id)
}

func (r *Repository) RecordStudentPayment(ctx context.Context, tenantID, userID, paymentID string, req RecordStudentPaymentRequest) (*StudentPaymentResponse, error) {
	before, err := r.GetPayment(ctx, tenantID, paymentID)
	if err != nil {
		return nil, err
	}
	if req.Amount > before.Amount {
		return nil, fmt.Errorf("payment amount exceeds charge amount")
	}
	status := "paid"
	if req.Amount < before.Amount {
		status = "partial"
	}
	receiptNumber := before.ReceiptNumber
	if receiptNumber == "" {
		suffix := paymentID
		if len(suffix) > 8 {
			suffix = suffix[len(suffix)-8:]
		}
		receiptNumber = "REC-" + time.Now().Format("20060102") + "-" + strings.ToUpper(suffix)
	}
	metadata, _ := json.Marshal(map[string]interface{}{
		"notes":            strings.TrimSpace(req.Notes),
		"reference":        strings.TrimSpace(req.Reference),
		"registered_by":    userID,
		"amount_collected": req.Amount,
	})
	tag, err := r.db.Exec(ctx, `
		UPDATE student_payments
		SET status = $1,
		    paid_at = NOW(),
		    payment_method = $2,
		    receipt_number = $3,
		    receipt_url = COALESCE(NULLIF(receipt_url, ''), '#'),
		    metadata = $4::jsonb,
		    updated_at = NOW()
		WHERE tenant_id = $5 AND id = $6 AND deleted_at IS NULL
	`, status, req.Method, receiptNumber, string(metadata), tenantID, paymentID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, fmt.Errorf("payment not found")
	}
	return r.GetPayment(ctx, tenantID, paymentID)
}
