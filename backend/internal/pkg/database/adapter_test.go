package database

import "testing"

func TestNormalizeDriver(t *testing.T) {
	tests := map[string]string{
		"":           "postgres",
		"postgres":   "postgres",
		"postgresql": "postgres",
		"pg":         "postgres",
		"mysql":      "mysql",
		"mariadb":    "mysql",
		" MySQL ":    "mysql",
	}

	for input, want := range tests {
		if got := NormalizeDriver(input); got != want {
			t.Fatalf("NormalizeDriver(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestIsMySQL(t *testing.T) {
	if !IsMySQL("mariadb") {
		t.Fatal("mariadb should be treated as MySQL-compatible")
	}
	if IsMySQL("postgres") {
		t.Fatal("postgres should not be treated as MySQL")
	}
}

func TestPlaceholder(t *testing.T) {
	if got := Placeholder("postgres", 3); got != "$3" {
		t.Fatalf("postgres placeholder = %q", got)
	}
	if got := Placeholder("mysql", 3); got != "?" {
		t.Fatalf("mysql placeholder = %q", got)
	}
}

func TestRebindPlaceholders(t *testing.T) {
	query := "SELECT * FROM users WHERE tenant_id = $1 AND email = $2 LIMIT $3"
	got := RebindPlaceholders("mysql", query)
	want := "SELECT * FROM users WHERE tenant_id = ? AND email = ? LIMIT ?"
	if got != want {
		t.Fatalf("RebindPlaceholders mysql = %q, want %q", got, want)
	}
	if got := RebindPlaceholders("postgres", query); got != query {
		t.Fatalf("RebindPlaceholders postgres changed query: %q", got)
	}
}

func TestRequireTenantID(t *testing.T) {
	if err := RequireTenantID(""); err == nil {
		t.Fatal("empty tenant_id should fail")
	}
	if err := RequireTenantID("tenant-1"); err != nil {
		t.Fatalf("tenant id should pass: %v", err)
	}
}

func TestGlobalTenantKey(t *testing.T) {
	if got := GlobalTenantKey(""); got != "__global__" {
		t.Fatalf("empty global tenant key = %q", got)
	}
	if got := GlobalTenantKey(" tenant-1 "); got != "tenant-1" {
		t.Fatalf("tenant global key = %q", got)
	}
}

func TestMySQLRuntimeReady(t *testing.T) {
	if err := MySQLRuntimeReady(false, []string{"auth"}); err != nil {
		t.Fatalf("postgres mode should not be blocked: %v", err)
	}
	if err := MySQLRuntimeReady(true, nil); err != nil {
		t.Fatalf("mysql mode without pending modules should pass: %v", err)
	}
	if err := MySQLRuntimeReady(true, []string{"auth"}); err == nil {
		t.Fatal("mysql mode with pending modules should fail closed")
	}
}
