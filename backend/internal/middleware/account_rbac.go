package middleware

import (
	"encoding/json"
	"strings"

	"educore/internal/pkg/database"
	"educore/internal/pkg/rbac"
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
)

// AuthorizeCurrentUser makes account status, role changes and tenant role
// permissions effective immediately instead of trusting a stale JWT until it
// expires. SUPER_ADMIN remains governed by the dedicated role gate and audit
// controls; tenant roles can only narrow their predefined capabilities.
func AuthorizeCurrentUser(db *database.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, _ := c.Locals("user_id").(string)
		tokenRole, _ := c.Locals("user_role").(string)
		claimsTenantID := tokenTenantID(c)
		if userID == "" || tokenRole == "" {
			return response.Error(c, fiber.StatusUnauthorized, "Sesión inválida")
		}

		var dbRole string
		var dbEmail string
		var dbTenantID *string
		var dbAuthVersion int
		var passwordMustChange bool
		var permissionsRaw []byte
		var tenantRoleExists bool
		err := db.QueryRow(c.UserContext(), `
			SELECT u.role, u.email, u.tenant_id, u.auth_version, u.password_must_change,
			       COALESCE(tr.permissions, '[]'::jsonb), tr.id IS NOT NULL
			FROM users u
			LEFT JOIN tenant_roles tr
			  ON tr.tenant_id = u.tenant_id
			 AND tr.key = CASE u.role
			   WHEN 'SCHOOL_ADMIN' THEN 'admin'
			   WHEN 'TEACHER' THEN 'teacher'
			   WHEN 'PARENT' THEN 'parent'
			   WHEN 'STUDENT' THEN 'student'
			   ELSE ''
			 END
			WHERE u.id = $1 AND u.is_active = true AND u.deleted_at IS NULL
			  AND (u.tenant_id IS NULL OR EXISTS (
			    SELECT 1 FROM tenants t WHERE t.id = u.tenant_id AND t.status IN ('active', 'trial') AND t.deleted_at IS NULL
			  ))
		`, userID).Scan(&dbRole, &dbEmail, &dbTenantID, &dbAuthVersion, &passwordMustChange, &permissionsRaw, &tenantRoleExists)
		if err != nil {
			return response.Error(c, fiber.StatusUnauthorized, "La cuenta está inactiva o ya no existe")
		}

		dbRole = rbac.NormalizeRole(dbRole)
		if dbRole != rbac.NormalizeRole(tokenRole) {
			return response.Error(c, fiber.StatusUnauthorized, "Los permisos de la cuenta cambiaron; inicia sesión nuevamente")
		}
		userClaims, _ := c.Locals("user").(map[string]interface{})
		tokenEmail, _ := userClaims["email"].(string)
		if !strings.EqualFold(strings.TrimSpace(dbEmail), strings.TrimSpace(tokenEmail)) {
			return response.Error(c, fiber.StatusUnauthorized, "Los datos de la cuenta cambiaron; inicia sesión nuevamente")
		}

		tokenAuthVersion, _ := c.Locals("auth_version").(int)
		if !authVersionMatches(tokenAuthVersion, dbAuthVersion) {
			return response.Error(c, fiber.StatusUnauthorized, "La sesion fue revocada; inicia sesion nuevamente")
		}
		if passwordMustChange {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"code":    "PASSWORD_CHANGE_REQUIRED",
				"error":   "Debes cambiar tu contrasena temporal antes de continuar",
			})
		}

		dbTenant := ""
		if dbTenantID != nil {
			dbTenant = strings.TrimSpace(*dbTenantID)
		}
		if dbRole == rbac.RoleSuperAdmin {
			if dbTenant != "" || claimsTenantID != "" {
				return response.Error(c, fiber.StatusForbidden, "Cuenta global con alcance inválido")
			}
			return c.Next()
		}
		if dbTenant == "" || dbTenant != claimsTenantID {
			return response.Error(c, fiber.StatusUnauthorized, "El alcance escolar de la sesión cambió; inicia sesión nuevamente")
		}

		definition, ok := rbac.Definition(dbRole)
		if !ok {
			return response.Error(c, fiber.StatusForbidden, "Rol no permitido")
		}
		permissions := append([]string(nil), definition.DefaultPermissions...)
		if tenantRoleExists && len(permissionsRaw) > 0 {
			var stored []string
			if json.Unmarshal(permissionsRaw, &stored) == nil {
				permissions = rbac.ResolvePermissions(dbRole, stored, true)
			}
		}
		c.Locals("effective_permissions", permissions)

		required := rbac.RequiredForRequest(dbRole, c.Method(), c.Path())
		if len(required) > 0 && !rbac.Allows(permissions, required...) {
			return response.Error(c, fiber.StatusForbidden, "El rol no tiene permiso para esta operación")
		}
		return c.Next()
	}
}

// authVersionMatches rejects legacy tokens without a version claim. Bumping
// users.auth_version revokes both access and refresh tokens deterministically.
func authVersionMatches(tokenVersion, databaseVersion int) bool {
	return tokenVersion > 0 && tokenVersion == databaseVersion
}

func tokenTenantID(c *fiber.Ctx) string {
	user, _ := c.Locals("user").(map[string]interface{})
	if user == nil {
		return ""
	}
	tenantID, _ := user["tenant_id"].(string)
	return strings.TrimSpace(tenantID)
}
