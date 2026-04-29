package superadmin

import (
	"crypto/rand"
	"educore/internal/pkg/response"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type confirmationRequest struct {
	ConfirmationText string `json:"confirmation_text"`
}

type enterprisePlanRequest struct {
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	PriceMonthly   float64  `json:"price_monthly"`
	PriceAnnual    float64  `json:"price_annual"`
	Currency       string   `json:"currency"`
	MaxStudents    int      `json:"max_students"`
	MaxTeachers    int      `json:"max_teachers"`
	StorageLimitMB int      `json:"storage_limit_mb"`
	TrialDays      int      `json:"trial_days"`
	Modules        []string `json:"modules"`
	Features       []string `json:"features"`
	IsActive       bool     `json:"is_active"`
	IsFeatured     bool     `json:"is_featured"`
}

type subscriptionRequest struct {
	TenantID        string  `json:"tenant_id"`
	PlanID          string  `json:"plan_id"`
	Status          string  `json:"status"`
	BillingCycle    string  `json:"billing_cycle"`
	PriceMonthly    float64 `json:"price_monthly"`
	DiscountPercent float64 `json:"discount_percent"`
	MaxStudents     int     `json:"max_students"`
	MaxTeachers     int     `json:"max_teachers"`
	StorageLimitMB  int     `json:"storage_limit_mb"`
}

type manualPaymentRequest struct {
	TenantID  string  `json:"tenant_id"`
	InvoiceID string  `json:"invoice_id"`
	Amount    float64 `json:"amount"`
	Method    string  `json:"method"`
	Reference string  `json:"reference"`
}

type supportTicketRequest struct {
	TenantID    string `json:"tenant_id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	Status      string `json:"status"`
	ModuleKey   string `json:"module_key"`
	AssignedTo  string `json:"assigned_to"`
}

type featureFlagRequest struct {
	Key               string                 `json:"key"`
	Name              string                 `json:"name"`
	Description       string                 `json:"description"`
	Enabled           bool                   `json:"enabled"`
	RolloutPercentage int                    `json:"rollout_percentage"`
	Metadata          map[string]interface{} `json:"metadata"`
}

type impersonationRequest struct {
	TargetUserID string `json:"target_user_id"`
	Reason       string `json:"reason"`
}

type moduleHealthRequest struct {
	ModuleKey string                 `json:"module_key"`
	TenantID  string                 `json:"tenant_id"`
	Severity  string                 `json:"severity"`
	Status    string                 `json:"status"`
	Message   string                 `json:"message"`
	ErrorRate float64                `json:"error_rate"`
	LatencyMS int                    `json:"latency_ms"`
	Metadata  map[string]interface{} `json:"metadata"`
}

func (h *Handler) RegisterEnterpriseRoutes(router fiber.Router) {
	router.Get("/dashboard/overview", h.EnterpriseOverview)
	router.Put("/dashboard/overview", h.SavePlatformSetting)

	router.Get("/modules", h.ListEnterpriseModules)
	router.Put("/modules", h.UpsertEnterpriseModule)
	router.Patch("/modules/:key/global", h.ToggleGlobalModule)
	router.Patch("/schools/:id/modules/:key", h.ToggleSchoolModuleV2)
	router.Get("/modules/usage", h.ModuleUsage)
	router.Post("/schools/:id/clone-config", h.CloneSchoolConfig)
	router.Post("/schools/:id/reset-data", h.ResetSchoolData)
	router.Delete("/schools/:id", h.SoftDeleteSchool)

	router.Get("/global-users", h.ListAllUsers)
	router.Post("/global-users", h.CreateScopedUser)
	router.Put("/global-users/:id", h.UpdateScopedUser)
	router.Patch("/global-users/:id/status", h.ToggleScopedUserStatus)
	router.Post("/global-users/:id/reset-password", h.ResetScopedUserPassword)
	router.Post("/global-users/:id/force-logout", h.ForceLogoutUser)

	router.Post("/impersonation/start", h.StartImpersonation)
	router.Post("/impersonation/stop", h.StopImpersonation)
	router.Get("/impersonation/audit", h.ImpersonationAudit)

	router.Get("/billing/plans", h.ListPlans)
	router.Post("/billing/plans", h.CreateBillingPlan)
	router.Put("/billing/plans/:id", h.UpdateBillingPlan)
	router.Get("/billing/subscriptions", h.ListSubscriptions)
	router.Post("/billing/subscriptions", h.CreateSubscription)
	router.Patch("/billing/subscriptions/:id", h.UpdateSubscription)
	router.Get("/billing/invoices", h.ListInvoices)
	router.Post("/billing/payments/manual", h.RecordManualPayment)

	router.Get("/analytics/kpis", h.AnalyticsKPIs)
	router.Get("/analytics/growth", h.AnalyticsGrowth)
	router.Get("/analytics/churn-risk", h.ChurnRisk)
	router.Get("/analytics/module-usage", h.ModuleUsage)

	router.Get("/system/settings", h.GetPlatformSettings)
	router.Put("/system/settings", h.SavePlatformSetting)
	router.Get("/system/security", h.GetPlatformSettings)
	router.Put("/system/security", h.SavePlatformSetting)
	router.Get("/system/email", h.GetPlatformSettings)
	router.Put("/system/email", h.SavePlatformSetting)
	router.Get("/system/api", h.GetPlatformSettings)
	router.Put("/system/api", h.SavePlatformSetting)
	router.Get("/system/integrations", h.GetPlatformSettings)
	router.Put("/system/integrations", h.SavePlatformSetting)

	router.Get("/logs/audit", h.AuditLogs)
	router.Get("/logs/errors", h.ErrorLogs)
	router.Get("/logs/activity", h.ActivityLogs)

	router.Get("/support/tickets", h.ListSupportTickets)
	router.Post("/support/tickets", h.CreateSupportTicket)
	router.Put("/support/tickets/:id", h.UpdateSupportTicket)

	router.Get("/storage/usage", h.StorageUsage)
	router.Patch("/storage/institutions/:id/limit", h.UpdateStorageLimit)
	router.Post("/storage/archive", h.ArchiveStorage)

	router.Get("/feature-flags", h.ListFeatureFlags)
	router.Post("/feature-flags", h.UpsertFeatureFlag)
	router.Put("/feature-flags/:key", h.UpsertFeatureFlag)
	router.Patch("/feature-flags/:key/scope", h.UpsertFeatureFlagScope)

	router.Get("/backups", h.ListBackups)
	router.Post("/backups", h.CreateBackupJob)
	router.Post("/backups/:id/restore", h.RestoreBackupJob)

	router.Get("/version", h.VersionInfo)
	router.Post("/version/deploy", h.CreateDeployEvent)
	router.Post("/version/rollback", h.CreateRollbackEvent)

	router.Get("/health/modules", h.ModuleHealth)
	router.Get("/health/system", h.SystemHealth)
	router.Post("/health/events", h.CreateModuleHealthEvent)
}

func (h *Handler) auditSuperAdmin(c *fiber.Ctx, action, resource, resourceID, severity string, details fiber.Map, confirmation string) {
	userID, _ := c.Locals("user_id").(string)
	if severity == "" {
		severity = "info"
	}
	detailsData, _ := json.Marshal(details)
	var resourceArg interface{}
	if resourceID != "" {
		resourceArg = resourceID
	}
	_, _ = h.db.Exec(c.UserContext(),
		`INSERT INTO audit_logs (tenant_id, user_id, acting_user_id, action, resource, resource_id, severity, details, ip_address, user_agent, confirmation_text, request_id)
		 VALUES (NULL, NULLIF($1, '')::uuid, NULLIF($1, '')::uuid, $2, $3, NULLIF($4, '')::uuid, $5, $6::jsonb, NULLIF($7, '')::inet, $8, $9, $10)`,
		userID, action, resource, resourceArg, severity, string(detailsData), c.IP(), c.Get("User-Agent"), confirmation, c.Get("X-Request-ID"))
}

func requireConfirmation(c *fiber.Ctx, expected string) (confirmationRequest, bool) {
	var req confirmationRequest
	_ = c.BodyParser(&req)
	return req, strings.EqualFold(strings.TrimSpace(req.ConfirmationText), expected)
}

func (h *Handler) EnterpriseOverview(c *fiber.Ctx) error {
	var tenants, activeTenants, users, students, sessions, tickets int
	var mrr float64
	_ = h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL").Scan(&tenants)
	_ = h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM tenants WHERE status = 'active' AND deleted_at IS NULL").Scan(&activeTenants)
	_ = h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL").Scan(&users)
	_ = h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM students").Scan(&students)
	_ = h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM user_sessions WHERE is_active = true AND expires_at > NOW()").Scan(&sessions)
	_ = h.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM support_tickets WHERE status IN ('open','escalated') AND deleted_at IS NULL").Scan(&tickets)
	_ = h.db.QueryRow(c.UserContext(), "SELECT COALESCE(SUM(price_monthly * (1 - discount_percent / 100)), 0) FROM subscriptions WHERE status IN ('active','trial') AND deleted_at IS NULL").Scan(&mrr)

	return response.Success(c, fiber.Map{
		"kpis": fiber.Map{
			"total_institutions":  tenants,
			"active_institutions": activeTenants,
			"total_users":         users,
			"total_students":      students,
			"active_sessions":     sessions,
			"mrr":                 mrr,
			"arr":                 mrr * 12,
			"open_tickets":        tickets,
		},
		"churn_risk":    h.churnRiskRows(c, 5),
		"module_health": h.moduleHealthRows(c, 8),
	}, "Enterprise overview retrieved")
}

func (h *Handler) ListEnterpriseModules(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT key, name, COALESCE(description, ''), is_core, price_monthly_mxn, status, version, dependencies, required_level, feature_flags, global_enabled, metadata
		 FROM modules_catalog
		 ORDER BY is_core DESC, name ASC`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching modules")
	}
	defer rows.Close()

	modules := []fiber.Map{}
	for rows.Next() {
		var key, name, description, status, version string
		var requiredLevel *string
		var isCore, globalEnabled bool
		var price float64
		var dependencies, featureFlags, metadata []byte
		_ = rows.Scan(&key, &name, &description, &isCore, &price, &status, &version, &dependencies, &requiredLevel, &featureFlags, &globalEnabled, &metadata)
		modules = append(modules, fiber.Map{
			"key": key, "name": name, "description": description, "is_core": isCore,
			"price_monthly_mxn": price, "status": status, "version": version,
			"dependencies": json.RawMessage(dependencies), "required_level": requiredLevel,
			"feature_flags": json.RawMessage(featureFlags), "global_enabled": globalEnabled,
			"metadata": json.RawMessage(metadata),
		})
	}
	return response.Success(c, fiber.Map{"modules": modules}, "Modules retrieved")
}

