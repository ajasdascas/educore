package superadmin

import (
	"context"
	"crypto/rand"
	"educore/internal/pkg/response"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"educore/internal/pkg/database"
	"educore/internal/pkg/rbac"
	"educore/internal/pkg/schooldomain"
	"educore/internal/pkg/slug"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	db *database.DB
}

func NewHandler(db *database.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/stats", h.Stats)
	router.Get("/schools", h.ListSchools)
	router.Post("/schools", h.CreateSchool)
	router.Get("/schools/:id", h.GetSchool)
	router.Patch("/schools/:id", h.UpdateSchool)
	router.Patch("/schools/:id/status", h.UpdateSchoolStatus)
	router.Get("/schools/:id/users", h.GetSchoolUsers)
	router.Get("/schools/:id/modules", h.GetSchoolModules)
	router.Post("/schools/:id/modules/toggle", h.ToggleModule)
	router.Post("/schools/:id/domain/provision", h.ProvisionSchoolDomain)
	router.Get("/modules-catalog", h.GetModulesCatalog)

	h.RegisterPlanRoutes(router)
	h.RegisterUserRoutes(router)
	h.RegisterEnterpriseRoutes(router)
	h.RegisterDatabaseAdminRoutes(router)
}

func (h *Handler) Stats(c *fiber.Ctx) error {
	var totalTenants, activeTenants, trialTenants, totalStudents int

	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL").Scan(&totalTenants); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching total tenants")
	}
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM tenants WHERE status = 'active' AND deleted_at IS NULL").Scan(&activeTenants); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching active tenants")
	}
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM tenants WHERE status = 'trial' AND deleted_at IS NULL").Scan(&trialTenants); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching trial tenants")
	}
	if err := h.db.QueryRow(c.UserContext(), `
		SELECT COUNT(*) FROM students s
		JOIN tenants t ON t.id = s.tenant_id
		WHERE s.deleted_at IS NULL AND t.deleted_at IS NULL`).Scan(&totalStudents); err != nil {
		// No devolvemos error fatal si falla el conteo de alumnos (tabla students podría no existir aún en dev)
		totalStudents = 0
	}

	// Recent schools
	rows, err := h.db.Query(c.UserContext(),
		"SELECT id, name, slug, plan, status, created_at FROM tenants WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5")
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching recent schools")
	}
	defer rows.Close()

	var recentSchools []fiber.Map
	for rows.Next() {
		var id, name, slug, plan, status string
		var createdAt interface{}
		if err := rows.Scan(&id, &name, &slug, &plan, &status, &createdAt); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error reading recent schools")
		}
		recentSchools = append(recentSchools, fiber.Map{
			"id": id, "name": name, "slug": slug, "plan": plan, "status": status, "created_at": createdAt,
		})
	}
	if recentSchools == nil {
		recentSchools = []fiber.Map{}
	}
	if err := rows.Err(); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error completing recent schools query")
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
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	search := strings.TrimSpace(c.Query("search", ""))
	status := strings.TrimSpace(c.Query("status", ""))
	plan := strings.TrimSpace(c.Query("plan", ""))
	offset := (page - 1) * limit

	query := `SELECT t.id, t.slug, t.name, t.logo_url, t.status, t.plan, t.created_at,
		 (SELECT COUNT(*) FROM students s WHERE s.tenant_id = t.id AND s.deleted_at IS NULL) as student_count,
		 (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.deleted_at IS NULL) as user_count
		 FROM tenants t WHERE t.deleted_at IS NULL`

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

		if err := rows.Scan(&id, &slug, &name, &logoURL, &status, &plan, &createdAt, &studentCount, &userCount); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error reading schools")
		}

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
	if err := rows.Err(); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error completing schools query")
	}

	// Get total count for pagination
	var total int
	countQuery := "SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL"
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
		return response.Error(c, fiber.StatusInternalServerError, "Error counting schools")
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
	// Only modules backed by a real route, API and persistence contract can be
	// provisioned. Level-specific capabilities that are still under design stay
	// out of this map so a newly-created tenant never receives dead navigation.
	"babies":     {"students", "groups"},
	"daycare":    {"students", "groups"},
	"preescolar": {"students", "groups"},
	"kinder":     {"students", "groups"},
	"primaria":   {"students", "groups", "grades"},
	// Secundaria / Prepa / Universidad
	"secundaria_general": {"students", "groups", "grades"},
	"secundaria_tecnica": {"students", "groups", "grades"},
	"prepa_general":      {"students", "groups", "grades"},
	"prepa_tecnica":      {"students", "groups", "grades"},
	"universidad":        {"students", "groups", "grades"},
}

var productionReadyTenantModules = map[string]struct{}{
	"auth": {}, "users": {}, "academic_core": {}, "grading": {},
	"students": {}, "groups": {}, "grades": {}, "schedules": {}, "attendance": {},
}

var productionCoreTenantModules = map[string]struct{}{
	"auth": {}, "users": {}, "academic_core": {}, "grading": {},
}

var tenantSelectableProductionModules = map[string]struct{}{
	"schedules": {}, "attendance": {},
}

func isProductionReadyTenantModule(key string) bool {
	_, ok := productionReadyTenantModules[strings.ToLower(strings.TrimSpace(key))]
	return ok
}

func isProductionCoreTenantModule(key string) bool {
	_, ok := productionCoreTenantModules[strings.ToLower(strings.TrimSpace(key))]
	return ok
}

