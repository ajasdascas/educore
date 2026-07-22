package superadmin

import (
	"encoding/json"
	"regexp"
	"testing"

	"educore/internal/pkg/rbac"
)

func TestGenerateSchoolAdminPasswordIsStrongAndUnique(t *testing.T) {
	pattern := regexp.MustCompile(`^Ec1![0-9a-f]{32}$`)
	seen := make(map[string]struct{})

	for i := 0; i < 16; i++ {
		password, err := generateSchoolAdminPassword()
		if err != nil {
			t.Fatalf("generateSchoolAdminPassword() error = %v", err)
		}
		if !pattern.MatchString(password) {
			t.Fatalf("generated password does not satisfy the expected policy")
		}
		if _, duplicate := seen[password]; duplicate {
			t.Fatal("generated password was unexpectedly reused")
		}
		seen[password] = struct{}{}
	}
}

func TestProductionTenantRoleSeedsMatchRBACDefaults(t *testing.T) {
	seeds, err := productionTenantRoleSeeds()
	if err != nil {
		t.Fatalf("productionTenantRoleSeeds() error = %v", err)
	}
	if len(seeds) != 4 {
		t.Fatalf("got %d tenant roles, want 4", len(seeds))
	}
	for _, seed := range seeds {
		var permissions []string
		if err := json.Unmarshal([]byte(seed.Permissions), &permissions); err != nil {
			t.Fatalf("role %s permissions are not JSON: %v", seed.Key, err)
		}
		var matched bool
		for _, definition := range rbac.Definitions() {
			if definition.TenantRoleKey == seed.Key {
				matched = true
				if len(permissions) != len(definition.DefaultPermissions) {
					t.Fatalf("role %s seed has %d permissions, want %d", seed.Key, len(permissions), len(definition.DefaultPermissions))
				}
			}
		}
		if !matched {
			t.Fatalf("role seed %s has no RBAC definition", seed.Key)
		}
	}
}