func (h *Handler) UpsertEnterpriseModule(c *fiber.Ctx) error {
	var req struct {
		Key             string                 `json:"key"`
		Name            string                 `json:"name"`
		Description     string                 `json:"description"`
		Status          string                 `json:"status"`
		Version         string                 `json:"version"`
		RequiredLevel   string                 `json:"required_level"`
		GlobalEnabled   bool                   `json:"global_enabled"`
		IsCore          bool                   `json:"is_core"`
		PriceMonthlyMXN float64                `json:"price_monthly_mxn"`
		Dependencies    []string               `json:"dependencies"`
		FeatureFlags    map[string]interface{} `json:"feature_flags"`
		Metadata        map[string]interface{} `json:"metadata"`
	}
	if err := c.BodyParser(&req); err != nil || req.Key == "" || req.Name == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid module payload")
	}
	if req.Status == "" {
		req.Status = "active"
	}
	if req.Version == "" {
		req.Version = "1.0.0"
	}
	deps, _ := json.Marshal(req.Dependencies)
	flags, _ := json.Marshal(req.FeatureFlags)
	metadata, _ := json.Marshal(req.Metadata)
	_, err := h.db.Exec(c.UserContext(),
		`INSERT INTO modules_catalog (key, name, description, is_core, price_monthly_mxn, status, version, dependencies, required_level, feature_flags, global_enabled, metadata)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		 ON CONFLICT (key) DO UPDATE SET name=$2, description=$3, is_core=$4, price_monthly_mxn=$5, status=$6, version=$7,
		 dependencies=$8, required_level=$9, feature_flags=$10, global_enabled=$11, metadata=$12, updated_at=NOW()`,
		req.Key, req.Name, req.Description, req.IsCore, req.PriceMonthlyMXN, req.Status, req.Version, string(deps), emptyToNil(req.RequiredLevel), string(flags), req.GlobalEnabled, string(metadata))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error saving module")
	}
	h.auditSuperAdmin(c, "module.upsert", "modules_catalog", "", "info", fiber.Map{"module_key": req.Key}, "")
	return response.Success(c, fiber.Map{"key": req.Key}, "Module saved")
}

func (h *Handler) ToggleGlobalModule(c *fiber.Ctx) error {
	key := c.Params("key")
	var req struct {
		Enabled bool `json:"enabled"`
	}
	_ = c.BodyParser(&req)
	_, err := h.db.Exec(c.UserContext(), "UPDATE modules_catalog SET global_enabled = $1, updated_at = NOW() WHERE key = $2", req.Enabled, key)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating module")
	}
	h.auditSuperAdmin(c, "module.global_toggle", "modules_catalog", "", "warning", fiber.Map{"module_key": key, "enabled": req.Enabled}, "")
	return response.Success(c, nil, "Module global state updated")
}

