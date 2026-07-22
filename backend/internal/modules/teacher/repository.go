package teacher

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"time"

	"educore/internal/pkg/database"
)

var (
	ErrTeacherAccessDenied        = errors.New("teacher access denied")
	ErrTeacherConfigurationNeeded = errors.New("teacher portal academic configuration is required")
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) getAcademicConfig(ctx context.Context, tenantID string) (string, *float64, error) {
	var schoolYear string
	var passing sql.NullFloat64
	err := r.db.QueryRow(ctx, `
		SELECT
			COALESCE(NULLIF(BTRIM(school_year), ''), ''),
			NULLIF(grading_scale->>'passing', '')::float8
		FROM school_settings
		WHERE tenant_id = $1
	`, tenantID).Scan(&schoolYear, &passing)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil, ErrTeacherConfigurationNeeded
	}
	if err != nil {
		return "", nil, fmt.Errorf("teacher.Repository.getAcademicConfig: %w", err)
	}
	if schoolYear == "" {
		return "", nil, ErrTeacherConfigurationNeeded
	}
	if !passing.Valid {
		return schoolYear, nil, nil
	}
	value := passing.Float64
	return schoolYear, &value, nil
}

func (r *Repository) GetDashboard(ctx context.Context, tenantID, teacherID string) (*DashboardResponse, error) {
	schoolYear, _, err := r.getAcademicConfig(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	classes, err := r.GetClasses(ctx, tenantID, teacherID)
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetDashboard classes: %w", err)
	}
	todayClasses, err := r.getClasses(ctx, tenantID, teacherID, true)
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetDashboard today classes: %w", err)
	}
	messages, err := r.GetMessages(ctx, tenantID, teacherID, 1, 5)
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetDashboard messages: %w", err)
	}

	stats := DashboardStats{TodayClasses: len(todayClasses)}
	groupSeen := map[string]bool{}
	for _, class := range classes {
		groupSeen[class.GroupID] = true
	}
	stats.TotalGroups = len(groupSeen)

	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT gs.student_id)
		FROM group_teachers gt
		INNER JOIN groups g ON g.id = gt.group_id AND g.tenant_id = $1
		INNER JOIN group_students gs ON gs.group_id = g.id
		INNER JOIN students st ON st.id = gs.student_id AND st.tenant_id = $1
		WHERE gt.teacher_id = $2
	`, tenantID, teacherID).Scan(&stats.TotalStudents); err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetDashboard total students: %w", err)
	}

	var average sql.NullFloat64
	if err := r.db.QueryRow(ctx, `
		SELECT ROUND(AVG(gr.score), 2)::float8
		FROM grade_records gr
		INNER JOIN groups g ON g.id = gr.group_id AND g.tenant_id = $1
		INNER JOIN group_teachers gt
			ON gt.group_id = gr.group_id
			AND gt.teacher_id = $2
			AND (gt.subject_id = gr.subject_id OR gt.subject_id IS NULL)
		WHERE gr.tenant_id = $1 AND gr.school_year = $3
	`, tenantID, teacherID, schoolYear).Scan(&average); err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetDashboard average grade: %w", err)
	}
	if average.Valid {
		stats.AverageGrade = &average.Float64
	}

	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT csb.group_id)
		FROM class_schedule_blocks csb
		INNER JOIN groups g ON g.id = csb.group_id AND g.tenant_id = $1
		INNER JOIN group_teachers gt
			ON gt.group_id = csb.group_id
			AND gt.teacher_id = $2
			AND (gt.subject_id = csb.subject_id OR gt.subject_id IS NULL)
		WHERE csb.tenant_id = $1
		  AND csb.status = 'active'
		  AND (csb.teacher_id = $2 OR csb.teacher_id IS NULL)
		  AND LOWER(csb.day) = CASE EXTRACT(ISODOW FROM CURRENT_DATE)::int
			WHEN 1 THEN 'monday'
			WHEN 2 THEN 'tuesday'
			WHEN 3 THEN 'wednesday'
			WHEN 4 THEN 'thursday'
			WHEN 5 THEN 'friday'
			WHEN 6 THEN 'saturday'
			WHEN 7 THEN 'sunday'
		  END
		  AND NOT EXISTS (
			SELECT 1
			FROM attendance_records ar
			WHERE ar.tenant_id = $1
			  AND ar.group_id = csb.group_id
			  AND ar.date = CURRENT_DATE
		  )
	`, tenantID, teacherID).Scan(&stats.PendingAttendance); err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetDashboard pending attendance: %w", err)
	}

	alerts := []TeacherAlert{}
	if stats.PendingAttendance > 0 {
		alerts = append(alerts, TeacherAlert{
			ID:       "attendance",
			Type:     "attendance",
			Title:    "Asistencia pendiente",
			Message:  fmt.Sprintf("Hay %d grupo(s) programado(s) hoy sin pase de lista.", stats.PendingAttendance),
			Priority: "high",
		})
	}

	return &DashboardResponse{
		Stats:          stats,
		TodayClasses:   todayClasses,
		RecentMessages: messages,
		Alerts:         alerts,
		LastUpdated:    time.Now(),
	}, nil
}

