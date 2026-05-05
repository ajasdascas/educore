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
			TO_CHAR(gr.created_at, 'YYYY-MM-DD') AS recorded_date
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
