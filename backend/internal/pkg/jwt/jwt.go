package jwt

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

type Claims struct {
	UserID      string `json:"sub"`
	TenantID    string `json:"tenant_id,omitempty"`
	Role        string `json:"role"`
	Email       string `json:"email"`
	AuthVersion int    `json:"auth_version"`
	TokenType   string `json:"token_type"`
	jwt.RegisteredClaims
}

func GenerateToken(userID, tenantID, role, email string, authVersion int, tokenType, secret string, duration time.Duration) (string, error) {
	if tokenType != TokenTypeAccess && tokenType != TokenTypeRefresh {
		return "", fmt.Errorf("invalid token type")
	}
	claims := Claims{
		UserID:      userID,
		TenantID:    tenantID,
		Role:        role,
		Email:       email,
		AuthVersion: authVersion,
		TokenType:   tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateToken(tokenString, secret, expectedType string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	if claims.TokenType == "" || claims.TokenType != expectedType {
		return nil, errors.New("invalid token type")
	}

	return claims, nil
}
