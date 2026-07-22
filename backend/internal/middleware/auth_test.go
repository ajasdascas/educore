package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func supportTestApp(method string, allowedRoles ...string) *fiber.App {
	app := fiber.New()
	app.Add(method, "/resource", func(c *fiber.Ctx) error {
		c.Locals("user_role", "SUPER_ADMIN")
		c.Locals("support_mode", true)
		return c.Next()
	}, RequireRoles(allowedRoles...), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})
	return app
}

func TestSupportRoleBypassAllowsReads(t *testing.T) {
	app := supportTestApp(fiber.MethodGet, "TEACHER")
	response, err := app.Test(httptest.NewRequest(fiber.MethodGet, "/resource", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.StatusCode, fiber.StatusNoContent)
	}
}

func TestSupportRoleBypassBlocksMutations(t *testing.T) {
	app := supportTestApp(fiber.MethodPost, "TEACHER")
	response, err := app.Test(httptest.NewRequest(fiber.MethodPost, "/resource", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.StatusCode, fiber.StatusForbidden)
	}
}

func TestExplicitSuperAdminRouteIsStillReadOnlyInSupportMode(t *testing.T) {
	app := supportTestApp(fiber.MethodPost, "SUPER_ADMIN")
	response, err := app.Test(httptest.NewRequest(fiber.MethodPost, "/resource", nil))
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != fiber.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.StatusCode, fiber.StatusForbidden)
	}
}
