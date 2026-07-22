package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestRequireProductionModuleBlocksUnreleasedModule(t *testing.T) {
	app := fiber.New()
	app.Get("/reports", RequireProductionModule("reports"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	response, err := app.Test(httptest.NewRequest(fiber.MethodGet, "/reports", nil))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("expected 503 for blocked module, got %d", response.StatusCode)
	}
}

func TestRequireProductionModuleAllowsReleasedModule(t *testing.T) {
	app := fiber.New()
	app.Get("/attendance", RequireProductionModule("attendance"), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	response, err := app.Test(httptest.NewRequest(fiber.MethodGet, "/attendance", nil))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != fiber.StatusNoContent {
		t.Fatalf("expected released module to continue, got %d", response.StatusCode)
	}
}