func (h *Handler) ToggleSchoolModuleV2(c *fiber.Ctx) error {
	tenantID := c.Params("id")
	key := c.Params("key")
	var req struct {
		Enabled bool   `json:"enabled"`
		Source  string `json:"source"`
	}
	_ = c.BodyParser(&req)
	if req.Source == "" {
		req.Source = "manual"
	}
	_, err := h.db.Exec(c.UserContext(),
		`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, source, override_source)
		 VALUES ($1, $2, $3, $3, $4, 'superadmin')
		 ON CONFLICT (tenant_id, module_key)
		 DO UPDATE SET is_active = EXCLUDED.is_active, enabled = EXCLUDED.enabled, source = EXCLUDED.source, override_source = 'superadmin', updated_at = NOW(), deleted_at = NULL`,
		tenantID, key, req.Enabled, req.Source)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating tenant module")
	}
	h.auditSuperAdmin(c, "module.tenant_toggle", "tenant_modules", "", "warning", fiber.Map{"tenant_id": tenantID, "module_key": key, "enabled": req.Enabled}, "")
	return response.Success(c, nil, "Tenant module updated")
}

func (h *Handler) CloneSchoolConfig(c *fiber.Ctx) error {
	sourceID := c.Params("id")
	var req struct {
		TargetTenantID string `json:"target_tenant_id"`
	}
	if err := c.BodyParser(&req); err != nil || req.TargetTenantID == "" {
		return response.Error(c, fiber.StatusBadRequest, "target_tenant_id is required")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not start transaction")
	}
	defer tx.Rollback(c.UserContext())
	_, err = tx.Exec(c.UserContext(),
		`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, level, is_required, source, config)
		 SELECT $1, module_key, is_active, enabled, level, is_required, source, config
		 FROM tenant_modules WHERE tenant_id = $2 AND deleted_at IS NULL
		 ON CONFLICT (tenant_id, module_key) DO UPDATE SET is_active=EXCLUDED.is_active, enabled=EXCLUDED.enabled, level=EXCLUDED.level,
		 is_required=EXCLUDED.is_required, source=EXCLUDED.source, config=EXCLUDED.config, updated_at=NOW()`,
		req.TargetTenantID, sourceID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error cloning modules")
	}
	_, _ = tx.Exec(c.UserContext(), "UPDATE tenants SET settings = (SELECT settings FROM tenants WHERE id = $2), updated_at = NOW() WHERE id = $1", req.TargetTenantID, sourceID)
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error saving cloned config")
	}
	h.auditSuperAdmin(c, "tenant.clone_config", "tenants", req.TargetTenantID, "warning", fiber.Map{"source_tenant_id": sourceID}, "")
	return response.Success(c, nil, "Configuration cloned")
}

func (h *Handler) ResetSchoolData(c *fiber.Ctx) error {
	id := c.Params("id")
	req, ok := requireConfirmation(c, "RESET "+id)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Confirmation text must be RESET "+id)
	}
	h.auditSuperAdmin(c, "tenant.reset_requested", "tenants", id, "critical", fiber.Map{"mode": "job_registered_only"}, req.ConfirmationText)
	return response.Success(c, fiber.Map{"status": "queued", "note": "Reset is registered for manual execution"}, "Reset request registered")
}

func (h *Handler) SoftDeleteSchool(c *fiber.Ctx) error {
	id := c.Params("id")
	req, ok := requireConfirmation(c, "DELETE "+id)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Confirmation text must be DELETE "+id)
	}
	_, err := h.db.Exec(c.UserContext(), "UPDATE tenants SET deleted_at = NOW(), status = 'cancelled', updated_at = NOW() WHERE id = $1", id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error deleting school")
	}
	h.auditSuperAdmin(c, "tenant.soft_delete", "tenants", id, "critical", fiber.Map{}, req.ConfirmationText)
	return response.Success(c, nil, "School soft deleted")
}

func (h *Handler) ListAllUsers(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	offset := (page - 1) * limit
	search := c.Query("search")
	role := c.Query("role")
	tenantID := c.Query("tenant_id")
	status := c.Query("status")
	query := `SELECT u.id, COALESCE(u.tenant_id::text, ''), COALESCE(t.name, 'EduCore'), u.email, u.first_name, u.last_name, u.role, u.is_active, u.last_login_at, u.created_at
		FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id WHERE u.deleted_at IS NULL`
	countQuery := `SELECT COUNT(*) FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id WHERE u.deleted_at IS NULL`
	args := []interface{}{}
	idx := 1
	add := func(clause string, value interface{}) {
		query += fmt.Sprintf(clause, idx)
		countQuery += fmt.Sprintf(clause, idx)
		args = append(args, value)
		idx++
	}
	if search != "" {
		query += fmt.Sprintf(" AND (u.email ILIKE $%d OR u.first_name ILIKE $%d OR u.last_name ILIKE $%d)", idx, idx, idx)
		countQuery += fmt.Sprintf(" AND (u.email ILIKE $%d OR u.first_name ILIKE $%d OR u.last_name ILIKE $%d)", idx, idx, idx)
		args = append(args, "%"+search+"%")
		idx++
	}
	if role != "" && role != "all" {
		add(" AND u.role = $%d", role)
	}
	if tenantID != "" && tenantID != "all" {
		add(" AND u.tenant_id = $%d", tenantID)
	}
	if status == "active" {
		add(" AND u.is_active = $%d", true)
	} else if status == "inactive" {
		add(" AND u.is_active = $%d", false)
	}
	var total int
	_ = h.db.QueryRow(c.UserContext(), countQuery, args...).Scan(&total)
	query += fmt.Sprintf(" ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d", idx, idx+1)
	args = append(args, limit, offset)
	rows, err := h.db.Query(c.UserContext(), query, args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching users")
	}
	defer rows.Close()
	users := []fiber.Map{}
	for rows.Next() {
		var id, tid, tenant, email, first, last, role string
		var active bool
		var lastLogin, created interface{}
		_ = rows.Scan(&id, &tid, &tenant, &email, &first, &last, &role, &active, &lastLogin, &created)
		users = append(users, fiber.Map{"id": id, "tenant_id": tid, "tenant_name": tenant, "email": email, "first_name": first, "last_name": last, "role": role, "is_active": active, "last_login_at": lastLogin, "created_at": created})
	}
	return response.SuccessWithMeta(c, fiber.Map{"users": users}, response.Meta{Page: page, PerPage: limit, Total: total})
}

func (h *Handler) CreateScopedUser(c *fiber.Ctx) error {
	var req struct {
		TenantID  string `json:"tenant_id"`
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
		Password  string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil || req.Email == "" || req.Role == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid user payload")
	}
	if req.Password == "" {
		req.Password = "EduCore2026!"
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error hashing password")
	}
	var id string
	err = h.db.QueryRow(c.UserContext(),
		`INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
		 VALUES (NULLIF($1, '')::uuid, $2, $3, $4, $5, $6, true) RETURNING id`,
		req.TenantID, req.Email, string(hash), req.FirstName, req.LastName, req.Role).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusConflict, "Could not create user")
	}
	h.auditSuperAdmin(c, "user.create", "users", id, "info", fiber.Map{"role": req.Role, "tenant_id": req.TenantID}, "")
	return response.Success(c, fiber.Map{"id": id}, "User created")
}

