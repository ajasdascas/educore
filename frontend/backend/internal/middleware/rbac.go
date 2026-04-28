package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

type Role string

const (
	RoleSuperAdmin  Role = "SUPER_ADMIN"
	RoleSchoolAdmin Role = "SCHOOL_ADMIN"
	RoleTeacher     Role = "TEACHER"
	RoleParent      Role = "PARENT"
)

var roleHierarchy = map[Role][]Role{
	RoleSuperAdmin:  {RoleSuperAdmin, RoleSchoolAdmin, RoleTeacher, RoleParent},
	RoleSchoolAdmin: {RoleSchoolAdmin, RoleTeacher, RoleParent},
	RoleTeacher:     {RoleTeacher},
	RoleParent:      {RoleParent},
}

func RequireRole(allowedRoles ...Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := c.Locals("user")
		if user == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Authentication required",
			})
		}

		userMap, ok := user.(map[string]interface{})
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error":   "Invalid user data",
			})
		}

		userRoleStr, exists := userMap["role"].(string)
		if !exists {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   "No role assigned",
			})
		}

		userRole := Role(userRoleStr)

		// Check if user has any of the allowed roles
		for _, allowedRole := range allowedRoles {
			if hasRole(userRole, allowedRole) {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"error":   "Insufficient permissions",
		})
	}
}

func RequireSuperAdmin() fiber.Handler {
	return RequireRole(RoleSuperAdmin)
}

func RequireSchoolAccess() fiber.Handler {
	return RequireRole(RoleSuperAdmin, RoleSchoolAdmin, RoleTeacher)
}

func RequireTeacherAccess() fiber.Handler {
	return RequireRole(RoleSuperAdmin, RoleSchoolAdmin, RoleTeacher)
}

func hasRole(userRole, requiredRole Role) bool {
	allowedRoles, exists := roleHierarchy[userRole]
	if !exists {
		return false
	}

	for _, allowedRole := range allowedRoles {
		if allowedRole == requiredRole {
			return true
		}
	}
	return false
}

func GetUserRole(c *fiber.Ctx) Role {
	user := c.Locals("user")
	if user == nil {
		return ""
	}

	if userMap, ok := user.(map[string]interface{}); ok {
		if role, exists := userMap["role"].(string); exists {
			return Role(role)
		}
	}
	return ""
}

func GetUserID(c *fiber.Ctx) string {
	user := c.Locals("user")
	if user == nil {
		return ""
	}

	if userMap, ok := user.(map[string]interface{}); ok {
		if id, exists := userMap["user_id"].(string); exists {
			return id
		}
	}
	return ""
}

func IsSuperAdmin(c *fiber.Ctx) bool {
	return GetUserRole(c) == RoleSuperAdmin
}

func CanAccessTenant(c *fiber.Ctx, targetTenantID string) bool {
	// Super admins can access any tenant
	if IsSuperAdmin(c) {
		return true
	}

	// Other roles can only access their own tenant
	currentTenantID := GetTenantID(c)
	return currentTenantID == targetTenantID
}