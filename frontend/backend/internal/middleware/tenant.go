package middleware

import (
	"fmt"
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TenantConfig struct {
	DB *pgxpool.Pool
}

func TenantMiddleware(config TenantConfig) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var tenantID string

		// 1. Try to get tenant from X-Tenant-ID header
		tenantID = c.Get("X-Tenant-ID")

		// 2. If not found, try to extract from subdomain
		if tenantID == "" {
			host := c.Get("Host")
			if host != "" {
				// Remove port if present
				if colonIndex := strings.Index(host, ":"); colonIndex != -1 {
					host = host[:colonIndex]
				}

				// Extract subdomain if not localhost or main domain
				if !strings.Contains(host, "localhost") && !strings.Contains(host, "onlineu.mx") && strings.Contains(host, ".") {
					parts := strings.Split(host, ".")
					if len(parts) >= 3 {
						tenantID = parts[0]
					}
				}
			}
		}

		// 3. If not found, try to get from JWT (for authenticated requests)
		if tenantID == "" {
			user := c.Locals("user")
			if user != nil {
				if userMap, ok := user.(map[string]interface{}); ok {
					if tid, exists := userMap["tenant_id"]; exists && tid != nil {
						tenantID = tid.(string)
					}
				}
			}
		}

		// Store tenant in context
		c.Locals("tenant_id", tenantID)

		// For authenticated endpoints, set PostgreSQL RLS
		if tenantID != "" && config.DB != nil {
			conn, err := config.DB.Acquire(c.Context())
			if err != nil {
				log.Printf("Error acquiring DB connection for tenant %s: %v", tenantID, err)
			} else {
				defer conn.Release()

				// Set current tenant for RLS
				_, err = conn.Exec(c.Context(), "SET LOCAL app.current_tenant = $1", tenantID)
				if err != nil {
					log.Printf("Error setting tenant context %s: %v", tenantID, err)
				}
			}
		}

		return c.Next()
	}
}

func RequireTenant() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id")
		if tenantID == nil || tenantID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success": false,
				"error": "Tenant ID required",
			})
		}
		return c.Next()
	}
}

func GetTenantID(c *fiber.Ctx) string {
	if tenantID := c.Locals("tenant_id"); tenantID != nil {
		if str, ok := tenantID.(string); ok {
			return str
		}
	}
	return ""
}