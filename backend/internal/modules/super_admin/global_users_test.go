package superadmin

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"educore/internal/pkg/database"
	"educore/internal/pkg/passwordpolicy"
	"educore/internal/pkg/rbac"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
)

func TestValidateScopedUserRequest(t *testing.T) {
	active := true
	valid := scopedUserRequest{
		TenantID: "tenant-a", Email: "teacher@example.test", FirstName: "Ana", LastName: "López",
		Role: rbac.RoleTeacher, Password: "Strong-Test-2026!", IsActive: &active,
	}
	if err := validateScopedUserRequest(valid, true); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}

	escalated := valid
	escalated.Role = rbac.RoleSuperAdmin
	if err := validateScopedUserRequest(escalated, true); err == nil {
		t.Fatal("tenant-scoped SUPER_ADMIN must be rejected")
	}

	studentWithoutLink := valid
	studentWithoutLink.Role = rbac.RoleStudent
	if err := validateScopedUserRequest(studentWithoutLink, true); err == nil {
		t.Fatal("student account without same-tenant student link must be rejected")
	}

	weakPassword := valid
	weakPassword.Password = "password123"
	if err := validateScopedUserRequest(weakPassword, true); err == nil {
		t.Fatal("weak password must be rejected")
	}
}

func TestAdminPasswordResetRevokesPendingRecoveryLinksAtomically(t *testing.T) {
	sqlDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()
	handler := NewHandler(database.NewPortableFromSQLDB("postgres", sqlDB))
	mock.ExpectQuery(`(?s)SELECT id, COALESCE\(tenant_id::text, ''\), email, first_name, last_name, role, is_active`).
		WithArgs("user-1").
		WillReturnRows(sqlmock.NewRows([]string{"id", "tenant_id", "email", "first_name", "last_name", "role", "is_active"}).
			AddRow("user-1", "tenant-1", "teacher@example.test", "Teacher", "One", rbac.RoleTeacher, true))
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE users SET password_hash`).
		WithArgs(sqlmock.AnyArg(), "user-1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`(?s)UPDATE password_reset_tokens SET revoked_at`).
		WithArgs("user-1").WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectCommit()
	mock.ExpectExec(`INSERT INTO audit_logs`).WillReturnResult(sqlmock.NewResult(0, 1))

	app := fiber.New()
	app.Post("/users/:id/reset", func(c *fiber.Ctx) error {
		c.Locals("user_id", "admin-1")
		return c.Next()
	}, handler.ResetScopedUserPassword)
	request := httptest.NewRequest(http.MethodPost, "/users/user-1/reset", strings.NewReader(`{"password":"Temporal-Nueva-2026!"}`))
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

func TestLastActiveSuperAdminGuardUsesLockedSnapshot(t *testing.T) {
	for _, driverName := range []string{"postgres", "mysql"} {
		t.Run(driverName+" blocks last", func(t *testing.T) {
			sqlDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
			if err != nil {
				t.Fatal(err)
			}
			defer sqlDB.Close()
			db := database.NewPortableFromSQLDB(driverName, sqlDB)
			mock.ExpectBegin()
			query := `(?s)SELECT id.*role, is_active.*FROM users.*ORDER BY id.*FOR UPDATE`
			mock.ExpectQuery(query).WillReturnRows(sqlmock.NewRows([]string{"id", "role", "is_active"}).
				AddRow("admin-1", rbac.RoleSuperAdmin, true))
			mock.ExpectRollback()
			tx, err := db.Begin(context.Background())
			if err != nil {
				t.Fatal(err)
			}
			err = guardLastActiveSuperAdminTx(context.Background(), tx, "admin-1", false)
			if !errors.Is(err, errLastActiveSuperAdmin) {
				t.Fatalf("guard error=%v, want last-admin conflict", err)
			}
			_ = tx.Rollback(context.Background())
			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestLastActiveSuperAdminGuardAllowsMutationWhenAnotherIsActive(t *testing.T) {
	sqlDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatal(err)
	}
	defer sqlDB.Close()
	db := database.NewPortableFromSQLDB("postgres", sqlDB)
	mock.ExpectBegin()
	mock.ExpectQuery(`(?s)SELECT id.*role, is_active.*FOR UPDATE`).WillReturnRows(
		sqlmock.NewRows([]string{"id", "role", "is_active"}).
			AddRow("admin-1", rbac.RoleSuperAdmin, true).
			AddRow("admin-2", rbac.RoleSuperAdmin, true),
	)
	mock.ExpectRollback()
	tx, err := db.Begin(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if err := guardLastActiveSuperAdminTx(context.Background(), tx, "admin-1", false); err != nil {
		t.Fatalf("guard rejected safe mutation: %v", err)
	}
	_ = tx.Rollback(context.Background())
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestNormalizeScopedUserRequest(t *testing.T) {
	req := scopedUserRequest{
		TenantID: " tenant-a ", Email: " User@Example.TEST ", FirstName: " Ana ", LastName: " López ", Role: "teacher",
	}
	normalizeScopedUserRequest(&req)
	if req.TenantID != "tenant-a" || req.Email != "user@example.test" || req.Role != rbac.RoleTeacher {
		t.Fatalf("request was not normalized: %+v", req)
	}
	if req.Relationship != "guardian" {
		t.Fatalf("default relationship = %q", req.Relationship)
	}
}

func TestValidatePasswordPolicy(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{name: "strong", password: "Temporal-Segura-2026!"},
		{name: "too short", password: "Adm1n!", wantErr: true},
		{name: "missing uppercase", password: "temporal-segura-2026!", wantErr: true},
		{name: "missing lowercase", password: "TEMPORAL-SEGURA-2026!", wantErr: true},
		{name: "missing number", password: "Temporal-Segura-SinNumero!", wantErr: true},
		{name: "missing symbol", password: "TemporalSegura2026", wantErr: true},
		{name: "bcrypt byte limit", password: "Aa1!" + string(make([]byte, 69)), wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := passwordpolicy.Validate(test.password)
			if (err != nil) != test.wantErr {
				t.Fatalf("validatePassword() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}
