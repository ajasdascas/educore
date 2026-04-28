package superadmin

import (
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type UpdateSchoolStatusRequest struct {
	Status string `json:"status"`
}

func (h *Handler) UpdateSchoolStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateSchoolStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	validStatuses := map[string]bool{"active": true, "trial": true, "suspended": true, "cancelled": true}
	if !validStatuses[req.Status] {
		return response.Error(c, fiber.StatusBadRequest, "Invalid status")
	}

	_, err := h.db.Exec(c.UserContext(), "UPDATE tenants SET status = $1, updated_at = NOW() WHERE id = $2", req.Status, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating status")
	}

	return response.Success(c, nil, "Status updated")
}

func (h *Handler) GetSchoolUsers(c *fiber.Ctx) error {
	id := c.Params("id")

	rows, err := h.db.Query(c.UserContext(),
		"SELECT id, email, first_name, last_name, role, is_active FROM users WHERE tenant_id = $1 ORDER BY created_at DESC", id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching users")
	}
	defer rows.Close()

	var users []fiber.Map
	for rows.Next() {
		var uid, email, role string
		var firstName, lastName *string
		var isActive bool

		rows.Scan(&uid, &email, &firstName, &lastName, &role, &isActive)

		fn := ""
		if firstName != nil {
			fn = *firstName
		}
		ln := ""
		if lastName != nil {
			ln = *lastName
		}

		users = append(users, fiber.Map{
			"id":         uid,
			"email":      email,
			"first_name": fn,
			"last_name":  ln,
			"role":       role,
			"is_active":  isActive,
		})
	}

	if users == nil {
		users = []fiber.Map{}
	}

	return response.Success(c, fiber.Map{"users": users}, "Users retrieved")
}
