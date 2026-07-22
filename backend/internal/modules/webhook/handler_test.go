package webhook

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestGitHubWebhookFailsClosedWithoutConfiguration(t *testing.T) {
	t.Setenv("GITHUB_WEBHOOK_SECRET", "")
	t.Setenv("GITHUB_WEBHOOK_REPOSITORY", "")
	app := fiber.New()
	app.Post("/github", NewHandler(nil).HandleGitHubPush)

	request := httptest.NewRequest(fiber.MethodPost, "/github", strings.NewReader(`{"ref":"refs/heads/main"}`))
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("expected 503 when webhook is unconfigured, got %d", response.StatusCode)
	}
}

func TestGitHubWebhookRejectsInvalidSignatureBeforeDatabaseAccess(t *testing.T) {
	t.Setenv("GITHUB_WEBHOOK_SECRET", "a-test-secret-that-is-not-used-in-production")
	t.Setenv("GITHUB_WEBHOOK_REPOSITORY", "owner/repository")
	app := fiber.New()
	app.Post("/github", NewHandler(nil).HandleGitHubPush)

	request := httptest.NewRequest(fiber.MethodPost, "/github", strings.NewReader(`{"ref":"refs/heads/main"}`))
	request.Header.Set("X-Hub-Signature-256", "sha256=invalid")
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected 401 for invalid signature, got %d", response.StatusCode)
	}
}
