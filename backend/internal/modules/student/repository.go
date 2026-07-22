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

// GetProfileByUserID fetches the student profile linked to a users.id in the
// authenticated tenant. Production uses PostgreSQL/Neon.
func (r *Repository) GetProfileByUserID(ctx context.Context, userID, tenantID string) (*StudentProfile, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			s.id::text, s.tenant_id::text,
			s.first_name,
			COALESCE(s.paternal_last_name, s.last_name, '') AS last_name,
			COALESCE(s.maternal_last_name, '') AS last_name_mother,
			COALESCE(s.email, u.email, '') AS email,
			g.id::text AS group_id,
			g.name AS group_name,
			gl.name AS grade_name,
			COALESCE(s.enrollment_number, '') AS enrollment_number,
			s.status
		FROM students s
		INNER JOIN users u ON u.id = s.user_id AND u.tenant_id = s.tenant_id
		LEFT JOIN group_students gs ON gs.student_id = s.id
		LEFT JOIN groups g ON g.id = gs.group_id AND g.tenant_id = s.tenant_id
		LEFT JOIN grade_levels gl ON gl.id = g.grade_id AND gl.tenant_id = s.tenant_id
		WHERE s.user_id = $1 AND s.tenant_id = $2
		ORDER BY gs.enrolled_at DESC NULLS LAST
		LIMIT 1
	`, userID, tenantID)

	var profile StudentProfile
	var groupID, groupName, gradeName *string
	if err := row.Scan(
		&profile.ID, &profile.TenantID,
		&profile.FirstName, &profile.LastName, &profile.LastNameMother,
		&profile.Email,
		&groupID, &groupName, &gradeName,
		&profile.EnrollmentNum, &profile.Status,
	); err != nil {
		return nil, fmt.Errorf("student.Repository.GetProfileByUserID: %w", err)
	}
	profile.GroupID = groupID
	profile.GroupName = groupName
	profile.GradeName = gradeName
	return &profile, nil
}

// GetRecentGrades returns persisted grade records for a student. Evaluation
// type is optional and comes from custom_fields when it was actually captured.
func (r *Repository) GetRecentGrades(ctx context.Context, studentID, tenantID string, limit int) ([]GradeSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			COALESCE(s.name, 'Materia') AS subject_name,
			COALESCE(gr.score, 0)::float8 AS grade,
			COALESCE(gr.period, '') AS period,
			COALESCE(gr.custom_fields->>'evaluation_type', '') AS eval_type,
			TO_CHAR(gr.created_at, 'YYYY-MM-DD') AS recorded_date
		FROM grade_records gr
		LEFT JOIN subjects s ON s.id = gr.subject_id AND s.tenant_id = gr.tenant_id
		WHERE gr.student_id = $1 AND gr.tenant_id = $2
		ORDER BY gr.created_at DESC
		LIMIT $3
	`, studentID, tenantID, limit)
	if err != nil {
		return nil, fmt.Errorf("student.Repository.GetRecentGrades: %w", err)
	}
	defer rows.Close()

	grades := []GradeSummary{}
	for rows.Next() {
		var grade GradeSummary
		if err := rows.Scan(&grade.SubjectName, &grade.Grade, &grade.Period, &grade.EvalType, &grade.RecordedDate); err != nil {
			return nil, fmt.Errorf("student.Repository.GetRecentGrades scan: %w", err)
		}
		grades = append(grades, grade)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("student.Repository.GetRecentGrades rows: %w", err)
	}
	return grades, nil
}

func (r *Repository) GetAttendanceSummary(ctx context.Context, studentID, tenantID string) (*AttendanceSummary, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*) AS total_days,
			COALESCE(SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END), 0) AS present,
			COALESCE(SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END), 0) AS absent,
			COALESCE(SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END), 0) AS late
		FROM attendance_records
		WHERE student_id = $1 AND tenant_id = $2
	`, studentID, tenantID)

	var summary AttendanceSummary
	if err := row.Scan(&summary.TotalDays, &summary.Present, &summary.Absent, &summary.Late); err != nil {
		return nil, fmt.Errorf("student.Repository.GetAttendanceSummary: %w", err)
	}
	if summary.TotalDays > 0 {
		summary.Rate = float64(summary.Present) / float64(summary.TotalDays) * 100
	}
	return &summary, nil
}

func (r *Repository) GetMessages(ctx context.Context, userID, tenantID string) ([]MessageSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			pm.id::text,
			COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email, 'Sistema') AS sender_name,
			COALESCE(pm.subject, '') AS subject,
			COALESCE(pm.content, '') AS preview,
			TO_CHAR(pm.created_at, 'YYYY-MM-DD HH24:MI') AS sent_at,
			pm.read_at IS NOT NULL AS is_read
		FROM parent_messages pm
		LEFT JOIN users u ON u.id = pm.sender_id AND u.tenant_id = pm.tenant_id
		WHERE pm.recipient_id = $1 AND pm.tenant_id = $2
		ORDER BY pm.created_at DESC
		LIMIT 50
	`, userID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("student.Repository.GetMessages: %w", err)
	}
	defer rows.Close()

	messages := []MessageSummary{}
	for rows.Next() {
		var message MessageSummary
		if err := rows.Scan(&message.ID, &message.From, &message.Subject, &message.Preview, &message.SentAt, &message.IsRead); err != nil {
			return nil, fmt.Errorf("student.Repository.GetMessages scan: %w", err)
		}
		messages = append(messages, message)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("student.Repository.GetMessages rows: %w", err)
	}
	return messages, nil
}