func isTenantSelectableProductionModule(key string) bool {
	_, ok := tenantSelectableProductionModules[strings.ToLower(strings.TrimSpace(key))]
	return ok
}

func decodePlanModules(raw string) ([]string, error) {
	if strings.TrimSpace(raw) == "" {
		return []string{}, nil
	}
	var modules []string
	if err := json.Unmarshal([]byte(raw), &modules); err != nil {
		return nil, err
	}
	return modules, nil
}

func classifyPlanModules(modules []string) (ready []string, unavailable []string) {
	seenReady := map[string]struct{}{}
	seenUnavailable := map[string]struct{}{}
	for _, value := range modules {
		key := strings.ToLower(strings.TrimSpace(value))
		if key == "" {
			continue
		}
		if isTenantSelectableProductionModule(key) {
			if _, exists := seenReady[key]; !exists {
				ready = append(ready, key)
				seenReady[key] = struct{}{}
			}
			continue
		}
		// Core and level-required modules are provisioned by their own contract,
		// so they are neither add-ons nor unavailable plan promises.
		if isProductionReadyTenantModule(key) {
			continue
		}
		if _, exists := seenUnavailable[key]; !exists {
			unavailable = append(unavailable, key)
			seenUnavailable[key] = struct{}{}
		}
	}
	return ready, unavailable
}

func classifyRequestedAddons(modules []string) (ready []string, invalid []string) {
	seenReady := map[string]struct{}{}
	seenInvalid := map[string]struct{}{}
	for _, value := range modules {
		key := strings.ToLower(strings.TrimSpace(value))
		if key == "" {
			continue
		}
		if isTenantSelectableProductionModule(key) {
			if _, exists := seenReady[key]; !exists {
				ready = append(ready, key)
				seenReady[key] = struct{}{}
			}
			continue
		}
		if _, exists := seenInvalid[key]; !exists {
			invalid = append(invalid, key)
			seenInvalid[key] = struct{}{}
		}
	}
	return ready, invalid
}

func normalizeEducationLevel(level string) string {
	switch strings.ToLower(strings.TrimSpace(level)) {
	case "babies", "bebés", "bebes", "guardería", "guarderia", "daycare":
		return "babies"
	case "kínder", "kinder", "kindergarten":
		return "kinder"
	case "preescolar", "preschool":
		return "preescolar"
	case "primaria", "primary":
		return "primaria"
	case "secundaria", "secundaria general", "secundaria_general":
		return "secundaria_general"
	case "secundaria técnica", "secundaria tecnica", "secundaria_tecnica":
		return "secundaria_tecnica"
	case "preparatoria", "preparatoria general", "prepa", "prepa_general":
		return "prepa_general"
	case "preparatoria técnica", "preparatoria tecnica", "prepa_tecnica":
		return "prepa_tecnica"
	case "universidad", "university":
		return "universidad"
	default:
		return strings.ToLower(strings.TrimSpace(level))
	}
}

func isSupportedEducationLevel(level string) bool {
	switch normalizeEducationLevel(level) {
	case "babies", "daycare", "preescolar", "kinder", "primaria":
		return true
	default:
		return false
	}
}

func generateSchoolAdminPassword() (string, error) {
	// The credential is returned once to the super admin and must never be a
	// shared environment value. The fixed prefix guarantees the character
	// classes commonly required by password policies; the random suffix carries
	// 128 bits of entropy and has no static fallback.
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	return "Ec1!" + hex.EncodeToString(randomBytes), nil
}

type tenantRoleSeed struct {
	Key         string
	Name        string
	Description string
	Permissions string
}

func productionTenantRoleSeeds() ([]tenantRoleSeed, error) {
	roles := []string{rbac.RoleSchoolAdmin, rbac.RoleTeacher, rbac.RoleParent, rbac.RoleStudent}
	seeds := make([]tenantRoleSeed, 0, len(roles))
	for _, role := range roles {
		definition, ok := rbac.Definition(role)
		if !ok || definition.TenantRoleKey == "" {
			return nil, fmt.Errorf("missing tenant role definition for %s", role)
		}
		permissions, err := json.Marshal(definition.DefaultPermissions)
		if err != nil {
			return nil, fmt.Errorf("serialize permissions for %s: %w", role, err)
		}
		seeds = append(seeds, tenantRoleSeed{
			Key: definition.TenantRoleKey, Name: definition.Name,
			Description: definition.Description, Permissions: string(permissions),
		})
	}
	return seeds, nil
}

func superAdminInternalErrorMessage(message string, err error) string {
	if err != nil && strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "staging") {
		return message + ": " + err.Error()
	}
	return message
}

func superAdminStagingPanicMessage(step string, recovered interface{}) string {
	if strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "staging") {
		return fmt.Sprintf("CreateSchool panic at %s: %v", step, recovered)
	}
	return "Error provisioning school"
}

