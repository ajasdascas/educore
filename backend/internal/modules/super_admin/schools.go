package superadmin

import (
	"database/sql"
	"strconv"
	"strings"

	"educore/internal/pkg/database"
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
)

// UpdateSchoolRequest — editable fields for PUT /super-admin/schools/:id
type UpdateSchoolRequest struct {
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	ContactEmail string `json:"contact_email"`
	Phone        string `json:"phone"`
	Address      string `json:"address"`
	Timezone     string `json:"timezone"`
	LogoURL      string `json:"logo_url"`
	Status       string `json:"status"`
	Plan         string `json:"plan"`
}

func (h *Handler) UpdateSchool(c *fiber.Ctx) error {
	id := c.Params("id")

	var req UpdateSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// Validate status if provided
	if req.Status != "" {
		validStatuses := map[string]bool{"active": true, "trial": true, "suspended": true, "cancelled": true}
		if !validStatuses[req.Status] {
			return response.Error(c, fiber.StatusBadRequest, "Invalid status value")
		}
	}

	// Verify the school exists
	var existingSlug string
	err := h.db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(h.db.Driver(), "SELECT slug FROM tenants WHERE id = $1"), id).
		Scan(&existingSlug)
	if err == sql.ErrNoRows || err != nil {
		return response.Error(c, fiber.StatusNotFound, "School not found")
	}

	// Validate slug uniqueness if slug is being changed
	if req.Slug != "" && req.Slug != existingSlug {
		var conflict int
		conflictErr := h.db.QueryRow(c.UserContext(),
			database.RebindPlaceholders(h.db.Driver(), "SELECT COUNT(*) FROM tenants WHERE slug = $1 AND id != $2"),
			req.Slug, id).Scan(&conflict)
		if conflictErr == nil && conflict > 0 {
			return response.Error(c, fiber.StatusConflict, "Slug already in use by another school")
		}
	}

	// Build dynamic SET clause — only update provided fields
	setClauses := []string{"updated_at = NOW()"}
	args := []interface{}{}
	argIdx := 1

	addField := func(col, val string) {
		if val != "" {
			setClauses = append(setClauses, col+" = $"+strconv.Itoa(argIdx))
			args = append(args, val)
			argIdx++
		}
	}

	addField("name", req.Name)
	addField("slug", req.Slug)
	addField("contact_email", req.ContactEmail)
	addField("phone", req.Phone)
	addField("address", req.Address)
	addField("timezone", req.Timezone)
	addField("logo_url", req.LogoURL)
	addField("status", req.Status)
	addField("plan", req.Plan)

	if len(setClauses) == 1 {
		return response.Error(c, fiber.StatusBadRequest, "No fields to update")
	}

	args = append(args, id)
	query := database.RebindPlaceholders(h.db.Driver(),
		"UPDATE tenants SET "+strings.Join(setClauses, ", ")+" WHERE id = $"+strconv.Itoa(argIdx))

	if _, err := h.db.Exec(c.UserContext(), query, args...); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update school")
	}

	return response.Success(c, fiber.Map{"id": id}, "School updated")
}


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
