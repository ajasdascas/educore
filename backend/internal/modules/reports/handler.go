package reports

import (
	"strings"
	"time"

	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// RegisterRoutes sets up all report routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	// Reports routes - require SCHOOL_ADMIN or TEACHER role. The caller owns the
	// /api/v1/reports prefix.
	api := app

	// Report management
	api.Post("/generate", h.GenerateReport)
	api.Get("/", h.GetReports)

	// Specific report types
	api.Get("/attendance", h.GetAttendanceReport)
	api.Get("/grades", h.GetGradesReport)
	api.Get("/financial", h.GetFinancialReport)
	api.Get("/academic-summary", h.GetAcademicSummary)

	// Report templates
	api.Get("/templates", h.GetReportTemplates)
	api.Post("/templates", h.CreateReportTemplate)

	// Analytics and metrics
	api.Get("/analytics", h.GetAnalytics)
	api.Get("/dashboard/metrics", h.GetDashboardMetrics)

	api.Get("/:id", h.GetReport)
	api.Delete("/:id", h.DeleteReport)

	// Export and scheduling
	api.Post("/:id/export", h.ExportReport)
	api.Post("/:id/schedule", h.ScheduleReport)
}

// Report management handlers
func (h *Handler) GenerateReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req GenerateReportRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	report, err := h.service.GenerateReport(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, report, "Report generation started successfully")
}

func (h *Handler) GetReports(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)

	reports, total, err := h.service.GetReports(c.Context(), tenantID, page, perPage)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.SuccessWithMeta(c, reports, response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

func (h *Handler) GetReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	reportID := c.Params("id")

	report, err := h.service.GetReportById(c.Context(), tenantID, reportID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}

	return response.Success(c, report, "Success")
}

func (h *Handler) DeleteReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	reportID := c.Params("id")

	err := h.service.DeleteReport(c.Context(), tenantID, reportID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Report deleted successfully")
}

// Specific report type handlers
func (h *Handler) GetAttendanceReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		return response.Error(c, fiber.StatusBadRequest, "start_date and end_date are required")
	}

	filters := h.parseReportFilters(c)

	report, err := h.service.GetAttendanceReport(c.Context(), tenantID, startDate, endDate, filters)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, report, "Success")
}

func (h *Handler) GetGradesReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		return response.Error(c, fiber.StatusBadRequest, "start_date and end_date are required")
	}

	filters := h.parseReportFilters(c)

	report, err := h.service.GetGradesReport(c.Context(), tenantID, startDate, endDate, filters)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, report, "Success")
}

func (h *Handler) GetFinancialReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		return response.Error(c, fiber.StatusBadRequest, "start_date and end_date are required")
	}

	filters := h.parseReportFilters(c)

	report, err := h.service.GetFinancialReport(c.Context(), tenantID, startDate, endDate, filters)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, report, "Success")
}

func (h *Handler) GetAcademicSummary(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	filters := h.parseReportFilters(c)

	summary, err := h.service.GetAcademicSummary(c.Context(), tenantID, filters)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, summary, "Success")
}

// Template handlers
func (h *Handler) GetReportTemplates(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	reportType := c.Query("type", "")

	templates, err := h.service.GetReportTemplates(c.Context(), tenantID, reportType)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, templates, "Success")
}

func (h *Handler) CreateReportTemplate(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var template ReportTemplateResponse
	if err := c.BodyParser(&template); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	createdTemplate, err := h.service.CreateReportTemplate(c.Context(), tenantID, userID, template)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, createdTemplate, "Success")
}

// Analytics handlers
func (h *Handler) GetAnalytics(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	metricType := c.Query("type")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if metricType == "" {
		return response.Error(c, fiber.StatusBadRequest, "type parameter is required")
	}

	if startDate == "" || endDate == "" {
		return response.Error(c, fiber.StatusBadRequest, "start_date and end_date are required")
	}

	analytics, err := h.service.GetAnalytics(c.Context(), tenantID, metricType, startDate, endDate)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, analytics, "Success")
}

func (h *Handler) GetDashboardMetrics(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	metrics, err := h.service.GetDashboardMetrics(c.Context(), tenantID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, map[string]interface{}{
		"metrics": metrics,
	}, "Dashboard metrics retrieved successfully")
}

