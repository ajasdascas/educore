package reports

import (
	"context"
	"database/sql"
	"educore/internal/pkg/database"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

func appendInCondition(conditions []string, args []interface{}, column string, values []string) ([]string, []interface{}) {
	if len(values) == 0 {
		return conditions, args
	}
	placeholders := make([]string, 0, len(values))
	for _, value := range values {
		args = append(args, value)
		placeholders = append(placeholders, fmt.Sprintf("$%d", len(args)))
	}
	return append(conditions, fmt.Sprintf("%s IN (%s)", column, strings.Join(placeholders, ","))), args
}

// Report management
func (r *Repository) CreateReport(ctx context.Context, tenantID, userID string, req GenerateReportRequest) (*ReportResponse, error) {
	query := `
		INSERT INTO reports (tenant_id, name, type, status, format, filters, generated_by, start_date, end_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at
	`

	filtersJSON, _ := json.Marshal(req.Filters)
	name := fmt.Sprintf("Reporte de %s - %s a %s", req.Type, req.StartDate, req.EndDate)

	var id string
	var createdAt time.Time
	err := r.db.QueryRowContext(ctx, query,
		tenantID, name, req.Type, "pending", req.Format,
		filtersJSON, userID, req.StartDate, req.EndDate,
	).Scan(&id, &createdAt)

	if err != nil {
		return nil, err
	}

	return &ReportResponse{
		ID:          id,
		TenantID:    tenantID,
		Name:        name,
		Type:        req.Type,
		Status:      "pending",
		Format:      req.Format,
		GeneratedBy: userID,
		StartDate:   req.StartDate,
		EndDate:     req.EndDate,
		CreatedAt:   createdAt,
	}, nil
}

func (r *Repository) GetReports(ctx context.Context, tenantID string, page, perPage int) ([]ReportResponse, int, error) {
	countQuery := `SELECT COUNT(*) FROM reports WHERE tenant_id = $1`
	var total int
	r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&total)

	query := `
		SELECT id, name, type, status, format, file_url, generated_by,
			   start_date, end_date, created_at, completed_at
		FROM reports
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	offset := (page - 1) * perPage
	rows, err := r.db.QueryContext(ctx, query, tenantID, perPage, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var reports []ReportResponse
	for rows.Next() {
		var report ReportResponse
		var fileURL, completedAt sql.NullString

		err := rows.Scan(
			&report.ID, &report.Name, &report.Type, &report.Status, &report.Format,
			&fileURL, &report.GeneratedBy, &report.StartDate, &report.EndDate,
			&report.CreatedAt, &completedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		report.TenantID = tenantID
		if fileURL.Valid {
			report.FileURL = &fileURL.String
		}
		if completedAt.Valid {
			parsed, _ := time.Parse(time.RFC3339, completedAt.String)
			report.CompletedAt = &parsed
		}

		reports = append(reports, report)
	}

	return reports, total, nil
}

func (r *Repository) UpdateReportStatus(ctx context.Context, tenantID, reportID, status string, fileURL *string) error {
	query := `
		UPDATE reports
		SET status = $1, file_url = $2, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END
		WHERE tenant_id = $3 AND id = $4
	`
	_, err := r.db.ExecContext(ctx, query, status, fileURL, tenantID, reportID)
	return err
}

// Attendance reports
func (r *Repository) GetAttendanceReport(ctx context.Context, tenantID, startDate, endDate string, filters ReportFilters) (*AttendanceReportResponse, error) {
	// Build WHERE clause based on filters
	whereConditions := []string{"ar.tenant_id = $1", "ar.date BETWEEN $2 AND $3"}
	args := []interface{}{tenantID, startDate, endDate}

	if len(filters.GroupIDs) > 0 {
		whereConditions, args = appendInCondition(whereConditions, args, "s.group_id", filters.GroupIDs)
	}

	if len(filters.StudentIDs) > 0 {
		whereConditions, args = appendInCondition(whereConditions, args, "ar.student_id", filters.StudentIDs)
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Get summary
	summaryQuery := fmt.Sprintf(`
		SELECT
			COUNT(DISTINCT ar.date) as total_days,
			COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_days,
			COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_days,
			COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_days,
			COUNT(CASE WHEN ar.status = 'excused' THEN 1 END) as excused_days
		FROM attendance_records ar
		JOIN students s ON s.id = ar.student_id
		WHERE %s
	`, whereClause)

	var summary AttendanceSummary
	err := r.db.QueryRowContext(ctx, summaryQuery, args...).Scan(
		&summary.TotalDays, &summary.PresentDays, &summary.AbsentDays,
		&summary.LateDays, &summary.ExcusedDays,
	)
	if err != nil {
		return nil, err
	}

	if summary.TotalDays > 0 {
		summary.AttendanceRate = float64(summary.PresentDays) / float64(summary.TotalDays) * 100
	}

	// Get details
	detailsQuery := fmt.Sprintf(`
		SELECT ar.date, ar.student_id, s.first_name || ' ' || s.last_name,
			   g.name, ar.status, ar.notes
		FROM attendance_records ar
		JOIN students s ON s.id = ar.student_id
		JOIN groups g ON g.id = s.group_id
		WHERE %s
		ORDER BY ar.date DESC, s.last_name, s.first_name
		LIMIT 1000
	`, whereClause)

	rows, err := r.db.QueryContext(ctx, detailsQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var details []AttendanceDetail
	for rows.Next() {
		var detail AttendanceDetail
		var notes sql.NullString

		err := rows.Scan(
			&detail.Date, &detail.StudentID, &detail.StudentName,
			&detail.GroupName, &detail.Status, &notes,
		)
		if err != nil {
			return nil, err
		}

		if notes.Valid {
			detail.Notes = &notes.String
		}

		details = append(details, detail)
	}

	return &AttendanceReportResponse{
		Summary: summary,
		Details: details,
		Period: ReportPeriod{
			StartDate: startDate,
			EndDate:   endDate,
			Type:      "date_range",
		},
	}, nil
}

// Grades reports
func (r *Repository) GetGradesReport(ctx context.Context, tenantID, startDate, endDate string, filters ReportFilters) (*GradesReportResponse, error) {
	whereConditions := []string{"g.tenant_id = $1", "g.evaluation_date BETWEEN $2 AND $3"}
	args := []interface{}{tenantID, startDate, endDate}

	if len(filters.GroupIDs) > 0 {
		whereConditions, args = appendInCondition(whereConditions, args, "s.group_id", filters.GroupIDs)
	}

	if len(filters.StudentIDs) > 0 {
		whereConditions, args = appendInCondition(whereConditions, args, "g.student_id", filters.StudentIDs)
	}

	if len(filters.SubjectIDs) > 0 {
		whereConditions, args = appendInCondition(whereConditions, args, "g.subject_id", filters.SubjectIDs)
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Get summary
	summaryQuery := fmt.Sprintf(`
		SELECT
			COUNT(DISTINCT g.student_id) as total_students,
			COUNT(CASE WHEN g.grade >= (g.max_grade * 0.6) THEN 1 END) as passing_students,
			COUNT(CASE WHEN g.grade < (g.max_grade * 0.6) THEN 1 END) as failing_students,
			AVG(g.grade) as average_grade,
			MAX(g.grade) as highest_grade,
			MIN(g.grade) as lowest_grade
		FROM grades g
		JOIN students s ON s.id = g.student_id
		WHERE %s
	`, whereClause)

	var summary GradesSummary
	err := r.db.QueryRowContext(ctx, summaryQuery, args...).Scan(
		&summary.TotalStudents, &summary.PassingStudents, &summary.FailingStudents,
		&summary.AverageGrade, &summary.HighestGrade, &summary.LowestGrade,
	)
	if err != nil {
		return nil, err
	}

	// Get details
	detailsQuery := fmt.Sprintf(`
		SELECT g.student_id, s.first_name || ' ' || s.last_name,
			   gr.name, sub.name, g.grade, g.max_grade,
			   u.first_name || ' ' || u.last_name, g.evaluation_date
		FROM grades g
		JOIN students s ON s.id = g.student_id
		JOIN groups gr ON gr.id = s.group_id
		JOIN subjects sub ON sub.id = g.subject_id
		JOIN users u ON u.id = g.teacher_id
		WHERE %s
		ORDER BY g.evaluation_date DESC, s.last_name, s.first_name
		LIMIT 1000
	`, whereClause)

	rows, err := r.db.QueryContext(ctx, detailsQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var details []GradeDetail
	for rows.Next() {
		var detail GradeDetail
		err := rows.Scan(
			&detail.StudentID, &detail.StudentName, &detail.GroupName,
			&detail.SubjectName, &detail.Grade, &detail.MaxGrade,
			&detail.TeacherName, &detail.EvaluationDate,
		)
		if err != nil {
			return nil, err
		}

		details = append(details, detail)
	}

	return &GradesReportResponse{
		Summary: summary,
		Details: details,
		Period: ReportPeriod{
			StartDate: startDate,
			EndDate:   endDate,
			Type:      "date_range",
		},
	}, nil
}

// Academic summary
func (r *Repository) GetAcademicSummary(ctx context.Context, tenantID string, filters ReportFilters) (*AcademicSummaryResponse, error) {
	// Overview
	overviewQuery := `
		SELECT
			(SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND status = 'active') as total_students,
			(SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'TEACHER' AND is_active = true) as total_teachers,
			(SELECT COUNT(*) FROM groups WHERE tenant_id = $1 AND status = 'active') as total_groups,
			(SELECT COUNT(*) FROM subjects WHERE tenant_id = $1 AND status = 'active') as total_subjects,
			(SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND status = 'active') as active_students,
			(SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND status = 'inactive') as inactive_students
	`

	var overview AcademicOverview
	err := r.db.QueryRowContext(ctx, overviewQuery, tenantID).Scan(
		&overview.TotalStudents, &overview.TotalTeachers, &overview.TotalGroups,
		&overview.TotalSubjects, &overview.ActiveStudents, &overview.InactiveStudents,
	)
	if err != nil {
		return nil, err
	}

	// Group summaries
	groupQuery := `
		SELECT g.id, g.name,
			   COUNT(DISTINCT s.id) as student_count,
			   COALESCE(AVG(CASE WHEN ar.status = 'present' THEN 100.0 ELSE 0.0 END), 0) as attendance_rate,
			   COALESCE(AVG(gr.grade), 0) as average_grade,
			   u.first_name || ' ' || u.last_name as teacher_name
		FROM groups g
		LEFT JOIN students s ON s.group_id = g.id AND s.status = 'active'
		LEFT JOIN attendance_records ar ON ar.student_id = s.id AND ar.date >= CURRENT_DATE - INTERVAL '30 days'
		LEFT JOIN grades gr ON gr.student_id = s.id AND gr.evaluation_date >= CURRENT_DATE - INTERVAL '30 days'
		LEFT JOIN users u ON u.id = g.main_teacher_id
		WHERE g.tenant_id = $1 AND g.status = 'active'
		GROUP BY g.id, g.name, u.first_name, u.last_name
		ORDER BY g.name
	`

	rows, err := r.db.QueryContext(ctx, groupQuery, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []GroupSummary
	for rows.Next() {
		var group GroupSummary
		var teacherName sql.NullString

		err := rows.Scan(
			&group.GroupID, &group.GroupName, &group.StudentCount,
			&group.AttendanceRate, &group.AverageGrade, &teacherName,
		)
		if err != nil {
			return nil, err
		}

		if teacherName.Valid {
			group.TeacherName = teacherName.String
		}

		groups = append(groups, group)
	}

	return &AcademicSummaryResponse{
		Overview: overview,
		Groups:   groups,
	}, nil
}

// Report templates
func (r *Repository) GetReportTemplates(ctx context.Context, tenantID, reportType string) ([]ReportTemplateResponse, error) {
	query := `
		SELECT id, name, type, description, fields, created_at
		FROM report_templates
		WHERE tenant_id = $1 AND (type = $2 OR $2 = '')
		ORDER BY name
	`

	rows, err := r.db.QueryContext(ctx, query, tenantID, reportType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []ReportTemplateResponse
	for rows.Next() {
		var template ReportTemplateResponse
		var fieldsJSON string

		err := rows.Scan(
			&template.ID, &template.Name, &template.Type,
			&template.Description, &fieldsJSON, &template.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		json.Unmarshal([]byte(fieldsJSON), &template.Fields)
		templates = append(templates, template)
	}

	return templates, nil
}

// Analytics data
func (r *Repository) GetAnalyticsData(ctx context.Context, tenantID, metricType string, startDate, endDate string) (*AnalyticsResponse, error) {
	var metrics []MetricData
	var charts []ChartData

	switch metricType {
	case "attendance":
		metrics, charts = r.getAttendanceAnalytics(ctx, tenantID, startDate, endDate)
	case "grades":
		metrics, charts = r.getGradesAnalytics(ctx, tenantID, startDate, endDate)
	case "enrollment":
		metrics, charts = r.getEnrollmentAnalytics(ctx, tenantID, startDate, endDate)
	}

	return &AnalyticsResponse{
		Metrics: metrics,
		Charts:  charts,
		Period: ReportPeriod{
			StartDate: startDate,
			EndDate:   endDate,
			Type:      "analytics",
		},
	}, nil
}

func (r *Repository) getAttendanceAnalytics(ctx context.Context, tenantID, startDate, endDate string) ([]MetricData, []ChartData) {
	// Implementation for attendance analytics
	metrics := []MetricData{
		{Key: "avg_attendance", Label: "Promedio de Asistencia", Type: "percentage"},
		{Key: "total_absences", Label: "Total de Faltas", Type: "number"},
	}

	charts := []ChartData{
		{Type: "line", Title: "Tendencia de Asistencia"},
		{Type: "pie", Title: "Distribución de Estados"},
	}

	return metrics, charts
}

func (r *Repository) getGradesAnalytics(ctx context.Context, tenantID, startDate, endDate string) ([]MetricData, []ChartData) {
	// Implementation for grades analytics
	metrics := []MetricData{
		{Key: "avg_grade", Label: "Promedio General", Type: "number"},
		{Key: "passing_rate", Label: "Tasa de Aprobación", Type: "percentage"},
	}

	charts := []ChartData{
		{Type: "bar", Title: "Distribución de Calificaciones"},
		{Type: "line", Title: "Evolución de Promedios"},
	}

	return metrics, charts
}

func (r *Repository) getEnrollmentAnalytics(ctx context.Context, tenantID, startDate, endDate string) ([]MetricData, []ChartData) {
	// Implementation for enrollment analytics
	metrics := []MetricData{
		{Key: "total_students", Label: "Total de Estudiantes", Type: "number"},
		{Key: "new_enrollments", Label: "Nuevas Inscripciones", Type: "number"},
	}

	charts := []ChartData{
		{Type: "area", Title: "Crecimiento de Matrícula"},
		{Type: "pie", Title: "Distribución por Grupo"},
	}

	return metrics, charts
}
