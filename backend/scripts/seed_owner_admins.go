//go:build ignore

package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

const defaultOwnerEmails = "gioescudero2007@gmail.com,jagustin_ramosp@hotmail.com"

func main() {
	driver := normalizeDriver(env("DB_DRIVER", "postgres"))
	emails := parseEmails(env("EDUCORE_OWNER_ADMIN_EMAILS", defaultOwnerEmails))
	password := os.Getenv("EDUCORE_OWNER_ADMIN_PASSWORD")
	if len(password) < 12 {
		log.Fatal("EDUCORE_OWNER_ADMIN_PASSWORD is required and must be at least 12 characters")
	}
	if len(emails) == 0 {
		log.Fatal("EDUCORE_OWNER_ADMIN_EMAILS must include at least one owner email")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("hash owner password: %v", err)
	}

	db, err := openDB(driver)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("ping %s: %v", driver, err)
	}

	for _, email := range emails {
		if err := upsertOwner(ctx, db, driver, email, string(hash)); err != nil {
			log.Fatalf("seed owner %s: %v", email, err)
		}
		fmt.Printf("Owner SuperAdmin ready: %s\n", email)
	}
}

func openDB(driver string) (*sql.DB, error) {
	switch driver {
	case "mysql":
		dsn := os.Getenv("MYSQL_DSN")
		if strings.TrimSpace(dsn) == "" {
			return nil, fmt.Errorf("MYSQL_DSN is required when DB_DRIVER=mysql")
		}
		return sql.Open("mysql", dsn)
	case "postgres":
		dsn := firstNonEmpty(os.Getenv("POSTGRES_DSN"), os.Getenv("DATABASE_URL"))
		if strings.TrimSpace(dsn) == "" {
			return nil, fmt.Errorf("POSTGRES_DSN or DATABASE_URL is required when DB_DRIVER=postgres")
		}
		return sql.Open("postgres", dsn)
	default:
		return nil, fmt.Errorf("unsupported DB_DRIVER %q", driver)
	}
}

func upsertOwner(ctx context.Context, db *sql.DB, driver, email, hash string) error {
	firstName, lastName := ownerName(email)
	id := uuidV4()

	switch driver {
	case "mysql":
		_, err := db.ExecContext(ctx, `
			INSERT INTO users (
				id, tenant_id, email, password_hash, first_name, last_name, role,
				is_active, password_must_change, email_verified_at, created_at, updated_at
			)
			VALUES (?, NULL, ?, ?, ?, ?, 'SUPER_ADMIN', TRUE, FALSE, NOW(), NOW(), NOW())
			ON DUPLICATE KEY UPDATE
				password_hash = VALUES(password_hash),
				first_name = VALUES(first_name),
				last_name = VALUES(last_name),
				role = 'SUPER_ADMIN',
				is_active = TRUE,
				password_must_change = FALSE,
				email_verified_at = COALESCE(email_verified_at, NOW()),
				deleted_at = NULL,
				updated_at = NOW()
		`, id, email, hash, firstName, lastName)
		return err
	default:
		_, err := db.ExecContext(ctx, `
			INSERT INTO users (
				id, tenant_id, email, password_hash, first_name, last_name, role,
				is_active, password_must_change, email_verified_at, created_at, updated_at, deleted_at
			)
			VALUES ($1, NULL, $2, $3, $4, $5, 'SUPER_ADMIN', TRUE, FALSE, NOW(), NOW(), NOW(), NULL)
			ON CONFLICT (LOWER(email)) WHERE tenant_id IS NULL
			DO UPDATE SET
				password_hash = EXCLUDED.password_hash,
				first_name = EXCLUDED.first_name,
				last_name = EXCLUDED.last_name,
				role = 'SUPER_ADMIN',
				is_active = TRUE,
				password_must_change = FALSE,
				email_verified_at = COALESCE(users.email_verified_at, NOW()),
				deleted_at = NULL,
				updated_at = NOW()
		`, id, email, hash, firstName, lastName)
		return err
	}
}

func ownerName(email string) (string, string) {
	switch strings.ToLower(strings.TrimSpace(email)) {
	case "gioescudero2007@gmail.com":
		return "Giovanni", "Escudero"
	case "jagustin_ramosp@hotmail.com":
		return "J. Agustin", "Ramos"
	default:
		local := strings.Split(email, "@")[0]
		parts := strings.FieldsFunc(local, func(r rune) bool {
			return r == '.' || r == '_' || r == '-'
		})
		if len(parts) == 0 {
			return "Owner", "Admin"
		}
		first := strings.Title(parts[0])
		last := "Admin"
		if len(parts) > 1 {
			last = strings.Title(strings.Join(parts[1:], " "))
		}
		return first, last
	}
}

func uuidV4() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	hexed := hex.EncodeToString(b[:])
	return fmt.Sprintf("%s-%s-%s-%s-%s", hexed[0:8], hexed[8:12], hexed[12:16], hexed[16:20], hexed[20:32])
}

func parseEmails(raw string) []string {
	seen := map[string]bool{}
	var emails []string
	for _, item := range strings.Split(raw, ",") {
		email := strings.ToLower(strings.TrimSpace(item))
		if email == "" || seen[email] {
			continue
		}
		seen[email] = true
		emails = append(emails, email)
	}
	return emails
}

func normalizeDriver(driver string) string {
	switch strings.ToLower(strings.TrimSpace(driver)) {
	case "", "postgres", "postgresql", "pg":
		return "postgres"
	case "mysql", "mariadb":
		return "mysql"
	default:
		return strings.ToLower(strings.TrimSpace(driver))
	}
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