func (r *Repository) GetClasses(ctx context.Context, tenantID, teacherID string) ([]TeacherClass, error) {
	return r.getClasses(ctx, tenantID, teacherID, false)
}

func (r *Repository) getClasses(ctx context.Context, tenantID, teacherID string, todayOnly bool) ([]TeacherClass, error) {
	rows, err := r.db.Query(ctx, `
		SELECT COALESCE(csb.id::text, g.id::text || '-' || COALESCE(s.id::text, 'subject')),
		       g.id::text,
		       g.name,
		       COALESCE(gl.name, ''),
		       COALESCE(s.id::text, ''),
		       COALESCE(s.name, 'Materia sin asignar'),
		       COALESCE(csb.day, ''),
		       COALESCE(TO_CHAR(csb.start_time, 'HH24:MI'), ''),
		       COALESCE(TO_CHAR(csb.end_time, 'HH24:MI'), ''),
		       COALESCE(csb.room, ''),
		       (SELECT COUNT(*)
		        FROM group_students gs
		        INNER JOIN students st ON st.id = gs.student_id AND st.tenant_id = $1
		        WHERE gs.group_id = g.id),
		       COALESCE(csb.status, 'unscheduled'),
		       COALESCE(csb.updated_at, g.updated_at)
		FROM group_teachers gt
		INNER JOIN groups g ON g.id = gt.group_id AND g.tenant_id = $1
		LEFT JOIN grade_levels gl ON gl.id = g.grade_id AND gl.tenant_id = $1
		LEFT JOIN subjects s ON s.id = gt.subject_id AND s.tenant_id = $1
		LEFT JOIN class_schedule_blocks csb
		       ON csb.group_id = g.id
		      AND csb.tenant_id = $1
		      AND (csb.teacher_id = gt.teacher_id OR csb.teacher_id IS NULL)
		      AND (csb.subject_id = gt.subject_id OR gt.subject_id IS NULL)
		WHERE gt.teacher_id = $2
		  AND (
			NOT $3::boolean
			OR (
				csb.id IS NOT NULL
				AND LOWER(csb.day) = CASE EXTRACT(ISODOW FROM CURRENT_DATE)::int
					WHEN 1 THEN 'monday'
					WHEN 2 THEN 'tuesday'
					WHEN 3 THEN 'wednesday'
					WHEN 4 THEN 'thursday'
					WHEN 5 THEN 'friday'
					WHEN 6 THEN 'saturday'
					WHEN 7 THEN 'sunday'
				END
			)
		  )
		ORDER BY g.name,
			CASE LOWER(csb.day)
				WHEN 'monday' THEN 1
				WHEN 'tuesday' THEN 2
				WHEN 'wednesday' THEN 3
				WHEN 'thursday' THEN 4
				WHEN 'friday' THEN 5
				WHEN 'saturday' THEN 6
				WHEN 'sunday' THEN 7
				ELSE 8
			END,
			csb.start_time
	`, tenantID, teacherID, todayOnly)
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.getClasses: %w", err)
	}
	defer rows.Close()

	classes := []TeacherClass{}
	for rows.Next() {
		var class TeacherClass
		if err := rows.Scan(&class.ID, &class.GroupID, &class.GroupName, &class.GradeName, &class.SubjectID, &class.SubjectName, &class.Day, &class.StartTime, &class.EndTime, &class.Room, &class.StudentCount, &class.Status, &class.UpdatedAt); err != nil {
			return nil, fmt.Errorf("teacher.Repository.getClasses scan: %w", err)
		}
		classes = append(classes, class)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("teacher.Repository.getClasses rows: %w", err)
	}
	return classes, nil
}

