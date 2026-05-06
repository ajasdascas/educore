package teacher

import (
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
	app.Get("/modules", h.GetEnabledModules)
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
	app.Put("/notifications/:id/read", h.MarkNotificationRead)
	app.Get("/announcements", h.GetAnnouncements)
	app.Post("/announcements", h.CreateAnnouncement)
}

func (h *Handler) GetEnabledModules(c *fiber.Ctx) error {
	tenantID, _ := c.Locals("tenant_id").(string)
	if tenantID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Missing tenant context")
	}
	modules, err := h.service.GetEnabledModules(c.Context(), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching modules")
	}
	return response.Success(c, fiber.Map{"modules": modules}, "Modules retrieved")
}

func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	data, err := h.service.GetDashboard(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) GetClasses(c *fiber.Ctx) error {
	data, err := h.service.GetClasses(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) GetClassStudents(c *fiber.Ctx) error {
	data, err := h.service.GetClassStudents(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string), c.Params("id"))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusForbidden, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) GetAttendance(c *fiber.Ctx) error {
	data, err := h.service.GetAttendance(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string), c.Query("group_id"), c.Query("date"))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) SaveAttendance(c *fiber.Ctx) error {
	var req AttendanceRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	if err := h.service.SaveAttendance(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string), req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.SuccessMessage(c, "Attendance saved")
}

func (h *Handler) GetGrades(c *fiber.Ctx) error {
	data, err := h.service.GetGrades(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string), c.Query("group_id"), c.Query("subject_id"), c.Query("period", "current"))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) SaveGrades(c *fiber.Ctx) error {
	var req GradesRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	if err := h.service.SaveGrades(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string), req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.SuccessMessage(c, "Grades saved")
}

func (h *Handler) GetMessages(c *fiber.Ctx) error {
	data, err := h.service.GetMessages(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string), c.QueryInt("page", 1), c.QueryInt("per_page", 20))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, data, "Success")
}

func (h *Handler) GetSchedule(c *fiber.Ctx) error {
	tenantID, _ := c.Locals("tenant_id").(string)
	userID, _ := c.Locals("user_id").(string)
	schedule, err := h.service.GetSchedule(c.Context(), tenantID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, fiber.Map{"schedule": schedule}, "Success")
}

func (h *Handler) GetNotifications(c *fiber.Ctx) error {
	tenantID, _ := c.Locals("tenant_id").(string)
	userID, _ := c.Locals("user_id").(string)
	notifications, err := h.service.GetNotifications(c.Context(), tenantID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, fiber.Map{"notifications": notifications}, "Success")
}

func (h *Handler) SendMessage(c *fiber.Ctx) error {
	var req SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	message, err := h.service.SendMessage(c.Context(), c.Locals("tenant_id").(string), c.Locals("user_id").(string), req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, message, "Success")
}

func (h *Handler) MarkNotificationRead(c *fiber.Ctx) error {
	tenantID, _ := c.Locals("tenant_id").(string)
	userID, _ := c.Locals("user_id").(string)
	if err := h.service.MarkNotificationRead(c.Context(), tenantID, userID, c.Params("id")); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.SuccessMessage(c, "Notification marked as read")
}

func (h *Handler) GetAnnouncements(c *fiber.Ctx) error {
	tenantID, _ := c.Locals("tenant_id").(string)
	userID, _ := c.Locals("user_id").(string)
	items, err := h.service.GetAnnouncements(c.Context(), tenantID, userID, c.QueryInt("page", 1), c.QueryInt("per_page", 20))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, fiber.Map{"announcements": items}, "Success")
}

func (h *Handler) CreateAnnouncement(c *fiber.Ctx) error {
	tenantID, _ := c.Locals("tenant_id").(string)
	userID, _ := c.Locals("user_id").(string)
	var req CreateAnnouncementRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	item, err := h.service.CreateAnnouncement(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, item, "Announcement created")
}