// Export and scheduling handlers
func (h *Handler) ExportReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	reportID := c.Params("id")

	var config ExportConfigRequest
	if err := c.BodyParser(&config); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	jobID, err := h.service.ExportReport(c.Context(), tenantID, reportID, userID, config)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, map[string]interface{}{
		"job_id":  jobID,
		"message": "Export job started successfully",
	}, "Export job started successfully")
}

func (h *Handler) ScheduleReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	reportID := c.Params("id")

	var req ScheduleReportRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	// Set the report ID from the URL parameter
	req.ReportID = reportID

	err := h.service.ScheduleReport(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Report scheduled successfully")
}

// Helper methods
func (h *Handler) parseReportFilters(c *fiber.Ctx) ReportFilters {
	filters := ReportFilters{}

	// Parse group IDs
	if groupIDsParam := c.Query("group_ids"); groupIDsParam != "" {
		filters.GroupIDs = h.parseCommaSeparated(groupIDsParam)
	}

	// Parse student IDs
	if studentIDsParam := c.Query("student_ids"); studentIDsParam != "" {
		filters.StudentIDs = h.parseCommaSeparated(studentIDsParam)
	}

	// Parse teacher IDs
	if teacherIDsParam := c.Query("teacher_ids"); teacherIDsParam != "" {
		filters.TeacherIDs = h.parseCommaSeparated(teacherIDsParam)
	}

	// Parse subject IDs
	if subjectIDsParam := c.Query("subject_ids"); subjectIDsParam != "" {
		filters.SubjectIDs = h.parseCommaSeparated(subjectIDsParam)
	}

	// Parse grades
	if gradesParam := c.Query("grades"); gradesParam != "" {
		filters.Grades = h.parseCommaSeparated(gradesParam)
	}

	return filters
}

func (h *Handler) parseCommaSeparated(param string) []string {
	if param == "" {
		return nil
	}

	// Split by comma and trim spaces
	parts := strings.Split(param, ",")
	var result []string
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}

	return result
}

// Additional endpoints for specific use cases

// Get report status (for polling during generation)
func (h *Handler) GetReportStatus(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	reportID := c.Params("id")

	report, err := h.service.GetReportById(c.Context(), tenantID, reportID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}

	return response.Success(c, map[string]interface{}{
		"status":       report.Status,
		"progress":     100, // Placeholder
		"file_url":     report.FileURL,
		"completed_at": report.CompletedAt,
	}, "Report status retrieved successfully")
}

// Download report file
func (h *Handler) DownloadReport(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	reportID := c.Params("id")

	report, err := h.service.GetReportById(c.Context(), tenantID, reportID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}

	if report.FileURL == nil || report.Status != "completed" {
		return response.Error(c, fiber.StatusBadRequest, "Report is not ready for download")
	}

	// In a real implementation, this would serve the file from storage
	// For now, redirect to the file URL
	return c.Redirect(*report.FileURL, fiber.StatusTemporaryRedirect)
}

// Quick reports for common use cases
func (h *Handler) GetQuickAttendanceToday(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	today := time.Now().Format("2006-01-02")
	filters := h.parseReportFilters(c)

	report, err := h.service.GetAttendanceReport(c.Context(), tenantID, today, today, filters)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, report, "Success")
}

func (h *Handler) GetQuickGradesThisWeek(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	now := time.Now()
	weekStart := now.AddDate(0, 0, -int(now.Weekday()))
	startDate := weekStart.Format("2006-01-02")
	endDate := now.Format("2006-01-02")

	filters := h.parseReportFilters(c)

	report, err := h.service.GetGradesReport(c.Context(), tenantID, startDate, endDate, filters)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, report, "Success")
}

// Register additional quick report routes
func (h *Handler) RegisterQuickRoutes(app *fiber.App) {
	quick := app.Group("/api/v1/reports/quick")

	quick.Get("/attendance/today", h.GetQuickAttendanceToday)
	quick.Get("/grades/week", h.GetQuickGradesThisWeek)
	quick.Get("/:id/status", h.GetReportStatus)
	quick.Get("/:id/download", h.DownloadReport)
}