func (r *Repository) VerifyTeacherGroup(ctx context.Context, tenantID, teacherID, groupID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM group_teachers gt
			INNER JOIN groups g ON g.id = gt.group_id
			WHERE g.tenant_id = $1 AND gt.teacher_id = $2 AND gt.group_id = $3
		)
	`, tenantID, teacherID, groupID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("teacher.Repository.VerifyTeacherGroup: %w", err)
	}
	return exists, nil
}

func (r *Repository) verifyTeacherGroupSubject(ctx context.Context, tenantID, teacherID, groupID, subjectID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM group_teachers gt
			INNER JOIN groups g ON g.id = gt.group_id AND g.tenant_id = $1
			INNER JOIN subjects s ON s.id = $4 AND s.tenant_id = $1
			WHERE gt.teacher_id = $2
			  AND gt.group_id = $3
			  AND (gt.subject_id = s.id OR gt.subject_id IS NULL)
		)
	`, tenantID, teacherID, groupID, subjectID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("teacher.Repository.verifyTeacherGroupSubject: %w", err)
	}
	return exists, nil
}

func (r *Repository) GetClassStudents(ctx context.Context, tenantID, teacherID, groupID string) ([]TeacherStudent, error) {
	allowed, err := r.VerifyTeacherGroup(ctx, tenantID, teacherID, groupID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrTeacherAccessDenied
	}
	rows, err := r.db.Query(ctx, `
		SELECT s.id::text,
		       s.first_name,
		       s.last_name,
		       COALESCE(s.enrollment_number, ''),
		       g.id::text,
		       g.name,
		       COALESCE((
		        SELECT ROUND(AVG(CASE WHEN ar.status IN ('present','late') THEN 100 ELSE 0 END), 2)
		        FROM attendance_records ar
		        WHERE ar.tenant_id = $1 AND ar.student_id = s.id
		       ), 0)::float8,
		       COALESCE((
		        SELECT ROUND(AVG(gr.score), 2)
		        FROM grade_records gr
		        WHERE gr.tenant_id = $1 AND gr.student_id = s.id
		       ), 0)::float8,
		       COALESCE((
		        SELECT TO_CHAR(ar.date, 'YYYY-MM-DD')
		        FROM attendance_records ar
		        WHERE ar.tenant_id = $1 AND ar.student_id = s.id
		        ORDER BY ar.date DESC LIMIT 1
		       ), ''),
		       s.status,
		       COALESCE((
		        SELECT u.id::text
		        FROM parent_student ps
		        INNER JOIN users u ON u.id = ps.parent_id AND u.tenant_id = $1
		        WHERE ps.student_id = s.id AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
		        ORDER BY ps.is_primary DESC
		        LIMIT 1
		       ), ''),
		       COALESCE((
		        SELECT NULLIF(BTRIM(CONCAT_WS(' ', u.first_name, u.last_name)), '')
		        FROM parent_student ps
		        INNER JOIN users u ON u.id = ps.parent_id AND u.tenant_id = $1
		        WHERE ps.student_id = s.id AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
		        ORDER BY ps.is_primary DESC
		        LIMIT 1
		       ), '')
		FROM group_students gs
		INNER JOIN students s ON s.id = gs.student_id AND s.tenant_id = $1
		INNER JOIN groups g ON g.id = gs.group_id AND g.tenant_id = $1
		WHERE gs.group_id = $2
		ORDER BY s.first_name, s.last_name
	`, tenantID, groupID)
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetClassStudents: %w", err)
	}
	defer rows.Close()

	students := []TeacherStudent{}
	for rows.Next() {
		var student TeacherStudent
		if err := rows.Scan(&student.ID, &student.FirstName, &student.LastName, &student.EnrollmentID, &student.GroupID, &student.GroupName, &student.AttendanceRate, &student.AverageGrade, &student.LastAttendance, &student.Status, &student.ParentID, &student.ParentName); err != nil {
			return nil, fmt.Errorf("teacher.Repository.GetClassStudents scan: %w", err)
		}
		students = append(students, student)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetClassStudents rows: %w", err)
	}
	return students, nil
}