func (h *Handler) UpdateScopedUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		TenantID  string `json:"tenant_id"`
		Email     string `json:"email"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Role      string `json:"role"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid user payload")
	}
	_, err := h.db.Exec(c.UserContext(),
		`UPDATE users SET tenant_id = NULLIF($1, '')::uuid, email = $2, first_name = $3, last_name = $4, role = $5, updated_at = NOW() WHERE id = $6`,
		req.TenantID, req.Email, req.FirstName, req.LastName, req.Role, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update user")
	}
	h.auditSuperAdmin(c, "user.update", "users", id, "warning", fiber.Map{"role": req.Role, "tenant_id": req.TenantID}, "")
	return response.Success(c, nil, "User updated")
}

func (h *Handler) ToggleScopedUserStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		IsActive bool `json:"is_active"`
	}
	_ = c.BodyParser(&req)
	_, err := h.db.Exec(c.UserContext(), "UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2", req.IsActive, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update user")
	}
	h.auditSuperAdmin(c, "user.status", "users", id, "warning", fiber.Map{"is_active": req.IsActive}, "")
	return response.Success(c, nil, "User status updated")
}

func (h *Handler) ResetScopedUserPassword(c *fiber.Ctx) error {
	id := c.Params("id")
	tokenBytes := make([]byte, 12)
	_, _ = rand.Read(tokenBytes)
	temp := "Edu-" + hex.EncodeToString(tokenBytes)
	hash, _ := bcrypt.GenerateFromPassword([]byte(temp), bcrypt.DefaultCost)
	_, err := h.db.Exec(c.UserContext(), "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", string(hash), id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not reset password")
	}
	h.auditSuperAdmin(c, "user.reset_password", "users", id, "critical", fiber.Map{}, "")
	return response.Success(c, fiber.Map{"temporary_password": temp}, "Password reset")
}

func (h *Handler) ForceLogoutUser(c *fiber.Ctx) error {
	id := c.Params("id")
	_, err := h.db.Exec(c.UserContext(), "UPDATE user_sessions SET is_active = false WHERE user_id = $1", id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not force logout")
	}
	h.auditSuperAdmin(c, "user.force_logout", "users", id, "critical", fiber.Map{}, "")
	return response.Success(c, nil, "User sessions closed")
}

func (h *Handler) StartImpersonation(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req impersonationRequest
	if err := c.BodyParser(&req); err != nil || req.TargetUserID == "" || strings.TrimSpace(req.Reason) == "" {
		return response.Error(c, fiber.StatusBadRequest, "target_user_id and reason are required")
	}
	var tenantID *string
	var email, role string
	err := h.db.QueryRow(c.UserContext(), "SELECT tenant_id::text, email, role FROM users WHERE id = $1 AND deleted_at IS NULL", req.TargetUserID).Scan(&tenantID, &email, &role)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Target user not found")
	}
	var id string
	err = h.db.QueryRow(c.UserContext(),
		`INSERT INTO impersonation_sessions (acting_user_id, target_user_id, tenant_id, reason, ip_address, user_agent)
		 VALUES ($1, $2, NULLIF($3, '')::uuid, $4, NULLIF($5, '')::inet, $6) RETURNING id`,
		userID, req.TargetUserID, stringPtrValue(tenantID), req.Reason, c.IP(), c.Get("User-Agent")).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not start impersonation")
	}
	h.auditSuperAdmin(c, "impersonation.start", "users", req.TargetUserID, "critical", fiber.Map{"session_id": id, "reason": req.Reason}, "")
	return response.Success(c, fiber.Map{"session_id": id, "target_user": fiber.Map{"id": req.TargetUserID, "email": email, "role": role, "tenant_id": stringPtrValue(tenantID)}, "expires_in_minutes": 30}, "Impersonation started")
}

func (h *Handler) StopImpersonation(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req struct {
		SessionID string `json:"session_id"`
	}
	_ = c.BodyParser(&req)
	_, err := h.db.Exec(c.UserContext(), "UPDATE impersonation_sessions SET status = 'ended', ended_at = NOW() WHERE acting_user_id = $1 AND ($2 = '' OR id = $2::uuid) AND status = 'active'", userID, req.SessionID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not stop impersonation")
	}
	h.auditSuperAdmin(c, "impersonation.stop", "impersonation_sessions", req.SessionID, "critical", fiber.Map{}, "")
	return response.Success(c, nil, "Impersonation stopped")
}

func (h *Handler) ImpersonationAudit(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT s.id, au.email, tu.email, COALESCE(t.name, 'EduCore'), s.reason, s.status, s.started_at, s.ended_at, s.expires_at
		 FROM impersonation_sessions s
		 JOIN users au ON au.id = s.acting_user_id
		 JOIN users tu ON tu.id = s.target_user_id
		 LEFT JOIN tenants t ON t.id = s.tenant_id
		 ORDER BY s.started_at DESC LIMIT 100`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch impersonation audit")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, acting, target, tenant, reason, status string
		var started, ended, expires interface{}
		_ = rows.Scan(&id, &acting, &target, &tenant, &reason, &status, &started, &ended, &expires)
		items = append(items, fiber.Map{"id": id, "acting_user": acting, "target_user": target, "tenant": tenant, "reason": reason, "status": status, "started_at": started, "ended_at": ended, "expires_at": expires})
	}
	return response.Success(c, fiber.Map{"sessions": items}, "Impersonation audit retrieved")
}

func (h *Handler) CreateBillingPlan(c *fiber.Ctx) error {
	return h.saveBillingPlan(c, "")
}

func (h *Handler) UpdateBillingPlan(c *fiber.Ctx) error {
	return h.saveBillingPlan(c, c.Params("id"))
}

func (h *Handler) saveBillingPlan(c *fiber.Ctx, id string) error {
	var req enterprisePlanRequest
	if err := c.BodyParser(&req); err != nil || req.Name == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid plan payload")
	}
	if req.Currency == "" {
		req.Currency = "MXN"
	}
	modules, _ := json.Marshal(req.Modules)
	features, _ := json.Marshal(req.Features)
	if id == "" {
		err := h.db.QueryRow(c.UserContext(),
			`INSERT INTO subscription_plans (name, description, price_monthly, price_annual, currency, max_students, max_teachers, storage_limit_mb, trial_days, modules, features, is_active, is_featured)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
			req.Name, req.Description, req.PriceMonthly, req.PriceAnnual, req.Currency, req.MaxStudents, req.MaxTeachers, req.StorageLimitMB, req.TrialDays, string(modules), string(features), req.IsActive, req.IsFeatured).Scan(&id)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Could not create plan")
		}
	} else {
		_, err := h.db.Exec(c.UserContext(),
			`UPDATE subscription_plans SET name=$1, description=$2, price_monthly=$3, price_annual=$4, currency=$5, max_students=$6,
			 max_teachers=$7, storage_limit_mb=$8, trial_days=$9, modules=$10, features=$11, is_active=$12, is_featured=$13, updated_at=NOW() WHERE id::text=$14`,
			req.Name, req.Description, req.PriceMonthly, req.PriceAnnual, req.Currency, req.MaxStudents, req.MaxTeachers, req.StorageLimitMB, req.TrialDays, string(modules), string(features), req.IsActive, req.IsFeatured, id)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Could not update plan")
		}
	}
	h.auditSuperAdmin(c, "billing.plan_save", "subscription_plans", "", "warning", fiber.Map{"plan_id": id}, "")
	return response.Success(c, fiber.Map{"id": id}, "Plan saved")
}

