package student

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

func readStudentSource(t *testing.T, name string) string {
	t.Helper()
	content, err := os.ReadFile(name)
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}

func TestStudentRepositoryUsesPostgresContracts(t *testing.T) {
	source := readStudentSource(t, "repository.go")
	for _, forbidden := range []string{`(?i)DATE_FORMAT\s*\(`, `(?i)TIME_FORMAT\s*\(`, `(?i)FIELD\s*\(`} {
		if regexp.MustCompile(forbidden).MatchString(source) {
			t.Fatalf("student repository contains MySQL-only SQL matching %q", forbidden)
		}
	}
	for _, required := range []string{
		"TO_CHAR(gr.created_at, 'YYYY-MM-DD')",
		"TO_CHAR(pm.created_at, 'YYYY-MM-DD HH24:MI')",
		"TO_CHAR(csb.start_time, 'HH24:MI')",
		"ORDER BY CASE LOWER(csb.day)",
		"ORDER BY gs.enrolled_at DESC NULLS LAST",
		"COALESCE(n.message, n.body, '')",
		"WHERE n.user_id = $1 AND n.tenant_id = $2",
	} {
		if !strings.Contains(source, required) {
			t.Errorf("student PostgreSQL contract missing %q", required)
		}
	}
}

func TestStudentReadsFailClosed(t *testing.T) {
	repository := readStudentSource(t, "repository.go")
	service := readStudentSource(t, "service.go")
	for _, forbidden := range []string{
		`(?s)if err := rows\.Scan\([^}]+\); err != nil \{\s*continue`,
		`return \[\][A-Za-z]+\{\}, nil`,
		`return &AttendanceSummary\{\}, nil`,
	} {
		if regexp.MustCompile(forbidden).MatchString(repository) {
			t.Fatalf("student repository still swallows a database error matching %q", forbidden)
		}
	}
	for _, forbidden := range []string{"grades, _ :=", "attendance, _ :=", "RecentMessages: []MessageSummary{}"} {
		if strings.Contains(service, forbidden) {
			t.Fatalf("student dashboard still fabricates or ignores data via %q", forbidden)
		}
	}
}
