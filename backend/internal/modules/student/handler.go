package student

import (
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
}

func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	tenantID, _ := c.Locals("tenant_id").(string)

	if tenantID == "" {
		return response.Error(c, fiber.StatusForbidden, "Student must belong to a school")
	}

	data, err := h.svc.GetDashboard(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Student profile not found")
	}

	return response.Success(c, data, "ok")
}

func (h *Handler) GetProfile(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	tenantID, _ := c.Locals("tenant_id").(string)

	if tenantID == "" {
		return response.Error(c, fiber.StatusForbidden, "Student must belong to a school")
	}

	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Student profile not found")
	}

	return response.Success(c, profile, "ok")
}

func (h *Handler) GetGrades(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	tenantID, _ := c.Locals("tenant_id").(string)

	if tenantID == "" {
		return response.Error(c, fiber.StatusForbidden, "Student must belong to a school")
	}

	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Student profile not found")
	}

	grades, err := h.svc.repo.GetRecentGrades(c.UserContext(), profile.ID, tenantID, 50)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching grades")
	}

	return response.Success(c, grades, "ok")
}

func (h *Handler) GetAttendance(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	tenantID, _ := c.Locals("tenant_id").(string)

	if tenantID == "" {
		return response.Error(c, fiber.StatusForbidden, "Student must belong to a school")
	}

	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Student profile not found")
	}

	summary, err := h.svc.repo.GetAttendanceSummary(c.UserContext(), profile.ID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching attendance")
	}

	return response.Success(c, summary, "ok")
}