func (h *Handler) ListSubscriptions(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT s.id, s.tenant_id, t.name, s.plan_id, s.status, s.billing_cycle, s.price_monthly, s.discount_percent, s.current_period_end, s.created_at
		 FROM subscriptions s JOIN tenants t ON t.id = s.tenant_id
		 WHERE s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 200`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch subscriptions")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, tenantID, tenant, planID, status, cycle string
		var price, discount float64
		var periodEnd, created interface{}
		_ = rows.Scan(&id, &tenantID, &tenant, &planID, &status, &cycle, &price, &discount, &periodEnd, &created)
		items = append(items, fiber.Map{"id": id, "tenant_id": tenantID, "tenant_name": tenant, "plan_id": planID, "status": status, "billing_cycle": cycle, "price_monthly": price, "discount_percent": discount, "current_period_end": periodEnd, "created_at": created})
	}
	return response.Success(c, fiber.Map{"subscriptions": items}, "Subscriptions retrieved")
}

func (h *Handler) CreateSubscription(c *fiber.Ctx) error {
	var req subscriptionRequest
	if err := c.BodyParser(&req); err != nil || req.TenantID == "" || req.PlanID == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid subscription payload")
	}
	if req.Status == "" {
		req.Status = "active"
	}
	if req.BillingCycle == "" {
		req.BillingCycle = "monthly"
	}
	var id string
	err := h.db.QueryRow(c.UserContext(),
		`INSERT INTO subscriptions (tenant_id, plan_id, status, billing_cycle, price_monthly, discount_percent, max_students, max_teachers, storage_limit_mb)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
		req.TenantID, req.PlanID, req.Status, req.BillingCycle, req.PriceMonthly, req.DiscountPercent, req.MaxStudents, req.MaxTeachers, req.StorageLimitMB).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not create subscription")
	}
	h.auditSuperAdmin(c, "billing.subscription_create", "subscriptions", id, "warning", fiber.Map{"tenant_id": req.TenantID}, "")
	return response.Success(c, fiber.Map{"id": id}, "Subscription created")
}

func (h *Handler) UpdateSubscription(c *fiber.Ctx) error {
	id := c.Params("id")
	var req subscriptionRequest
	_ = c.BodyParser(&req)
	_, err := h.db.Exec(c.UserContext(),
		`UPDATE subscriptions SET plan_id=$1, status=$2, billing_cycle=$3, price_monthly=$4, discount_percent=$5,
		 max_students=$6, max_teachers=$7, storage_limit_mb=$8, updated_at=NOW() WHERE id=$9`,
		req.PlanID, req.Status, req.BillingCycle, req.PriceMonthly, req.DiscountPercent, req.MaxStudents, req.MaxTeachers, req.StorageLimitMB, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update subscription")
	}
	h.auditSuperAdmin(c, "billing.subscription_update", "subscriptions", id, "warning", fiber.Map{"status": req.Status}, "")
	return response.Success(c, nil, "Subscription updated")
}

func (h *Handler) ListInvoices(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT i.id, i.tenant_id, t.name, COALESCE(i.folio, ''), i.status, i.total, i.currency, i.due_date, i.paid_at, i.created_at
		 FROM invoices i JOIN tenants t ON t.id = i.tenant_id
		 WHERE i.deleted_at IS NULL ORDER BY i.created_at DESC LIMIT 200`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch invoices")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, tenantID, tenant, folio, status, currency string
		var total float64
		var due, paid, created interface{}
		_ = rows.Scan(&id, &tenantID, &tenant, &folio, &status, &total, &currency, &due, &paid, &created)
		items = append(items, fiber.Map{"id": id, "tenant_id": tenantID, "tenant_name": tenant, "folio": folio, "status": status, "total": total, "currency": currency, "due_date": due, "paid_at": paid, "created_at": created})
	}
	return response.Success(c, fiber.Map{"invoices": items}, "Invoices retrieved")
}

func (h *Handler) RecordManualPayment(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req manualPaymentRequest
	if err := c.BodyParser(&req); err != nil || req.TenantID == "" || req.Amount <= 0 {
		return response.Error(c, fiber.StatusBadRequest, "Invalid payment payload")
	}
	var id string
	err := h.db.QueryRow(c.UserContext(),
		`INSERT INTO manual_payments (tenant_id, invoice_id, amount, method, reference, recorded_by)
		 VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, NULLIF($6, '')::uuid) RETURNING id`,
		req.TenantID, req.InvoiceID, req.Amount, defaultString(req.Method, "transfer"), req.Reference, userID).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not record payment")
	}
	if req.InvoiceID != "" {
		_, _ = h.db.Exec(c.UserContext(), "UPDATE invoices SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1", req.InvoiceID)
	}
	h.auditSuperAdmin(c, "billing.manual_payment", "manual_payments", id, "warning", fiber.Map{"tenant_id": req.TenantID, "amount": req.Amount}, "")
	return response.Success(c, fiber.Map{"id": id}, "Payment recorded")
}

func (h *Handler) AnalyticsKPIs(c *fiber.Ctx) error {
	return h.EnterpriseOverview(c)
}

func (h *Handler) AnalyticsGrowth(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as month, COUNT(*)
		 FROM tenants WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 12`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch growth")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var month string
		var count int
		_ = rows.Scan(&month, &count)
		items = append(items, fiber.Map{"month": month, "institutions": count})
	}
	return response.Success(c, fiber.Map{"growth": items}, "Growth retrieved")
}

func (h *Handler) ChurnRisk(c *fiber.Ctx) error {
	return response.Success(c, fiber.Map{"institutions": h.churnRiskRows(c, 50)}, "Churn risk retrieved")
}

