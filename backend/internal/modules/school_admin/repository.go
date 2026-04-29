package school_admin

import (
	"context"
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
		SELECT g.id, g.name, COALESCE(gl.name, '') as grade_name,
			   COALESCE((
			   	SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name))
			   	FROM group_teachers gt
			   	INNER JOIN users u ON gt.teacher_id = u.id
			   	WHERE gt.group_id = g.id
			   	LIMIT 1
			   ), '') as teacher_name,
			   (SELECT COUNT(*) FROM group_students gs WHERE gs.group_id = g.id) as student_count,
			   COALESCE(g.capacity, 0) as max_students,
			   '' as room,
			   g.school_year as schedule,
			   'active' as status,
			   g.created_at
		FROM groups g
		INNER JOIN grade_levels gl ON g.grade_id = gl.id
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
			&group.ID, &group.Name, &group.GradeName, &group.TeacherName,
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

	var groupID string
	err = tx.QueryRow(ctx, `
		INSERT INTO groups (tenant_id, grade_id, name, school_year, capacity)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`, tenantID, req.GradeLevelID, req.Name, schoolYear, maxStudents).Scan(&groupID)
	if err != nil {
		return nil, fmt.Errorf("failed to create group: %w", err)
	}

	if req.TeacherID != "" {
		_, err = tx.Exec(ctx, `
			INSERT INTO group_teachers (group_id, teacher_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, groupID, req.TeacherID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign teacher to group: %w", err)
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
		SELECT g.id, g.name, COALESCE(gl.name, '') as grade_name,
			   COALESCE((
			   	SELECT TRIM(CONCAT(u.first_name, ' ', u.last_name))
			   	FROM group_teachers gt
			   	INNER JOIN users u ON gt.teacher_id = u.id
			   	WHERE gt.group_id = g.id
			   	LIMIT 1
			   ), '') as teacher_name,
			   (SELECT COUNT(*) FROM group_students gs WHERE gs.group_id = g.id) as student_count,
			   COALESCE(g.capacity, 0) as max_students,
			   '' as room,
			   g.school_year as schedule,
			   'active' as status,
			   g.created_at
		FROM groups g
		INNER JOIN grade_levels gl ON g.grade_id = gl.id
		WHERE g.tenant_id = $1 AND g.id = $2
	`

	var group GroupDetailResponse
	group.GroupResponse = &GroupResponse{}
	err := r.db.QueryRow(ctx, query, tenantID, groupID).Scan(
		&group.ID, &group.Name, &group.GradeName, &group.TeacherName,
		&group.StudentCount, &group.MaxStudents, &group.Room, &group.Schedule,
		&group.Status, &group.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get group: %w", err)
	}

	group.Description = ""
	group.Students = []StudentResponse{}
	group.Subjects = []SubjectResponse{}
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
	if req.MaxStudents > 0 {
		argCount++
		setParts = append(setParts, fmt.Sprintf("capacity = $%d", argCount))
		args = append(args, req.MaxStudents)
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

	if req.TeacherID != "" {
		_, err = tx.Exec(ctx, "DELETE FROM group_teachers WHERE group_id = $1", groupID)
		if err != nil {
			return nil, fmt.Errorf("failed to clear group teacher: %w", err)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO group_teachers (group_id, teacher_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, groupID, req.TeacherID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign teacher to group: %w", err)
		}
	}

	if len(setParts) == 0 && req.TeacherID == "" {
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

func (r *Repository) GetSubjects(ctx context.Context, tenantID string) ([]SubjectResponse, error) {
	return []SubjectResponse{}, nil
}

func (r *Repository) CreateSubject(ctx context.Context, tenantID string, req CreateSubjectRequest) (*SubjectResponse, error) {
	return &SubjectResponse{}, nil
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
