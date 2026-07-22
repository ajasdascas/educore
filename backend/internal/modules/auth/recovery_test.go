package auth

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"educore/internal/pkg/database"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
)

type resetSenderStub struct {
	configured bool
	providerID string
	err        error
	resetURL   string
}

func (s *resetSenderStub) Configured() bool { return s.configured }

func (s *resetSenderStub) SendPasswordReset(_ context.Context, _, _, resetURL, _ string) (string, error) {
	s.resetURL = resetURL
	return s.providerID, s.err
}

type captureStringArgument struct {
	value string
}

func (argument *captureStringArgument) Match(value driver.Value) bool {
	text, ok := value.(string)
	if ok {
		argument.value = text
	}
	return ok
}

func newMockHandler(t *testing.T) (*Handler, sqlmock.Sqlmock, func()) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New(sqlmock.QueryMatcherOption(sqlmock.QueryMatcherRegexp))
	if err != nil {
		t.Fatal(err)
	}
	handler := &Handler{db: database.NewPortableFromSQLDB("postgres", sqlDB)}
	return handler, mock, func() { _ = sqlDB.Close() }
}

func TestGeneratePasswordResetTokenIsRandomAndHashed(t *testing.T) {
	rawOne, hashOne, err := generatePasswordResetToken()
	if err != nil {
		t.Fatal(err)
	}
	rawTwo, hashTwo, err := generatePasswordResetToken()
	if err != nil {
		t.Fatal(err)
	}
	if len(rawOne) != 64 || len(hashOne) != 64 {
		t.Fatalf("token lengths raw=%d hash=%d, want 64/64", len(rawOne), len(hashOne))
	}
	if rawOne == hashOne {
		t.Fatal("raw token must not equal the stored digest")
	}
	if rawOne == rawTwo || hashOne == hashTwo {
		t.Fatal("independent reset tokens must be unique")
	}
	computed, err := passwordResetTokenHash(rawOne)
	if err != nil || computed != hashOne {
		t.Fatalf("digest mismatch: got %q err=%v", computed, err)
	}
}

func TestBuildPasswordResetURLPreservesTenantScope(t *testing.T) {
	resetURL, err := buildPasswordResetURL("https://onlineu.mx/educore", strings.Repeat("a", 64), "kinder-prueba")
	if err != nil {
		t.Fatal(err)
	}
	parsed, err := url.Parse(resetURL)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Path != "/educore/reset-password" || parsed.Query().Get("slug") != "kinder-prueba" || parsed.Query().Get("token") == "" {
		t.Fatalf("unexpected reset URL: %s", resetURL)
	}
	if _, err := buildPasswordResetURL("http://onlineu.mx/educore", strings.Repeat("a", 64), ""); err == nil {
		t.Fatal("non-local HTTP APP_BASE_URL must be rejected")
	}
}

func TestResendSenderUsesOfficialHTTPContract(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodPost || request.URL.Path != "/emails" {
			t.Fatalf("request = %s %s", request.Method, request.URL.Path)
		}
		if request.Header.Get("Authorization") != "Bearer re_test_secret" {
			t.Fatalf("missing bearer authorization")
		}
		if request.Header.Get("User-Agent") != "EduCore/1.0" {
			t.Fatalf("user agent = %q", request.Header.Get("User-Agent"))
		}
		if request.Header.Get("Idempotency-Key") != "password-reset-reset-1" {
			t.Fatalf("idempotency key = %q", request.Header.Get("Idempotency-Key"))
		}
		body, _ := io.ReadAll(request.Body)
		var payload struct {
			From string   `json:"from"`
			To   []string `json:"to"`
			Text string   `json:"text"`
			HTML string   `json:"html"`
		}
		if err := json.Unmarshal(body, &payload); err != nil {
			t.Fatal(err)
		}
		if payload.From != "EduCore <noreply@onlineu.mx>" || len(payload.To) != 1 || payload.To[0] != "user@example.test" {
			t.Fatalf("unexpected envelope: %+v", payload)
		}
		if !strings.Contains(payload.Text, "https://onlineu.mx/educore/reset-password?token=") || !strings.Contains(payload.HTML, "Restablecer") {
			t.Fatal("reset URL is missing from the email bodies")
		}
		response.Header().Set("Content-Type", "application/json")
		_, _ = response.Write([]byte(`{"id":"email-1"}`))
	}))
	defer server.Close()

	sender := &resendEmailSender{
		apiKey: "re_test_secret",
		from:   "EduCore <noreply@onlineu.mx>",
		apiURL: server.URL,
		client: server.Client(),
	}
	providerID, err := sender.SendPasswordReset(context.Background(), "user@example.test", "User Test", "https://onlineu.mx/educore/reset-password?token=abc", "password-reset-reset-1")
	if err != nil || providerID != "email-1" {
		t.Fatalf("providerID=%q err=%v", providerID, err)
	}
}