func (h *Handler) CreateSchool(c *fiber.Ctx) (err error) {
	step := "parse_request"
	requestID := fmt.Sprint(c.Locals("requestid"))
	staging := strings.EqualFold(strings.TrimSpace(os.Getenv("APP_ENV")), "staging")
	defer func() {
		if recovered := recover(); recovered != nil {
			log.Printf("CreateSchool panic request_id=%s step=%s err=%v", requestID, step, recovered)
			err = response.Error(c, fiber.StatusInternalServerError, superAdminStagingPanicMessage(step, recovered))
		}
	}()
	internalError := func(message string, cause error) string {
		if cause != nil {
			log.Printf("CreateSchool error request_id=%s step=%s err=%v", requestID, step, cause)
		}
		if cause != nil && staging {
			return fmt.Sprintf("%s at %s: %s", message, step, cause)
		}
		return message
	}

	var req CreateSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}
	step = "validate_request"
	if len(req.Levels) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "Selecciona un nivel escolar: preescolar, kinder o primaria")
	}
	for _, level := range req.Levels {
		if !isSupportedEducationLevel(level) {
			return response.Error(c, fiber.StatusBadRequest, "Nivel escolar no soportado. Usa preescolar, kinder o primaria")
		}
	}

	// 1. Validate plan exists
	step = "validate_plan"
	var planExists bool
	if database.IsMySQL(h.db.Driver()) {
		step = "validate_plan_mysql_subscription_plans"
		err := h.db.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE (id = ? OR name = ?) AND is_active = true)", req.Plan, req.Plan).Scan(&planExists)
		if err != nil && strings.Contains(err.Error(), "subscription_plans") && strings.Contains(err.Error(), "doesn't exist") {
			step = "validate_plan_mysql_plans_fallback"
			err = h.db.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM plans WHERE (id = ? OR name = ?) AND is_active = true)", req.Plan, req.Plan).Scan(&planExists)
		}
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, internalError("Error validating subscription plan", err))
		}
	} else {
		step = "validate_plan_postgres"
		if err := h.db.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM subscription_plans WHERE (id::text = $1 OR name = $1) AND is_active = true)", req.Plan).Scan(&planExists); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, internalError("Error validating subscription plan", err))
		}
	}
	if !planExists {
		return response.Error(c, fiber.StatusBadRequest, "El plan seleccionado no es válido")
	}

	// Load the plan contract. Previously the plan was stored on the tenant but
	// its modules were never provisioned, leaving newly-created schools with a
	// misleading subscription and missing functionality.
	step = "load_plan_modules"
	var planModulesRaw string
	if database.IsMySQL(h.db.Driver()) {
		err = h.db.QueryRow(c.UserContext(),
			"SELECT CAST(COALESCE(modules, JSON_ARRAY()) AS CHAR) FROM subscription_plans WHERE (id = ? OR name = ?) AND is_active = true LIMIT 1",
			req.Plan, req.Plan).Scan(&planModulesRaw)
		if err != nil && strings.Contains(err.Error(), "subscription_plans") && strings.Contains(err.Error(), "doesn't exist") {
			err = h.db.QueryRow(c.UserContext(),
				"SELECT CAST(COALESCE(modules, JSON_ARRAY()) AS CHAR) FROM plans WHERE (id = ? OR name = ?) AND is_active = true LIMIT 1",
				req.Plan, req.Plan).Scan(&planModulesRaw)
		}
	} else {
		err = h.db.QueryRow(c.UserContext(),
			"SELECT COALESCE(modules, '[]'::jsonb)::text FROM subscription_plans WHERE (id::text = $1 OR name = $1) AND is_active = true LIMIT 1",
			req.Plan).Scan(&planModulesRaw)
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, internalError("Error loading subscription plan modules", err))
	}
	planModules, err := decodePlanModules(planModulesRaw)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, internalError("Subscription plan has an invalid module contract", err))
	}
	provisionedAddonModules, unavailablePlanModules := classifyPlanModules(planModules)

	// Explicit add-ons are user-controlled input. Reject any planned, internal
	// or unknown key instead of silently creating a tenant with dead modules.
	requestedAddons, invalidRequestedAddons := classifyRequestedAddons(req.PremiumModules)
	if len(invalidRequestedAddons) > 0 {
		return response.Error(c, fiber.StatusBadRequest,
			"Estos módulos todavía no están disponibles para producción: "+strings.Join(invalidRequestedAddons, ", "))
	}
	for _, moduleKey := range requestedAddons {
		alreadyIncluded := false
		for _, includedKey := range provisionedAddonModules {
			if includedKey == moduleKey {
				alreadyIncluded = true
				break
			}
		}
		if !alreadyIncluded {
			provisionedAddonModules = append(provisionedAddonModules, moduleKey)
		}
	}

	// 2. Normalize + validate slug (subdominio de la escuela)
	step = "normalize_slug"
	candidate := slug.Normalize(req.Slug)
	if candidate == "" {
		// Sin slug explícito: derivar del nombre de la escuela.
		candidate = slug.Normalize(req.Name)
	}
	if err := slug.Validate(candidate); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Subdominio inválido: "+err.Error())
	}
	req.Slug = candidate

	// 2b. Check if slug exists
	step = "validate_slug"
	var slugExists bool
	if err := h.db.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM tenants WHERE slug = $1)", req.Slug).Scan(&slugExists); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, internalError("Error validating school slug", err))
	}
	if slugExists {
		return response.Error(c, fiber.StatusConflict, "El subdominio ya está en uso")
	}

	// 3. Start transaction
	step = "begin_transaction"
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not start transaction")
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(c.UserContext())
		}
	}()

	// 2. Create Tenant with Settings
	var tenantID string

	// Auto-generate normalized subdomain from slug
	subdomain := req.Slug + ".onlineu.mx"

	settingsJSON := fiber.Map{
		"levels":        req.Levels,
		"phone":         req.Phone,
		"contact_email": req.ContactEmail,
		"address":       req.Address,
		"timezone":      req.Timezone,
		"subdomain":     subdomain,
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

	if database.IsMySQL(h.db.Driver()) {
		step = "insert_tenant_mysql"
		tenantID = database.NewID()
		_, err = tx.Exec(c.UserContext(),
			"INSERT INTO tenants (id, name, slug, logo_url, plan, status, settings) VALUES (?, ?, ?, ?, ?, 'active', ?)",
			tenantID, req.Name, req.Slug, req.LogoURL, req.Plan, settingsData)
	} else {
		step = "insert_tenant_postgres"
		err = tx.QueryRow(c.UserContext(),
			"INSERT INTO tenants (name, slug, logo_url, plan, status, settings) VALUES ($1, $2, $3, $4, 'active', $5) RETURNING id",
			req.Name, req.Slug, req.LogoURL, req.Plan, settingsData).Scan(&tenantID)
	}

	if err != nil {
		return response.Error(c, fiber.StatusConflict, internalError("Slug already exists or database error", err))
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
	defaultPassword, err := generateSchoolAdminPassword()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error generating one-time admin password")
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error preparing admin password")
	}

	if database.IsMySQL(h.db.Driver()) {
		step = "create_admin_user_mysql"
		_, err = tx.Exec(c.UserContext(),
			`INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active, password_must_change)
			 VALUES (?, ?, ?, ?, ?, ?, 'SCHOOL_ADMIN', true, true)
			 ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash),
			                         first_name = VALUES(first_name),
			                         last_name = VALUES(last_name),
			                         role = 'SCHOOL_ADMIN',
			                         is_active = true,
			                         password_must_change = true,
			                         updated_at = CURRENT_TIMESTAMP`,
			database.NewID(), tenantID, adminEmail, string(hashedPassword), adminFirstName, adminLastName)
	} else {
		step = "create_admin_user_postgres"
		_, err = tx.Exec(c.UserContext(),
			`INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, password_must_change)
			 VALUES ($1, $2, $3, $4, $5, 'SCHOOL_ADMIN', true, true)
			 ON CONFLICT (tenant_id, email)
			 DO UPDATE SET password_hash = EXCLUDED.password_hash,
			               first_name = EXCLUDED.first_name,
			               last_name = EXCLUDED.last_name,
			               role = 'SCHOOL_ADMIN',
			               is_active = true,
			               password_must_change = true,
			               updated_at = NOW()`,
			tenantID, adminEmail, string(hashedPassword), adminFirstName, adminLastName)
	}

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, internalError("Error creating admin user", err))
	}

	roleSeeds, err := productionTenantRoleSeeds()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, internalError("Error preparing tenant roles", err))
	}
	for _, seed := range roleSeeds {
		step = "seed_role:" + seed.Key
		if database.IsMySQL(h.db.Driver()) {
			_, err = tx.Exec(c.UserContext(), `
				INSERT INTO tenant_roles (id, tenant_id, `+"`key`"+`, name, description, permissions, is_system, policy_version)
				VALUES (?, ?, ?, ?, ?, ?, true, 2)
				ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_system = true,
				                        policy_version = GREATEST(policy_version, VALUES(policy_version))`,
				database.NewID(), tenantID, seed.Key, seed.Name, seed.Description, seed.Permissions)
		} else {
			_, err = tx.Exec(c.UserContext(), `
				INSERT INTO tenant_roles (tenant_id, key, name, description, permissions, is_system, policy_version)
				VALUES ($1, $2, $3, $4, $5::jsonb, true, 2)
				ON CONFLICT (tenant_id, key) DO NOTHING`,
				tenantID, seed.Key, seed.Name, seed.Description, seed.Permissions)
		}
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding tenant role: "+seed.Key, err))
		}
	}

	// 4. Activate core modules and selected premium modules
	if database.IsMySQL(h.db.Driver()) {
		step = "activate_core_modules_mysql"
		_, err = tx.Exec(c.UserContext(),
			`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, is_required, source)
			 SELECT ?, `+"`key`"+`, true, true, true, 'core'
			 FROM modules_catalog
			 WHERE is_core = true AND status = 'active' AND global_enabled = true
			 ON DUPLICATE KEY UPDATE is_active = true,
			                         enabled = true,
			                         is_required = true,
			                         source = 'core',
			                         updated_at = CURRENT_TIMESTAMP`,
			tenantID)
	} else {
		step = "activate_core_modules_postgres"
		_, err = tx.Exec(c.UserContext(),
			`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, is_required, source)
			 SELECT $1, `+h.moduleCatalogKey("")+`, true, true, true, 'core'
			 FROM modules_catalog
			 WHERE is_core = true AND status = 'active' AND global_enabled = true
			 ON CONFLICT (tenant_id, module_key)
			 DO UPDATE SET is_active = true, enabled = true, is_required = true, updated_at = NOW()`,
			tenantID)
	}

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, internalError("Error activating core modules", err))
	}

	for _, level := range req.Levels {
		normalizedLevel := normalizeEducationLevel(level)
		for _, mod := range modulesByEducationLevel[normalizedLevel] {
			if database.IsMySQL(h.db.Driver()) {
				step = "activate_level_module_mysql:" + mod
				if _, err := tx.Exec(c.UserContext(),
					`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, level, is_required, source)
					 VALUES (?, ?, true, true, ?, true, 'level')
					 ON DUPLICATE KEY UPDATE is_active = true,
					                         enabled = true,
					                         level = ?,
					                         is_required = true,
					                         source = 'level',
					                         updated_at = CURRENT_TIMESTAMP`,
					tenantID, mod, normalizedLevel, normalizedLevel); err != nil {
					return response.Error(c, fiber.StatusInternalServerError, internalError("Error activating level module: "+mod, err))
				}
			} else {
				step = "activate_level_module_postgres:" + mod
				if _, err := tx.Exec(c.UserContext(),
					`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, level, is_required, source)
					 VALUES ($1, $2, true, true, $3, true, 'level')
					 ON CONFLICT (tenant_id, module_key)
					 DO UPDATE SET is_active = true, enabled = true, level = COALESCE(tenant_modules.level, EXCLUDED.level),
					               is_required = true, source = EXCLUDED.source, updated_at = NOW()`,
					tenantID, mod, normalizedLevel); err != nil {
					return response.Error(c, fiber.StatusInternalServerError, internalError("Error activating level module: "+mod, err))
				}
			}
		}
	}

	for _, mod := range provisionedAddonModules {
		if database.IsMySQL(h.db.Driver()) {
			step = "activate_premium_module_mysql:" + mod
			if _, err := tx.Exec(c.UserContext(),
				`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, is_required, source)
				 VALUES (?, ?, true, true, false, 'plan')
				 ON DUPLICATE KEY UPDATE is_active = true,
				                         enabled = true,
				                         source = 'plan',
				                         updated_at = CURRENT_TIMESTAMP`,
				tenantID, mod); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, internalError("Error activating premium module: "+mod, err))
			}
		} else {
			step = "activate_premium_module_postgres:" + mod
			if _, err := tx.Exec(c.UserContext(),
				`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, is_required, source)
				 VALUES ($1, $2, true, true, false, 'plan')
				 ON CONFLICT (tenant_id, module_key)
				 DO UPDATE SET is_active = true, enabled = true, source = EXCLUDED.source, updated_at = NOW()`,
				tenantID, mod); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, internalError("Error activating premium module: "+mod, err))
			}
		}
	}

	// 5. Seed virtual tenant academic environment.
	schoolYearName := strings.TrimSpace(req.SchoolYear)
	if schoolYearName == "" {
		now := time.Now()
		schoolYearName = strconv.Itoa(now.Year()) + "-" + strconv.Itoa(now.Year()+1)
	}
	var schoolYearID string
	if database.IsMySQL(h.db.Driver()) {
		step = "seed_school_year_mysql"
		schoolYearID = database.NewID()
		now := time.Now()
		startDate := time.Date(now.Year(), 8, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
		endDate := time.Date(now.Year()+1, 7, 31, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
		if _, err := tx.Exec(c.UserContext(), `
			INSERT INTO school_years (id, tenant_id, name, start_date, end_date, status, is_current, notes)
			VALUES (?, ?, ?, ?, ?, 'active', true, 'Ciclo creado automaticamente al provisionar tenant')`,
			schoolYearID, tenantID, schoolYearName, startDate, endDate); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding school year", err))
		}
	} else {
		step = "seed_school_year_postgres"
		if err := tx.QueryRow(c.UserContext(), `
			INSERT INTO school_years (tenant_id, name, start_date, end_date, status, is_current, notes)
			VALUES ($1, $2, make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int, 8, 1),
			        make_date(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1, 7, 31),
			        'active', true, 'Ciclo creado automaticamente al provisionar tenant')
			RETURNING id`, tenantID, schoolYearName).Scan(&schoolYearID); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding school year", err))
		}
	}

	if database.IsMySQL(h.db.Driver()) {
		step = "seed_school_settings_mysql"
		if _, err := tx.Exec(c.UserContext(), `
			INSERT INTO school_settings (tenant_id, school_year, periods, grading_scale, primary_color, updated_at)
			VALUES (?, ?, '[]', '{"min":0,"max":100,"passing":60}', '#4f46e5', CURRENT_TIMESTAMP)
			ON DUPLICATE KEY UPDATE school_year = VALUES(school_year), updated_at = CURRENT_TIMESTAMP`,
			tenantID, schoolYearName); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding school settings", err))
		}
	} else {
		step = "seed_school_settings_postgres"
		if _, err := tx.Exec(c.UserContext(), `
			INSERT INTO school_settings (tenant_id, school_year, periods, grading_scale, primary_color, updated_at)
			VALUES ($1, $2, '[]'::jsonb, '{"min":0,"max":100,"passing":60}'::jsonb, '#4f46e5', NOW())
			ON CONFLICT (tenant_id)
			DO UPDATE SET school_year = EXCLUDED.school_year, updated_at = NOW()`, tenantID, schoolYearName); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding school settings", err))
		}
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
		if database.IsMySQL(h.db.Driver()) {
			step = "seed_grade_level_mysql:" + normalizedLevel
			gradeID = database.NewID()
			if _, err := tx.Exec(c.UserContext(),
				`INSERT INTO grade_levels (id, tenant_id, name, level, sort_order)
				 VALUES (?, ?, ?, ?, ?)`,
				gradeID, tenantID, gradeName, normalizedLevel, i); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding grade level: "+level, err))
			}
		} else {
			step = "seed_grade_level_postgres:" + normalizedLevel
			if err := tx.QueryRow(c.UserContext(),
				`INSERT INTO grade_levels (tenant_id, name, level, sort_order)
				 VALUES ($1, $2, $3, $4)
				 RETURNING id`,
				tenantID, gradeName, normalizedLevel, i).Scan(&gradeID); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding grade level: "+level, err))
			}
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
		if database.IsMySQL(h.db.Driver()) {
			step = "seed_subject_mysql:" + subject.Code
			if _, err := tx.Exec(c.UserContext(), `
				INSERT IGNORE INTO subjects (id, tenant_id, grade_id, name, code, description, credits, status)
				VALUES (?, ?, NULLIF(?, ''), ?, ?, 'Materia base creada automaticamente', 1, 'active')`,
				database.NewID(), tenantID, firstGradeID, subject.Name, subject.Code); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding subject: "+subject.Name, err))
			}
		} else {
			step = "seed_subject_postgres:" + subject.Code
			if _, err := tx.Exec(c.UserContext(), `
				INSERT INTO subjects (tenant_id, grade_id, name, code, description, credits, status)
				VALUES ($1, NULLIF($2, '')::uuid, $3, $4, 'Materia base creada automaticamente', 1, 'active')
				ON CONFLICT DO NOTHING`, tenantID, firstGradeID, subject.Name, subject.Code); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding subject: "+subject.Name, err))
			}
		}
	}

	if firstGradeID != "" {
		if database.IsMySQL(h.db.Driver()) {
			step = "seed_default_group_mysql"
			if _, err := tx.Exec(c.UserContext(), `
				INSERT IGNORE INTO groups (id, tenant_id, grade_id, name, school_year, school_year_id, capacity, room, description, status)
				VALUES (?, ?, ?, 'A', ?, ?, 30, 'Aula 1', 'Grupo base creado automaticamente', 'active')`,
				database.NewID(), tenantID, firstGradeID, schoolYearName, schoolYearID); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding default group", err))
			}
		} else {
			step = "seed_default_group_postgres"
			if _, err := tx.Exec(c.UserContext(), `
				INSERT INTO groups (tenant_id, grade_id, name, school_year, school_year_id, capacity, room, description, status)
				VALUES ($1, $2, 'A', $3, $4, 30, 'Aula 1', 'Grupo base creado automaticamente', 'active')
				ON CONFLICT DO NOTHING`, tenantID, firstGradeID, schoolYearName, schoolYearID); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, internalError("Error seeding default group", err))
			}
		}
	}

	step = "commit"
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, internalError("Could not commit transaction", err))
	}
	committed = true

	// Provision the Hostinger subdomain after the database transaction is
	// durable. This is an external side effect, so a provider outage must not
	// roll back an otherwise valid tenant. The persisted status makes the
	// partial outcome explicit and retryable instead of claiming the host works.
	domainProvisioningStatus := "not_configured"
	domainReady := false
	domainProvisioningWarning := "Configura la API de Hostinger para crear el subdominio automáticamente."
	if provisioner, configErr := schooldomain.NewFromEnv(); configErr == nil {
		domainProvisioningStatus = "pending"
		domainProvisioningWarning = "La escuela fue creada, pero Hostinger todavía no confirmó el subdominio."
		provisionContext, cancelProvision := context.WithTimeout(context.Background(), 20*time.Second)
		provisionResult, provisionErr := provisioner.Ensure(provisionContext, req.Slug)
		cancelProvision()
		if provisionErr != nil {
			log.Printf("CreateSchool domain provisioning failed request_id=%s tenant_id=%s slug=%s err=%v", requestID, tenantID, req.Slug, provisionErr)
		} else {
			domainProvisioningStatus = provisionResult.Status
			domainReady = provisionResult.Status == "created" || provisionResult.Status == "existing"
			domainProvisioningWarning = ""
		}
	}
	if recordErr := h.recordDomainProvisioningStatus(context.Background(), tenantID, domainProvisioningStatus, domainReady); recordErr != nil {
		log.Printf("CreateSchool could not persist domain status request_id=%s tenant_id=%s err=%v", requestID, tenantID, recordErr)
	}

	// This is the only response that exposes the one-time credential. Prevent
	// browser/proxy caching and never persist or log the plaintext value.
	c.Set(fiber.HeaderCacheControl, "no-store")
	c.Set(fiber.HeaderPragma, "no-cache")
	return response.Success(c, fiber.Map{
		"id":                          tenantID,
		"tenant_id":                   tenantID,
		"admin_email":                 adminEmail,
		"subdomain":                   subdomain,
		"admin_ready":                 true,
		"admin_password":              defaultPassword,
		"generated_admin_password":    true,
		"password_must_change":        true,
		"enabled_addon_modules":       provisionedAddonModules,
		"unavailable_plan_modules":    unavailablePlanModules,
		"domain_provisioning_status":  domainProvisioningStatus,
		"domain_ready":                domainReady,
		"domain_provisioning_warning": domainProvisioningWarning,
		"portals": fiber.Map{
			"school_admin": "/school-portal/school-admin?slug=" + req.Slug,
			"parents":      "/school-portal/parents?slug=" + req.Slug,
			"teachers":     "/school-portal/teachers?slug=" + req.Slug,
			"students":     "/school-portal/students?slug=" + req.Slug,
		},
	}, "School created successfully")
}

