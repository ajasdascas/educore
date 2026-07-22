package student

import (
	"database/sql"
	"errors"

	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/dashboard", h.GetDashboard)
	router.Get("/profile", h.GetProfile)
	router.Get("/grades", h.GetGrades)
	router.Get("/attendance", h.GetAttendance)
	router.Get("/messages", h.GetMessages)
	router.Get("/assignments", h.GetAssignments)
	router.Get("/schedule", h.GetSchedule)
	router.Get("/notifications", h.GetNotifications)
}

func studentRequestContext(c *fiber.Ctx) (userID, tenantID string, ok bool) {
	userID, userOK := c.Locals("user_id").(string)
	tenantID, tenantOK := c.Locals("tenant_id").(string)
	return userID, tenantID, userOK && tenantOK && userID != "" && tenantID != ""
}

func studentLookupError(c *fiber.Ctx, err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return response.Error(c, fiber.StatusNotFound, "Student profile not found")
	}
	return response.Error(c, fiber.StatusInternalServerError, "Student portal data unavailable")
}

func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	userID, tenantID, ok := studentRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Student identity context is required")
	}

	data, err := h.svc.GetDashboard(c.UserContext(), userID, tenantID)
	if err != nil {
		return studentLookupError(c, err)
	}

	return response.Success(c, data, "ok")
}

func (h *Handler) GetProfile(c *fiber.Ctx) error {
	userID, tenantID, ok := studentRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Student identity context is required")
	}

	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return studentLookupError(c, err)
	}

	return response.Success(c, profile, "ok")
}

func (h *Handler) GetGrades(c *fiber.Ctx) error {
	userID, tenantID, ok := studentRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Student identity context is required")
	}

	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return studentLookupError(c, err)
	}

	grades, err := h.svc.repo.GetRecentGrades(c.UserContext(), profile.ID, tenantID, 50)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching grades")
	}

	return response.Success(c, grades, "ok")
}

func (h *Handler) GetAttendance(c *fiber.Ctx) error {
	userID, tenantID, ok := studentRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Student identity context is required")
	}

	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return studentLookupError(c, err)
	}

	summary, err := h.svc.repo.GetAttendanceSummary(c.UserContext(), profile.ID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching attendance")
	}

	return response.Success(c, summary, "ok")
}

func (h *Handler) GetMessages(c *fiber.Ctx) error {
	userID, tenantID, ok := studentRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Student identity context is required")
	}
	messages, err := h.svc.repo.GetMessages(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching messages")
	}
	return response.Success(c, fiber.Map{"messages": messages}, "ok")
}

func (h *Handler) GetAssignments(c *fiber.Ctx) error {
	userID, tenantID, ok := studentRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Student identity context is required")
	}
	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return studentLookupError(c, err)
	}
	assignments, err := h.svc.repo.GetAssignments(c.UserContext(), profile.ID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching assignments")
	}
	return response.Success(c, fiber.Map{"assignments": assignments}, "ok")
}

func (h *Handler) GetSchedule(c *fiber.Ctx) error {
	userID, tenantID, ok := studentRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Student identity context is required")
	}
	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return studentLookupError(c, err)
	}
	schedule, err := h.svc.repo.GetSchedule(c.UserContext(), profile.ID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching schedule")
	}
	return response.Success(c, fiber.Map{"schedule": schedule}, "ok")
}

func (h *Handler) GetNotifications(c *fiber.Ctx) error {
	userID, tenantID, ok := studentRequestContext(c)
	if !ok {
		return response.Error(c, fiber.StatusForbidden, "Student identity context is required")
	}
	notifications, err := h.svc.repo.GetNotifications(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching notifications")
	}
	return response.Success(c, fiber.Map{"notifications": notifications}, "ok")
}
