package middleware

import (
	"strings"

	"educore/internal/pkg/jwt"
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
)

func Protected(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return response.Error(c, fiber.StatusUnauthorized, "Missing or invalid token")
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := jwt.ValidateToken(tokenString, secret)
		if err != nil {
			return response.Error(c, fiber.StatusUnauthorized, "Invalid or expired token")
		}

		// Store user data as map for compatibility with new RBAC system
		user := map[string]interface{}{
			"user_id":   claims.UserID,
			"role":      claims.Role,
			"email":     claims.Email,
			"tenant_id": claims.TenantID,
		}

		c.Locals("user", user)
		c.Locals("user_id", claims.UserID)
		c.Locals("user_role", claims.Role)
		c.Locals("user_email", claims.Email)

		if claims.TenantID != "" {
			// Override tenant with JWT tenant for security
			c.Locals("tenant_id", claims.TenantID)
		}

		// SUPER_ADMIN can pass X-Support-Tenant-ID header to operate in school context
		if claims.Role == "SUPER_ADMIN" {
			supportTenantID := c.Get("X-Support-Tenant-ID")
			if supportTenantID != "" {
				c.Locals("tenant_id", supportTenantID)
				c.Locals("support_mode", true)
			}
		}

		return c.Next()
	}
}

func RequireRoles(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, ok := c.Locals("user_role").(string)
		if !ok {
			return response.Error(c, fiber.StatusForbidden, "Role not found in context")
		}

		// SUPER_ADMIN in support mode (X-Support-Tenant-ID present) passes any role gate.
		// They are previewing portals as read-only soporte — not performing mutations as the role.
		if userRole == "SUPER_ADMIN" {
			if _, isSupport := c.Locals("support_mode").(bool); isSupport {
				return c.Next()
			}
		}

		for _, role := range roles {
			if role == userRole {
				return c.Next()
			}
		}

		return response.Error(c, fiber.StatusForbidden, "Insufficient permissions")
	}
}
