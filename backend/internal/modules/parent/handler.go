package parent

import (
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

// RegisterRoutes sets up all parent portal routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	// Parent portal routes - the parent router is already mounted at /api/v1/parent.
	api := app

	// Dashboard
	api.Get("/dashboard", h.GetDashboard)
	api.Get("/children", h.GetChildren)

	// Child-specific routes
	child := api.Group("/children/:childId")
	child.Get("/", h.GetChildDetails)
	child.Get("/grades", h.GetChildGrades)
	child.Get("/attendance", h.GetChildAttendance)
	child.Get("/schedule", h.GetChildSchedule)
	child.Get("/report-card", h.GetChildReportCard)
	child.Get("/teachers", h.GetChildTeachers)
	child.Get("/assignments", h.GetChildAssignments)

	// Communications
	api.Get("/notifications", h.GetNotifications)
	api.Put("/notifications/:id/read", h.MarkNotificationRead)
	api.Post("/messages", h.SendMessage)
	api.Get("/messages", h.GetMessages)

	// Documents, payments, consents and reports
	api.Get("/documents", h.GetDocuments)
	api.Get("/payments", h.GetPayments)
	api.Get("/consents", h.GetConsents)
	api.Patch("/consents/:id", h.UpdateConsent)
	api.Get("/reports/summary", h.GetReportSummary)

	// Calendar & Events
	api.Get("/calendar", h.GetCalendar)
	api.Get("/events", h.GetEvents)

	// Profile management
	api.Get("/profile", h.GetProfile)
	api.Put("/profile", h.UpdateProfile)
	api.Put("/password", h.ChangePassword)
}

// Dashboard handlers
func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	dashboard, err := h.service.GetDashboard(c.Context(), tenantID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, dashboard, "Success")
}

func (h *Handler) GetChildren(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	children, err := h.service.GetChildren(c.Context(), tenantID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, children, "Success")
}

// Child-specific handlers
func (h *Handler) GetChildDetails(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	childID := c.Params("childId")

	// Verify parent has access to this child
	hasAccess, err := h.service.VerifyParentAccess(c.Context(), tenantID, userID, childID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	if !hasAccess {
		return response.Error(c, fiber.StatusForbidden, "Access denied")
	}

	child, err := h.service.GetChildDetails(c.Context(), tenantID, childID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}

	return response.Success(c, child, "Success")
}

func (h *Handler) GetChildGrades(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	childID := c.Params("childId")

	// Verify access
	hasAccess, err := h.service.VerifyParentAccess(c.Context(), tenantID, userID, childID)
	if err != nil || !hasAccess {
		return response.Error(c, fiber.StatusForbidden, "Access denied")
	}

	period := c.Query("period", "current")
	subject := c.Query("subject")

	grades, err := h.service.GetChildGrades(c.Context(), tenantID, childID, period, subject)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, grades, "Success")
}

func (h *Handler) GetChildAttendance(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	childID := c.Params("childId")

	// Verify access
	hasAccess, err := h.service.VerifyParentAccess(c.Context(), tenantID, userID, childID)
	if err != nil || !hasAccess {
		return response.Error(c, fiber.StatusForbidden, "Access denied")
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	attendance, err := h.service.GetChildAttendance(c.Context(), tenantID, childID, startDate, endDate)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, attendance, "Success")
}

func (h *Handler) GetChildSchedule(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	childID := c.Params("childId")

	// Verify access
	hasAccess, err := h.service.VerifyParentAccess(c.Context(), tenantID, userID, childID)
	if err != nil || !hasAccess {
		return response.Error(c, fiber.StatusForbidden, "Access denied")
	}

	schedule, err := h.service.GetChildSchedule(c.Context(), tenantID, childID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, schedule, "Success")
}

func (h *Handler) GetChildReportCard(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	childID := c.Params("childId")

	// Verify access
	hasAccess, err := h.service.VerifyParentAccess(c.Context(), tenantID, userID, childID)
	if err != nil || !hasAccess {
		return response.Error(c, fiber.StatusForbidden, "Access denied")
	}

	period := c.Query("period", "current")

	reportCard, err := h.service.GetChildReportCard(c.Context(), tenantID, childID, period)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, reportCard, "Success")
}

func (h *Handler) GetChildTeachers(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	childID := c.Params("childId")

	// Verify access
	hasAccess, err := h.service.VerifyParentAccess(c.Context(), tenantID, userID, childID)
	if err != nil || !hasAccess {
		return response.Error(c, fiber.StatusForbidden, "Access denied")
	}

	teachers, err := h.service.GetChildTeachers(c.Context(), tenantID, childID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, teachers, "Success")
}

func (h *Handler) GetChildAssignments(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	childID := c.Params("childId")

	// Verify access
	hasAccess, err := h.service.VerifyParentAccess(c.Context(), tenantID, userID, childID)
	if err != nil || !hasAccess {
		return response.Error(c, fiber.StatusForbidden, "Access denied")
	}

	status := c.Query("status")
	subject := c.Query("subject")

	assignments, err := h.service.GetChildAssignments(c.Context(), tenantID, childID, status, subject)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, assignments, "Success")
}

// Communications handlers
func (h *Handler) GetNotifications(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)
	unreadOnly := c.QueryBool("unread_only", false)

	notifications, total, err := h.service.GetNotifications(c.Context(), tenantID, userID, page, perPage, unreadOnly)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.SuccessWithMeta(c, notifications, response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

func (h *Handler) MarkNotificationRead(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	notificationID := c.Params("id")

	err := h.service.MarkNotificationRead(c.Context(), tenantID, userID, notificationID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Notification marked as read")
}

func (h *Handler) SendMessage(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	message, err := h.service.SendMessage(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, message, "Success")
}

func (h *Handler) GetMessages(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	conversationID := c.Query("conversation_id")
	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)

	messages, total, err := h.service.GetMessages(c.Context(), tenantID, userID, conversationID, page, perPage)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.SuccessWithMeta(c, messages, response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

func (h *Handler) GetDocuments(c *fiber.Ctx) error {
	documents, err := h.service.GetDocuments(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, documents, "Success")
}

func (h *Handler) GetPayments(c *fiber.Ctx) error {
	payments, err := h.service.GetPayments(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, payments, "Success")
}

func (h *Handler) GetConsents(c *fiber.Ctx) error {
	consents, err := h.service.GetConsents(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, consents, "Success")
}

func (h *Handler) UpdateConsent(c *fiber.Ctx) error {
	var req ConsentUpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	consent, err := h.service.UpdateConsent(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string), c.Params("id"), req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, consent, "Success")
}

func (h *Handler) GetReportSummary(c *fiber.Ctx) error {
	summary, err := h.service.GetReportSummary(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, summary, "Success")
}

// Calendar & Events handlers
func (h *Handler) GetCalendar(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	month := c.QueryInt("month")
	year := c.QueryInt("year")

	calendar, err := h.service.GetCalendar(c.Context(), tenantID, userID, month, year)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, calendar, "Success")
}

func (h *Handler) GetEvents(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	eventType := c.Query("type")

	events, err := h.service.GetEvents(c.Context(), tenantID, userID, startDate, endDate, eventType)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, events, "Success")
}

// Profile handlers
func (h *Handler) GetProfile(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	profile, err := h.service.GetProfile(c.Context(), tenantID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, profile, "Success")
}

func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	profile, err := h.service.UpdateProfile(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, profile, "Success")
}

func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	err := h.service.ChangePassword(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Password changed successfully")
}