func TestIssuePasswordResetStoresDigestOnlyAndMarksDelivered(t *testing.T) {
	handler, mock, closeDB := newMockHandler(t)
	defer closeDB()
	sender := &resetSenderStub{configured: true, providerID: "email-1"}
	handler.resetSender = sender
	handler.appBaseURL = "https://onlineu.mx/educore"
	storedDigest := &captureStringArgument{}

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE password_reset_tokens SET revoked_at`).WithArgs("user-1").WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectQuery(`(?s)INSERT INTO password_reset_tokens .*RETURNING id`).
		WithArgs("user-1", "tenant-1", storedDigest, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("reset-1"))
	mock.ExpectCommit()
	mock.ExpectExec(`(?s)UPDATE password_reset_tokens.*delivered_at = CURRENT_TIMESTAMP`).
		WithArgs("email-1", "reset-1").WillReturnResult(sqlmock.NewResult(0, 1))

	err := handler.issuePasswordReset(context.Background(), recoveryAccount{
		ID: "user-1", TenantID: "tenant-1", Email: "user@example.test", FirstName: "User", LastName: "Test",
	}, "kinder-prueba")
	if err != nil {
		t.Fatal(err)
	}
	parsed, _ := url.Parse(sender.resetURL)
	rawToken := parsed.Query().Get("token")
	computedDigest, err := passwordResetTokenHash(rawToken)
	if err != nil {
		t.Fatalf("invalid raw token delivered by email: %v", err)
	}
	if storedDigest.value != computedDigest || storedDigest.value == rawToken {
		t.Fatalf("database value is not the SHA-256 digest only")
	}
	if parsed.Query().Get("slug") != "kinder-prueba" {
		t.Fatalf("tenant scope missing from reset URL: %s", sender.resetURL)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestIssuePasswordResetProviderFailureRevokesPendingToken(t *testing.T) {
	handler, mock, closeDB := newMockHandler(t)
	defer closeDB()
	handler.resetSender = &resetSenderStub{configured: true, err: errors.New("provider unavailable")}
	handler.appBaseURL = "https://onlineu.mx/educore"

	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE password_reset_tokens SET revoked_at`).WithArgs("user-1").WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectQuery(`(?s)INSERT INTO password_reset_tokens .*RETURNING id`).
		WithArgs("user-1", "", sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("reset-1"))
	mock.ExpectCommit()
	mock.ExpectExec(`(?s)UPDATE password_reset_tokens SET revoked_at.*delivered_at IS NULL`).
		WithArgs("reset-1").WillReturnResult(sqlmock.NewResult(0, 1))

	err := handler.issuePasswordReset(context.Background(), recoveryAccount{ID: "user-1", Email: "user@example.test"}, "")
	if err == nil {
		t.Fatal("provider failure must be returned internally")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestResetPasswordIsTenantScopedAndOneTime(t *testing.T) {
	handler, mock, closeDB := newMockHandler(t)
	defer closeDB()
	rawToken, tokenHash, err := generatePasswordResetToken()
	if err != nil {
		t.Fatal(err)
	}
	strongPassword := "Nueva-Segura-2026!"

	mock.ExpectBegin()
	mock.ExpectQuery(`(?s)SELECT prt.id, u.id.*FOR UPDATE`).
		WithArgs(tokenHash, "kinder-prueba").
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id"}).AddRow("reset-1", "user-1"))
	mock.ExpectExec(`(?s)UPDATE users SET password_hash`).
		WithArgs(sqlmock.AnyArg(), "user-1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`(?s)UPDATE password_reset_tokens SET used_at`).
		WithArgs("reset-1").WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectExec(`(?s)UPDATE password_reset_tokens SET revoked_at.*id <>`).
		WithArgs("user-1", "reset-1").WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	app := fiber.New()
	app.Post("/reset", handler.ResetPassword)
	request := httptest.NewRequest(http.MethodPost, "/reset", strings.NewReader(`{"token":"`+rawToken+`","new_password":"`+strongPassword+`","tenant_slug":"kinder-prueba"}`))
	request.Header.Set("Content-Type", "application/json")
	result, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if result.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(result.Body)
		t.Fatalf("first reset status=%d body=%s", result.StatusCode, body)
	}

	// A second request with the exact same raw token finds no active row.
	mock.ExpectBegin()
	mock.ExpectQuery(`(?s)SELECT prt.id, u.id.*FOR UPDATE`).
		WithArgs(tokenHash, "kinder-prueba").WillReturnError(errors.New("sql: no rows in result set"))
	mock.ExpectRollback()
	request = httptest.NewRequest(http.MethodPost, "/reset", strings.NewReader(`{"token":"`+rawToken+`","new_password":"`+strongPassword+`","tenant_slug":"kinder-prueba"}`))
	request.Header.Set("Content-Type", "application/json")
	result, err = app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	if result.StatusCode != http.StatusBadRequest {
		t.Fatalf("second reset status=%d, want 400", result.StatusCode)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestForgotPasswordDoesNotClaimDeliveryWhenUnconfigured(t *testing.T) {
	handler, _, closeDB := newMockHandler(t)
	defer closeDB()
	handler.resetSender = &resetSenderStub{configured: false}
	handler.appBaseURL = "https://onlineu.mx/educore"
	app := fiber.New()
	app.Post("/forgot", handler.ForgotPassword)
	request := httptest.NewRequest(http.MethodPost, "/forgot", strings.NewReader(`{"email":"known@example.test"}`))
	request.Header.Set("Content-Type", "application/json")
	result, err := app.Test(request)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(result.Body)
	if result.StatusCode != http.StatusServiceUnavailable || strings.Contains(strings.ToLower(string(body)), "enviado") {
		t.Fatalf("status=%d body=%s", result.StatusCode, body)
	}
}

func TestForgotPasswordUsesSamePublicResponseForUnknownAccountAndDeliveryFailure(t *testing.T) {
	handler, mock, closeDB := newMockHandler(t)
	defer closeDB()
	handler.resetSender = &resetSenderStub{configured: true, err: errors.New("provider unavailable")}
	handler.appBaseURL = "https://onlineu.mx/educore"
	app := fiber.New()
	app.Post("/forgot", handler.ForgotPassword)

	mock.ExpectQuery(`(?s)SELECT u.id, COALESCE.*FROM users u`).
		WithArgs("unknown@example.test", "kinder-prueba").WillReturnError(sql.ErrNoRows)
	unknownRequest := httptest.NewRequest(http.MethodPost, "/forgot", strings.NewReader(`{"email":"unknown@example.test","tenant_slug":"kinder-prueba"}`))
	unknownRequest.Header.Set("Content-Type", "application/json")
	unknownResult, err := app.Test(unknownRequest)
	if err != nil {
		t.Fatal(err)
	}

	mock.ExpectQuery(`(?s)SELECT u.id, COALESCE.*FROM users u`).
		WithArgs("known@example.test", "kinder-prueba").
		WillReturnRows(sqlmock.NewRows([]string{"id", "tenant_id", "email", "first_name", "last_name"}).
			AddRow("user-1", "tenant-1", "known@example.test", "Known", "User"))
	mock.ExpectBegin()
	mock.ExpectExec(`UPDATE password_reset_tokens SET revoked_at`).WithArgs("user-1").WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectQuery(`(?s)INSERT INTO password_reset_tokens .*RETURNING id`).
		WithArgs("user-1", "tenant-1", sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow("reset-1"))
	mock.ExpectCommit()
	mock.ExpectExec(`(?s)UPDATE password_reset_tokens SET revoked_at.*delivered_at IS NULL`).
		WithArgs("reset-1").WillReturnResult(sqlmock.NewResult(0, 1))
	knownRequest := httptest.NewRequest(http.MethodPost, "/forgot", strings.NewReader(`{"email":"known@example.test","tenant_slug":"kinder-prueba"}`))
	knownRequest.Header.Set("Content-Type", "application/json")
	knownResult, err := app.Test(knownRequest)
	if err != nil {
		t.Fatal(err)
	}

	var unknownPayload, knownPayload struct {
		Success bool   `json:"success"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(unknownResult.Body).Decode(&unknownPayload); err != nil {
		t.Fatal(err)
	}
	if err := json.NewDecoder(knownResult.Body).Decode(&knownPayload); err != nil {
		t.Fatal(err)
	}
	if unknownResult.StatusCode != http.StatusOK || knownResult.StatusCode != http.StatusOK ||
		!unknownPayload.Success || !knownPayload.Success || unknownPayload.Message != knownPayload.Message ||
		unknownPayload.Message != genericRecoveryMessage {
		t.Fatalf("responses differ: unknown=%+v known=%+v", unknownPayload, knownPayload)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestPasswordResetExpiryIsShortLived(t *testing.T) {
	if passwordResetLifetime > 30*time.Minute {
		t.Fatalf("password reset lifetime = %s", passwordResetLifetime)
	}
}
