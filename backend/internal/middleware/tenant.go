package middleware

import (
	"context"
	"strings"

	"educore/internal/pkg/database"
	"github.com/gofiber/fiber/v2"
)

func TenantResolver(db *database.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenantID := ""

		// Public/pre-auth tenant context can only be inferred from the host.
		// Protected routes overwrite this with the JWT tenant in middleware.Protected.
		host := c.Hostname()
		parts := strings.Split(host, ".")
		if len(parts) > 1 && parts[0] != "www" && parts[0] != "api" {
			slug := parts[0]
			var id string
			err := db.QueryRow(context.Background(), "SELECT id FROM tenants WHERE slug = $1 AND status = 'active'", slug).Scan(&id)
			if err == nil {
				tenantID = id
			}
		}

		// Inject tenant into Fiber Context locals
		if tenantID != "" {
			c.Locals("tenant_id", tenantID)
		}

		return c.Next()
	}
}

// SetDBTenant context execution logic for RLS
func SetDBTenant(ctx context.Context, db *database.DB, tenantID string) (context.Context, error) {
	if tenantID == "" {
		return ctx, nil
	}
	_, err := db.Exec(ctx, "SET LOCAL app.current_tenant = $1", tenantID)
	return ctx, err
}
