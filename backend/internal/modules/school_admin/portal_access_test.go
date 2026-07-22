package school_admin

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func TestGeneratePortalPasswordIsRandomAndStrong(t *testing.T) {
	first, err := generatePortalPassword()
	if err != nil {
		t.Fatalf("generatePortalPassword() error = %v", err)
	}
	second, err := generatePortalPassword()
	if err != nil {
		t.Fatalf("generatePortalPassword() second error = %v", err)
	}

	if first == second {
		t.Fatal("generatePortalPassword() returned the same credential twice")
	}
	if len(first) < 24 {
		t.Fatalf("generated password length = %d, want at least 24", len(first))
	}
	if !strings.HasPrefix(first, "Ec!7") {
		t.Fatalf("generated password %q does not include the required complexity prefix", first)
	}
}

func TestOneTimePortalCredentialResponsesCannotBeCached(t *testing.T) {
	app := fiber.New()
	app.Get("/credential", func(c *fiber.Ctx) error {
		markOneTimeCredentialResponse(c)
		return c.JSON(fiber.Map{"password": "one-time"})
	})
	result, err := app.Test(httptest.NewRequest(http.MethodGet, "/credential", nil))
	if err != nil {
		t.Fatal(err)
	}
	if result.Header.Get("Cache-Control") != "no-store, max-age=0" || result.Header.Get("Pragma") != "no-cache" || result.Header.Get("Expires") != "0" {
		t.Fatalf("unsafe cache headers: Cache-Control=%q Pragma=%q Expires=%q", result.Header.Get("Cache-Control"), result.Header.Get("Pragma"), result.Header.Get("Expires"))
	}
}

func TestGeneratePortalCredentialProducesUsableHash(t *testing.T) {
	password, hash, err := generatePortalCredential()
	if err != nil {
		t.Fatalf("generatePortalCredential() error = %v", err)
	}
	if password == hash || strings.Contains(hash, password) {
		t.Fatal("generated credential was not one-way hashed")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		t.Fatalf("generated hash does not match its temporary password: %v", err)
	}
}

func TestPortalPasswordConfigured(t *testing.T) {
	tests := []struct {
		name string
		hash sql.NullString
		want bool
	}{
		{name: "null", hash: sql.NullString{}, want: false},
		{name: "empty", hash: sql.NullString{String: "", Valid: true}, want: false},
		{name: "whitespace", hash: sql.NullString{String: "  ", Valid: true}, want: false},
		{name: "bcrypt", hash: sql.NullString{String: "$2a$10$configured", Valid: true}, want: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := portalPasswordConfigured(test.hash); got != test.want {
				t.Fatalf("portalPasswordConfigured(%#v) = %v, want %v", test.hash, got, test.want)
			}
		})
	}
}

func TestIsUniqueConflict(t *testing.T) {
	if !isUniqueConflict(assertionError("Duplicate entry")) {
		t.Fatal("duplicate database errors must be classified as conflicts")
	}
	if isUniqueConflict(assertionError("connection refused")) {
		t.Fatal("non-unique database errors must not be classified as conflicts")
	}
}

type assertionError string

func (e assertionError) Error() string { return string(e) }
