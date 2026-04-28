package superadmin

import (
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	db *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/stats", h.Stats)
	router.Get("/schools", h.ListSchools)
	router.Post("/schools", h.CreateSchool)
	router.Get("/schools/:id", h.GetSchool)
	router.Get("/schools/:id/modules", h.GetSchoolModules)
	router.Post("/schools/:id/modules/toggle", h.ToggleModule)
	router.Get("/modules-catalog", h.GetModulesCatalog)
	router.Post("/upload", h.UploadLogo)
}

func (h *Handler) Stats(c *fiber.Ctx) error {
	var totalTenants, activeTenants, trialTenants, totalStudents int

	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM tenants").Scan(&totalTenants)
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM tenants WHERE status = 'active'").Scan(&activeTenants)
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM tenants WHERE status = 'trial'").Scan(&trialTenants)
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM students").Scan(&totalStudents)

	// Recent schools
	rows, _ := h.db.Query(c.Context(),
		"SELECT id, name, slug, plan, status, created_at FROM tenants ORDER BY created_at DESC LIMIT 5")
	defer rows.Close()

	var recentSchools []fiber.Map
	for rows.Next() {
		var id, name, slug, plan, status string
		var createdAt interface{}
		rows.Scan(&id, &name, &slug, &plan, &status, &createdAt)
		recentSchools = append(recentSchools, fiber.Map{
			"id": id, "name": name, "slug": slug, "plan": plan, "status": status, "created_at": createdAt,
		})
	}
	if recentSchools == nil {
		recentSchools = []fiber.Map{}
	}

	return response.Success(c, fiber.Map{
		"total_tenants":  totalTenants,
		"active_tenants": activeTenants,
		"trial_tenants":  trialTenants,
		"total_students": totalStudents,
		"mrr_mxn":        0,
		"recent_schools": recentSchools,
		"alerts":         []fiber.Map{},
	}, "Stats retrieved")
}

func (h *Handler) ListSchools(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	offset := (page - 1) * limit

	rows, err := h.db.Query(c.Context(),
		`SELECT t.id, t.slug, t.name, t.logo_url, t.status, t.plan, t.created_at,
		 (SELECT COUNT(*) FROM students s WHERE s.tenant_id = t.id) as student_count,
		 (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count
		 FROM tenants t ORDER BY t.created_at DESC LIMIT $1 OFFSET $2`, limit, offset)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching schools")
	}
	defer rows.Close()

	var schools []fiber.Map
	for rows.Next() {
		var id, slug, name, status, plan string
		var logoURL *string
		var createdAt interface{}
		var studentCount, userCount int

		rows.Scan(&id, &slug, &name, &logoURL, &status, &plan, &createdAt, &studentCount, &userCount)

		logo := ""
		if logoURL != nil {
			logo = *logoURL
		}

		schools = append(schools, fiber.Map{
			"id":             id,
			"slug":           slug,
			"name":           name,
			"logo_url":       logo,
			"status":         status,
			"plan":           plan,
			"created_at":     createdAt,
			"total_students": studentCount,
			"total_users":    userCount,
		})
	}
	if schools == nil {
		schools = []fiber.Map{}
	}

	return response.Success(c, fiber.Map{"schools": schools, "page": page, "limit": limit}, "Schools retrieved")
}

type CreateSchoolRequest struct {
	// 1. Datos Generales
	Name         string   `json:"name"`
	LogoURL      string   `json:"logo_url"`
	Levels       []string `json:"levels"`
	Phone        string   `json:"phone"`
	ContactEmail string   `json:"contact_email"`
	Address      string   `json:"address"`

	// 2. Configuración Técnica
	Slug     string `json:"slug"`
	Timezone string `json:"timezone"`

	// 3. Cuenta Admin
	AdminEmail string `json:"admin_email"`
	AdminName  string `json:"admin_name"`

	// 4. Suscripción Financiera
	Plan           string   `json:"plan"`
	PremiumModules []string `json:"premium_modules"`
	RFC            string   `json:"rfc"`
	RazonSocial    string   `json:"razon_social"`
	Regimen        string   `json:"regimen"`
	CodigoPostal   string   `json:"codigo_postal"`

	// 5. Semilla Académica
	SchoolYear string `json:"school_year"`
	EvalScheme string `json:"eval_scheme"`
}

