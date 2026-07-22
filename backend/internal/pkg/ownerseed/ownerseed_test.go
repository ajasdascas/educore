package ownerseed

import (
	"os"
	"strings"
	"testing"
)

func TestOwnerSeedSourceIsCreateOnly(t *testing.T) {
	source, err := os.ReadFile("ownerseed.go")
	if err != nil {
		t.Fatalf("read ownerseed source: %v", err)
	}
	text := string(source)
	for _, forbidden := range []string{"ON DUPLICATE KEY UPDATE", "DO UPDATE SET", "deleted_at = NULL"} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("owner seed must not mutate existing accounts; found %q", forbidden)
		}
	}
	if !strings.Contains(text, "DO NOTHING") || !strings.Contains(text, "INSERT IGNORE") {
		t.Fatal("owner seed must use create-only conflict handling for PostgreSQL and MySQL")
	}
}

func TestProductionOwnerPasswordMinimum(t *testing.T) {
	if got := minimumOwnerPasswordLength("production"); got < 12 {
		t.Fatalf("production owner password minimum is too weak: %d", got)
	}
}
