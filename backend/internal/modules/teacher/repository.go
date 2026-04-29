package teacher

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func (r *Repository) GetDashboard(ctx context.Context, tenantID, teacherID string) (*DashboardResponse, error) {
	classes, err := r.GetClasses(ctx, tenantID, teacherID)
	if err != nil {
		return nil, err
	}
	messages, _ := r.GetMessages(ctx, tenantID, teacherID, 1, 5)
	stats := DashboardStats{TotalGroups: len(classes), TodayClasses: len(classes)}
	groupSeen := map[string]bool{}
	for _, class := range classes {
		groupSeen[class.GroupID] = true
		stats.TotalStudents += class.StudentCount
	}
	stats.TotalGroups = len(groupSeen)
	if stats.TotalGroups > 0 {
		stats.TotalStudents = int(math.Round(float64(stats.TotalStudents) / float64(stats.TotalGroups)))
	}
	_ = r.db.QueryRow(ctx, `
		SELECT COALESCE(ROUND(AVG(score), 2), 0)::float8
		FROM grade_records
		WHERE tenant_id = $1 AND recorded_by = $2
	`, tenantID, teacherID).Scan(&stats.AverageGrade)
	_ = r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM group_teachers gt
		INNER JOIN groups g ON g.id = gt.group_id AND g.tenant_id = $1
		WHERE gt.teacher_id = $2
		  AND NOT EXISTS (
		      SELECT 1 FROM attendance_records ar
		      WHERE ar.tenant_id = $1 AND ar.group_id = g.id AND ar.date = CURRENT_DATE
		  )
	`, tenantID, teacherID).Scan(&stats.PendingAttendance)
	stats.PendingGrades = len(classes)

	return &DashboardResponse{
		Stats:          stats,
		TodayClasses:   classes,
		RecentMessages: messages,
		Alerts: []TeacherAlert{
			{ID: "attendance", Type: "attendance", Title: "Asistencia pendiente", Message: "Revisa los grupos sin pase de lista de hoy.", Priority: "high"},
			{ID: "grades", Type: "grades", Title: "Calificaciones por publicar", Message: "Mantén actualizado el avance de tus grupos.", Priority: "normal"},
		},
		LastUpdated: time.Now(),
	}, nil
}

func (r *Repository) GetClasses(ctx context.Context, tenantID, teacherID string) ([]TeacherClass, error) {
	rows, err := r.db.Query(ctx, `
		SELECT COALESCE(csb.id::text, CONCAT(g.id::text, '-', COALESCE(s.id::text, 'subject'))),
		       g.id::text,
		       g.name,
		       COALESCE(gl.name, ''),
		       COALESCE(s.id::text, ''),
		       COALESCE(s.name, 'Materia sin asignar'),
		       COALESCE(csb.day, 'monday'),
		       COALESCE(TO_CHAR(csb.start_time, 'HH24:MI'), ''),
		       COALESCE(TO_CHAR(csb.end_time, 'HH24:MI'), ''),
		       COALESCE(csb.room, ''),
		       COALESCE(student_counts.total, 0),
		       COALESCE(csb.status, 'active'),
		       COALESCE(csb.updated_at, NOW())
		FROM group_teachers gt
		INNER JOIN groups g ON g.id = gt.group_id AND g.tenant_id = $1
		LEFT JOIN grade_levels gl ON gl.id = g.grade_id
		LEFT JOIN subjects s ON s.id = gt.subject_id
		LEFT JOIN class_schedule_blocks csb
		       ON csb.group_id = g.id
		      AND csb.tenant_id = $1
		      AND (csb.teacher_id = gt.teacher_id OR csb.teacher_id IS NULL)
		      AND (csb.subject_id = gt.subject_id OR gt.subject_id IS NULL)
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS total FROM group_students gs WHERE gs.group_id = g.id
		) student_counts ON true
		WHERE gt.teacher_id = $2
		ORDER BY g.name, csb.day, csb.start_time
	`, tenantID, teacherID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	classes := []TeacherClass{}
	for rows.Next() {
		var item TeacherClass
		if err := rows.Scan(&item.ID, &item.GroupID, &item.GroupName, &item.GradeName, &item.SubjectID, &item.SubjectName, &item.Day, &item.StartTime, &item.EndTime, &item.Room, &item.StudentCount, &item.Status, &item.UpdatedAt); err != nil {
			return nil, err
		}
		classes = append(classes, item)
	}
	return classes, rows.Err()
}

func (r *Repository) VerifyTeacherGroup(ctx context.Context, tenantID, teacherID, groupID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM group_teachers gt
			INNER JOIN groups g ON g.id = gt.group_id
			WHERE g.tenant_id = $1 AND gt.teacher_id = $2 AND gt.group_id = $3
		)
	`, tenantID, teacherID, groupID).Scan(&exists)
	return exists, err
}

