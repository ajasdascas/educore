package teacher

import (
	"errors"

	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(app fiber.Router) {
	app.Get("/dashboard", h.GetDashboard)
	app.Get("/classes", h.GetClasses)
	app.Get("/classes/:id/students", h.GetClassStudents)
	app.Get("/attendance", h.GetAttendance)
	app.Post("/attendance", h.SaveAttendance)
	app.Get("/grades", h.GetGrades)
	app.Post("/grades", h.SaveGrades)
	app.Get("/messages", h.GetMessages)
	app.Post("/messages", h.SendMessage)
	app.Get("/schedule", h.GetSchedule)
	app.Get("/notifications", h.GetNotifications)
}

func teacherRequestContext(c *fiber.Ctx) (tenantID, teacherID string, ok bool) {
	tenantID, tenantOK := c.Locals("tenant_id").(string)
	teacherID, teacherOK := c.Locals("user_id").(string)
	return tenantID, teacherID, tenantOK && teacherOK && tenantID != "" && teacherID != ""
}

func teacherOperationError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, ErrTeacherInvalidRequest):
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	case errors.Is(err, ErrTeacherAccessDenied):
		return response.Error(c, fiber.StatusForbidden, "Teacher cannot access this school resource")
	case errors.Is(err, ErrTeacherConfigurationNeeded):
		return response.Error(c, fiber.StatusServiceUnavailable, "School academic configuration is incomplete")
	default:
		return response.Error(c, fiber.StatusInternalServerError, "Teacher portal operation failed")
	}
}

func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	data, err := h.service.GetDashboard(c.UserContext(), tenantID, teacherID)
	if err != nil {
		return teacherOperationError(c, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) GetClasses(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	data, err := h.service.GetClasses(c.UserContext(), tenantID, teacherID)
	if err != nil {
		return teacherOperationError(c, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) GetClassStudents(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	data, err := h.service.GetClassStudents(c.UserContext(), tenantID, teacherID, c.Params("id"))
	if err != nil {
		return teacherOperationError(c, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) GetAttendance(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	data, err := h.service.GetAttendance(c.UserContext(), tenantID, teacherID, c.Query("group_id"), c.Query("date"))
	if err != nil {
		return teacherOperationError(c, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) SaveAttendance(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	var req AttendanceRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	if err := h.service.SaveAttendance(c.UserContext(), tenantID, teacherID, req); err != nil {
		return teacherOperationError(c, err)
	}
	return response.SuccessMessage(c, "Attendance saved")
}

func (h *Handler) GetGrades(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	data, err := h.service.GetGrades(c.UserContext(), tenantID, teacherID, c.Query("group_id"), c.Query("subject_id"), c.Query("period", "current"))
	if err != nil {
		return teacherOperationError(c, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) SaveGrades(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	var req GradesRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	if err := h.service.SaveGrades(c.UserContext(), tenantID, teacherID, req); err != nil {
		return teacherOperationError(c, err)
	}
	return response.SuccessMessage(c, "Grades saved")
}

func (h *Handler) GetMessages(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	data, err := h.service.GetMessages(c.UserContext(), tenantID, teacherID, c.QueryInt("page", 1), c.QueryInt("per_page", 20))
	if err != nil {
		return teacherOperationError(c, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) GetSchedule(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	schedule, err := h.service.GetSchedule(c.UserContext(), tenantID, teacherID)
	if err != nil {
		return teacherOperationError(c, err)
	}
	return response.Success(c, fiber.Map{"schedule": schedule}, "Success")
}

func (h *Handler) GetNotifications(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	notifications, err := h.service.GetNotifications(c.UserContext(), tenantID, teacherID)
	if err != nil {
		return teacherOperationError(c, err)
	}
	return response.Success(c, fiber.Map{"notifications": notifications}, "Success")
}

func (h *Handler) SendMessage(c *fiber.Ctx) error {
	tenantID, teacherID, ok := teacherRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Teacher identity context is required")
	}
	var req SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	message, err := h.service.SendMessage(c.UserContext(), tenantID, teacherID, req)
	if err != nil {
		return teacherOperationError(c, err)
	}
	return response.Success(c, message, "Success")
}