func (r *Repository) GetAttendance(ctx context.Context, tenantID, teacherID, groupID, date string) (*AttendanceResponse, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	students, err := r.GetClassStudents(ctx, tenantID, teacherID, groupID)
	if err != nil {
		return nil, err
	}
	var groupName string
	if err := r.db.QueryRow(ctx, `SELECT name FROM groups WHERE tenant_id = $1 AND id = $2`, tenantID, groupID).Scan(&groupName); err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetAttendance group: %w", err)
	}

	result := &AttendanceResponse{GroupID: groupID, GroupName: groupName, Date: date, Students: []AttendanceStudent{}}
	for _, student := range students {
		status := "unrecorded"
		notes := ""
		err := r.db.QueryRow(ctx, `
			SELECT status, COALESCE(notes, '')
			FROM attendance_records
			WHERE tenant_id = $1 AND group_id = $2 AND student_id = $3 AND date = $4
		`, tenantID, groupID, student.ID, date).Scan(&status, &notes)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("teacher.Repository.GetAttendance record: %w", err)
		}
		result.Students = append(result.Students, AttendanceStudent{
			StudentID: student.ID, StudentName: student.FirstName + " " + student.LastName,
			EnrollmentID: student.EnrollmentID, Status: status, Notes: notes,
		})
		switch status {
		case "present":
			result.Summary.Present++
		case "absent":
			result.Summary.Absent++
		case "late":
			result.Summary.Late++
		case "excused":
			result.Summary.Excused++
		}
	}
	result.Summary.Total = len(result.Students)
	return result, nil
}

func (r *Repository) SaveAttendance(ctx context.Context, tenantID, teacherID string, req AttendanceRequest) error {
	allowed, err := r.VerifyTeacherGroup(ctx, tenantID, teacherID, req.GroupID)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrTeacherAccessDenied
	}
	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("teacher.Repository.SaveAttendance begin: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, record := range req.Records {
		var studentAllowed bool
		if err := tx.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1
				FROM group_teachers gt
				INNER JOIN groups g ON g.id = gt.group_id AND g.tenant_id = $1
				INNER JOIN group_students gs ON gs.group_id = g.id AND gs.student_id = $4
				INNER JOIN students s ON s.id = gs.student_id AND s.tenant_id = $1
				WHERE gt.teacher_id = $2 AND gt.group_id = $3
			)
		`, tenantID, teacherID, req.GroupID, record.StudentID).Scan(&studentAllowed); err != nil {
			return fmt.Errorf("teacher.Repository.SaveAttendance authorize student: %w", err)
		}
		if !studentAllowed {
			return ErrTeacherAccessDenied
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO attendance_records (tenant_id, student_id, group_id, date, status, recorded_by, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (student_id, group_id, date)
			DO UPDATE SET status = EXCLUDED.status, recorded_by = EXCLUDED.recorded_by, notes = EXCLUDED.notes, updated_at = NOW()
		`, tenantID, record.StudentID, req.GroupID, req.Date, record.Status, teacherID, record.Notes); err != nil {
			return fmt.Errorf("teacher.Repository.SaveAttendance upsert: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("teacher.Repository.SaveAttendance commit: %w", err)
	}
	return nil
}