func (r *Repository) GetClassStudents(ctx context.Context, tenantID, teacherID, groupID string) ([]TeacherStudent, error) {
	ok, err := r.VerifyTeacherGroup(ctx, tenantID, teacherID, groupID)
	if err != nil || !ok {
		return nil, fmt.Errorf("group not found or access denied")
	}
	rows, err := r.db.Query(ctx, `
		SELECT s.id::text,
		       s.first_name,
		       s.last_name,
		       COALESCE(s.enrollment_number, ''),
		       g.id::text,
		       g.name,
		       COALESCE(att.rate, 0)::float8,
		       COALESCE(gr.avg_score, 0)::float8,
		       COALESCE(last_att.last_date, ''),
		       s.status,
		       COALESCE(parent_info.parent_id, ''),
		       COALESCE(parent_info.parent_name, '')
		FROM group_students gs
		INNER JOIN students s ON s.id = gs.student_id AND s.tenant_id = $1
		INNER JOIN groups g ON g.id = gs.group_id AND g.tenant_id = $1
		LEFT JOIN LATERAL (
			SELECT ROUND(AVG(CASE WHEN status IN ('present','late') THEN 100 ELSE 0 END), 2) AS rate
			FROM attendance_records WHERE tenant_id = $1 AND student_id = s.id
		) att ON true
		LEFT JOIN LATERAL (
			SELECT ROUND(AVG(score), 2) AS avg_score
			FROM grade_records WHERE tenant_id = $1 AND student_id = s.id
		) gr ON true
		LEFT JOIN LATERAL (
			SELECT TO_CHAR(date, 'YYYY-MM-DD') AS last_date
			FROM attendance_records WHERE tenant_id = $1 AND student_id = s.id ORDER BY date DESC LIMIT 1
		) last_att ON true
		LEFT JOIN LATERAL (
			SELECT u.id::text AS parent_id, CONCAT(u.first_name, ' ', u.last_name) AS parent_name
			FROM parent_student ps
			INNER JOIN users u ON u.id = ps.parent_id
			WHERE ps.student_id = s.id AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
			ORDER BY ps.is_primary DESC
			LIMIT 1
		) parent_info ON true
		WHERE gs.group_id = $2
		ORDER BY s.first_name, s.last_name
	`, tenantID, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	students := []TeacherStudent{}
	for rows.Next() {
		var item TeacherStudent
		if err := rows.Scan(&item.ID, &item.FirstName, &item.LastName, &item.EnrollmentID, &item.GroupID, &item.GroupName, &item.AttendanceRate, &item.AverageGrade, &item.LastAttendance, &item.Status, &item.ParentID, &item.ParentName); err != nil {
			return nil, err
		}
		students = append(students, item)
	}
	return students, rows.Err()
}

func (r *Repository) GetAttendance(ctx context.Context, tenantID, teacherID, groupID, date string) (*AttendanceResponse, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	students, err := r.GetClassStudents(ctx, tenantID, teacherID, groupID)
	if err != nil {
		return nil, err
	}
	groupName := ""
	_ = r.db.QueryRow(ctx, `SELECT name FROM groups WHERE tenant_id = $1 AND id = $2`, tenantID, groupID).Scan(&groupName)
	resp := &AttendanceResponse{GroupID: groupID, GroupName: groupName, Date: date}
	for _, student := range students {
		status := "present"
		notes := ""
		_ = r.db.QueryRow(ctx, `
			SELECT status, COALESCE(notes, '')
			FROM attendance_records
			WHERE tenant_id = $1 AND group_id = $2 AND student_id = $3 AND date = $4
		`, tenantID, groupID, student.ID, date).Scan(&status, &notes)
		resp.Students = append(resp.Students, AttendanceStudent{
			StudentID: student.ID, StudentName: student.FirstName + " " + student.LastName,
			EnrollmentID: student.EnrollmentID, Status: status, Notes: notes,
		})
		switch status {
		case "present":
			resp.Summary.Present++
		case "absent":
			resp.Summary.Absent++
		case "late":
			resp.Summary.Late++
		case "excused":
			resp.Summary.Excused++
		}
	}
	resp.Summary.Total = len(resp.Students)
	return resp, nil
}

func (r *Repository) SaveAttendance(ctx context.Context, tenantID, teacherID string, req AttendanceRequest) error {
	ok, err := r.VerifyTeacherGroup(ctx, tenantID, teacherID, req.GroupID)
	if err != nil || !ok {
		return fmt.Errorf("group not found or access denied")
	}
	if req.Date == "" {
		req.Date = time.Now().Format("2006-01-02")
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, record := range req.Records {
		_, err := tx.Exec(ctx, `
			INSERT INTO attendance_records (tenant_id, student_id, group_id, date, status, recorded_by, notes)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (student_id, group_id, date)
			DO UPDATE SET status = EXCLUDED.status, recorded_by = EXCLUDED.recorded_by, notes = EXCLUDED.notes, updated_at = NOW()
		`, tenantID, record.StudentID, req.GroupID, req.Date, record.Status, teacherID, record.Notes)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *Repository) GetGrades(ctx context.Context, tenantID, teacherID, groupID, subjectID, period string) (*GradesResponse, error) {
	if period == "" {
		period = "current"
	}
	students, err := r.GetClassStudents(ctx, tenantID, teacherID, groupID)
	if err != nil {
		return nil, err
	}
	resp := &GradesResponse{GroupID: groupID, SubjectID: subjectID, Period: period}
	_ = r.db.QueryRow(ctx, `SELECT name FROM groups WHERE tenant_id = $1 AND id = $2`, tenantID, groupID).Scan(&resp.GroupName)
	_ = r.db.QueryRow(ctx, `SELECT name FROM subjects WHERE tenant_id = $1 AND id = $2`, tenantID, subjectID).Scan(&resp.SubjectName)
	totalScore := 0.0
	for _, student := range students {
		score := 0.0
		notes := ""
		_ = r.db.QueryRow(ctx, `
			SELECT COALESCE(score, 0)::float8, COALESCE(notes, '')
			FROM grade_records
			WHERE tenant_id = $1 AND group_id = $2 AND subject_id = $3 AND student_id = $4 AND period = $5
			ORDER BY created_at DESC LIMIT 1
		`, tenantID, groupID, subjectID, student.ID, period).Scan(&score, &notes)
		status := "pending"
		if score >= 60 {
			status = "passing"
		} else if score > 0 {
			status = "at_risk"
		}
		resp.Students = append(resp.Students, GradeStudent{StudentID: student.ID, StudentName: student.FirstName + " " + student.LastName, EnrollmentID: student.EnrollmentID, Score: score, Status: status, Notes: notes})
		totalScore += score
		if score >= 60 {
			resp.Summary.Passing++
		} else if score > 0 {
			resp.Summary.AtRisk++
		}
	}
	resp.Summary.Total = len(resp.Students)
	if resp.Summary.Total > 0 {
		resp.Summary.Average = math.Round((totalScore/float64(resp.Summary.Total))*100) / 100
	}
	return resp, nil
}

func (r *Repository) SaveGrades(ctx context.Context, tenantID, teacherID string, req GradesRequest) error {
	ok, err := r.VerifyTeacherGroup(ctx, tenantID, teacherID, req.GroupID)
	if err != nil || !ok {
		return fmt.Errorf("group not found or access denied")
	}
	if req.Period == "" {
		req.Period = "current"
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, grade := range req.Grades {
		gradeType := grade.Type
		if gradeType == "" {
			gradeType = "exam"
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO grade_records (tenant_id, student_id, subject_id, group_id, period, school_year, score, recorded_by, notes)
			VALUES ($1, $2, $3, $4, $5, EXTRACT(YEAR FROM CURRENT_DATE)::text, $6, $7, $8)
			ON CONFLICT (student_id, subject_id, period, school_year)
			DO UPDATE SET score = EXCLUDED.score, recorded_by = EXCLUDED.recorded_by, notes = EXCLUDED.notes, published_at = NOW(), updated_at = NOW()
		`, tenantID, grade.StudentID, grade.SubjectID, req.GroupID, req.Period, grade.Score, teacherID, grade.Notes)
		if err != nil {
			return err
		}
		_ = gradeType
	}
	return tx.Commit(ctx)
}

func (r *Repository) GetMessages(ctx context.Context, tenantID, teacherID string, page, perPage int) ([]TeacherMessage, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 20
	}
	rows, err := r.db.Query(ctx, `
		SELECT pm.id::text, pm.conversation_id::text,
		       COALESCE(sender.first_name || ' ' || sender.last_name, ''),
		       COALESCE(recipient.first_name || ' ' || recipient.last_name, ''),
		       pm.subject, pm.content, pm.priority, pm.read_at IS NOT NULL, pm.created_at
		FROM parent_messages pm
		LEFT JOIN users sender ON sender.id = pm.sender_id
		LEFT JOIN users recipient ON recipient.id = pm.recipient_id
		WHERE pm.tenant_id = $1 AND (pm.sender_id = $2 OR pm.recipient_id = $2)
		ORDER BY pm.created_at DESC
		LIMIT $3 OFFSET $4
	`, tenantID, teacherID, perPage, (page-1)*perPage)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	messages := []TeacherMessage{}
	for rows.Next() {
		var item TeacherMessage
		if err := rows.Scan(&item.ID, &item.ConversationID, &item.SenderName, &item.RecipientName, &item.Subject, &item.Content, &item.Priority, &item.IsRead, &item.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, item)
	}
	return messages, rows.Err()
}

func (r *Repository) SendMessage(ctx context.Context, tenantID, teacherID string, req SendMessageRequest) (*TeacherMessage, error) {
	if req.Priority == "" {
		req.Priority = "normal"
	}
	var conversationID string
	err := r.db.QueryRow(ctx, `
		INSERT INTO parent_conversations (tenant_id, parent_id, recipient_id, subject)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`, tenantID, req.RecipientID, teacherID, req.Subject).Scan(&conversationID)
	if err != nil {
		return nil, err
	}
	var msg TeacherMessage
	err = r.db.QueryRow(ctx, `
		INSERT INTO parent_messages (tenant_id, conversation_id, sender_id, recipient_id, subject, content, priority)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id::text, conversation_id::text, subject, content, priority, read_at IS NOT NULL, created_at
	`, tenantID, conversationID, teacherID, req.RecipientID, req.Subject, req.Content, req.Priority).
		Scan(&msg.ID, &msg.ConversationID, &msg.Subject, &msg.Content, &msg.Priority, &msg.IsRead, &msg.CreatedAt)
	msg.SenderName = "Profesor"
	msg.RecipientName = "Padre/Tutor"
	return &msg, err
}