func (h *Handler) recordDomainProvisioningStatus(ctx context.Context, tenantID, status string, ready bool) error {
	if database.IsMySQL(h.db.Driver()) {
		_, err := h.db.Exec(ctx, `
			UPDATE tenants
			SET settings = JSON_SET(COALESCE(settings, JSON_OBJECT()),
			  '$.domain_provisioning_status', ?, '$.domain_ready', ?),
			  updated_at = CURRENT_TIMESTAMP
			WHERE id = ?`, status, ready, tenantID)
		return err
	}
	_, err := h.db.Exec(ctx, `
		UPDATE tenants
		SET settings = jsonb_set(
		  jsonb_set(COALESCE(settings, '{}'::jsonb), '{domain_provisioning_status}', to_jsonb($1::text), true),
		  '{domain_ready}', to_jsonb($2::boolean), true
		), updated_at = NOW()
		WHERE id = $3`, status, ready, tenantID)
	return err
}

func (h *Handler) ProvisionSchoolDomain(c *fiber.Ctx) error {
	tenantID := strings.TrimSpace(c.Params("id"))
	var schoolSlug string
	if err := h.db.QueryRow(c.UserContext(), "SELECT slug FROM tenants WHERE id = $1 AND deleted_at IS NULL", tenantID).Scan(&schoolSlug); err != nil {
		return response.Error(c, fiber.StatusNotFound, "School not found")
	}

	provisioner, err := schooldomain.NewFromEnv()
	if err != nil {
		_ = h.recordDomainProvisioningStatus(context.Background(), tenantID, "not_configured", false)
		return response.Error(c, fiber.StatusServiceUnavailable, "Hostinger provisioning is not configured")
	}

	provisionContext, cancelProvision := context.WithTimeout(context.Background(), 20*time.Second)
	result, err := provisioner.Ensure(provisionContext, schoolSlug)
	cancelProvision()
	if err != nil {
		_ = h.recordDomainProvisioningStatus(context.Background(), tenantID, "pending", false)
		log.Printf("ProvisionSchoolDomain failed tenant_id=%s slug=%s err=%v", tenantID, schoolSlug, err)
		return response.Error(c, fiber.StatusBadGateway, "Hostinger did not confirm the subdomain; it remains pending")
	}

	ready := result.Status == "created" || result.Status == "existing"
	if err := h.recordDomainProvisioningStatus(context.Background(), tenantID, result.Status, ready); err != nil {
		log.Printf("ProvisionSchoolDomain could not persist status tenant_id=%s err=%v", tenantID, err)
		return response.Error(c, fiber.StatusInternalServerError, "Subdomain was provisioned but its status could not be saved")
	}

	h.auditSuperAdmin(c, "school.domain.provision", "tenants", tenantID, "warning", fiber.Map{
		"host": result.Host, "status": result.Status,
	}, "")
	return response.Success(c, fiber.Map{
		"host": result.Host, "status": result.Status, "domain_ready": ready,
	}, "School subdomain provisioned")
}

