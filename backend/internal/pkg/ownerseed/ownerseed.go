package ownerseed

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"strings"

	"educore/internal/pkg/database"
	"golang.org/x/crypto/bcrypt"
)

const defaultOwnerEmails = "gioescudero2007@gmail.com,jagustin_ramosp@hotmail.com"

func SeedFromEnv(ctx context.Context, db *database.DB, appEnv string) error {
	if !shouldSeed(appEnv) {
		return nil
	}

	emails := parseEmails(env("EDUCORE_OWNER_ADMIN_EMAILS", defaultOwnerEmails))
	password := os.Getenv("EDUCORE_OWNER_ADMIN_PASSWORD")
	if strings.TrimSpace(password) == "" {
		log.Println("Owner SuperAdmin seed skipped: EDUCORE_OWNER_ADMIN_PASSWORD is not configured")
		return nil
	}
	if len(password) < 12 {
		return fmt.Errorf("EDUCORE_OWNER_ADMIN_PASSWORD must be at least 12 characters")
	}
	if len(emails) == 0 {
		return fmt.Errorf("EDUCORE_OWNER_ADMIN_EMAILS must include at least one owner email")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash owner password: %w", err)
	}

	for _, email := range emails {
		if err := upsertOwner(ctx, db, email, string(hash)); err != nil {
			return fmt.Errorf("seed owner %s: %w", email, err)
		}
		log.Printf("Owner SuperAdmin ready: %s", email)
	}
	return nil
}

func shouldSeed(appEnv string) bool {
	if strings.EqualFold(os.Getenv("EDUCORE_AUTO_SEED_OWNERS"), "true") {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(appEnv), "staging")
}

func upsertOwner(ctx context.Context, db *database.DB, email, hash string) error {
	firstName, lastName := ownerName(email)
	id := uuidV4()

	if database.IsMySQL(db.Driver()) {
		_, err := db.Exec(ctx, `
			INSERT INTO users (
				id, tenant_id, email, password_hash, first_name, last_name, role,
				is_active, password_must_change, email_verified_at, global_tenant_key, created_at, updated_at
			)
			VALUES ($1, NULL, $2, $3, $4, $5, 'SUPER_ADMIN', TRUE, FALSE, NOW(), '__global__', NOW(), NOW())
			ON DUPLICATE KEY UPDATE
				password_hash = VALUES(password_hash),
				first_name = VALUES(first_name),
				last_name = VALUES(last_name),
				role = 'SUPER_ADMIN',
				is_active = TRUE,
				password_must_change = FALSE,
				global_tenant_key = '__global__',
				email_verified_at = COALESCE(email_verified_at, NOW()),
				deleted_at = NULL,
				updated_at = NOW()
		`, id, email, hash, firstName, lastName)
		return err
	}

	_, err := db.Exec(ctx, `
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

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}