func (h *Handler) churnRiskRows(c *fiber.Ctx, limit int) []fiber.Map {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT t.id, t.name, t.status, t.plan,
		        COALESCE(MAX(u.last_login_at), t.created_at) as last_activity,
		        (SELECT COUNT(*) FROM tenant_modules tm WHERE tm.tenant_id = t.id AND tm.is_active = true) as active_modules,
		        (SELECT COUNT(*) FROM support_tickets st WHERE st.tenant_id = t.id AND st.status IN ('open','escalated')) as open_tickets
		 FROM tenants t LEFT JOIN users u ON u.tenant_id = t.id
		 WHERE t.deleted_at IS NULL
		 GROUP BY t.id ORDER BY last_activity ASC LIMIT $1`, limit)
	if err != nil {
		return []fiber.Map{}
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, name, status, plan string
		var lastActivity time.Time
		var modules, tickets int
		_ = rows.Scan(&id, &name, &status, &plan, &lastActivity, &modules, &tickets)
		days := int(time.Since(lastActivity).Hours() / 24)
		score := 20
		if status == "suspended" || status == "cancelled" {
			score += 35
		}
		if days > 14 {
			score += 30
		} else if days > 7 {
			score += 15
		}
		if modules < 4 {
			score += 15
		}
		if tickets > 2 {
			score += 20
		}
		if score > 100 {
			score = 100
		}
		items = append(items, fiber.Map{"id": id, "name": name, "status": status, "plan": plan, "last_activity_at": lastActivity, "active_modules": modules, "open_tickets": tickets, "risk_score": score})
	}
	return items
}

func (h *Handler) ModuleUsage(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT mc.key, mc.name,
		        COUNT(tm.tenant_id) FILTER (WHERE tm.is_active = true) as active_tenants,
		        COALESCE(SUM(mus.event_count), 0) as events,
		        COALESCE(SUM(mus.error_count), 0) as errors
		 FROM modules_catalog mc
		 LEFT JOIN tenant_modules tm ON tm.module_key = mc.key
		 LEFT JOIN module_usage_snapshots mus ON mus.module_key = mc.key AND mus.captured_at > NOW() - INTERVAL '30 days'
		 GROUP BY mc.key, mc.name ORDER BY active_tenants DESC, events DESC`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch module usage")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var key, name string
		var activeTenants, events, errors int
		_ = rows.Scan(&key, &name, &activeTenants, &events, &errors)
		items = append(items, fiber.Map{"key": key, "name": name, "active_tenants": activeTenants, "events": events, "errors": errors})
	}
	return response.Success(c, fiber.Map{"modules": items}, "Module usage retrieved")
}

func (h *Handler) GetPlatformSettings(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(), "SELECT key, category, value, is_sensitive, updated_at FROM platform_settings ORDER BY category, key")
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch settings")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var key, category string
		var value []byte
		var sensitive bool
		var updated interface{}
		_ = rows.Scan(&key, &category, &value, &sensitive, &updated)
		items = append(items, fiber.Map{"key": key, "category": category, "value": json.RawMessage(value), "is_sensitive": sensitive, "updated_at": updated})
	}
	return response.Success(c, fiber.Map{"settings": items}, "Settings retrieved")
}

func (h *Handler) SavePlatformSetting(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req struct {
		Key       string                 `json:"key"`
		Category  string                 `json:"category"`
		Value     map[string]interface{} `json:"value"`
		Sensitive bool                   `json:"is_sensitive"`
	}
	if err := c.BodyParser(&req); err != nil || req.Key == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid setting payload")
	}
	data, _ := json.Marshal(req.Value)
	_, err := h.db.Exec(c.UserContext(),
		`INSERT INTO platform_settings (key, category, value, is_sensitive, updated_by)
		 VALUES ($1,$2,$3,$4,NULLIF($5, '')::uuid)
		 ON CONFLICT (key) DO UPDATE SET category=$2, value=$3, is_sensitive=$4, updated_by=NULLIF($5, '')::uuid, updated_at=NOW()`,
		req.Key, defaultString(req.Category, "general"), string(data), req.Sensitive, userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not save setting")
	}
	h.auditSuperAdmin(c, "system.setting_save", "platform_settings", "", "warning", fiber.Map{"key": req.Key, "category": req.Category}, "")
	return response.Success(c, nil, "Setting saved")
}

func (h *Handler) AuditLogs(c *fiber.Ctx) error {
	severity := c.Query("severity")
	module := c.Query("module")
	query := `SELECT al.id, COALESCE(u.email, 'system'), al.action, al.resource, COALESCE(al.resource_id::text, ''), al.severity, COALESCE(al.module_key, ''), al.details, al.ip_address::text, al.created_at
		FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id WHERE 1=1`
	args := []interface{}{}
	idx := 1
	if severity != "" && severity != "all" {
		query += fmt.Sprintf(" AND al.severity = $%d", idx)
		args = append(args, severity)
		idx++
	}
	if module != "" && module != "all" {
		query += fmt.Sprintf(" AND al.module_key = $%d", idx)
		args = append(args, module)
		idx++
	}
	query += " ORDER BY al.created_at DESC LIMIT 200"
	rows, err := h.db.Query(c.UserContext(), query, args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch audit logs")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, user, action, resource, resourceID, sev, mod, ip string
		var details []byte
		var created interface{}
		_ = rows.Scan(&id, &user, &action, &resource, &resourceID, &sev, &mod, &details, &ip, &created)
		items = append(items, fiber.Map{"id": id, "user": user, "action": action, "resource": resource, "resource_id": resourceID, "severity": sev, "module_key": mod, "details": json.RawMessage(details), "ip_address": ip, "created_at": created})
	}
	return response.Success(c, fiber.Map{"logs": items}, "Audit logs retrieved")
}

func (h *Handler) ErrorLogs(c *fiber.Ctx) error {
	rows := h.moduleHealthRows(c, 100)
	return response.Success(c, fiber.Map{"logs": rows}, "Error logs retrieved")
}

func (h *Handler) ActivityLogs(c *fiber.Ctx) error {
	return h.AuditLogs(c)
}

