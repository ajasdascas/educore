package school_admin

import (
	"context"
	"fmt"
	"strconv"
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

// Dashboard & Stats queries
func (r *Repository) GetDashboardStats(ctx context.Context, tenantID string) (*DashboardStats, error) {
	query := `
		SELECT
			(SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND status = 'active') as total_students,
			(SELECT COUNT(*) FROM users u
			 INNER JOIN teacher_profiles tp ON u.id = tp.user_id
			 WHERE u.tenant_id = $1 AND u.status = 'active') as total_teachers,
			(SELECT COUNT(*) FROM groups WHERE tenant_id = $1 AND status = 'active') as total_groups,
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
		whereClause += fmt.Sprintf(" AND (s.first_name ILIKE $%d OR s.last_name ILIKE $%d OR s.email ILIKE $%d)", argCount, argCount, argCount)
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
		SELECT DISTINCT s.id, s.first_name, s.last_name, s.email, s.phone,
			   s.enrollment_id, s.status, COALESCE(g.name, '') as group_name,
			   COALESCE(gl.name, '') as grade_name, s.parent_name, s.parent_email,
			   s.created_at, s.updated_at
		FROM students s
		LEFT JOIN group_students gs ON s.id = gs.student_id
		LEFT JOIN groups g ON gs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_level_id = gl.id
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
	query := `
		INSERT INTO students (tenant_id, first_name, last_name, email, phone, birth_date,
							 address, enrollment_id, parent_name, parent_email, parent_phone, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12, 'active'))
		RETURNING id, first_name, last_name, email, phone, enrollment_id, status,
				  parent_name, parent_email, created_at, updated_at
	`

	var student StudentResponse
	err := r.db.QueryRow(ctx, query,
		tenantID, req.FirstName, req.LastName, req.Email, req.Phone,
		req.BirthDate, req.Address, req.EnrollmentID, req.ParentName,
		req.ParentEmail, req.ParentPhone, req.Status,
	).Scan(
		&student.ID, &student.FirstName, &student.LastName, &student.Email,
		&student.Phone, &student.EnrollmentID, &student.Status,
		&student.ParentName, &student.ParentEmail, &student.CreatedAt, &student.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create student: %w", err)
	}

	// Assign to group if specified
	if req.GroupID != "" {
		_, err = r.db.Exec(ctx, `
			INSERT INTO group_students (group_id, student_id, tenant_id)
			VALUES ($1, $2, $3)
		`, req.GroupID, student.ID, tenantID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign student to group: %w", err)
		}
	}

	return &student, nil
}

func (r *Repository) GetStudentByID(ctx context.Context, tenantID, studentID string) (*StudentDetailResponse, error) {
	query := `
		SELECT s.id, s.first_name, s.last_name, s.email, s.phone, s.birth_date,
			   s.address, s.enrollment_id, s.status, s.parent_name, s.parent_email,
			   s.parent_phone, COALESCE(g.name, '') as group_name,
			   COALESCE(gl.name, '') as grade_name, s.created_at, s.updated_at
		FROM students s
		LEFT JOIN group_students gs ON s.id = gs.student_id
		LEFT JOIN groups g ON gs.group_id = g.id
		LEFT JOIN grade_levels gl ON g.grade_level_id = gl.id
		WHERE s.tenant_id = $1 AND s.id = $2
	`

	var student StudentDetailResponse
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
	if req.Email != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("email = $%d", argCount))
		args = append(args, req.Email)
	}
	if req.Phone != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("phone = $%d", argCount))
		args = append(args, req.Phone)
	}
	if req.Address != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("address = $%d", argCount))
		args = append(args, req.Address)
	}
	if req.ParentName != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("parent_name = $%d", argCount))
		args = append(args, req.ParentName)
	}
	if req.ParentEmail != "" {
		argCount++
		setParts = append(setParts, fmt.Sprintf("parent_email = $%d", argCount))
		args = append(args, req.ParentEmail)
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

	query := fmt.Sprintf(`
		UPDATE students
		SET %s
		WHERE tenant_id = $1 AND id = $2
		RETURNING id, first_name, last_name, email, phone, enrollment_id,
				  status, parent_name, parent_email, created_at, updated_at
	`, strings.Join(setParts, ", "))

	var student StudentResponse
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&student.ID, &student.FirstName, &student.LastName, &student.Email,
		&student.Phone, &student.EnrollmentID, &student.Status,
		&student.ParentName, &student.ParentEmail, &student.CreatedAt, &student.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update student: %w", err)
	}

	// Update group assignment if specified
	if req.GroupID != "" {
		// Remove from current group first
		_, err = r.db.Exec(ctx, `
			DELETE FROM group_students WHERE student_id = $1 AND tenant_id = $2
		`, studentID, tenantID)
		if err != nil {
			return nil, fmt.Errorf("failed to remove student from current group: %w", err)
		}

		// Add to new group
		_, err = r.db.Exec(ctx, `
			INSERT INTO group_students (group_id, student_id, tenant_id)
			VALUES ($1, $2, $3)
		`, req.GroupID, studentID, tenantID)
		if err != nil {
			return nil, fmt.Errorf("failed to assign student to new group: %w", err)
		}
	}

	return &student, nil
}

func (r *Repository) DeleteStudent(ctx context.Context, tenantID, studentID string) error {
	// Start transaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete from related tables first
	_, err = tx.Exec(ctx, "DELETE FROM group_students WHERE student_id = $1 AND tenant_id = $2", studentID, tenantID)
	if err != nil {
		return fmt.Errorf("failed to delete group assignments: %w", err)
	}

	_, err = tx.Exec(ctx, "DELETE FROM parent_student WHERE student_id = $1 AND tenant_id = $2", studentID, tenantID)
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
		SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
			   tp.employee_id, u.status, tp.specialties, tp.hire_date,
			   (SELECT COUNT(*) FROM group_teachers gt WHERE gt.teacher_id = u.id) as group_count,
			   u.created_at
		FROM users u
		INNER JOIN teacher_profiles tp ON u.id = tp.user_id
		WHERE u.tenant_id = $1 AND u.role IN ('SCHOOL_ADMIN', 'TEACHER')
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
		var specialties []string

		err := rows.Scan(
			&teacher.ID, &teacher.FirstName, &teacher.LastName, &teacher.Email,
			&teacher.Phone, &teacher.EmployeeID, &teacher.Status, &specialties,
			&teacher.HireDate, &teacher.GroupCount, &teacher.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan teacher: %w", err)
		}

		teacher.Specialties = specialties
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
	err = tx.QueryRow(ctx, `
		INSERT INTO users (tenant_id, first_name, last_name, email, phone,
						  password_hash, role, status)
		VALUES ($1, $2, $3, $4, $5, '', 'TEACHER', COALESCE($6, 'active'))
		RETURNING id
	`, tenantID, req.FirstName, req.LastName, req.Email, req.Phone, req.Status).Scan(&userID)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create teacher profile
	_, err = tx.Exec(ctx, `
		INSERT INTO teacher_profiles (tenant_id, user_id, employee_id, hire_date,
									 salary, specialties, address)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, tenantID, userID, req.EmployeeID, req.HireDate, req.Salary, req.Specialties, req.Address)
	if err != nil {
		return nil, fmt.Errorf("failed to create teacher profile: %w", err)
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// Return teacher data
	teacher := &TeacherResponse{
		ID:         userID,
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Email:      req.Email,
		Phone:      req.Phone,
		EmployeeID: req.EmployeeID,
		Status:     req.Status,
		Specialties: req.Specialties,
		HireDate:   req.HireDate,
		CreatedAt:  time.Now(),
	}

	return teacher, nil
}