type updateSchoolRequest struct {
	Name    *string `json:"name"`
	LogoURL *string `json:"logo_url"`
}

func (h *Handler) UpdateSchool(c *fiber.Ctx) error {
	tenantID := strings.TrimSpace(c.Params("id"))
	var req updateSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Solicitud de escuela inválida")
	}
	if req.Name == nil && req.LogoURL == nil {
		return response.Error(c, fiber.StatusBadRequest, "No hay cambios para guardar")
	}

	setParts := []string{}
	args := []interface{}{}
	if req.Name != nil {
		name := strings.TrimSpace(*req.Name)
		if len([]rune(name)) < 2 || len([]rune(name)) > 255 {
			return response.Error(c, fiber.StatusBadRequest, "El nombre debe tener entre 2 y 255 caracteres")
		}
		args = append(args, name)
		setParts = append(setParts, fmt.Sprintf("name = $%d", len(args)))
	}
	if req.LogoURL != nil {
		logo := strings.TrimSpace(*req.LogoURL)
		if logo != "" {
			parsed, err := url.ParseRequestURI(logo)
			if err != nil || parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil {
				return response.Error(c, fiber.StatusBadRequest, "El logo debe ser una URL pública HTTPS válida")
			}
		}
		args = append(args, logo)
		setParts = append(setParts, fmt.Sprintf("logo_url = NULLIF($%d, '')", len(args)))
	}
	args = append(args, tenantID)
	query := fmt.Sprintf(
		"UPDATE tenants SET %s, updated_at = NOW() WHERE id::text = $%d AND deleted_at IS NULL",
		strings.Join(setParts, ", "), len(args),
	)
	result, err := h.db.Exec(c.UserContext(), query, args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo actualizar la escuela")
	}
	if result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "Escuela no encontrada")
	}
	h.auditSuperAdmin(c, "school.update", "tenants", tenantID, "warning", fiber.Map{
		"name_changed": req.Name != nil, "logo_changed": req.LogoURL != nil,
	}, "")
	return response.Success(c, fiber.Map{"id": tenantID}, "Escuela actualizada")
}

