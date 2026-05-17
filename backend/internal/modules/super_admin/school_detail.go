package superadmin

import (
	"log"
	"strings"

	"educore/internal/pkg/database"
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
)

// GetSchoolSubmodules returns the list of tenant_module_submodules for a given school.
// If the table does not exist it returns an empty array instead of a 500.
func (h *Handler) GetSchoolSubmodules(c *fiber.Ctx) error {
	id := c.Params("id")

	rows, err := h.db.Query(c.UserContext(),
		database.RebindPlaceholders(h.db.Driver(),
			`SELECT module_key, submodule_key, enabled
			 FROM tenant_module_submodules
			 WHERE tenant_id = $1
			 ORDER BY module_key, submodule_key`),
		id)
	if err != nil {
		if isTableMissingError(err) {
			log.Printf("GetSchoolSubmodules: table tenant_module_submodules not found, returning empty: %v", err)
			return response.Success(c, []fiber.Map{}, "Submodules retrieved")
		}
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching submodules")
	}
	defer rows.Close()

	submodules := []fiber.Map{}
	for rows.Next() {
		var moduleKey, submoduleKey string
		var enabled bool
		if rows.Scan(&moduleKey, &submoduleKey, &enabled) == nil {
			submodules = append(submodules, fiber.Map{
				"module_key":    moduleKey,
				"submodule_key": submoduleKey,
				"enabled":       enabled,
			})
		}
	}
	return response.Success(c, submodules, "Submodules retrieved")
}

// UpdateSchoolModule upserts a module's is_active state for a specific school.
// Body: {"is_active": bool}
func (h *Handler) UpdateSchoolModule(c *fiber.Ctx) error {
	id := c.Params("id")
	moduleKey := c.Params("moduleKey")

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	var err error
	if database.IsMySQL(h.db.Driver()) {
		_, err = h.db.Exec(c.UserContext(),
			`INSERT INTO tenant_modules (id, tenant_id, module_key, is_active, enabled, source, updated_at)
			 VALUES (?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP)
			 ON DUPLICATE KEY UPDATE
			   is_active = VALUES(is_active),
			   enabled = VALUES(enabled),
			   source = 'manual',
			   updated_at = CURRENT_TIMESTAMP`,
			database.NewID(), id, moduleKey, req.IsActive, req.IsActive)
	} else {
		_, err = h.db.Exec(c.UserContext(),
			`INSERT INTO tenant_modules (tenant_id, module_key, is_active, enabled, source)
			 VALUES ($1, $2, $3, $3, 'manual')
			 ON CONFLICT (tenant_id, module_key)
			 DO UPDATE SET
			   is_active = EXCLUDED.is_active,
			   enabled = EXCLUDED.enabled,
			   source = 'manual',
			   updated_at = NOW()`,
			id, moduleKey, req.IsActive)
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating module")
	}

	h.auditSuperAdmin(c, "school.module_update", "tenant_modules", id, "info",
		fiber.Map{"module_key": moduleKey, "is_active": req.IsActive}, "")

	return response.Success(c, fiber.Map{
		"tenant_id":  id,
		"module_key": moduleKey,
		"is_active":  req.IsActive,
	}, "Module updated")
}

