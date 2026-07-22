package config

import (
	"strings"
	"testing"
)

func TestConfigValidateProductionJWTSecret(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		appEnv  string
		secret  string
		wantErr bool
	}{
		{name: "missing", appEnv: "production", secret: "", wantErr: true},
		{name: "whitespace only", appEnv: "production", secret: "    ", wantErr: true},
		{name: "development fallback", appEnv: "production", secret: defaultDevelopmentJWTSecret, wantErr: true},
		{name: "development fallback case insensitive", appEnv: "production", secret: "SUPER-SECRET-DEV-KEY", wantErr: true},
		{name: "repository deployment placeholder", appEnv: "production", secret: "tu-jwt-secret-super-ultra-seguro-512-bits", wantErr: true},
		{name: "31 bytes", appEnv: "production", secret: strings.Repeat("x", 31), wantErr: true},
		{name: "32 bytes", appEnv: "production", secret: strings.Repeat("x", 32)},
		{name: "minimum is bytes", appEnv: "production", secret: strings.Repeat("\u00e1", 16)},
		{name: "production is normalized", appEnv: " Production ", secret: strings.Repeat("x", 32)},
		{name: "prod alias is protected", appEnv: "prod", secret: defaultDevelopmentJWTSecret, wantErr: true},
		{name: "development retains fallback", appEnv: "development", secret: defaultDevelopmentJWTSecret},
		{name: "test retains fallback", appEnv: "test", secret: defaultDevelopmentJWTSecret},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := (&Config{AppEnv: tt.appEnv, JWTSecret: tt.secret}).Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestLoadFailsClosedForProductionPlaceholder(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("JWT_SECRET", defaultDevelopmentJWTSecret)

	cfg, err := Load()
	if err == nil {
		t.Fatal("Load() error = nil, want insecure production JWT error")
	}
	if cfg != nil {
		t.Fatalf("Load() config = %#v, want nil on validation failure", cfg)
	}
}

func TestConfigValidateDoesNotLeakJWTSecret(t *testing.T) {
	t.Parallel()

	secret := "short-production-secret"
	err := (&Config{AppEnv: "production", JWTSecret: secret}).Validate()
	if err == nil {
		t.Fatal("Validate() error = nil, want weak-secret error")
	}
	if strings.Contains(err.Error(), secret) {
		t.Fatalf("validation error leaked JWT secret: %q", err)
	}
}
