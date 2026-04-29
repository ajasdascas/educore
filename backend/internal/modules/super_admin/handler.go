package superadmin

import (
	"educore/internal/pkg/response"
	"encoding/json"
	"os"
	"strconv"
	"strings"
	"time"

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
	router.Patch("/schools/:id/status", h.UpdateSchoolStatus)
	router.Get("/schools/:id/users", h.GetSchoolUsers)
	router.Get("/schools/:id/modules", h.GetSchoolModules)
	router.Post("/schools/:id/modules/toggle", h.ToggleModule)
	router.Get("/modules-catalog", h.GetModulesCatalog)
	router.Post("/upload", h.UploadLogo)

	h.RegisterPlanRoutes(router)
	h.RegisterUserRoutes(router)
	h.RegisterEnterpriseRoutes(router)
	h.RegisterDatabaseAdminRoutes(router)
}

func (h *Handler) Stats(c *fiber.Ctx) error {
	var totalTenants, activeTenants, trialTenants, totalStudents int

	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM tenants").Scan(&totalTenants); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching total tenants")
	}
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM tenants WHERE status = 'active'").Scan(&activeTenants); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching active tenants")
	}
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM tenants WHERE status = 'trial'").Scan(&trialTenants); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching trial tenants")
	}
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM students").Scan(&totalStudents); err != nil {
		// No devolvemos error fatal si falla el conteo de alumnos (tabla students podría no existir aún en dev)
		totalStudents = 0
	}

	// Recent schools
	rows, err := h.db.Query(c.UserContext(),
		"SELECT id, name, slug, plan, status, created_at FROM tenants ORDER BY created_at DESC LIMIT 5")
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching recent schools")
	}
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
	search := c.Query("search", "")
	status := c.Query("status", "")
	plan := c.Query("plan", "")
	offset := (page - 1) * limit

	query := `SELECT t.id, t.slug, t.name, t.logo_url, t.status, t.plan, t.created_at,
		 (SELECT COUNT(*) FROM students s WHERE s.tenant_id = t.id) as student_count,
		 (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as user_count
		 FROM tenants t WHERE 1=1`

	args := []interface{}{}
	argCount := 1

	if search != "" {
		query += ` AND (t.name ILIKE $` + strconv.Itoa(argCount) + ` OR t.slug ILIKE $` + strconv.Itoa(argCount) + `)`
		args = append(args, "%"+search+"%")
		argCount++
	}

	if status != "" {
		query += ` AND t.status = $` + strconv.Itoa(argCount)
		args = append(args, status)
		argCount++
	}

	if plan != "" {
		query += ` AND t.plan = $` + strconv.Itoa(argCount)
		args = append(args, plan)
		argCount++
	}

	query += ` ORDER BY t.created_at DESC LIMIT $` + strconv.Itoa(argCount) + ` OFFSET $` + strconv.Itoa(argCount+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(c.UserContext(), query, args...)

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

	// Get total count for pagination
	var total int
	countQuery := "SELECT COUNT(*) FROM tenants WHERE 1=1"
	countArgs := []interface{}{}
	cArgCount := 1
	if search != "" {
		countQuery += " AND (name ILIKE $" + strconv.Itoa(cArgCount) + " OR slug ILIKE $" + strconv.Itoa(cArgCount) + ")"
		countArgs = append(countArgs, "%"+search+"%")
		cArgCount++
	}
	if status != "" {
		countQuery += " AND status = $" + strconv.Itoa(cArgCount)
		countArgs = append(countArgs, status)
		cArgCount++
	}
	if plan != "" {
		countQuery += " AND plan = $" + strconv.Itoa(cArgCount)
		countArgs = append(countArgs, plan)
		cArgCount++
	}
	if err := h.db.QueryRow(c.UserContext(), countQuery, countArgs...).Scan(&total); err != nil {
		// Log error if needed, but for now we fallback to schools count
		total = len(schools)
	}

	return response.SuccessWithMeta(c, fiber.Map{
		"schools": schools,
	}, response.Meta{
		Page:    page,
		PerPage: limit,
		Total:   total,
	})
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

var modulesByEducationLevel = map[string][]string{
	"kinder":             {"academic_core", "users", "students", "groups", "schedules", "attendance", "reports", "communications"},
	"primaria":           {"academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"},
	"secundaria_general": {"academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"},
	"secundaria_tecnica": {"academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"},
	"prepa_general":      {"academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"},
	"prepa_tecnica":      {"academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"},
	"universidad":        {"academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"},
}

func normalizeEducationLevel(level string) string {
	switch level {
	case "Kínder", "Kinder", "KÃ­nder", "kinder", "preescolar":
		return "kinder"
	case "Primaria", "primaria":
		return "primaria"
	case "Secundaria", "Secundaria General", "secundaria", "secundaria_general":
		return "secundaria_general"
	case "Secundaria Técnica", "Secundaria Tecnica", "secundaria_tecnica":
		return "secundaria_tecnica"
	case "Preparatoria", "Preparatoria General", "prepa", "prepa_general":
		return "prepa_general"
	case "Preparatoria Técnica", "Preparatoria Tecnica", "prepa_tecnica":
		return "prepa_tecnica"
	case "Universidad", "universidad":
		return "universidad"
	default:
		return level
	}
}

func (h *Handler) CreateSchool(c *fiber.Ctx) error {
	var req CreateSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// 1. Validate plan exists
	var planExists bool
	h.db.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE id::text = $1 OR name = $1)", req.Plan).Scan(&planExists)
	if !planExists {
		return response.Error(c, fiber.StatusBadRequest, "El plan seleccionado no es válido")
	}

	// 2. Check if slug exists
	var slugExists bool
	h.db.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM tenants WHERE slug = $1)", req.Slug).Scan(&slugExists)
	if slugExists {
		return response.Error(c, fiber.StatusConflict, "El subdominio ya está en uso")
	}

	// 3. Start transaction
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not start transaction")
	}
	defer tx.Rollback(c.UserContext())

	// 2. Create Tenant with Settings
	var tenantID string

	settingsJSON := fiber.Map{
		"levels":        req.Levels,
		"phone":         req.Phone,
		"contact_email": req.ContactEmail,
		"address":       req.Address,
		"timezone":      req.Timezone,
		"fiscal_data": fiber.Map{
			"rfc":           req.RFC,
			"razon_social":  req.RazonSocial,
			"regimen":       req.Regimen,
			"codigo_postal": req.CodigoPostal,
		},
		"school_year": req.SchoolYear,
		"eval_scheme": req.EvalScheme,
	}

	settingsData, err := json.Marshal(settingsJSON)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error serializing settings")
	}

	err = tx.QueryRow(c.UserContext(),
		"INSERT INTO tenants (name, slug, logo_url, plan, status, settings) VALUES ($1, $2, $3, $4, 'active', $5) RETURNING id",
		req.Name, req.Slug, req.LogoURL, req.Plan, settingsData).Scan(&tenantID)

	if err != nil {
		return response.Error(c, fiber.StatusConflict, "Slug already exists or database error")
	}

	// 3. Create default tenant admin user for the virtual environment.
	adminEmail := strings.TrimSpace(req.AdminEmail)
	if adminEmail == "" {
		adminEmail = "admin@educore.mx"
	}
	adminName := strings.TrimSpace(req.AdminName)
	if adminName == "" {
		adminName = "Administrador Escuela"
	}
	nameParts := strings.Fields(adminName)
	adminFirstName := "Administrador"
	adminLastName := "Escuela"
	if len(nameParts) == 1 {
		adminFirstName = nameParts[0]
	} else if len(nameParts) > 1 {
		adminFirstName = nameParts[0]
		adminLastName = strings.Join(nameParts[1:], " ")
	}
	passwordHash := "$2a$10$MJsfnrvcdfz1LtAsrYyiYeKhFbK/LdUbGuKMhfEu0rxfaKjzpVMV." // "admin123" for testing, or use a better default

	_, err = tx.Exec(c.UserContext(),
		`INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
		 VALUES ($1, $2, $3, $4, $5, 'SCHOOL_ADMIN', true)
		 ON CONFLICT (tenant_id, email)
		 DO UPDATE SET password_hash = EXCLUDED.password_hash,
		               first_name = EXCLUDED.first_name,
		               last_name = EXCLUDED.last_name,
		               role = 'SCHOOL_ADMIN',
		               is_active = true,
		               updated_at = NOW()`,
		tenantID, adminEmail, passwordHash, adminFirstName, adminLastName)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error creating admin user")
	}

	_, err = tx.Exec(c.UserContext(), `
		INSERT INTO tenant_roles (tenant_id, key, name, description, permissions, is_system)
		VALUES
			($1, 'admin', 'Administrador', 'Control operativo de la escuela', '["users:*","academic:*","database:tenant"]'::jsonb, true),
			($1, 'teacher', 'Profesor', 'Gestion docente y captura academica', '["groups:read","attendance:write","grades:write"]'::jsonb, true),
			($1, 'parent', 'Padre/Tutor', 'Consulta de hijos y comunicacion escolar', '["children:read","messages:write"]'::jsonb, true),
			($1, 'student', 'Alumno', 'Consulta de informacion academica propia', '["profile:read","grades:read"]'::jsonb, true)
		ON CONFLICT (tenant_id, key) DO NOTHING`, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error seeding tenant roles")
	}

	// 4. Activate core modules and selected premium modules
	_, err = tx.Exec(c.UserContext(),
		`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, is_required, source)
		 SELECT $1, key, true, true, true, 'core' FROM modules_catalog WHERE is_core = true
		 ON CONFLICT (tenant_id, module_key)
		 DO UPDATE SET is_active = true, enabled = true, is_required = true, updated_at = NOW()`,
		tenantID)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error activating core modules")
	}

	for _, level := range req.Levels {
		normalizedLevel := normalizeEducationLevel(level)
		for _, mod := range modulesByEducationLevel[normalizedLevel] {
			if _, err := tx.Exec(c.UserContext(),
				`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, level, is_required, source)
				 VALUES ($1, $2, true, true, $3, true, 'level')
				 ON CONFLICT (tenant_id, module_key)
				 DO UPDATE SET is_active = true, enabled = true, level = COALESCE(tenant_modules.level, EXCLUDED.level),
				               is_required = true, source = EXCLUDED.source, updated_at = NOW()`,
				tenantID, mod, normalizedLevel); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, "Error activating level module: "+mod)
			}
		}
	}

	for _, mod := range req.PremiumModules {
		if _, err := tx.Exec(c.UserContext(),
			`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, is_required, source)
			 VALUES ($1, $2, true, true, false, 'plan')
			 ON CONFLICT (tenant_id, module_key)
			 DO UPDATE SET is_active = true, enabled = true, source = EXCLUDED.source, updated_at = NOW()`,
			tenantID, mod); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error activating premium module: "+mod)
		}
	}

	// 5. Seed virtual tenant academic environment.
	schoolYearName := strings.TrimSpace(req.SchoolYear)
	if schoolYearName == "" {
		now := time.Now()
		schoolYearName = strconv.Itoa(now.Year()) + "-" + strconv.Itoa(now.Year()+1)
	}
	var schoolYearID string
	if err := tx.QueryRow(c.UserContext(), `
		INSERT INTO school_years (tenant_id, name, start_date, end_date, status, is_current, notes)
		VALUES ($1, $2, make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 8, 1),
		        make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, 7, 31),
		        'active', true, 'Ciclo creado automaticamente al provisionar tenant')
		RETURNING id`, tenantID, schoolYearName).Scan(&schoolYearID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error seeding school year")
	}

	if _, err := tx.Exec(c.UserContext(), `
		INSERT INTO school_settings (tenant_id, school_year, periods, grading_scale, primary_color, updated_at)
		VALUES ($1, $2, '[]'::jsonb, '{"min":0,"max":100,"passing":60}'::jsonb, '#4f46e5', NOW())
		ON CONFLICT (tenant_id)
		DO UPDATE SET school_year = EXCLUDED.school_year, updated_at = NOW()`, tenantID, schoolYearName); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error seeding school settings")
	}

	seedLevels := req.Levels
	if len(seedLevels) == 0 {
		seedLevels = []string{"Primaria"}
	}
	var firstGradeID string
	for i, level := range seedLevels {
		normalizedLevel := normalizeEducationLevel(level)
		gradeName := level
		if strings.TrimSpace(gradeName) == "" {
			gradeName = "Grado inicial"
		}
		var gradeID string
		if err := tx.QueryRow(c.UserContext(),
			`INSERT INTO grade_levels (tenant_id, name, level, sort_order)
			 VALUES ($1, $2, $3, $4)
			 RETURNING id`,
			tenantID, gradeName, normalizedLevel, i).Scan(&gradeID); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error seeding grade level: "+level)
		}
		if firstGradeID == "" {
			firstGradeID = gradeID
		}
	}

	defaultSubjects := []struct {
		Name string
		Code string
	}{
		{"Español", "ESP"},
		{"Matematicas", "MAT"},
		{"Ciencias", "CIE"},
		{"Historia", "HIS"},
	}
	for _, subject := range defaultSubjects {
		if _, err := tx.Exec(c.UserContext(), `
			INSERT INTO subjects (tenant_id, grade_id, name, code, description, credits, status)
			VALUES ($1, NULLIF($2, '')::uuid, $3, $4, 'Materia base creada automaticamente', 1, 'active')
			ON CONFLICT DO NOTHING`, tenantID, firstGradeID, subject.Name, subject.Code); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error seeding subject: "+subject.Name)
		}
	}

	if firstGradeID != "" {
		if _, err := tx.Exec(c.UserContext(), `
			INSERT INTO groups (tenant_id, grade_id, name, school_year, school_year_id, capacity, room, description, status)
			VALUES ($1, $2, 'A', $3, $4, 30, 'Aula 1', 'Grupo base creado automaticamente', 'active')
			ON CONFLICT DO NOTHING`, tenantID, firstGradeID, schoolYearName, schoolYearID); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error seeding default group")
		}
	}

	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not commit transaction")
	}

	return response.Success(c, fiber.Map{
		"id":          tenantID,
		"tenant_id":   tenantID,
		"admin_email": adminEmail,
		"admin_demo":  true,
	}, "School created successfully")
}

