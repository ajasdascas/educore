package reports

import (
	"context"
	"fmt"
	"time"

	"educore/internal/events"
)

type Service struct {
	repo *Repository
	bus  *events.EventBus
}

func NewService(repo *Repository, bus *events.EventBus) *Service {
	return &Service{
		repo: repo,
		bus:  bus,
	}
}

// Report generation
func (s *Service) GenerateReport(ctx context.Context, tenantID, userID string, req GenerateReportRequest) (*ReportResponse, error) {
	// Validate request
	if err := s.validateReportRequest(req); err != nil {
		return nil, err
	}

	// Create report record
	report, err := s.repo.CreateReport(ctx, tenantID, userID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create report: %w", err)
	}

	// Trigger async report generation
	s.bus.Publish("report.generation_requested", map[string]interface{}{
		"tenant_id":  tenantID,
		"report_id":  report.ID,
		"type":       req.Type,
		"user_id":    userID,
		"timestamp":  time.Now(),
	})

	return report, nil
}

func (s *Service) GetReports(ctx context.Context, tenantID string, page, perPage int) ([]ReportResponse, int, error) {
	reports, total, err := s.repo.GetReports(ctx, tenantID, page, perPage)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get reports: %w", err)
	}

	return reports, total, nil
}

func (s *Service) GetReportById(ctx context.Context, tenantID, reportID string) (*ReportResponse, error) {
	// This would need to be implemented in the repository
	// For now, we'll use the GetReports and filter
	reports, _, err := s.repo.GetReports(ctx, tenantID, 1, 1000)
	if err != nil {
		return nil, fmt.Errorf("failed to get report: %w", err)
	}

	for _, report := range reports {
		if report.ID == reportID {
			return &report, nil
		}
	}

	return nil, fmt.Errorf("report not found")
}

func (s *Service) DeleteReport(ctx context.Context, tenantID, reportID, userID string) error {
	// First verify the report exists and belongs to tenant
	_, err := s.GetReportById(ctx, tenantID, reportID)
	if err != nil {
		return err
	}

	// This would need to be implemented in repository
	// For now, we'll just publish the event
	s.bus.Publish("report.deleted", map[string]interface{}{
		"tenant_id":  tenantID,
		"report_id":  reportID,
		"deleted_by": userID,
		"timestamp":  time.Now(),
	})

	return nil
}

// Specific report types
func (s *Service) GetAttendanceReport(ctx context.Context, tenantID, startDate, endDate string, filters ReportFilters) (*AttendanceReportResponse, error) {
	// Validate date range
	if err := s.validateDateRange(startDate, endDate); err != nil {
		return nil, err
	}

	report, err := s.repo.GetAttendanceReport(ctx, tenantID, startDate, endDate, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to generate attendance report: %w", err)
	}

	return report, nil
}

func (s *Service) GetGradesReport(ctx context.Context, tenantID, startDate, endDate string, filters ReportFilters) (*GradesReportResponse, error) {
	// Validate date range
	if err := s.validateDateRange(startDate, endDate); err != nil {
		return nil, err
	}

	report, err := s.repo.GetGradesReport(ctx, tenantID, startDate, endDate, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to generate grades report: %w", err)
	}

	return report, nil
}

func (s *Service) GetFinancialReport(ctx context.Context, tenantID, startDate, endDate string, filters ReportFilters) (*FinancialReportResponse, error) {
	// Validate date range
	if err := s.validateDateRange(startDate, endDate); err != nil {
		return nil, err
	}

	// This would need to be implemented based on financial module
	// For now, return a placeholder
	return &FinancialReportResponse{
		Summary: FinancialSummary{
			TotalRevenue:   100000.0,
			PaidAmount:     85000.0,
			PendingAmount:  15000.0,
			OverdueAmount:  5000.0,
			CollectionRate: 85.0,
		},
		Details: []FinancialDetail{},
		Period: ReportPeriod{
			StartDate: startDate,
			EndDate:   endDate,
			Type:      "date_range",
		},
	}, nil
}