func (h *Handler) CreateSchool(c *fiber.Ctx) error {
	var req CreateSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// 1. Start transaction
	tx, err := h.db.Begin(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not start transaction")
	}
	defer tx.Rollback(c.Context())

	// 2. Create Tenant with Settings
	var tenantID string
	
	settingsJSON := fiber.Map{
		"levels":         req.Levels,
		"phone":          req.Phone,
		"contact_email":  req.ContactEmail,
		"address":        req.Address,
		"timezone":       req.Timezone,
		"fiscal_data": fiber.Map{
			"rfc":           req.RFC,
			"razon_social":  req.RazonSocial,
			"regimen":       req.Regimen,
			"codigo_postal": req.CodigoPostal,
		},
		"school_year": req.SchoolYear,
		"eval_scheme": req.EvalScheme,
	}

	err = tx.QueryRow(c.Context(),
		"INSERT INTO tenants (name, slug, logo_url, plan, status, settings) VALUES ($1, $2, $3, $4, 'active', $5) RETURNING id",
		req.Name, req.Slug, req.LogoURL, req.Plan, settingsJSON).Scan(&tenantID)

	if err != nil {
		return response.Error(c, fiber.StatusConflict, "Slug already exists or database error")
	}

	// 3. Create Admin User for the School
	// Default password for new admins: "Escuela2024!" (bcrypt hash)
	passwordHash := "$2a$10$MJsfnrvcdfz1LtAsrYyiYeKhFbK/LdUbGuKMhfEu0rxfaKjzpVMV." // "admin123" for testing, or use a better default

	_, err = tx.Exec(c.Context(),
		`INSERT INTO users (tenant_id, email, password_hash, first_name, role, is_active)
		 VALUES ($1, $2, $3, $4, 'SCHOOL_ADMIN', true)`,
		tenantID, req.AdminEmail, passwordHash, req.AdminName)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error creating admin user")
	}

	// 4. Activate core modules and selected premium modules
	_, err = tx.Exec(c.Context(),
		`INSERT INTO tenant_modules (tenant_id, module_key, is_active)
		 SELECT $1, key, true FROM modules_catalog WHERE is_core = true`,
		tenantID)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error activating core modules")
	}

	for _, mod := range req.PremiumModules {
		_, _ = tx.Exec(c.Context(),
			"INSERT INTO tenant_modules (tenant_id, module_key, is_active) VALUES ($1, $2, true) ON CONFLICT DO NOTHING",
			tenantID, mod)
	}

	// 5. Seed grade levels based on selection
	for i, level := range req.Levels {
		_, _ = tx.Exec(c.Context(),
			"INSERT INTO grade_levels (tenant_id, name, level, sort_order) VALUES ($1, $2, $3, $4)",
			tenantID, level, level, i)
	}

	if err := tx.Commit(c.Context()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not commit transaction")
	}

	return response.Success(c, fiber.Map{"id": tenantID}, "School created successfully")
}

func (h *Handler) GetSchool(c *fiber.Ctx) error {
	id := c.Params("id")

	var slug, name, status, plan string
	var logoURL *string
	var createdAt, updatedAt interface{}

	err := h.db.QueryRow(c.Context(),
		"SELECT slug, name, logo_url, status, plan, created_at, updated_at FROM tenants WHERE id = $1", id).
		Scan(&slug, &name, &logoURL, &status, &plan, &createdAt, &updatedAt)

	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "School not found")
	}

	var studentCount, teacherCount, parentCount int
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM students WHERE tenant_id = $1", id).Scan(&studentCount)
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'TEACHER'", id).Scan(&teacherCount)
	h.db.QueryRow(c.Context(), "SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'PARENT'", id).Scan(&parentCount)

	logo := ""
	if logoURL != nil {
		logo = *logoURL
	}

	return response.Success(c, fiber.Map{
		"id": id, "slug": slug, "name": name, "logo_url": logo,
		"status": status, "plan": plan,
		"created_at": createdAt, "updated_at": updatedAt,
		"total_students": studentCount, "total_teachers": teacherCount, "total_parents": parentCount,
	}, "School retrieved")
}