func (r *Repository) GetGrades(ctx context.Context, tenantID, teacherID, groupID, subjectID, period string) (*GradesResponse, error) {
	if period == "" {
		period = "current"
	}
	allowed, err := r.verifyTeacherGroupSubject(ctx, tenantID, teacherID, groupID, subjectID)
	if err != nil {
		return nil, err
	}
	if !allowed {
		return nil, ErrTeacherAccessDenied
	}
	schoolYear, passingThreshold, err := r.getAcademicConfig(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	students, err := r.GetClassStudents(ctx, tenantID, teacherID, groupID)
	if err != nil {
		return nil, err
	}

	result := &GradesResponse{GroupID: groupID, SubjectID: subjectID, Period: period, Students: []GradeStudent{}}
	result.Summary.PassingThreshold = passingThreshold
	if err := r.db.QueryRow(ctx, `
		SELECT g.name, s.name
		FROM groups g
		INNER JOIN subjects s ON s.id = $3 AND s.tenant_id = $1
		WHERE g.tenant_id = $1 AND g.id = $2
	`, tenantID, groupID, subjectID).Scan(&result.GroupName, &result.SubjectName); err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetGrades context: %w", err)
	}

	totalScore := 0.0
	gradedCount := 0
	for _, student := range students {
		var score sql.NullFloat64
		var notes string
		err := r.db.QueryRow(ctx, `
			SELECT score::float8, COALESCE(notes, '')
			FROM grade_records
			WHERE tenant_id = $1 AND group_id = $2 AND subject_id = $3
			  AND student_id = $4 AND period = $5 AND school_year = $6
			ORDER BY created_at DESC LIMIT 1
		`, tenantID, groupID, subjectID, student.ID, period, schoolYear).Scan(&score, &notes)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("teacher.Repository.GetGrades record: %w", err)
		}

		grade := GradeStudent{
			StudentID: student.ID, StudentName: student.FirstName + " " + student.LastName,
			EnrollmentID: student.EnrollmentID, Status: "pending", Notes: notes,
		}
		if score.Valid {
			value := score.Float64
			grade.Score = &value
			gradedCount++
			totalScore += value
			grade.Status = "graded"
			if passingThreshold != nil && value >= *passingThreshold {
				grade.Status = "passing"
				result.Summary.Passing++
			} else if passingThreshold != nil {
				grade.Status = "at_risk"
				result.Summary.AtRisk++
			}
		}
		result.Students = append(result.Students, grade)
	}
	result.Summary.Total = len(result.Students)
	if gradedCount > 0 {
		result.Summary.Average = math.Round((totalScore/float64(gradedCount))*100) / 100
	}
	return result, nil
}

func (r *Repository) SaveGrades(ctx context.Context, tenantID, teacherID string, req GradesRequest) error {
	allowed, err := r.VerifyTeacherGroup(ctx, tenantID, teacherID, req.GroupID)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrTeacherAccessDenied
	}
	if req.Period == "" {
		req.Period = "current"
	}
	schoolYear, _, err := r.getAcademicConfig(ctx, tenantID)
	if err != nil {
		return err
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("teacher.Repository.SaveGrades begin: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, grade := range req.Grades {
		var gradeAllowed bool
		if err := tx.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1
				FROM group_teachers gt
				INNER JOIN groups g ON g.id = gt.group_id AND g.tenant_id = $1
				INNER JOIN group_students gs ON gs.group_id = g.id AND gs.student_id = $4
				INNER JOIN students st ON st.id = gs.student_id AND st.tenant_id = $1
				INNER JOIN subjects s ON s.id = $5 AND s.tenant_id = $1
				WHERE gt.teacher_id = $2
				  AND gt.group_id = $3
				  AND (gt.subject_id = s.id OR gt.subject_id IS NULL)
			)
		`, tenantID, teacherID, req.GroupID, grade.StudentID, grade.SubjectID).Scan(&gradeAllowed); err != nil {
			return fmt.Errorf("teacher.Repository.SaveGrades authorize grade: %w", err)
		}
		if !gradeAllowed {
			return ErrTeacherAccessDenied
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO grade_records (
				tenant_id, student_id, subject_id, group_id, period, school_year,
				score, recorded_by, notes, custom_fields, published_at
			)
			VALUES (
				$1, $2, $3, $4, $5, $10,
				$6, $7, $8,
				CASE WHEN NULLIF($9, '') IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('evaluation_type', $9::text) END,
				NOW()
			)
			ON CONFLICT (student_id, subject_id, period, school_year)
			DO UPDATE SET
				group_id = EXCLUDED.group_id,
				score = EXCLUDED.score,
				recorded_by = EXCLUDED.recorded_by,
				notes = EXCLUDED.notes,
				custom_fields = COALESCE(grade_records.custom_fields, '{}'::jsonb) || EXCLUDED.custom_fields,
				published_at = NOW(),
				updated_at = NOW()
		`, tenantID, grade.StudentID, grade.SubjectID, req.GroupID, req.Period, grade.Score, teacherID, grade.Notes, grade.Type, schoolYear); err != nil {
			return fmt.Errorf("teacher.Repository.SaveGrades upsert: %w", err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("teacher.Repository.SaveGrades commit: %w", err)
	}
	return nil
}

