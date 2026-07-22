package jwt

import (
	"testing"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
)

func TestGenerateTokenCarriesAuthenticationVersion(t *testing.T) {
	const secret = "test-secret-with-enough-entropy"
	token, err := GenerateToken("user-1", "tenant-1", "TEACHER", "teacher@example.test", 7, TokenTypeAccess, secret, time.Minute)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	claims, err := ValidateToken(token, secret, TokenTypeAccess)
	if err != nil {
		t.Fatalf("ValidateToken() error = %v", err)
	}
	if claims.AuthVersion != 7 {
		t.Fatalf("AuthVersion = %d, want 7", claims.AuthVersion)
	}
	if _, err := ValidateToken(token, secret, TokenTypeRefresh); err == nil {
		t.Fatal("access token must not validate as refresh token")
	}
}

func TestValidateTokenRejectsUnexpectedSigningMethod(t *testing.T) {
	claims := Claims{
		UserID: "user-1", Role: "TEACHER", Email: "teacher@example.test",
		AuthVersion: 1, TokenType: TokenTypeAccess,
		RegisteredClaims: jwtlib.RegisteredClaims{ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(time.Minute))},
	}
	token, err := jwtlib.NewWithClaims(jwtlib.SigningMethodHS512, claims).SignedString([]byte("test-secret"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ValidateToken(token, "test-secret", TokenTypeAccess); err == nil {
		t.Fatal("HS512 token must be rejected when only HS256 is configured")
	}
}

func TestRefreshTokenCannotBeUsedAsAccessToken(t *testing.T) {
	const secret = "test-secret-with-enough-entropy"
	token, err := GenerateToken("user-1", "tenant-1", "TEACHER", "teacher@example.test", 7, TokenTypeRefresh, secret, time.Minute)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ValidateToken(token, secret, TokenTypeAccess); err == nil {
		t.Fatal("refresh token must not validate as access token")
	}
	if _, err := ValidateToken(token, secret, TokenTypeRefresh); err != nil {
		t.Fatalf("refresh token rejected as refresh token: %v", err)
	}
}
