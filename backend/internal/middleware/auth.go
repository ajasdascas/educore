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

		c.Locals("user_id", claims.UserID)
		c.Locals("user_role", claims.Role)
		c.Locals("user_email", claims.Email)
		
		if claims.TenantID != "" {
			// Override tenant with JWT tenant for security
			c.Locals("tenant_id", claims.TenantID)
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

		for _, role := range roles {
			if role == userRole {
				return c.Next()
			}
		}

		return response.Error(c, fiber.StatusForbidden, "Insufficient permissions")
	}
}