func (r *Repository) GetMessages(ctx context.Context, tenantID, teacherID string, page, perPage int) ([]TeacherMessage, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	if perPage > 100 {
		perPage = 100
	}
	rows, err := r.db.Query(ctx, `
		SELECT pm.id::text, pm.conversation_id::text,
		       COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', sender.first_name, sender.last_name)), ''), sender.email, ''),
		       COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', recipient.first_name, recipient.last_name)), ''), recipient.email, ''),
		       pm.subject, pm.content, pm.priority, pm.read_at IS NOT NULL, pm.created_at
		FROM parent_messages pm
		LEFT JOIN users sender ON sender.id = pm.sender_id AND sender.tenant_id = pm.tenant_id
		LEFT JOIN users recipient ON recipient.id = pm.recipient_id AND recipient.tenant_id = pm.tenant_id
		WHERE pm.tenant_id = $1 AND (pm.sender_id = $2 OR pm.recipient_id = $2)
		ORDER BY pm.created_at DESC
		LIMIT $3 OFFSET $4
	`, tenantID, teacherID, perPage, (page-1)*perPage)
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetMessages: %w", err)
	}
	defer rows.Close()

	messages := []TeacherMessage{}
	for rows.Next() {
		var message TeacherMessage
		if err := rows.Scan(&message.ID, &message.ConversationID, &message.SenderName, &message.RecipientName, &message.Subject, &message.Content, &message.Priority, &message.IsRead, &message.CreatedAt); err != nil {
			return nil, fmt.Errorf("teacher.Repository.GetMessages scan: %w", err)
		}
		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetMessages rows: %w", err)
	}
	return messages, nil
}

func (r *Repository) GetNotifications(ctx context.Context, tenantID, userID string) ([]TeacherNotification, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			n.id::text,
			COALESCE(n.title, '') AS title,
			COALESCE(n.message, n.body, '') AS message,
			TO_CHAR(n.created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
			n.is_read
		FROM notifications n
		WHERE n.user_id = $1 AND n.tenant_id = $2
		ORDER BY n.created_at DESC
		LIMIT 50
	`, userID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetNotifications: %w", err)
	}
	defer rows.Close()

	notifications := []TeacherNotification{}
	for rows.Next() {
		var notification TeacherNotification
		if err := rows.Scan(&notification.ID, &notification.Title, &notification.Message, &notification.CreatedAt, &notification.IsRead); err != nil {
			return nil, fmt.Errorf("teacher.Repository.GetNotifications scan: %w", err)
		}
		notifications = append(notifications, notification)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetNotifications rows: %w", err)
	}
	return notifications, nil
}

func (r *Repository) GetSchedule(ctx context.Context, tenantID, teacherID string) ([]TeacherClass, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			csb.id::text,
			g.id::text AS group_id,
			g.name AS group_name,
			COALESCE(gl.name, '') AS grade_name,
			COALESCE(s.id::text, '') AS subject_id,
			COALESCE(s.name, '') AS subject_name,
			csb.day,
			TO_CHAR(csb.start_time, 'HH24:MI') AS start_time,
			TO_CHAR(csb.end_time, 'HH24:MI') AS end_time,
			COALESCE(csb.room, '') AS room,
			(SELECT COUNT(*)
			 FROM group_students gs
			 INNER JOIN students st ON st.id = gs.student_id AND st.tenant_id = $1
			 WHERE gs.group_id = g.id) AS student_count,
			csb.status,
			csb.updated_at
		FROM class_schedule_blocks csb
		INNER JOIN groups g ON g.id = csb.group_id AND g.tenant_id = $1
		INNER JOIN group_teachers gt
			ON gt.group_id = csb.group_id
			AND gt.teacher_id = $2
			AND (gt.subject_id = csb.subject_id OR gt.subject_id IS NULL)
		LEFT JOIN grade_levels gl ON gl.id = g.grade_id AND gl.tenant_id = $1
		LEFT JOIN subjects s ON s.id = csb.subject_id AND s.tenant_id = $1
		WHERE csb.tenant_id = $1
		  AND csb.status = 'active'
		  AND (csb.teacher_id = $2 OR csb.teacher_id IS NULL)
		ORDER BY CASE LOWER(csb.day)
			WHEN 'monday' THEN 1
			WHEN 'tuesday' THEN 2
			WHEN 'wednesday' THEN 3
			WHEN 'thursday' THEN 4
			WHEN 'friday' THEN 5
			WHEN 'saturday' THEN 6
			WHEN 'sunday' THEN 7
			ELSE 8
		END, csb.start_time
		LIMIT 100
	`, tenantID, teacherID)
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetSchedule: %w", err)
	}
	defer rows.Close()

	schedule := []TeacherClass{}
	for rows.Next() {
		var class TeacherClass
		if err := rows.Scan(&class.ID, &class.GroupID, &class.GroupName, &class.GradeName, &class.SubjectID, &class.SubjectName, &class.Day, &class.StartTime, &class.EndTime, &class.Room, &class.StudentCount, &class.Status, &class.UpdatedAt); err != nil {
			return nil, fmt.Errorf("teacher.Repository.GetSchedule scan: %w", err)
		}
		schedule = append(schedule, class)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("teacher.Repository.GetSchedule rows: %w", err)
	}
	return schedule, nil
}

