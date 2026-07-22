package auth

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
)

func TestAuthRateLimiterEnforcesSubjectLimitWithoutAccountLookup(t *testing.T) {
	clock := time.Date(2026, 7, 21, 12, 0, 0, 0, time.UTC)
	limiter := newAuthRateLimiter(nil)
	limiter.now = func() time.Time { return clock }
	rule := authRateLimitRule{
		name: "login", ipLimit: 100, subjectLimit: 2, window: time.Minute, subject: loginRateLimitSubject,
	}
	app := fiber.New()
	app.Post("/login", limiter.middleware(rule), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})

	request := func(email string) *http.Request {
		req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(`{"email":"`+email+`","tenant_slug":"school-a"}`))
		req.Header.Set("Content-Type", "application/json")
		return req
	}
	for attempt := 1; attempt <= 2; attempt++ {
		result, err := app.Test(request("user@example.test"))
		if err != nil || result.StatusCode != fiber.StatusNoContent {
			t.Fatalf("attempt %d status=%d err=%v", attempt, result.StatusCode, err)
		}
	}
	result, err := app.Test(request("user@example.test"))
	if err != nil {
		t.Fatal(err)
	}
	if result.StatusCode != fiber.StatusTooManyRequests || result.Header.Get(fiber.HeaderRetryAfter) != "60" {
		t.Fatalf("status=%d retry-after=%q", result.StatusCode, result.Header.Get(fiber.HeaderRetryAfter))
	}
	var payload struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(result.Body).Decode(&payload); err != nil || payload.Code != "RATE_LIMITED" {
		t.Fatalf("payload=%+v err=%v", payload, err)
	}

	// A different subject is not classified as an existing or missing account;
	// it receives the same fixed-window policy without consulting the database.
	result, err = app.Test(request("other@example.test"))
	if err != nil || result.StatusCode != fiber.StatusNoContent {
		t.Fatalf("different subject status=%d err=%v", result.StatusCode, err)
	}

	clock = clock.Add(time.Minute + time.Second)
	result, err = app.Test(request("user@example.test"))
	if err != nil || result.StatusCode != fiber.StatusNoContent {
		t.Fatalf("expired window status=%d err=%v", result.StatusCode, err)
	}
}

func TestAuthRateLimiterAlsoEnforcesIPLimitAcrossSubjects(t *testing.T) {
	limiter := newAuthRateLimiter(nil)
	rule := authRateLimitRule{
		name: "forgot", ipLimit: 2, subjectLimit: 100, window: time.Minute, subject: forgotRateLimitSubject,
	}
	app := fiber.New()
	app.Post("/forgot", limiter.middleware(rule), func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusNoContent)
	})
	for attempt, email := range []string{"one@example.test", "two@example.test", "three@example.test"} {
		request := httptest.NewRequest(http.MethodPost, "/forgot", strings.NewReader(`{"email":"`+email+`"}`))
		request.Header.Set("Content-Type", "application/json")
		result, err := app.Test(request)
		if err != nil {
			t.Fatal(err)
		}
		want := fiber.StatusNoContent
		if attempt == 2 {
			want = fiber.StatusTooManyRequests
		}
		if result.StatusCode != want {
			t.Fatalf("attempt %d status=%d, want %d", attempt+1, result.StatusCode, want)
		}
	}
}

func TestAuthRateLimitConfigUsesSafeDefaultsForInvalidOverrides(t *testing.T) {
	t.Setenv("AUTH_RATE_LIMIT_WINDOW", "0s")
	t.Setenv("AUTH_LOGIN_SUBJECT_LIMIT", "0")
	t.Setenv("AUTH_FORGOT_SUBJECT_LIMIT", "not-a-number")
	config := loadAuthRateLimitConfig()
	if config.Window != 15*time.Minute || config.LoginSubjectLimit != 10 || config.ForgotSubjectLimit != 5 {
		t.Fatalf("unsafe fallback config: %+v", config)
	}
}