func (h *Handler) GetSchoolModules(c *fiber.Ctx) error {
	id := c.Params("id")

	rows, err := h.db.Query(c.Context(),
		`SELECT mc.key, mc.name, mc.description, mc.is_core, mc.price_monthly_mxn,
		 COALESCE(tm.is_active, false) as is_active
		 FROM modules_catalog mc
		 LEFT JOIN tenant_modules tm ON tm.module_key = mc.key AND tm.tenant_id = $1
		 ORDER BY mc.is_core DESC, mc.name`, id)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching modules")
	}
	defer rows.Close()

	var modules []fiber.Map
	for rows.Next() {
		var key, name string
		var description *string
		var isCore, isActive bool
		var price float64

		rows.Scan(&key, &name, &description, &isCore, &price, &isActive)

		desc := ""
		if description != nil {
			desc = *description
		}

		modules = append(modules, fiber.Map{
			"key": key, "name": name, "description": desc,
			"is_core": isCore, "price_monthly_mxn": price, "is_active": isActive,
		})
	}
	if modules == nil {
		modules = []fiber.Map{}
	}

	return response.Success(c, fiber.Map{"modules": modules}, "Modules retrieved")
}

type ToggleModuleRequest struct {
	ModuleKey string `json:"module_key"`
	IsActive  bool   `json:"is_active"`
}

func (h *Handler) ToggleModule(c *fiber.Ctx) error {
	id := c.Params("id")
	var req ToggleModuleRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	// Check if core module
	var isCore bool
	h.db.QueryRow(c.Context(), "SELECT is_core FROM modules_catalog WHERE key = $1", req.ModuleKey).Scan(&isCore)
	if isCore {
		return response.Error(c, fiber.StatusForbidden, "Cannot toggle core modules")
	}

	if req.IsActive {
		_, err := h.db.Exec(c.Context(),
			`INSERT INTO tenant_modules (tenant_id, module_key, is_active) VALUES ($1, $2, true)
			 ON CONFLICT (tenant_id, module_key) DO UPDATE SET is_active = true`,
			id, req.ModuleKey)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error activating module")
		}
	} else {
		_, err := h.db.Exec(c.Context(),
			"UPDATE tenant_modules SET is_active = false WHERE tenant_id = $1 AND module_key = $2",
			id, req.ModuleKey)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error deactivating module")
		}
	}

	return response.Success(c, nil, "Module toggled")
}

func (h *Handler) GetModulesCatalog(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.Context(),
		"SELECT key, name, description, is_core, price_monthly_mxn FROM modules_catalog ORDER BY is_core DESC, name")
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching catalog")
	}
	defer rows.Close()

	var modules []fiber.Map
	for rows.Next() {
		var key, name string
		var description *string
		var isCore bool
		var price float64
		rows.Scan(&key, &name, &description, &isCore, &price)

		desc := ""
		if description != nil {
			desc = *description
		}
		modules = append(modules, fiber.Map{
			"key": key, "name": name, "description": desc,
			"is_core": isCore, "price_monthly_mxn": price,
		})
	}
	if modules == nil {
		modules = []fiber.Map{}
	}

	return response.Success(c, fiber.Map{"modules": modules}, "Catalog retrieved")
}

func (h *Handler) UploadLogo(c *fiber.Ctx) error {
	file, err := c.FormFile("logo")
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No file uploaded")
	}
	
	// Ensure uploads directory exists (in real prod this would be S3 logic)
	// We use a mock URL for now that serves locally
	filename := "logo_" + file.Filename
	c.SaveFile(file, "./uploads/"+filename)
	
	return response.Success(c, fiber.Map{"url": "http://localhost:8082/uploads/" + filename}, "Logo uploaded")
}
