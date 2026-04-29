package school_admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
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

// Student queries
func (r *Repository) GetStudentsPaginated(ctx context.Context, tenantID string, params GetStudentsParams) ([]StudentResponse, int, error) {
	whereClause := "WHERE s.tenant_id = $1"
	args := []interface{}{tenantID}
	argCount := 1

	if params.Search != "" {
		argCount++
		whereClause += fmt.Sprintf(" AND (s.first_name ILIKE $%d OR s.last_name ILIKE $%d OR s.enrollment_number ILIKE $%d)", argCount, argCount, argCount)
		args = append(args, "%"+params.Search+"%")
	}

	if params.GroupID != "" {
		argCount++
		whereClause += fmt.Sprintf(" AND gs.group_id = $%d", argCount)
		args = append(args, params.GroupID)
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
		%s
	`, whereClause)

	var total int
	err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count students: %w", err)
	}

	// Data query
	offset := (params.Page - 1) * params.PerPage
	dataQuery := fmt.Sprintf(`
		SELECT DISTINCT s.id, s.first_name, s.last_name, '' as email, '' as phone,
			   COALESCE(s.enrollment_number, '') as enrollment_id, s.status,
			   COALESCE(g.name, '') as group_name,
			   COALESCE(gl.name, '') as grade_name,
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
		ORDER BY s.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argCount+1, argCount+2)

	args = append(args, params.PerPage, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get students: %w", err)
	}
	defer rows.Close()

	var students []StudentResponse
	for rows.Next() {
		var student StudentResponse
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

	var student StudentResponse
	err = tx.QueryRow(ctx, `
		INSERT INTO students (tenant_id, enrollment_number, first_name, last_name, birth_date, status, notes)
		VALUES ($1, $2, $3, $4, NULLIF($5, '')::date, $6, $7)
		RETURNING id, first_name, last_name, COALESCE(enrollment_number, ''), status, created_at, updated_at
	`,
		tenantID, req.EnrollmentID, req.FirstName, req.LastName, req.BirthDate, status, req.Address,
	).Scan(
		&student.ID, &student.FirstName, &student.LastName, &student.EnrollmentID,
		&student.Status, &student.CreatedAt, &student.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create student: %w", err)
	}

	student.Email = req.Email
	student.Phone = req.Phone
	student.ParentName = req.ParentName
	student.ParentEmail = req.ParentEmail

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

	if req.ParentEmail != "" {
		parentFirstName, parentLastName := splitFullName(req.ParentName)
		var parentID string
		err = tx.QueryRow(ctx, `
			INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
			VALUES ($1, $2, '', $3, $4, 'PARENT', true)
			ON CONFLICT (tenant_id, email)
			DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, updated_at = NOW()
			RETURNING id
		`, tenantID, req.ParentEmail, parentFirstName, parentLastName).Scan(&parentID)
		if err != nil {
			return nil, fmt.Errorf("failed to create parent user: %w", err)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO parent_student (parent_id, student_id, relationship, is_primary)
			VALUES ($1, $2, 'guardian', true)
			ON CONFLICT (parent_id, student_id) DO UPDATE SET is_primary = true
		`, parentID, student.ID)
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
	err = tx.QueryRow(ctx, `
		INSERT INTO users (tenant_id, first_name, last_name, email,
						  password_hash, role, is_active)
		VALUES ($1, $2, $3, $4, '', 'TEACHER', $5)
		RETURNING id
	`, tenantID, req.FirstName, req.LastName, req.Email, isActive).Scan(&userID)
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

func (r *Repository) GetTodayAttendance(ctx context.Context, tenantID, groupID string) (*AttendanceResponse, error) {
	return &AttendanceResponse{}, nil
}

func (r *Repository) BulkUpdateAttendance(ctx context.Context, tenantID, groupID string, req BulkAttendanceRequest) error {
	return nil
}

func (r *Repository) GetStudentAttendanceHistory(ctx context.Context, tenantID, studentID, startDate, endDate string) (*AttendanceHistoryResponse, error) {
	return &AttendanceHistoryResponse{}, nil
}

func (r *Repository) GetMonthlyAttendanceReport(ctx context.Context, tenantID string, year, month int) (*MonthlyAttendanceReport, error) {
	return &MonthlyAttendanceReport{}, nil
}

func (r *Repository) GetGroupGrades(ctx context.Context, tenantID, groupID, subjectID string) (*GroupGradesResponse, error) {
	return &GroupGradesResponse{}, nil
}

func (r *Repository) BulkUpdateGrades(ctx context.Context, tenantID string, req BulkGradesRequest) error {
	return nil
}

func (r *Repository) GetStudentReportCard(ctx context.Context, tenantID, studentID, period string) (*ReportCardResponse, error) {
	return &ReportCardResponse{}, nil
}

func (r *Repository) GetGroupFinalGrades(ctx context.Context, tenantID, groupID string) (*GroupFinalGradesResponse, error) {
	return &GroupFinalGradesResponse{}, nil
}