func (s *Service) GetAcademicSummary(ctx context.Context, tenantID string, filters ReportFilters) (*AcademicSummaryResponse, error) {
	summary, err := s.repo.GetAcademicSummary(ctx, tenantID, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to generate academic summary: %w", err)
	}

	// Add attendance and grades summaries from other methods
	attendanceReport, _ := s.GetAttendanceReport(ctx, tenantID,
		time.Now().AddDate(0, -1, 0).Format("2006-01-02"),
		time.Now().Format("2006-01-02"),
		filters)

	gradesReport, _ := s.GetGradesReport(ctx, tenantID,
		time.Now().AddDate(0, -1, 0).Format("2006-01-02"),
		time.Now().Format("2006-01-02"),
		filters)

	if attendanceReport != nil {
		summary.Attendance = attendanceReport.Summary
	}

	if gradesReport != nil {
		summary.Grades = gradesReport.Summary
	}

	summary.Period = ReportPeriod{
		StartDate: time.Now().AddDate(0, -1, 0).Format("2006-01-02"),
		EndDate:   time.Now().Format("2006-01-02"),
		Type:      "monthly_summary",
	}

	return summary, nil
}

// Report templates
func (s *Service) GetReportTemplates(ctx context.Context, tenantID, reportType string) ([]ReportTemplateResponse, error) {
	templates, err := s.repo.GetReportTemplates(ctx, tenantID, reportType)
	if err != nil {
		return nil, fmt.Errorf("failed to get report templates: %w", err)
	}

	return templates, nil
}

func (s *Service) CreateReportTemplate(ctx context.Context, tenantID, userID string, template ReportTemplateResponse) (*ReportTemplateResponse, error) {
	// Validate template
	if err := s.validateReportTemplate(template); err != nil {
		return nil, err
	}

	// This would need to be implemented in repository
	// For now, publish event
	s.bus.Publish("report.template_created", map[string]interface{}{
		"tenant_id":     tenantID,
		"template_name": template.Name,
		"template_type": template.Type,
		"created_by":    userID,
		"timestamp":     time.Now(),
	})

	return &template, nil
}

// Analytics
func (s *Service) GetAnalytics(ctx context.Context, tenantID, metricType string, startDate, endDate string) (*AnalyticsResponse, error) {
	// Validate inputs
	if metricType == "" {
		return nil, fmt.Errorf("metric type is required")
	}

	if err := s.validateDateRange(startDate, endDate); err != nil {
		return nil, err
	}

	analytics, err := s.repo.GetAnalyticsData(ctx, tenantID, metricType, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get analytics: %w", err)
	}

	return analytics, nil
}

func (s *Service) GetDashboardMetrics(ctx context.Context, tenantID string) ([]MetricData, error) {
	// Get key metrics for dashboard
	now := time.Now()
	thisMonth := now.Format("2006-01-02")
	lastMonth := now.AddDate(0, -1, 0).Format("2006-01-02")

	// Current month attendance
	attendanceReport, err := s.GetAttendanceReport(ctx, tenantID, lastMonth, thisMonth, ReportFilters{})
	if err != nil {
		return nil, err
	}

	// Current month grades
	gradesReport, err := s.GetGradesReport(ctx, tenantID, lastMonth, thisMonth, ReportFilters{})
	if err != nil {
		return nil, err
	}

	// Academic summary
	academicSummary, err := s.GetAcademicSummary(ctx, tenantID, ReportFilters{})
	if err != nil {
		return nil, err
	}

	metrics := []MetricData{
		{
			Key:   "total_students",
			Label: "Total de Estudiantes",
			Value: academicSummary.Overview.TotalStudents,
			Type:  "number",
		},
		{
			Key:   "attendance_rate",
			Label: "Tasa de Asistencia",
			Value: attendanceReport.Summary.AttendanceRate,
			Type:  "percentage",
		},
		{
			Key:   "average_grade",
			Label: "Promedio General",
			Value: gradesReport.Summary.AverageGrade,
			Type:  "number",
		},
		{
			Key:   "active_teachers",
			Label: "Profesores Activos",
			Value: academicSummary.Overview.TotalTeachers,
			Type:  "number",
		},
	}

	return metrics, nil
}