func (r *Repository) GetAssignments(ctx context.Context, studentID, tenantID string) ([]AssignmentSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			sa.id::text,
			COALESCE(sa.title, '') AS title,
			COALESCE(s.name, '') AS subject_name,
			COALESCE(sa.description, '') AS description,
			TO_CHAR(sa.due_date, 'YYYY-MM-DD') AS due_date,
			COALESCE(sa.status, 'pending') AS status
		FROM student_assignments sa
		LEFT JOIN subjects s ON s.id = sa.subject_id AND s.tenant_id = sa.tenant_id
		WHERE sa.student_id = $1 AND sa.tenant_id = $2
		ORDER BY sa.due_date ASC, sa.created_at DESC
		LIMIT 50
	`, studentID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("student.Repository.GetAssignments: %w", err)
	}
	defer rows.Close()

	assignments := []AssignmentSummary{}
	for rows.Next() {
		var assignment AssignmentSummary
		if err := rows.Scan(&assignment.ID, &assignment.Title, &assignment.SubjectName, &assignment.Description, &assignment.DueDate, &assignment.Status); err != nil {
			return nil, fmt.Errorf("student.Repository.GetAssignments scan: %w", err)
		}
		assignments = append(assignments, assignment)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("student.Repository.GetAssignments rows: %w", err)
	}
	return assignments, nil
}

func (r *Repository) GetNotifications(ctx context.Context, userID, tenantID string) ([]NotificationSummary, error) {
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
		return nil, fmt.Errorf("student.Repository.GetNotifications: %w", err)
	}
	defer rows.Close()

	notifications := []NotificationSummary{}
	for rows.Next() {
		var notification NotificationSummary
		if err := rows.Scan(&notification.ID, &notification.Title, &notification.Message, &notification.CreatedAt, &notification.IsRead); err != nil {
			return nil, fmt.Errorf("student.Repository.GetNotifications scan: %w", err)
		}
		notifications = append(notifications, notification)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("student.Repository.GetNotifications rows: %w", err)
	}
	return notifications, nil
}

func (r *Repository) GetSchedule(ctx context.Context, studentID, tenantID string) ([]ScheduleBlock, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			csb.id::text,
			csb.day,
			TO_CHAR(csb.start_time, 'HH24:MI') AS start_time,
			TO_CHAR(csb.end_time, 'HH24:MI') AS end_time,
			COALESCE(s.name, '') AS subject_name,
			COALESCE(NULLIF(BTRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), '') AS teacher_name,
			COALESCE(csb.room, '') AS room
		FROM group_students gs
		INNER JOIN class_schedule_blocks csb ON csb.group_id = gs.group_id AND csb.tenant_id = $2
		LEFT JOIN subjects s ON s.id = csb.subject_id AND s.tenant_id = csb.tenant_id
		LEFT JOIN users u ON u.id = csb.teacher_id AND u.tenant_id = csb.tenant_id
		WHERE gs.student_id = $1 AND csb.status = 'active'
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
	`, studentID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("student.Repository.GetSchedule: %w", err)
	}
	defer rows.Close()

	blocks := []ScheduleBlock{}
	for rows.Next() {
		var block ScheduleBlock
		if err := rows.Scan(&block.ID, &block.Day, &block.StartTime, &block.EndTime, &block.SubjectName, &block.TeacherName, &block.Room); err != nil {
			return nil, fmt.Errorf("student.Repository.GetSchedule scan: %w", err)
		}
		blocks = append(blocks, block)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("student.Repository.GetSchedule rows: %w", err)
	}
	return blocks, nil
}