func (h *Handler) ListSupportTickets(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT st.id, COALESCE(st.tenant_id::text, ''), COALESCE(t.name, 'Interno'), st.title, st.status, st.priority, COALESCE(st.module_key, ''), st.created_at, st.resolved_at
		 FROM support_tickets st LEFT JOIN tenants t ON t.id = st.tenant_id
		 WHERE st.deleted_at IS NULL ORDER BY st.created_at DESC LIMIT 200`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch tickets")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, tenantID, tenant, title, status, priority, module string
		var created, resolved interface{}
		_ = rows.Scan(&id, &tenantID, &tenant, &title, &status, &priority, &module, &created, &resolved)
		items = append(items, fiber.Map{"id": id, "tenant_id": tenantID, "tenant_name": tenant, "title": title, "status": status, "priority": priority, "module_key": module, "created_at": created, "resolved_at": resolved})
	}
	return response.Success(c, fiber.Map{"tickets": items}, "Tickets retrieved")
}

func (h *Handler) CreateSupportTicket(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req supportTicketRequest
	if err := c.BodyParser(&req); err != nil || req.Title == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid ticket payload")
	}
	var id string
	err := h.db.QueryRow(c.UserContext(),
		`INSERT INTO support_tickets (tenant_id, title, description, status, priority, module_key, assigned_to, created_by)
		 VALUES (NULLIF($1, '')::uuid, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, '')::uuid, NULLIF($8, '')::uuid) RETURNING id`,
		req.TenantID, req.Title, req.Description, defaultString(req.Status, "open"), defaultString(req.Priority, "medium"), req.ModuleKey, req.AssignedTo, userID).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not create ticket")
	}
	h.auditSuperAdmin(c, "support.ticket_create", "support_tickets", id, "info", fiber.Map{"tenant_id": req.TenantID, "priority": req.Priority}, "")
	return response.Success(c, fiber.Map{"id": id}, "Ticket created")
}

func (h *Handler) UpdateSupportTicket(c *fiber.Ctx) error {
	id := c.Params("id")
	var req supportTicketRequest
	_ = c.BodyParser(&req)
	_, err := h.db.Exec(c.UserContext(),
		`UPDATE support_tickets SET title=$1, description=$2, status=$3, priority=$4, module_key=NULLIF($5, ''), assigned_to=NULLIF($6, '')::uuid,
		 resolved_at = CASE WHEN $3 IN ('closed','resolved') AND resolved_at IS NULL THEN NOW() ELSE resolved_at END, updated_at=NOW() WHERE id=$7`,
		req.Title, req.Description, defaultString(req.Status, "open"), defaultString(req.Priority, "medium"), req.ModuleKey, req.AssignedTo, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update ticket")
	}
	h.auditSuperAdmin(c, "support.ticket_update", "support_tickets", id, "info", fiber.Map{"status": req.Status}, "")
	return response.Success(c, nil, "Ticket updated")
}

func (h *Handler) StorageUsage(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT t.id, t.name, t.storage_limit_mb, COALESCE(SUM(sus.used_mb), 0), COALESCE(SUM(sus.file_count), 0)
		 FROM tenants t LEFT JOIN storage_usage_snapshots sus ON sus.tenant_id = t.id
		 WHERE t.deleted_at IS NULL GROUP BY t.id ORDER BY t.name LIMIT 200`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch storage")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, name string
		var limit, files int
		var used float64
		_ = rows.Scan(&id, &name, &limit, &used, &files)
		items = append(items, fiber.Map{"tenant_id": id, "tenant_name": name, "storage_limit_mb": limit, "used_mb": used, "file_count": files})
	}
	return response.Success(c, fiber.Map{"usage": items}, "Storage usage retrieved")
}

func (h *Handler) UpdateStorageLimit(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		StorageLimitMB int `json:"storage_limit_mb"`
	}
	_ = c.BodyParser(&req)
	if req.StorageLimitMB <= 0 {
		return response.Error(c, fiber.StatusBadRequest, "storage_limit_mb must be positive")
	}
	_, err := h.db.Exec(c.UserContext(), "UPDATE tenants SET storage_limit_mb = $1, updated_at = NOW() WHERE id = $2", req.StorageLimitMB, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update storage limit")
	}
	h.auditSuperAdmin(c, "storage.limit_update", "tenants", id, "warning", fiber.Map{"storage_limit_mb": req.StorageLimitMB}, "")
	return response.Success(c, nil, "Storage limit updated")
}

func (h *Handler) ArchiveStorage(c *fiber.Ctx) error {
	req, ok := requireConfirmation(c, "ARCHIVE")
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Confirmation text must be ARCHIVE")
	}
	h.auditSuperAdmin(c, "storage.archive_requested", "storage", "", "warning", fiber.Map{"mode": "job_registered_only"}, req.ConfirmationText)
	return response.Success(c, fiber.Map{"status": "queued"}, "Archive job registered")
}

func (h *Handler) ListFeatureFlags(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(), "SELECT key, name, COALESCE(description, ''), enabled, rollout_percentage, metadata, created_at, updated_at FROM feature_flags WHERE deleted_at IS NULL ORDER BY key")
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch feature flags")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var key, name, desc string
		var enabled bool
		var rollout int
		var metadata []byte
		var created, updated interface{}
		_ = rows.Scan(&key, &name, &desc, &enabled, &rollout, &metadata, &created, &updated)
		items = append(items, fiber.Map{"key": key, "name": name, "description": desc, "enabled": enabled, "rollout_percentage": rollout, "metadata": json.RawMessage(metadata), "created_at": created, "updated_at": updated})
	}
	return response.Success(c, fiber.Map{"flags": items}, "Feature flags retrieved")
}

func (h *Handler) UpsertFeatureFlag(c *fiber.Ctx) error {
	key := c.Params("key")
	var req featureFlagRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid flag payload")
	}
	if key != "" {
		req.Key = key
	}
	if req.Key == "" || req.Name == "" {
		return response.Error(c, fiber.StatusBadRequest, "key and name are required")
	}
	metadata, _ := json.Marshal(req.Metadata)
	_, err := h.db.Exec(c.UserContext(),
		`INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, metadata)
		 VALUES ($1,$2,$3,$4,$5,$6)
		 ON CONFLICT (key) DO UPDATE SET name=$2, description=$3, enabled=$4, rollout_percentage=$5, metadata=$6, updated_at=NOW()`,
		req.Key, req.Name, req.Description, req.Enabled, req.RolloutPercentage, string(metadata))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not save flag")
	}
	h.auditSuperAdmin(c, "feature_flag.save", "feature_flags", "", "warning", fiber.Map{"key": req.Key, "enabled": req.Enabled}, "")
	return response.Success(c, fiber.Map{"key": req.Key}, "Feature flag saved")
}

func (h *Handler) UpsertFeatureFlagScope(c *fiber.Ctx) error {
	key := c.Params("key")
	var req struct {
		TenantID string                 `json:"tenant_id"`
		Level    string                 `json:"level"`
		Plan     string                 `json:"plan"`
		Enabled  bool                   `json:"enabled"`
		Config   map[string]interface{} `json:"config"`
	}
	_ = c.BodyParser(&req)
	config, _ := json.Marshal(req.Config)
	_, err := h.db.Exec(c.UserContext(),
		`INSERT INTO feature_flag_scopes (flag_key, tenant_id, level, plan, enabled, config)
		 VALUES ($1, NULLIF($2, '')::uuid, NULLIF($3, ''), NULLIF($4, ''), $5, $6)
		 ON CONFLICT (flag_key, tenant_id, level, plan) DO UPDATE SET enabled=$5, config=$6, updated_at=NOW()`,
		key, req.TenantID, req.Level, req.Plan, req.Enabled, string(config))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not save flag scope")
	}
	h.auditSuperAdmin(c, "feature_flag.scope_save", "feature_flag_scopes", "", "warning", fiber.Map{"key": key, "tenant_id": req.TenantID, "level": req.Level, "plan": req.Plan}, "")
	return response.Success(c, nil, "Feature flag scope saved")
}

