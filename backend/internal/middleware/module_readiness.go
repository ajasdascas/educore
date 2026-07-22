package middleware

import (
	"strings"

	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
)

// productionReadyTenantModules is the server-side release boundary. Catalog,
// plan and tenant rows cannot make a module executable while it remains absent
// from this allowlist.
var productionReadyTenantModules = map[string]struct{}{
	"auth": {}, "users": {}, "academic_core": {}, "grading": {},
	"students": {}, "groups": {}, "grades": {}, "schedules": {}, "attendance": {},
}

func IsProductionReadyTenantModule(moduleKey string) bool {
	_, ok := productionReadyTenantModules[strings.ToLower(strings.TrimSpace(moduleKey))]
	return ok
}

// RequireProductionModule prevents parallel or legacy routers from bypassing
// the same release gate enforced by the school-admin module routes.
func RequireProductionModule(moduleKey string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !IsProductionReadyTenantModule(moduleKey) {
			return response.Error(c, fiber.StatusServiceUnavailable, "Module is disabled until its production readiness audit passes")
		}
		return c.Next()
	}
}