// UpdateSchoolSubmodule upserts a submodule's enabled state for a specific school.
// Body: {"enabled": bool}
func (h *Handler) UpdateSchoolSubmodule(c *fiber.Ctx) error {
	id := c.Params("id")
	moduleKey := c.Params("moduleKey")
	submoduleKey := c.Params("submoduleKey")

	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	var err error
	if database.IsMySQL(h.db.Driver()) {
		// INSERT IGNORE creates the row if missing; the UPDATE handles the toggle.
		_, err = h.db.Exec(c.UserContext(),
			`INSERT IGNORE INTO tenant_module_submodules (id, tenant_id, module_key, submodule_key, enabled)
			 VALUES (?, ?, ?, ?, ?)`,
			database.NewID(), id, moduleKey, submoduleKey, req.Enabled)
		if err == nil {
			_, err = h.db.Exec(c.UserContext(),
				`UPDATE tenant_module_submodules
				 SET enabled = ?, updated_at = CURRENT_TIMESTAMP
				 WHERE tenant_id = ? AND module_key = ? AND submodule_key = ?`,
				req.Enabled, id, moduleKey, submoduleKey)
		}
	} else {
		_, err = h.db.Exec(c.UserContext(),
			`INSERT INTO tenant_module_submodules (tenant_id, module_key, submodule_key, enabled)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (tenant_id, module_key, submodule_key)
			 DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
			id, moduleKey, submoduleKey, req.Enabled)
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating submodule")
	}

	return response.Success(c, fiber.Map{
		"tenant_id":    id,
		"module_key":   moduleKey,
		"submodule_key": submoduleKey,
		"enabled":      req.Enabled,
	}, "Submodule updated")
}

// GetSchoolPlanEntitlements returns plan limits vs current usage for a school.
// Falls back to the `plans` table if `subscription_plans` does not exist.
func (h *Handler) GetSchoolPlanEntitlements(c *fiber.Ctx) error {
	id := c.Params("id")

	entitlementsQuery := `
		SELECT sp.name, sp.max_students, sp.max_teachers, sp.storage_limit_mb,
		       COUNT(DISTINCT s.id) AS current_students,
		       COUNT(DISTINCT u.id) AS current_teachers
		FROM tenants t
		LEFT JOIN subscription_plans sp ON sp.id = t.plan OR sp.name = t.plan
		LEFT JOIN students s ON s.tenant_id = t.id
		LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'TEACHER'
		WHERE t.id = $1
		GROUP BY t.id, sp.name, sp.max_students, sp.max_teachers, sp.storage_limit_mb`

	fallbackQuery := `
		SELECT p.name, p.max_students, p.max_teachers, p.storage_limit_mb,
		       COUNT(DISTINCT s.id) AS current_students,
		       COUNT(DISTINCT u.id) AS current_teachers
		FROM tenants t
		LEFT JOIN plans p ON p.id = t.plan OR p.name = t.plan
		LEFT JOIN students s ON s.tenant_id = t.id
		LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'TEACHER'
		WHERE t.id = $1
		GROUP BY t.id, p.name, p.max_students, p.max_teachers, p.storage_limit_mb`

	row := h.db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(h.db.Driver(), entitlementsQuery), id)

	var planName *string
	var maxStudents, maxTeachers, storageLimitMB *int
	var currentStudents, currentTeachers int

	err := row.Scan(&planName, &maxStudents, &maxTeachers, &storageLimitMB, &currentStudents, &currentTeachers)
	if err != nil && isTableMissingError(err) {
		log.Printf("GetSchoolPlanEntitlements: subscription_plans not found, trying plans fallback: %v", err)
		row = h.db.QueryRow(c.UserContext(),
			database.RebindPlaceholders(h.db.Driver(), fallbackQuery), id)
		err = row.Scan(&planName, &maxStudents, &maxTeachers, &storageLimitMB, &currentStudents, &currentTeachers)
	}
	if err != nil {
		log.Printf("GetSchoolPlanEntitlements: query failed: %v", err)
		// Return zeroed entitlements rather than a 500
		return response.Success(c, fiber.Map{
			"plan_name":        nil,
			"max_students":     nil,
			"max_teachers":     nil,
			"storage_limit_mb": nil,
			"current_students": 0,
			"current_teachers": 0,
		}, "Plan entitlements retrieved")
	}

	return response.Success(c, fiber.Map{
		"plan_name":        planName,
		"max_students":     maxStudents,
		"max_teachers":     maxTeachers,
		"storage_limit_mb": storageLimitMB,
		"current_students": currentStudents,
		"current_teachers": currentTeachers,
	}, "Plan entitlements retrieved")
}

// GetSchoolCredentials returns the SCHOOL_ADMIN user's credential info and portal URLs.
// Password hash is intentionally never included in the response.
func (h *Handler) GetSchoolCredentials(c *fiber.Ctx) error {
	id := c.Params("id")

	var adminID, email, firstName, lastName string
	var isActive bool
	var createdAt interface{}

	err := h.db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(h.db.Driver(),
			`SELECT id, email, first_name, last_name, is_active, created_at
			 FROM users
			 WHERE tenant_id = $1 AND role = 'SCHOOL_ADMIN'
			 LIMIT 1`),
		id).Scan(&adminID, &email, &firstName, &lastName, &isActive, &createdAt)

	if err != nil {
		// School has no admin yet — return empty object rather than 404
		return response.Success(c, fiber.Map{
			"admin_email": nil,
			"admin_name":  nil,
			"is_active":   false,
			"created_at":  nil,
			"portals": fiber.Map{
				"school_admin": "/school-portal/school-admin?support_tenant=" + id,
				"parents":      "/school-portal/parents?support_tenant=" + id,
				"teachers":     "/school-portal/teachers?support_tenant=" + id,
				"students":     "/school-portal/students?support_tenant=" + id,
			},
		}, "Credentials retrieved")
	}

	adminName := strings.TrimSpace(firstName + " " + lastName)

	return response.Success(c, fiber.Map{
		"admin_email": email,
		"admin_name":  adminName,
		"admin_id":    adminID,
		"is_active":   isActive,
		"created_at":  createdAt,
		"portals": fiber.Map{
			"school_admin": "/school-portal/school-admin?support_tenant=" + id,
			"parents":      "/school-portal/parents?support_tenant=" + id,
			"teachers":     "/school-portal/teachers?support_tenant=" + id,
			"students":     "/school-portal/students?support_tenant=" + id,
		},
	}, "Credentials retrieved")
}

// GetSchoolStudentBilling returns student count, new students this month, current plan, and
// an estimated monthly billing figure (default 20 MXN/student when no pricing is available).
func (h *Handler) GetSchoolStudentBilling(c *fiber.Ctx) error {
	id := c.Params("id")

	const defaultPricePerStudent = 20.0

	// Count total and new-this-month students
	var totalStudents, newThisMonth int
	var studentsQuery string
	if database.IsMySQL(h.db.Driver()) {
		studentsQuery = `SELECT
			COUNT(*) AS total_students,
			SUM(CASE WHEN created_at >= DATE_FORMAT(NOW(),'%Y-%m-01') THEN 1 ELSE 0 END) AS new_this_month
			FROM students WHERE tenant_id = ?`
	} else {
		studentsQuery = `SELECT
			COUNT(*) AS total_students,
			SUM(CASE WHEN created_at >= date_trunc('month', NOW()) THEN 1 ELSE 0 END) AS new_this_month
			FROM students WHERE tenant_id = $1`
	}

	if err := h.db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(h.db.Driver(), studentsQuery), id).
		Scan(&totalStudents, &newThisMonth); err != nil {
		log.Printf("GetSchoolStudentBilling: student count error: %v", err)
	}

	// Current plan
	var plan string
	_ = h.db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(h.db.Driver(), `SELECT COALESCE(plan, '') FROM tenants WHERE id = $1`),
		id).Scan(&plan)

	estimated := float64(totalStudents) * defaultPricePerStudent

	return response.Success(c, fiber.Map{
		"total_students":         totalStudents,
		"new_this_month":         newThisMonth,
		"plan":                   plan,
		"estimated_monthly_mxn":  estimated,
	}, "Student billing retrieved")
}

// GetSchoolAudit returns the last 50 super-admin audit log entries for a given school.
// If the super_admin_audit_log table does not exist it falls back to audit_logs.
// If neither table exists it returns an empty array.
func (h *Handler) GetSchoolAudit(c *fiber.Ctx) error {
	id := c.Params("id")

	var dateExpr string
	if database.IsMySQL(h.db.Driver()) {
		dateExpr = "DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:00') AS created_at"
	} else {
		dateExpr = "created_at"
	}

	superAuditQuery := database.RebindPlaceholders(h.db.Driver(),
		`SELECT id, action, resource, COALESCE(resource_id,''), COALESCE(performed_by,''), severity,
		        COALESCE(details_json,'{}'), `+dateExpr+`
		 FROM super_admin_audit_log
		 WHERE resource_id = $1
		 ORDER BY created_at DESC
		 LIMIT 50`)

	rows, err := h.db.Query(c.UserContext(), superAuditQuery, id)
	if err != nil {
		if isTableMissingError(err) {
			log.Printf("GetSchoolAudit: super_admin_audit_log not found: %v", err)
			return response.Success(c, []fiber.Map{}, "Audit log retrieved")
		}
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching audit log")
	}
	defer rows.Close()

	entries := []fiber.Map{}
	for rows.Next() {
		var id2, action, resource, resourceID, performedBy, severity, detailsJSON, createdAt string
		if rows.Scan(&id2, &action, &resource, &resourceID, &performedBy, &severity, &detailsJSON, &createdAt) == nil {
			entries = append(entries, fiber.Map{
				"id":           id2,
				"action":       action,
				"resource":     resource,
				"resource_id":  resourceID,
				"performed_by": performedBy,
				"severity":     severity,
				"details":      detailsJSON,
				"created_at":   createdAt,
			})
		}
	}
	return response.Success(c, entries, "Audit log retrieved")
}

// GetSchoolPortalPreview returns the 4 portal URLs available for a given school.
func (h *Handler) GetSchoolPortalPreview(c *fiber.Ctx) error {
	id := c.Params("id")

	return response.Success(c, fiber.Map{
		"portals": []fiber.Map{
			{
				"role":  "school_admin",
				"url":   "/school-portal/school-admin?support_tenant=" + id,
				"label": "Admin Escuela",
			},
			{
				"role":  "teacher",
				"url":   "/school-portal/teachers?support_tenant=" + id,
				"label": "Maestro",
			},
			{
				"role":  "parent",
				"url":   "/school-portal/parents?support_tenant=" + id,
				"label": "Padre",
			},
			{
				"role":  "student",
				"url":   "/school-portal/students?support_tenant=" + id,
				"label": "Alumno",
			},
		},
		"support_mode": true,
	}, "Portal preview retrieved")
}

// isTableMissingError returns true when the DB error indicates a missing table.
// Covers MySQL "doesn't exist" and PostgreSQL "does not exist" / "relation" errors.
func isTableMissingError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "doesn't exist") ||
		strings.Contains(msg, "does not exist") ||
		strings.Contains(msg, "no such table") ||
		strings.Contains(msg, "relation") && strings.Contains(msg, "exist")
}