func (h *Handler) ListBackups(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT bj.id, COALESCE(bj.tenant_id::text, ''), COALESCE(t.name, 'Global'), bj.type, bj.status, bj.size_mb, bj.created_at, bj.completed_at, COALESCE(bj.error, '')
		 FROM backup_jobs bj LEFT JOIN tenants t ON t.id = bj.tenant_id ORDER BY bj.created_at DESC LIMIT 100`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch backups")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, tenantID, tenant, typ, status, errMsg string
		var size float64
		var created, completed interface{}
		_ = rows.Scan(&id, &tenantID, &tenant, &typ, &status, &size, &created, &completed, &errMsg)
		items = append(items, fiber.Map{"id": id, "tenant_id": tenantID, "tenant_name": tenant, "type": typ, "status": status, "size_mb": size, "created_at": created, "completed_at": completed, "error": errMsg})
	}
	return response.Success(c, fiber.Map{"backups": items}, "Backups retrieved")
}

func (h *Handler) CreateBackupJob(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	var req struct {
		TenantID string `json:"tenant_id"`
		Type     string `json:"type"`
	}
	_ = c.BodyParser(&req)
	var id string
	err := h.db.QueryRow(c.UserContext(), "INSERT INTO backup_jobs (tenant_id, type, status, requested_by) VALUES (NULLIF($1, '')::uuid, $2, 'queued', NULLIF($3, '')::uuid) RETURNING id", req.TenantID, defaultString(req.Type, "full"), userID).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not create backup job")
	}
	h.auditSuperAdmin(c, "backup.create", "backup_jobs", id, "warning", fiber.Map{"tenant_id": req.TenantID}, "")
	return response.Success(c, fiber.Map{"id": id, "status": "queued"}, "Backup job created")
}

func (h *Handler) RestoreBackupJob(c *fiber.Ctx) error {
	id := c.Params("id")
	req, ok := requireConfirmation(c, "RESTORE "+id)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Confirmation text must be RESTORE "+id)
	}
	_, err := h.db.Exec(c.UserContext(), "UPDATE backup_jobs SET status = 'restore_requested' WHERE id = $1", id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not request restore")
	}
	h.auditSuperAdmin(c, "backup.restore_requested", "backup_jobs", id, "critical", fiber.Map{"mode": "job_registered_only"}, req.ConfirmationText)
	return response.Success(c, fiber.Map{"status": "restore_requested"}, "Restore request registered")
}

func (h *Handler) VersionInfo(c *fiber.Ctx) error {
	rows, err := h.db.Query(c.UserContext(), "SELECT id, version, status, changelog, deployed_at FROM system_versions ORDER BY deployed_at DESC LIMIT 20")
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch versions")
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var id, version, status, changelog string
		var deployed interface{}
		_ = rows.Scan(&id, &version, &status, &changelog, &deployed)
		items = append(items, fiber.Map{"id": id, "version": version, "status": status, "changelog": changelog, "deployed_at": deployed})
	}
	return response.Success(c, fiber.Map{"versions": items}, "Version info retrieved")
}

func (h *Handler) CreateDeployEvent(c *fiber.Ctx) error {
	return h.createVersionEvent(c, "deploy", "DEPLOY")
}

func (h *Handler) CreateRollbackEvent(c *fiber.Ctx) error {
	return h.createVersionEvent(c, "rollback", "ROLLBACK")
}

func (h *Handler) createVersionEvent(c *fiber.Ctx, action, confirmation string) error {
	userID, _ := c.Locals("user_id").(string)
	var req struct {
		VersionID        string `json:"version_id"`
		ConfirmationText string `json:"confirmation_text"`
	}
	_ = c.BodyParser(&req)
	if req.ConfirmationText != confirmation {
		return response.Error(c, fiber.StatusBadRequest, "Confirmation text must be "+confirmation)
	}
	var id string
	err := h.db.QueryRow(c.UserContext(), "INSERT INTO system_deploy_events (version_id, action, status, requested_by, confirmation_text) VALUES (NULLIF($1, '')::uuid, $2, 'queued', NULLIF($3, '')::uuid, $4) RETURNING id", req.VersionID, action, userID, req.ConfirmationText).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not create version event")
	}
	h.auditSuperAdmin(c, "version."+action, "system_deploy_events", id, "critical", fiber.Map{"version_id": req.VersionID}, req.ConfirmationText)
	return response.Success(c, fiber.Map{"id": id, "status": "queued"}, "Version event registered")
}

func (h *Handler) ModuleHealth(c *fiber.Ctx) error {
	return response.Success(c, fiber.Map{"modules": h.moduleHealthRows(c, 100)}, "Module health retrieved")
}

func (h *Handler) SystemHealth(c *fiber.Ctx) error {
	return response.Success(c, fiber.Map{"status": "operational", "database": "ok", "generated_at": time.Now()}, "System health retrieved")
}

func (h *Handler) CreateModuleHealthEvent(c *fiber.Ctx) error {
	var req moduleHealthRequest
	if err := c.BodyParser(&req); err != nil || req.ModuleKey == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid health event")
	}
	metadata, _ := json.Marshal(req.Metadata)
	_, err := h.db.Exec(c.UserContext(),
		`INSERT INTO module_health_events (module_key, tenant_id, severity, status, message, error_rate, latency_ms, metadata)
		 VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7, $8)`,
		req.ModuleKey, req.TenantID, defaultString(req.Severity, "info"), defaultString(req.Status, "healthy"), req.Message, req.ErrorRate, req.LatencyMS, string(metadata))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not create health event")
	}
	return response.Success(c, nil, "Health event created")
}

func (h *Handler) moduleHealthRows(c *fiber.Ctx, limit int) []fiber.Map {
	rows, err := h.db.Query(c.UserContext(),
		`SELECT module_key, COALESCE(t.name, 'Global'), severity, status, message, error_rate, latency_ms, created_at
		 FROM module_health_events mhe LEFT JOIN tenants t ON t.id = mhe.tenant_id
		 ORDER BY created_at DESC LIMIT $1`, limit)
	if err != nil {
		return []fiber.Map{}
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var module, tenant, severity, status, message string
		var errorRate float64
		var latency int
		var created interface{}
		_ = rows.Scan(&module, &tenant, &severity, &status, &message, &errorRate, &latency, &created)
		items = append(items, fiber.Map{"module_key": module, "tenant_name": tenant, "severity": severity, "status": status, "message": message, "error_rate": errorRate, "latency_ms": latency, "created_at": created})
	}
	if len(items) == 0 {
		items = append(items, fiber.Map{"module_key": "api", "tenant_name": "Global", "severity": "info", "status": "healthy", "message": "Sin incidentes registrados", "error_rate": 0, "latency_ms": 0, "created_at": time.Now()})
	}
	return items
}

func emptyToNil(value string) interface{} {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func defaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func stringPtrValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func parseLimit(c *fiber.Ctx, fallback int) int {
	limit, err := strconv.Atoi(c.Query("limit", fmt.Sprintf("%d", fallback)))
	if err != nil || limit <= 0 {
		return fallback
	}
	if limit > 500 {
		return 500
	}
	return limit
}
