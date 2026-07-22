package auth

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"educore/internal/pkg/jwt"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func TestLoginIssuesTypedTokensAndReportsMandatoryPasswordChange(t *testing.T) {
	handler, mock, closeDB := newMockHandler(t)
	defer closeDB()
	handler.jwtSecret = "test-secret-with-more-than-32-characters"
	handler.jwtExpiry = 15 * time.Minute
	handler.refreshExpiry = 24 * time.Hour

	passwordHash, err := bcrypt.GenerateFromPassword([]byte("Temporal-Segura-2026!"), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	mock.ExpectQuery(`(?s)SELECT u.id, u.tenant_id, u.role.*FROM users u`).
		WithArgs("admin@example.test").
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "tenant_id", "role", "password_hash", "email", "auth_version", "password_must_change", "tenant_slug",
		}).AddRow("user-1", nil, "SUPER_ADMIN", string(passwordHash), "admin@example.test", 3, true, ""))
	mock.ExpectExec(`UPDATE users SET last_login_at`).WithArgs("user-1").WillReturnResult(sqlmock.NewResult(0, 1))

	app := fiber.New()
	app.Post("/login", handler.Login)
	request := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(`{"email":"ADMIN@example.test","password":"Temporal-Segura-2026!"}`))
	request.Header.Set("Content-Type", "application/json")
	result, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if result.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(result.Body)
		t.Fatalf("login status=%d body=%s", result.StatusCode, body)
	}
	var payload struct {
		Data struct {
			AccessToken string `json:"access_token"`
			User        struct {
				PasswordMustChange bool `json:"password_must_change"`
			} `json:"user"`
		} `json:"data"`
	}
	if err := json.NewDecoder(result.Body).Decode(&payload); err != nil {
		t.Fatal(err)
	}
	if !payload.Data.User.PasswordMustChange {
		t.Fatal("login must expose password_must_change to the route guard")
	}
	if _, err := jwt.ValidateToken(payload.Data.AccessToken, handler.jwtSecret, jwt.TokenTypeAccess); err != nil {
		t.Fatalf("access token validation failed: %v", err)
	}
	if _, err := jwt.ValidateToken(payload.Data.AccessToken, handler.jwtSecret, jwt.TokenTypeRefresh); err == nil {
		t.Fatal("access token must never validate as refresh")
	}

	var refreshToken string
	for _, cookie := range result.Cookies() {
		if cookie.Name == "refresh_token" {
			refreshToken = cookie.Value
		}
	}
	if refreshToken == "" {
		t.Fatal("refresh token cookie was not set")
	}
	if _, err := jwt.ValidateToken(refreshToken, handler.jwtSecret, jwt.TokenTypeRefresh); err != nil {
		t.Fatalf("refresh token validation failed: %v", err)
	}
	if _, err := jwt.ValidateToken(refreshToken, handler.jwtSecret, jwt.TokenTypeAccess); err == nil {
		t.Fatal("refresh token must never validate as access")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestRefreshEndpointRejectsAccessTokenCookie(t *testing.T) {
	handler, mock, closeDB := newMockHandler(t)
	defer closeDB()
	handler.jwtSecret = "test-secret-with-more-than-32-characters"
	handler.jwtExpiry = 15 * time.Minute
	accessToken, err := jwt.GenerateToken("user-1", "", "SUPER_ADMIN", "admin@example.test", 1, jwt.TokenTypeAccess, handler.jwtSecret, time.Minute)
	if err != nil {
		t.Fatal(err)
	}

	app := fiber.New()
	app.Post("/refresh", handler.Refresh)
	request := httptest.NewRequest(http.MethodPost, "/refresh", nil)
	request.AddCookie(&http.Cookie{Name: "refresh_token", Value: accessToken})
	result, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if result.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status=%d, want 401", result.StatusCode)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestChangePasswordRevokesPendingResetTokensInSameTransaction(t *testing.T) {
	handler, mock, closeDB := newMockHandler(t)
	defer closeDB()
	currentPassword := "Temporal-Segura-2026!"
	currentHash, err := bcrypt.GenerateFromPassword([]byte(currentPassword), bcrypt.MinCost)
	if err != nil {
		t.Fatal(err)
	}
	mock.ExpectBegin()
	mock.ExpectQuery(`(?s)SELECT password_hash FROM users.*FOR UPDATE`).
		WithArgs("user-1").WillReturnRows(sqlmock.NewRows([]string{"password_hash"}).AddRow(string(currentHash)))
	mock.ExpectExec(`(?s)UPDATE users SET password_hash`).
		WithArgs(sqlmock.AnyArg(), "user-1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`(?s)UPDATE password_reset_tokens SET revoked_at`).
		WithArgs("user-1").WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectCommit()

	app := fiber.New()
	app.Post("/change-password", func(c *fiber.Ctx) error {
		c.Locals("user_id", "user-1")
		return c.Next()
	}, handler.ChangePassword)
	request := httptest.NewRequest(http.MethodPost, "/change-password", strings.NewReader(`{"current_password":"`+currentPassword+`","new_password":"Nueva-Segura-2026!"}`))
	request.Header.Set("Content-Type", "application/json")
	result, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if result.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(result.Body)
		t.Fatalf("status=%d body=%s", result.StatusCode, body)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}
