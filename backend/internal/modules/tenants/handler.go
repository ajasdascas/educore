package tenants

import (
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	db *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/", h.List)
	router.Post("/", h.Create)
	router.Get("/:id", h.GetByID)
	router.Patch("/:id", h.Update)
	router.Post("/:id/suspend", h.Suspend)
	router.Post("/:id/activate", h.Activate)
}

// --- DTOs ---

type CreateTenantRequest struct {
	Name     string `json:"name"`
	Slug     string `json:"slug"`
	LogoURL  string `json:"logo_url"`
	Level    string `json:"level"`
	Country  string `json:"country"`
	State    string `json:"state"`
	Phone    string `json:"phone"`
	Plan     string `json:"plan"`
	TrialDays int   `json:"trial_days"`
	Director struct {
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
	} `json:"director"`
}

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

func (h *Handler) Create(c *fiber.Ctx) error {
	var req CreateTenantRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.Name == "" || req.Slug == "" {
		return response.Error(c, fiber.StatusBadRequest, "Name and slug are required")
	}
	if req.Plan == "" {
		req.Plan = "starter"
	}
	if req.TrialDays == 0 {
		req.TrialDays = 30
	}

	// Start transaction for provisioning
	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Transaction error")
	}
	defer tx.Rollback(c.Context())

	// 1. Create tenant
	var tenantID string
	err = tx.QueryRow(c.Context(),
		`INSERT INTO tenants (name, slug, logo_url, status, plan, settings)
		 VALUES ($1, $2, $3, 'trial', $4, '{}')
		 RETURNING id`,
		req.Name, req.Slug, req.LogoURL, req.Plan).Scan(&tenantID)

	if err != nil {
		return response.Error(c, fiber.StatusConflict, "Slug already exists or insert error")
	}

	// 2. Insert core modules
	coreModules := []string{"academic_core", "parent_portal", "teacher_portal", "communication", "payments_basic"}
	for _, mod := range coreModules {
		_, err = tx.Exec(c.Context(),
			"INSERT INTO tenant_modules (tenant_id, module_key, is_active) VALUES ($1, $2, true)",
			tenantID, mod)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error creating modules")
		}
	}

	// 3. Create school_settings
	_, err = tx.Exec(c.Context(),
		"INSERT INTO school_settings (tenant_id) VALUES ($1)", tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error creating settings")
	}

	// 4. Create SCHOOL_ADMIN user (director) with invitation
	if req.Director.Email != "" {
		// Temporary password hash (will be replaced when invitation is accepted)
		tempHash, _ := bcrypt.GenerateFromPassword([]byte("temp-will-be-replaced"), bcrypt.DefaultCost)

		_, err = tx.Exec(c.Context(),
			`INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, invitation_token, invitation_expires_at)
			 VALUES ($1, $2, $3, $4, $5, 'SCHOOL_ADMIN', true, gen_random_uuid()::text, NOW() + INTERVAL '7 days')`,
			tenantID, req.Director.Email, string(tempHash), req.Director.FirstName, req.Director.LastName)

		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error creating director: "+err.Error())
		}

		// TODO: Send invitation email via Resend
	}

	if err := tx.Commit(c.Context()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error committing transaction")
	}

	return response.Success(c, fiber.Map{
		"tenant_id": tenantID,
		"slug":      req.Slug,
		"url":       req.Slug + ".educore.app",
	}, "School created successfully")
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
		"id":            id,
		"slug":          slug,
		"name":          name,
		"logo_url":      logo,
		"status":        tstatus,
		"plan":          tplan,
		"created_at":    createdAt,
		"updated_at":    updatedAt,
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
	return string(rune('0'+i)) // works for 1-9
}