// Validation helper functions
func (r *Repository) StudentEmailExists(ctx context.Context, tenantID, email string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM students WHERE tenant_id = $1 AND email = $2)",
		tenantID, email).Scan(&exists)
	return exists, err
}

func (r *Repository) StudentEmailExistsExcluding(ctx context.Context, tenantID, email, studentID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM students WHERE tenant_id = $1 AND email = $2 AND id != $3)",
		tenantID, email, studentID).Scan(&exists)
	return exists, err
}

func (r *Repository) GroupExists(ctx context.Context, tenantID, groupID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM groups WHERE tenant_id = $1 AND id = $2 AND status = 'active')",
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
		"SELECT EXISTS(SELECT 1 FROM users WHERE tenant_id = $1 AND email = $2 AND role IN ('SCHOOL_ADMIN', 'TEACHER'))",
		tenantID, email).Scan(&exists)
	return exists, err
}

func (r *Repository) GroupNameExists(ctx context.Context, tenantID, name, gradeLevelID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM groups WHERE tenant_id = $1 AND name = $2 AND grade_level_id = $3)",
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
	err := r.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM group_students WHERE tenant_id = $1 AND student_id = $2 AND group_id = $3)",
		tenantID, studentID, groupID).Scan(&exists)
	return exists, err
}

func (r *Repository) StudentBelongsToSubject(ctx context.Context, tenantID, studentID, subjectID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM group_students gs
			INNER JOIN group_teachers gt ON gs.group_id = gt.group_id
			INNER JOIN teacher_subjects ts ON gt.teacher_id = ts.teacher_id
			WHERE gs.tenant_id = $1 AND gs.student_id = $2 AND ts.subject_id = $3
		)
	`, tenantID, studentID, subjectID).Scan(&exists)
	return exists, err
}

// Placeholder implementations for remaining methods
func (r *Repository) GetDetailedStats(ctx context.Context, tenantID string) (*StatsResponse, error) {
	return &StatsResponse{}, nil
}

func (r *Repository) GetTeacherByID(ctx context.Context, tenantID, teacherID string) (*TeacherDetailResponse, error) {
	return &TeacherDetailResponse{}, nil
}

func (r *Repository) UpdateTeacher(ctx context.Context, tenantID, teacherID string, req UpdateTeacherRequest) (*TeacherResponse, error) {
	return &TeacherResponse{}, nil
}

func (r *Repository) GetGroups(ctx context.Context, tenantID string) ([]GroupResponse, error) {
	return []GroupResponse{}, nil
}

func (r *Repository) CreateGroup(ctx context.Context, tenantID string, req CreateGroupRequest) (*GroupResponse, error) {
	return &GroupResponse{}, nil
}

func (r *Repository) GetGroupByID(ctx context.Context, tenantID, groupID string) (*GroupDetailResponse, error) {
	return &GroupDetailResponse{}, nil
}

func (r *Repository) UpdateGroup(ctx context.Context, tenantID, groupID string, req UpdateGroupRequest) (*GroupResponse, error) {
	return &GroupResponse{}, nil
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