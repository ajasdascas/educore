package database

import (
	"fmt"
	"regexp"
	"strings"
)

type Dialect string

const (
	DialectPostgres Dialect = "postgres"
	DialectMySQL    Dialect = "mysql"
)

var postgresPlaceholderPattern = regexp.MustCompile(`\$(\d+)`)

func NormalizeDialect(driver string) Dialect {
	if IsMySQL(driver) {
		return DialectMySQL
	}
	return DialectPostgres
}

func Placeholder(driver string, index int) string {
	if index <= 0 {
		index = 1
	}
	if IsMySQL(driver) {
		return "?"
	}
	return fmt.Sprintf("$%d", index)
}

func RebindPlaceholders(driver, query string) string {
	if !IsMySQL(driver) {
		return query
	}
	return postgresPlaceholderPattern.ReplaceAllString(query, "?")
}

func RequireTenantID(tenantID string) error {
	if strings.TrimSpace(tenantID) == "" {
		return fmt.Errorf("tenant_id is required and must be derived from authenticated context")
	}
	return nil
}

func MySQLRuntimeReady(enabled bool, pending []string) error {
	if !enabled {
		return nil
	}
	if len(pending) == 0 {
		return nil
	}
	return fmt.Errorf("DB_DRIVER=mysql is blocked until these PostgreSQL-specific modules are ported: %s", strings.Join(pending, ", "))
}