func (h *Handler) GetSchool(c *fiber.Ctx) error {
	id := c.Params("id")

	var slug, name, status, plan string
	var logoURL *string
	var createdAt, updatedAt interface{}

	err := h.db.QueryRow(c.UserContext(),
		"SELECT slug, name, logo_url, status, plan, created_at, updated_at FROM tenants WHERE id = $1", id).
		Scan(&slug, &name, &logoURL, &status, &plan, &createdAt, &updatedAt)

	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "School not found")
	}

	var studentCount, teacherCount, parentCount int
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM students WHERE tenant_id = $1", id).Scan(&studentCount); err != nil {
		studentCount = 0
	}
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'TEACHER'", id).Scan(&teacherCount); err != nil {
		teacherCount = 0
	}
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'PARENT'", id).Scan(&parentCount); err != nil {
		parentCount = 0
	}

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

	rows, err := h.db.Query(c.UserContext(),
		`SELECT mc.key, mc.name, mc.description, mc.is_core, mc.price_monthly_mxn,
		 COALESCE(tm.is_active, false) as is_active,
		 COALESCE(tm.enabled, tm.is_active, false) as enabled,
		 COALESCE(tm.level, '') as level,
		 COALESCE(tm.is_required, mc.is_core, false) as is_required,
		 COALESCE(tm.source, CASE WHEN mc.is_core THEN 'core' ELSE 'manual' END) as source
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
		var isCore, isActive, enabled, isRequired bool
		var level, source string
		var price float64

		rows.Scan(&key, &name, &description, &isCore, &price, &isActive, &enabled, &level, &isRequired, &source)

		desc := ""
		if description != nil {
			desc = *description
		}

		modules = append(modules, fiber.Map{
			"key": key, "name": name, "description": desc,
			"is_core": isCore, "price_monthly_mxn": price, "is_active": isActive,
			"enabled": enabled, "level": level, "is_required": isRequired, "source": source,
		})
	}
	if modules == nil {
		modules = []fiber.Map{}
	}

	return response.Success(c, fiber.Map{"modules": modules}, "Modules retrieved")
}

type ToggleModuleRequest struct {
	ModuleKey string `json:"module_key"`
	IsActive  *bool  `json:"is_active"`
}

func (h *Handler) ToggleModule(c *fiber.Ctx) error {
	id := c.Params("id")
	var req ToggleModuleRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	// Required modules are protected because they are part of the tenant's base contract.
	var isCore bool
	if err := h.db.QueryRow(c.UserContext(), "SELECT is_core FROM modules_catalog WHERE key = $1", req.ModuleKey).Scan(&isCore); err != nil {
		return response.Error(c, fiber.StatusNotFound, "Module not found in catalog")
	}
	var isRequired bool
	_ = h.db.QueryRow(c.UserContext(), "SELECT COALESCE(is_required, false) FROM tenant_modules WHERE tenant_id = $1 AND module_key = $2", id, req.ModuleKey).Scan(&isRequired)
	if isCore || isRequired {
		return response.Error(c, fiber.StatusForbidden, "Cannot toggle core modules")
	}

	nextActive := true
	if req.IsActive != nil {
		nextActive = *req.IsActive
	} else {
		_ = h.db.QueryRow(c.UserContext(), "SELECT NOT COALESCE(is_active, false) FROM tenant_modules WHERE tenant_id = $1 AND module_key = $2", id, req.ModuleKey).Scan(&nextActive)
	}

	_, err := h.db.Exec(c.UserContext(),
		`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, is_required, source)
		 VALUES ($1, $2, $3, $3, false, 'manual')
		 ON CONFLICT (tenant_id, module_key)
		 DO UPDATE SET is_active = EXCLUDED.is_active,
		               enabled = EXCLUDED.enabled,
		               source = CASE WHEN tenant_modules.source = 'core' THEN tenant_modules.source ELSE EXCLUDED.source END,
		               updated_at = NOW()`,
		id, req.ModuleKey, nextActive)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error toggling module")
	}

	return response.Success(c, nil, "Module toggled")
}

func (h *Handler) GetModulesCatalog(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
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

	// Ensure uploads directory exists
	if _, err := os.Stat("./uploads"); os.IsNotExist(err) {
		os.Mkdir("./uploads", 0755)
	}

	filename := "logo_" + file.Filename
	if err := c.SaveFile(file, "./uploads/"+filename); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error saving file")
	}

	protocol := "http"
	if c.Protocol() == "https" {
		protocol = "https"
	}
	url := protocol + "://" + c.Hostname() + "/uploads/" + filename

	return response.Success(c, fiber.Map{"url": url}, "Logo uploaded")
}