func (r *Repository) SendMessage(ctx context.Context, tenantID, teacherID string, req SendMessageRequest) (*TeacherMessage, error) {
	if req.Priority == "" {
		req.Priority = "normal"
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.SendMessage begin: %w", err)
	}
	defer tx.Rollback(ctx)

	var senderName, recipientName string
	err = tx.QueryRow(ctx, `
		SELECT
			COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', sender.first_name, sender.last_name)), ''), sender.email),
			COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', recipient.first_name, recipient.last_name)), ''), recipient.email)
		FROM users sender
		INNER JOIN users recipient
			ON recipient.id = $3
			AND recipient.tenant_id = $1
			AND UPPER(recipient.role) = 'PARENT'
		WHERE sender.id = $2
		  AND sender.tenant_id = $1
		  AND EXISTS (
			SELECT 1
			FROM parent_student ps
			INNER JOIN students st ON st.id = ps.student_id AND st.tenant_id = $1
			INNER JOIN group_students gs ON gs.student_id = st.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $2
			INNER JOIN groups g ON g.id = gt.group_id AND g.tenant_id = $1
			WHERE ps.parent_id = recipient.id
			  AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
		  )
	`, tenantID, teacherID, req.RecipientID).Scan(&senderName, &recipientName)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrTeacherAccessDenied
	}
	if err != nil {
		return nil, fmt.Errorf("teacher.Repository.SendMessage authorize recipient: %w", err)
	}

	var conversationID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO parent_conversations (tenant_id, parent_id, recipient_id, subject)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`, tenantID, req.RecipientID, teacherID, req.Subject).Scan(&conversationID); err != nil {
		return nil, fmt.Errorf("teacher.Repository.SendMessage conversation: %w", err)
	}

	message := TeacherMessage{SenderName: senderName, RecipientName: recipientName}
	if err := tx.QueryRow(ctx, `
		INSERT INTO parent_messages (tenant_id, conversation_id, sender_id, recipient_id, subject, content, priority)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id::text, conversation_id::text, subject, content, priority, read_at IS NOT NULL, created_at
	`, tenantID, conversationID, teacherID, req.RecipientID, req.Subject, req.Content, req.Priority).
		Scan(&message.ID, &message.ConversationID, &message.Subject, &message.Content, &message.Priority, &message.IsRead, &message.CreatedAt); err != nil {
		return nil, fmt.Errorf("teacher.Repository.SendMessage message: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("teacher.Repository.SendMessage commit: %w", err)
	}
	return &message, nil
}