func (h *Handler) GetSchool(c *fiber.Ctx) error {
	id := c.Params("id")

	var slug, name, status, plan, planID string
	var logoURL *string
	var createdAt, updatedAt interface{}

	err := h.db.QueryRow(c.UserContext(), `
		SELECT t.slug, t.name, t.logo_url, t.status,
		       COALESCE(sp.name, t.plan), t.plan, t.created_at, t.updated_at
		FROM tenants t
		LEFT JOIN subscription_plans sp ON sp.id::text = t.plan
		WHERE t.id = $1 AND t.deleted_at IS NULL`, id).
		Scan(&slug, &name, &logoURL, &status, &plan, &planID, &createdAt, &updatedAt)

	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "School not found")
	}

	var studentCount, teacherCount, parentCount int
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM students WHERE tenant_id = $1 AND deleted_at IS NULL", id).Scan(&studentCount); err != nil {
		studentCount = 0
	}
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'TEACHER' AND is_active = true AND deleted_at IS NULL", id).Scan(&teacherCount); err != nil {
		teacherCount = 0
	}
	if err := h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = 'PARENT' AND is_active = true AND deleted_at IS NULL", id).Scan(&parentCount); err != nil {
		parentCount = 0
	}
	domainProvisioningStatus := "unknown"
	domainReady := false
	if database.IsMySQL(h.db.Driver()) {
		_ = h.db.QueryRow(c.UserContext(), `
			SELECT COALESCE(JSON_UNQUOTE(JSON_EXTRACT(settings, '$.domain_provisioning_status')), 'unknown'),
			       COALESCE(JSON_EXTRACT(settings, '$.domain_ready') = true, false)
			FROM tenants WHERE id = ?`, id).Scan(&domainProvisioningStatus, &domainReady)
	} else {
		_ = h.db.QueryRow(c.UserContext(), `
			SELECT COALESCE(settings->>'domain_provisioning_status', 'unknown'),
			       COALESCE((settings->>'domain_ready')::boolean, false)
			FROM tenants WHERE id = $1`, id).Scan(&domainProvisioningStatus, &domainReady)
	}

	logo := ""
	if logoURL != nil {
		logo = *logoURL
	}

	return response.Success(c, fiber.Map{
		"id": id, "slug": slug, "name": name, "logo_url": logo,
		"status": status, "plan": plan, "plan_id": planID,
		"created_at": createdAt, "updated_at": updatedAt,
		"total_students": studentCount, "total_teachers": teacherCount, "total_parents": parentCount,
		"domain_provisioning_status": domainProvisioningStatus, "domain_ready": domainReady,
	}, "School retrieved")
}

