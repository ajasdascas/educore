package student

import (
	"context"
	"fmt"

	"educore/internal/pkg/database"
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// GetProfileByUserID fetches the student profile linked to a users.id.
// Column names match the MySQL schema (001_hostinger_core.sql):
//   - students.maternal_last_name  (not last_name_mother)
//   - students.user_id             (added in 006_student_portal_user_id.sql)
func (r *Repository) GetProfileByUserID(ctx context.Context, userID, tenantID string) (*StudentProfile, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			s.id, s.tenant_id,
			s.first_name,
			COALESCE(s.paternal_last_name, s.last_name, '') AS last_name,
			COALESCE(s.maternal_last_name, '') AS last_name_mother,
			COALESCE(s.email, u.email, '') AS email,
			gs.group_id,
			g.name AS group_name,
			gl.name AS grade_name,
			COALESCE(s.enrollment_number, '') AS enrollment_number,
			s.status
		FROM students s
		INNER JOIN users u ON u.id = s.user_id
		LEFT JOIN group_students gs ON gs.student_id = s.id
		LEFT JOIN groups g ON g.id = gs.group_id
		LEFT JOIN grade_levels gl ON gl.id = g.grade_id
		WHERE s.user_id = $1 AND s.tenant_id = $2
		ORDER BY gs.created_at DESC
		LIMIT 1
	`, userID, tenantID)

	var p StudentProfile
	var groupID, groupName, gradeName *string
	if err := row.Scan(
		&p.ID, &p.TenantID,
		&p.FirstName, &p.LastName, &p.LastNameMother,
		&p.Email,
		&groupID, &groupName, &gradeName,
		&p.EnrollmentNum, &p.Status,
	); err != nil {
		return nil, fmt.Errorf("student.Repository.GetProfileByUserID: %w", err)
	}
	p.GroupID = groupID
	p.GroupName = groupName
	p.GradeName = gradeName
	return &p, nil
}

// GetRecentGrades returns recent grade records for a student.
// Column names match the MySQL schema:
//   - grade_records.score  (not grade)
//   - grade_records.qualitative_value used as eval_type fallback (no eval_type column)
//   - TO_CHAR(...) is translated to DATE_FORMAT(...) automatically by portable_db
func (r *Repository) GetRecentGrades(ctx context.Context, studentID, tenantID string, limit int) ([]GradeSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			COALESCE(s.name, 'Materia') AS subject_name,
			COALESCE(gr.score, 0) AS grade,
			COALESCE(gr.period, '') AS period,
			COALESCE(gr.qualitative_value, 'exam') AS eval_type,
			DATE_FORMAT(gr.created_at, '%Y-%m-%d') AS recorded_date
		FROM grade_records gr
		LEFT JOIN subjects s ON s.id = gr.subject_id
		WHERE gr.student_id = $1 AND gr.tenant_id = $2
		ORDER BY gr.created_at DESC
		LIMIT $3
	`, studentID, tenantID, limit)
	if err != nil {
		return nil, fmt.Errorf("student.Repository.GetRecentGrades: %w", err)
	}
	defer rows.Close()

	var grades []GradeSummary
	for rows.Next() {
		var g GradeSummary
		if err := rows.Scan(&g.SubjectName, &g.Grade, &g.Period, &g.EvalType, &g.RecordedDate); err != nil {
			continue
		}
		grades = append(grades, g)
	}
	if grades == nil {
		grades = []GradeSummary{}
	}
	return grades, nil
}

