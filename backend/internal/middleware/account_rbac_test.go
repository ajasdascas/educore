package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"educore/internal/pkg/database"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
)

func TestAuthVersionMatchesRevokesOldTokens(t *testing.T) {
	if authVersionMatches(0, 1) {
		t.Fatal("legacy token without auth_version must be rejected")
	}
	if authVersionMatches(1, 2) {
		t.Fatal("token issued before a password reset must be rejected")
	}
	if !authVersionMatches(2, 2) {
		t.Fatal("token issued after the reset must remain valid")
	}
}

func TestMandatoryPasswordChangeBlocksEveryAccountRoute(t *testing.T) {
	sqlDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()
	db := database.NewPortableFromSQLDB("postgres", sqlDB)
	mock.ExpectQuery(`(?s)SELECT u.role, u.email, u.tenant_id, u.auth_version, u.password_must_change`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{
			"role", "email", "tenant_id", "auth_version", "password_must_change", "permissions", "tenant_role_exists",
		}).AddRow("SUPER_ADMIN", "admin@example.test", nil, 4, true, []byte(`[]`), false))

	nextCalled := false
	app := fiber.New()
	app.Get("/protected",
		func(c *fiber.Ctx) error {
			c.Locals("user_id", "user-1")
			c.Locals("user_role", "SUPER_ADMIN")
			c.Locals("auth_version", 4)
			c.Locals("user", map[string]interface{}{
				"email": "admin@example.test", "tenant_id": "",
			})
			return c.Next()
		},
		AuthorizeCurrentUser(db),
		func(c *fiber.Ctx) error {
			nextCalled = true
			return c.SendStatus(fiber.StatusNoContent)
		},
	)
	result, err := app.Test(httptest.NewRequest(http.MethodGet, "/protected", nil))
	if err != nil {
		t.Fatal(err)
	}
	if result.StatusCode != fiber.StatusForbidden || nextCalled {
		t.Fatalf("status=%d nextCalled=%t, want 403/false", result.StatusCode, nextCalled)
	}
	var payload map[string]interface{}
	if err := json.NewDecoder(result.Body).Decode(&payload); err != nil {
		t.Fatal(err)
	}
	if payload["code"] != "PASSWORD_CHANGE_REQUIRED" {
		t.Fatalf("code=%v", payload["code"])
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