// Export functionality
func (s *Service) ExportReport(ctx context.Context, tenantID, reportID, userID string, config ExportConfigRequest) (string, error) {
	// Validate export config
	if err := s.validateExportConfig(config); err != nil {
		return "", err
	}

	// Get the report
	report, err := s.GetReportById(ctx, tenantID, reportID)
	if err != nil {
		return "", err
	}

	// Trigger async export
	s.bus.Publish("report.export_requested", map[string]interface{}{
		"tenant_id":   tenantID,
		"report_id":   reportID,
		"format":      config.Format,
		"options":     config.Options,
		"user_id":     userID,
		"timestamp":   time.Now(),
	})

	// Return job ID (would be generated by export service)
	jobID := fmt.Sprintf("export_%s_%d", reportID, time.Now().Unix())
	return jobID, nil
}

func (s *Service) ScheduleReport(ctx context.Context, tenantID, userID string, req ScheduleReportRequest) error {
	// Validate schedule request
	if err := s.validateScheduleRequest(req); err != nil {
		return err
	}

	// Verify report exists
	_, err := s.GetReportById(ctx, tenantID, req.ReportID)
	if err != nil {
		return fmt.Errorf("report not found: %w", err)
	}

	// Create scheduled job
	s.bus.Publish("report.schedule_created", map[string]interface{}{
		"tenant_id":   tenantID,
		"report_id":   req.ReportID,
		"schedule":    req.Schedule,
		"recipients":  req.Recipients,
		"created_by":  userID,
		"timestamp":   time.Now(),
	})

	return nil
}

// Validation methods
func (s *Service) validateReportRequest(req GenerateReportRequest) error {
	// Validate report type
	validTypes := []string{"attendance", "grades", "behavior", "financial", "academic_summary"}
	typeValid := false
	for _, validType := range validTypes {
		if req.Type == validType {
			typeValid = true
			break
		}
	}
	if !typeValid {
		return fmt.Errorf("invalid report type: %s", req.Type)
	}

	// Validate format
	validFormats := []string{"pdf", "excel", "csv"}
	formatValid := false
	for _, validFormat := range validFormats {
		if req.Format == validFormat {
			formatValid = true
			break
		}
	}
	if !formatValid {
		return fmt.Errorf("invalid format: %s", req.Format)
	}

	// Validate date range
	return s.validateDateRange(req.StartDate, req.EndDate)
}

func (s *Service) validateDateRange(startDate, endDate string) error {
	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return fmt.Errorf("invalid start date format: %s", startDate)
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return fmt.Errorf("invalid end date format: %s", endDate)
	}

	if start.After(end) {
		return fmt.Errorf("start date cannot be after end date")
	}

	if start.Before(time.Now().AddDate(-2, 0, 0)) {
		return fmt.Errorf("start date cannot be more than 2 years ago")
	}

	if end.After(time.Now()) {
		return fmt.Errorf("end date cannot be in the future")
	}

	return nil
}

func (s *Service) validateReportTemplate(template ReportTemplateResponse) error {
	if len(template.Name) < 3 {
		return fmt.Errorf("template name must be at least 3 characters")
	}

	if len(template.Name) > 100 {
		return fmt.Errorf("template name cannot exceed 100 characters")
	}

	if template.Type == "" {
		return fmt.Errorf("template type is required")
	}

	if len(template.Fields) == 0 {
		return fmt.Errorf("template must have at least one field")
	}

	return nil
}

func (s *Service) validateExportConfig(config ExportConfigRequest) error {
	validFormats := []string{"pdf", "excel", "csv"}
	formatValid := false
	for _, validFormat := range validFormats {
		if config.Format == validFormat {
			formatValid = true
			break
		}
	}
	if !formatValid {
		return fmt.Errorf("invalid export format: %s", config.Format)
	}

	return nil
}

func (s *Service) validateScheduleRequest(req ScheduleReportRequest) error {
	if req.ReportID == "" {
		return fmt.Errorf("report ID is required")
	}

	validSchedules := []string{"daily", "weekly", "monthly"}
	scheduleValid := false
	for _, validSchedule := range validSchedules {
		if req.Schedule == validSchedule {
			scheduleValid = true
			break
		}
	}
	if !scheduleValid {
		return fmt.Errorf("invalid schedule: %s", req.Schedule)
	}

	if len(req.Recipients) == 0 {
		return fmt.Errorf("at least one recipient is required")
	}

	return nil
}