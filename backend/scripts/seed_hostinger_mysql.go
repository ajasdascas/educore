//go:build ignore

package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		log.Fatal("MYSQL_DSN is required")
	}

	email := env("EDUCORE_SEED_ADMIN_EMAIL", "admin@educore.mx")
	password := os.Getenv("EDUCORE_SEED_ADMIN_PASSWORD")
	if len(password) < 12 {
		log.Fatal("EDUCORE_SEED_ADMIN_PASSWORD is required and must be at least 12 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("hash password: %v", err)
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("open mysql: %v", err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("ping mysql: %v", err)
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO users (
			id, tenant_id, email, password_hash, first_name, last_name, role,
			is_active, password_must_change, email_verified_at, global_tenant_key, created_at, updated_at
		)
		VALUES (UUID(), NULL, ?, ?, 'Giovanni', 'SuperAdmin', 'SUPER_ADMIN', TRUE, TRUE, NOW(), '__global__', NOW(), NOW())
		ON DUPLICATE KEY UPDATE
			password_hash = VALUES(password_hash),
			is_active = TRUE,
			password_must_change = TRUE,
			global_tenant_key = '__global__',
			updated_at = NOW()
	`, email, string(hash))
	if err != nil {
		log.Fatalf("seed super admin: %v", err)
	}

	fmt.Printf("Seed OK. SuperAdmin %s created/updated with temporary password and password_must_change=true\n", email)
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
