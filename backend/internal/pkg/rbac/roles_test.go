package rbac

import "testing"

func TestValidateScope(t *testing.T) {
	tests := []struct {
		name     string
		role     string
		tenantID string
		wantErr  bool
	}{
		{name: "global super admin", role: RoleSuperAdmin},
		{name: "super admin cannot belong to tenant", role: RoleSuperAdmin, tenantID: "tenant-a", wantErr: true},
		{name: "school admin requires tenant", role: RoleSchoolAdmin, wantErr: true},
		{name: "teacher tenant scope", role: RoleTeacher, tenantID: "tenant-a"},
		{name: "unknown role", role: "OWNER", tenantID: "tenant-a", wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := ValidateScope(test.role, test.tenantID)
			if (err != nil) != test.wantErr {
				t.Fatalf("ValidateScope() error = %v, wantErr %v", err, test.wantErr)
			}
		})
	}
}

func TestNormalizePermissionsRejectsEscalation(t *testing.T) {
	permissions, err := NormalizePermissions(RoleTeacher, []string{"grades:read", "grades:read", "attendance:write"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(permissions) != 2 {
		t.Fatalf("expected duplicate removal, got %v", permissions)
	}
	if _, err := NormalizePermissions(RoleTeacher, []string{"users:*"}); err == nil {
		t.Fatal("teacher must not receive school administrator permissions")
	}
	if _, err := NormalizePermissions(RoleParent, []string{"platform:*"}); err == nil {
		t.Fatal("parent must not receive global permissions")
	}
}

func TestAllowsWildcardsAndWriteImpliesRead(t *testing.T) {
	if !Allows([]string{"academic:*"}, "academic:write") {
		t.Fatal("resource wildcard should authorize matching action")
	}
	if !Allows([]string{"grades:write"}, "grades:read") {
		t.Fatal("write should imply read for the same resource")
	}
	if Allows([]string{"grades:read"}, "grades:write") {
		t.Fatal("read must not imply write")
	}
	if Allows([]string{"children:read"}, "children:read", "payments:read") {
		t.Fatal("required permissions are all-of; an unrelated permission must not bypass revocation")
	}
	if !Allows([]string{"children:read", "payments:read"}, "children:read", "payments:read") {
		t.Fatal("all required permissions should authorize the request")
	}
}

func TestResolvePermissionsPreservesEveryCustomizedSubset(t *testing.T) {
	legacyShapedCustom := ResolvePermissions(RoleTeacher, []string{"groups:read", "attendance:write", "grades:write"}, true)
	if len(legacyShapedCustom) != 3 || Allows(legacyShapedCustom, "communications:write") {
		t.Fatalf("legacy-shaped custom subset must round-trip without expansion: %v", legacyShapedCustom)
	}
	custom := ResolvePermissions(RoleTeacher, []string{"grades:read"}, true)
	if len(custom) != 1 || custom[0] != "grades:read" {
		t.Fatalf("custom subset must be preserved: %v", custom)
	}
	invalid := ResolvePermissions(RoleTeacher, []string{"platform:*"}, true)
	if len(invalid) != 0 {
		t.Fatalf("invalid stored policy must fail closed, got %v", invalid)
	}
}

func TestRequiredForRequestUsesExactGranularPermission(t *testing.T) {
	tests := []struct {
		name       string
		role       string
		method     string
		path       string
		permission string
	}{
		{name: "parent payments", role: RoleParent, method: "GET", path: "/api/v1/parent/payments", permission: "payments:read"},
		{name: "parent attendance", role: RoleParent, method: "GET", path: "/api/v1/parent/children/child-1/attendance", permission: "attendance:read"},
		{name: "student grades", role: RoleStudent, method: "GET", path: "/api/v1/student/grades", permission: "grades:read"},
		{name: "teacher grade write", role: RoleTeacher, method: "POST", path: "/api/v1/teacher/grades", permission: "grades:write"},
		{name: "school student write", role: RoleSchoolAdmin, method: "POST", path: "/api/v1/school-admin/academic/students", permission: "users:write"},
		{name: "school schedule write", role: RoleSchoolAdmin, method: "PUT", path: "/api/v1/school-admin/academic/schedule/slot-1", permission: "schedule:write"},
		{name: "report generation", role: RoleTeacher, method: "POST", path: "/api/v1/reports/generate", permission: "reports:write"},
		{name: "student notification read", role: RoleStudent, method: "GET", path: "/api/v1/communications/notifications", permission: "notifications:read"},
		{name: "parent message send", role: RoleParent, method: "POST", path: "/api/v1/communications/messages", permission: "messages:write"},
		{name: "parent bulk messaging denied", role: RoleParent, method: "POST", path: "/api/v1/communications/messages/bulk/send", permission: "communications:write"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			required := RequiredForRequest(test.role, test.method, test.path)
			if len(required) != 1 || required[0] != test.permission {
				t.Fatalf("required = %v, want [%s]", required, test.permission)
			}
			if !Allows([]string{test.permission}, required...) {
				t.Fatalf("exact permission %q should authorize %s", test.permission, test.path)
			}
			if Allows([]string{"children:read", "academic:*", "profile:read"}, required...) && test.permission != "children:read" && test.permission != "academic:read" && test.permission != "profile:read" {
				t.Fatalf("unrelated permissions bypassed %q", test.permission)
			}
		})
	}
}

func TestRequiredForRequestFailsClosedForUnknownTenantRoute(t *testing.T) {
	required := RequiredForRequest(RoleTeacher, "GET", "/api/v1/teacher/future-module")
	if len(required) != 1 || required[0] != "route:unmapped" {
		t.Fatalf("unknown tenant route must fail closed, got %v", required)
	}
}

func TestParentReportCardRequiresChildAndGradeAccess(t *testing.T) {
	required := RequiredForRequest(RoleParent, "GET", "/api/v1/parent/children/child-1/report-card")
	if len(required) != 2 || required[0] != "children:read" || required[1] != "grades:read" {
		t.Fatalf("required = %v, want children:read and grades:read", required)
	}
	if Allows([]string{"children:read"}, required...) {
		t.Fatal("children:read alone must not expose a report card")
	}
	if Allows([]string{"grades:read"}, required...) {
		t.Fatal("grades:read alone must not bypass the parent-child boundary")
	}
	if !Allows([]string{"children:read", "grades:read"}, required...) {
		t.Fatal("both permissions should authorize the linked child's report card")
	}
}