// GetAttendanceSummary returns aggregated attendance for a student.
// Schema matches: attendance_records.status ENUM('present','absent','late','excused','sick')
func (r *Repository) GetAttendanceSummary(ctx context.Context, studentID, tenantID string) (*AttendanceSummary, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*) AS total_days,
			SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
			SUM(CASE WHEN status = 'absent'  THEN 1 ELSE 0 END) AS absent,
			SUM(CASE WHEN status IN ('late', 'sick') THEN 1 ELSE 0 END) AS late
		FROM attendance_records
		WHERE student_id = $1 AND tenant_id = $2
	`, studentID, tenantID)

	var s AttendanceSummary
	if err := row.Scan(&s.TotalDays, &s.Present, &s.Absent, &s.Late); err != nil {
		return &AttendanceSummary{}, nil
	}
	if s.TotalDays > 0 {
		s.Rate = float64(s.Present) / float64(s.TotalDays) * 100
	}
	return &s, nil
}

// GetMessages returns messages received by the student's user account.
// Uses parent_messages table. DATE_FORMAT used explicitly (not TO_CHAR) because
// the combined datetime format 'YYYY-MM-DD HH24:MI' is not handled by the portable adapter.
func (r *Repository) GetMessages(ctx context.Context, userID, tenantID string) ([]MessageSummary, error) {
	rows, err := r.db.Query(ctx, database.RebindPlaceholders(r.db.Driver(), `
		SELECT
			pm.id,
			COALESCE(u.first_name, u.email, 'Sistema') AS sender_name,
			COALESCE(pm.subject, '') AS subject,
			COALESCE(pm.content, '') AS preview,
			DATE_FORMAT(pm.created_at, '%Y-%m-%d %H:%i') AS sent_at,
			CASE WHEN pm.read_at IS NOT NULL THEN TRUE ELSE FALSE END AS is_read
		FROM parent_messages pm
		LEFT JOIN users u ON u.id = pm.sender_id
		WHERE pm.recipient_id = $1 AND pm.tenant_id = $2
		ORDER BY pm.created_at DESC
		LIMIT 50
	`), userID, tenantID)
	if err != nil {
		return []MessageSummary{}, nil
	}
	defer rows.Close()

	var msgs []MessageSummary
	for rows.Next() {
		var m MessageSummary
		if err := rows.Scan(&m.ID, &m.From, &m.Subject, &m.Preview, &m.SentAt, &m.IsRead); err != nil {
			continue
		}
		msgs = append(msgs, m)
	}
	if msgs == nil {
		msgs = []MessageSummary{}
	}
	return msgs, nil
}

// GetAssignments returns assignments for the student's group.
// Uses student_assignments table. due_date is a DATE column — DATE_FORMAT is safe here;
// the portable adapter also translates TO_CHAR(col,'YYYY-MM-DD') but we use DATE_FORMAT
// explicitly to be unambiguous on MySQL/Hostinger.
func (r *Repository) GetAssignments(ctx context.Context, studentID, tenantID string) ([]AssignmentSummary, error) {
	rows, err := r.db.Query(ctx, database.RebindPlaceholders(r.db.Driver(), `
		SELECT
			sa.id,
			COALESCE(sa.title, '') AS title,
			COALESCE(s.name, '') AS subject_name,
			COALESCE(sa.description, '') AS description,
			COALESCE(DATE_FORMAT(sa.due_date, '%Y-%m-%d'), '') AS due_date,
			COALESCE(sa.status, 'pending') AS status
		FROM student_assignments sa
		LEFT JOIN subjects s ON s.id = sa.subject_id
		WHERE sa.student_id = $1 AND sa.tenant_id = $2
		ORDER BY sa.due_date ASC, sa.created_at DESC
		LIMIT 50
	`), studentID, tenantID)
	if err != nil {
		return []AssignmentSummary{}, nil
	}
	defer rows.Close()

	var items []AssignmentSummary
	for rows.Next() {
		var a AssignmentSummary
		if err := rows.Scan(&a.ID, &a.Title, &a.SubjectName, &a.Description, &a.DueDate, &a.Status); err != nil {
			continue
		}
		items = append(items, a)
	}
	if items == nil {
		items = []AssignmentSummary{}
	}
	return items, nil
}

// GetNotifications returns school notifications for the student.
// notifications table uses user_id (not recipient_id) and has a boolean is_read column directly.
func (r *Repository) GetNotifications(ctx context.Context, userID, tenantID string) ([]NotificationSummary, error) {
	rows, err := r.db.Query(ctx, database.RebindPlaceholders(r.db.Driver(), `
		SELECT
			n.id,
			COALESCE(n.title, '') AS title,
			COALESCE(n.body, n.message, n.content, '') AS message,
			DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i') AS created_at,
			n.is_read
		FROM notifications n
		WHERE n.user_id = $1 AND n.tenant_id = $2
		ORDER BY n.created_at DESC
		LIMIT 50
	`), userID, tenantID)
	if err != nil {
		return []NotificationSummary{}, nil
	}
	defer rows.Close()

	var items []NotificationSummary
	for rows.Next() {
		var n NotificationSummary
		if err := rows.Scan(&n.ID, &n.Title, &n.Message, &n.CreatedAt, &n.IsRead); err != nil {
			continue
		}
		items = append(items, n)
	}
	if items == nil {
		items = []NotificationSummary{}
	}
	return items, nil
}

// MarkNotificationRead marks a notification as read for this student.
func (r *Repository) MarkNotificationRead(ctx context.Context, tenantID, userID, notificationID string) error {
	_, err := r.db.Exec(ctx, database.RebindPlaceholders(r.db.Driver(), `
		UPDATE notifications SET is_read = TRUE, read_at = NOW(), status = 'read'
		WHERE id = $1 AND user_id = $2 AND tenant_id = $3
	`), notificationID, userID, tenantID)
	return err
}

// GetSchedule returns the weekly schedule for the student's group.
// start_time/end_time are TIME columns — TIME_FORMAT is correct for MySQL.
// FIELD() for day ordering is MySQL-only; no portable translation needed since
// this query is MySQL-only (production is Hostinger/MySQL).
func (r *Repository) GetSchedule(ctx context.Context, studentID, tenantID string) ([]ScheduleBlock, error) {
	rows, err := r.db.Query(ctx, database.RebindPlaceholders(r.db.Driver(), `
		SELECT
			csb.id,
			COALESCE(csb.day, '') AS day,
			COALESCE(TIME_FORMAT(csb.start_time, '%H:%i'), '') AS start_time,
			COALESCE(TIME_FORMAT(csb.end_time, '%H:%i'), '') AS end_time,
			COALESCE(s.name, '') AS subject_name,
			COALESCE(CONCAT(u.first_name, ' ', u.last_name), '') AS teacher_name,
			COALESCE(csb.room, '') AS room
		FROM group_students gs
		INNER JOIN class_schedule_blocks csb ON csb.group_id = gs.group_id AND csb.tenant_id = $2
		LEFT JOIN subjects s ON s.id = csb.subject_id
		LEFT JOIN users u ON u.id = csb.teacher_id
		WHERE gs.student_id = $1
		ORDER BY FIELD(csb.day, 'monday','tuesday','wednesday','thursday','friday','saturday'), csb.start_time
		LIMIT 100
	`), studentID, tenantID)
	if err != nil {
		return []ScheduleBlock{}, nil
	}
	defer rows.Close()

	var blocks []ScheduleBlock
	for rows.Next() {
		var b ScheduleBlock
		if err := rows.Scan(&b.ID, &b.Day, &b.StartTime, &b.EndTime, &b.SubjectName, &b.TeacherName, &b.Room); err != nil {
			continue
		}
		blocks = append(blocks, b)
	}
	if blocks == nil {
		blocks = []ScheduleBlock{}
	}
	return blocks, nil
}
