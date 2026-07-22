package superadmin

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestDatabaseAdminRoutesFailClosed(t *testing.T) {
	app := fiber.New()
	handler := &Handler{}
	handler.RegisterDatabaseAdminRoutes(app.Group("/api/v1/super-admin"))

	for _, methodPath := range []struct {
		method string
		path   string
	}{
		{fiber.MethodGet, "/api/v1/super-admin/database/tables"},
		{fiber.MethodPost, "/api/v1/super-admin/database/tables"},
		{fiber.MethodPost, "/api/v1/super-admin/database/import/validate"},
	} {
		request := httptest.NewRequest(methodPath.method, methodPath.path, nil)
		response, err := app.Test(request)
		if err != nil {
			t.Fatalf("%s %s: %v", methodPath.method, methodPath.path, err)
		}
		if response.StatusCode != fiber.StatusServiceUnavailable {
			t.Fatalf("%s %s status = %d, want %d", methodPath.method, methodPath.path, response.StatusCode, fiber.StatusServiceUnavailable)
		}
	}
}
