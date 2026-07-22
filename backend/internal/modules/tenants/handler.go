package tenants

import (
	"educore/internal/pkg/response"
	"strconv"

	"educore/internal/pkg/database"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	db *database.DB
}

func NewHandler(db *database.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/", h.List)
	// School provisioning has a single authoritative route:
	// POST /api/v1/super-admin/schools. The legacy POST /tenants path skipped
	// the production module gate, DNS provisioning and secure credentials, so it
	// must not remain reachable as an alternate creation flow.
	router.Get("/:id", h.GetByID)
	router.Patch("/:id", h.Update)
	router.Post("/:id/suspend", h.Suspend)
	router.Post("/:id/activate", h.Activate)
}

// --- DTOs ---

type UpdateTenantRequest struct {
	Name    *string `json:"name"`
	LogoURL *string `json:"logo_url"`
	Plan    *string `json:"plan"`
	Phone   *string `json:"phone"`
}

// --- Handlers ---

func (h *Handler) List(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	status := c.Query("status")
	plan := c.Query("plan")
	offset := (page - 1) * limit

	query := "SELECT id, slug, name, logo_url, status, plan, created_at FROM tenants WHERE 1=1"
	args := []interface{}{}
	argIdx := 1

	if status != "" {
		query += " AND status = $" + itoa(argIdx)
		args = append(args, status)
		argIdx++
	}
	if plan != "" {
		query += " AND plan = $" + itoa(argIdx)
		args = append(args, plan)
		argIdx++
	}

	query += " ORDER BY created_at DESC"
	query += " LIMIT $" + itoa(argIdx) + " OFFSET $" + itoa(argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(c.Context(), query, args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching tenants")
	}
	defer rows.Close()

	var tenants []fiber.Map
	for rows.Next() {
		var id, slug, name, tstatus, tplan string
		var logoURL *string
		var createdAt interface{}
		if err := rows.Scan(&id, &slug, &name, &logoURL, &tstatus, &tplan, &createdAt); err != nil {
			continue
		}
		logo := ""
		if logoURL != nil {
			logo = *logoURL
		}
		tenants = append(tenants, fiber.Map{
			"id":         id,
			"slug":       slug,
			"name":       name,
			"logo_url":   logo,
			"status":     tstatus,
			"plan":       tplan,
			"created_at": createdAt,
		})
	}

	if tenants == nil {
		tenants = []fiber.Map{}
	}

	return response.Success(c, fiber.Map{
		"tenants": tenants,
		"page":    page,
		"limit":   limit,
	}, "Tenants retrieved")
}

func (h *Handler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")

	var slug, name, tstatus, tplan string
	var logoURL *string
	var createdAt, updatedAt interface{}

	err := h.db.QueryRow(c.Context(),
		"SELECT slug, name, logo_url, status, plan, created_at, updated_at FROM tenants WHERE id = $1",
		id).Scan(&slug, &name, &logoURL, &tstatus, &tplan, &createdAt, &updatedAt)

	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Tenant not found")
	}

	// Count students and users
	var studentCount, userCount int
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM students WHERE tenant_id = $1", id).Scan(&studentCount)
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM users WHERE tenant_id = $1", id).Scan(&userCount)

	logo := ""
	if logoURL != nil {
		logo = *logoURL
	}

	return response.Success(c, fiber.Map{
		"id":             id,
		"slug":           slug,
		"name":           name,
		"logo_url":       logo,
		"status":         tstatus,
		"plan":           tplan,
		"created_at":     createdAt,
		"updated_at":     updatedAt,
		"total_students": studentCount,
		"total_users":    userCount,
	}, "Tenant retrieved")
}

func (h *Handler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateTenantRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	query := "UPDATE tenants SET updated_at = NOW()"
	args := []interface{}{}
	argIdx := 1

	if req.Name != nil {
		query += ", name = $" + itoa(argIdx)
		args = append(args, *req.Name)
		argIdx++
	}
	if req.LogoURL != nil {
		query += ", logo_url = $" + itoa(argIdx)
		args = append(args, *req.LogoURL)
		argIdx++
	}
	if req.Plan != nil {
		query += ", plan = $" + itoa(argIdx)
		args = append(args, *req.Plan)
		argIdx++
	}

	query += " WHERE id = $" + itoa(argIdx)
	args = append(args, id)

	_, err := h.db.Exec(c.Context(), query, args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating tenant")
	}

	return response.Success(c, nil, "Tenant updated")
}

func (h *Handler) Suspend(c *fiber.Ctx) error {
	id := c.Params("id")
	_, err := h.db.Exec(c.Context(), "UPDATE tenants SET status = 'suspended', updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error suspending tenant")
	}
	return response.Success(c, nil, "Tenant suspended")
}

func (h *Handler) Activate(c *fiber.Ctx) error {
	id := c.Params("id")
	_, err := h.db.Exec(c.Context(), "UPDATE tenants SET status = 'active', updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error activating tenant")
	}
	return response.Success(c, nil, "Tenant activated")
}

// helper
func itoa(i int) string {
	return strconv.Itoa(i)
}
