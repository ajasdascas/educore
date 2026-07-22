package main

import "testing"

func TestIsAllowedBrowserOrigin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		origin  string
		allowed bool
	}{
		{name: "main domain", origin: "https://onlineu.mx", allowed: true},
		{name: "www domain", origin: "https://www.onlineu.mx", allowed: true},
		{name: "local development", origin: "http://localhost:3000", allowed: true},
		{name: "valid school", origin: "https://kinder-prueba.onlineu.mx", allowed: true},
		{name: "reserved school label", origin: "https://api.onlineu.mx", allowed: false},
		{name: "nested school label", origin: "https://grupo.kinder.onlineu.mx", allowed: false},
		{name: "insecure school origin", origin: "http://kinder-prueba.onlineu.mx", allowed: false},
		{name: "explicit port", origin: "https://kinder-prueba.onlineu.mx:443", allowed: false},
		{name: "path is not an origin", origin: "https://kinder-prueba.onlineu.mx/educore", allowed: false},
		{name: "lookalike suffix", origin: "https://kinder-prueba.onlineu.mx.attacker.example", allowed: false},
		{name: "credentials trick", origin: "https://kinder-prueba.onlineu.mx@attacker.example", allowed: false},
		{name: "invalid double hyphen", origin: "https://kinder--prueba.onlineu.mx", allowed: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := isAllowedBrowserOrigin(tt.origin); got != tt.allowed {
				t.Fatalf("isAllowedBrowserOrigin(%q) = %v, want %v", tt.origin, got, tt.allowed)
			}
		})
	}
}

func TestResolvePublicSchoolSlug(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		rawSlug  string
		rawHost  string
		wantSlug string
		valid    bool
	}{
		{name: "explicit slug", rawSlug: " Kinder-Prueba ", wantSlug: "kinder-prueba", valid: true},
		{name: "valid host", rawHost: "KINDER-PRUEBA.ONLINEU.MX.", wantSlug: "kinder-prueba", valid: true},
		{name: "foreign host", rawHost: "kinder-prueba.attacker.example", valid: false},
		{name: "nested host", rawHost: "grupo.kinder-prueba.onlineu.mx", valid: false},
		{name: "reserved host", rawHost: "api.onlineu.mx", valid: false},
		{name: "invalid explicit slug does not fall back", rawSlug: "api", rawHost: "kinder-prueba.onlineu.mx", valid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			gotSlug, gotValid := resolvePublicSchoolSlug(tt.rawSlug, tt.rawHost)
			if gotSlug != tt.wantSlug || gotValid != tt.valid {
				t.Fatalf("resolvePublicSchoolSlug(%q, %q) = (%q, %v), want (%q, %v)", tt.rawSlug, tt.rawHost, gotSlug, gotValid, tt.wantSlug, tt.valid)
			}
		})
	}
}

func TestPublicModuleExposureIsFailClosed(t *testing.T) {
	t.Parallel()
	for _, moduleKey := range []string{"auth", "academic_core", "schedules", "attendance"} {
		if !isPublicProductionModuleKey(moduleKey) {
			t.Fatalf("expected audited module %q to be public", moduleKey)
		}
	}
	for _, moduleKey := range []string{"documents", "communications", "payments", "qr_access", "made_up"} {
		if isPublicProductionModuleKey(moduleKey) {
			t.Fatalf("unaudited module %q must stay hidden", moduleKey)
		}
	}
}