func (h *Handler) GetSchoolModules(c *fiber.Ctx) error {
	id := c.Params("id")
	moduleKey := h.moduleCatalogKey("mc")

	rows, err := h.db.Query(c.UserContext(),
		`SELECT `+moduleKey+`, mc.name, mc.description, mc.is_core, mc.price_monthly_mxn,
		 mc.status, mc.global_enabled,
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
		var isCore, globallyEnabled, isActive, enabled, isRequired bool
		var level, source, status string
		var price float64

		if err := rows.Scan(&key, &name, &description, &isCore, &price, &status, &globallyEnabled, &isActive, &enabled, &level, &isRequired, &source); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error reading module catalog")
		}

		desc := ""
		if description != nil {
			desc = *description
		}

		modules = append(modules, fiber.Map{
			"key": key, "name": name, "description": desc,
			"is_core": isCore, "price_monthly_mxn": price, "is_active": isActive,
			"enabled": enabled, "level": level, "is_required": isRequired, "source": source,
			"status": status, "global_enabled": globallyEnabled,
			"production_ready": isProductionReadyTenantModule(key) && status == "active" && globallyEnabled,
			"selectable":       isTenantSelectableProductionModule(key) && status == "active" && globallyEnabled,
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

	req.ModuleKey = strings.ToLower(strings.TrimSpace(req.ModuleKey))
	if !isProductionReadyTenantModule(req.ModuleKey) {
		return response.Error(c, fiber.StatusConflict, "Module is not available for production")
	}

	// Required modules are protected because they are part of the tenant's base contract.
	var isCore, globallyEnabled bool
	var status string
	if err := h.db.QueryRow(c.UserContext(),
		"SELECT is_core, status, global_enabled FROM modules_catalog WHERE "+h.moduleCatalogKey("")+" = $1",
		req.ModuleKey).Scan(&isCore, &status, &globallyEnabled); err != nil {
		return response.Error(c, fiber.StatusNotFound, "Module not found in catalog")
	}
	if status != "active" || !globallyEnabled {
		return response.Error(c, fiber.StatusConflict, "Module is not enabled in the production catalog")
	}
	var isRequired bool
	_ = h.db.QueryRow(c.UserContext(), "SELECT COALESCE(is_required, false) FROM tenant_modules WHERE tenant_id = $1 AND module_key = $2", id, req.ModuleKey).Scan(&isRequired)
	if isCore || isRequired {
		return response.Error(c, fiber.StatusForbidden, "Cannot toggle core modules")
	}
	if !isTenantSelectableProductionModule(req.ModuleKey) {
		return response.Error(c, fiber.StatusForbidden, "Module is managed by the tenant level contract")
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
	moduleKey := h.moduleCatalogKey("")
	rows, err := h.db.Query(c.UserContext(),
		"SELECT "+moduleKey+", name, description, is_core, price_monthly_mxn, status, global_enabled FROM modules_catalog ORDER BY is_core DESC, name")
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching catalog")
	}
	defer rows.Close()

	var modules []fiber.Map
	for rows.Next() {
		var key, name string
		var description *string
		var isCore, globallyEnabled bool
		var status string
		var price float64
		if err := rows.Scan(&key, &name, &description, &isCore, &price, &status, &globallyEnabled); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error reading catalog")
		}

		desc := ""
		if description != nil {
			desc = *description
		}
		modules = append(modules, fiber.Map{
			"key": key, "name": name, "description": desc,
			"is_core": isCore, "price_monthly_mxn": price,
			"status": status, "global_enabled": globallyEnabled,
			"production_ready": isProductionReadyTenantModule(key) && status == "active" && globallyEnabled,
			"selectable":       isTenantSelectableProductionModule(key) && status == "active" && globallyEnabled,
		})
	}
	if modules == nil {
		modules = []fiber.Map{}
	}

	return response.Success(c, fiber.Map{"modules": modules}, "Catalog retrieved")
}

func (h *Handler) moduleCatalogKey(alias string) string {
	prefix := ""
	if alias != "" {
		prefix = alias + "."
	}
	if database.IsMySQL(h.db.Driver()) {
		return prefix + "`key`"
	}
	return prefix + "key"
}
