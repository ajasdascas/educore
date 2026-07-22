package ownerseed

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
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
	password := cleanSecret(os.Getenv("EDUCORE_OWNER_ADMIN_PASSWORD"))
	if strings.TrimSpace(password) == "" {
		log.Println("Owner SuperAdmin seed skipped: EDUCORE_OWNER_ADMIN_PASSWORD is not configured")
		return nil
	}
	minLength := minimumOwnerPasswordLength(appEnv)
	if len(password) < minLength {
		return fmt.Errorf("EDUCORE_OWNER_ADMIN_PASSWORD must be at least %d characters", minLength)
	}
	if len(emails) == 0 {
		return fmt.Errorf("EDUCORE_OWNER_ADMIN_EMAILS must include at least one owner email")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash owner password: %w", err)
	}

	for _, email := range emails {
		created, err := ensureOwnerCreateOnce(ctx, db, email, string(hash))
		if err != nil {
			return fmt.Errorf("seed owner %s: %w", email, err)
		}
		if created {
			log.Printf("Owner SuperAdmin created once: %s", email)
		} else {
			log.Printf("Owner SuperAdmin already exists and was left unchanged: %s", email)
		}
	}
	return nil
}

func shouldSeed(appEnv string) bool {
	if strings.EqualFold(os.Getenv("EDUCORE_AUTO_SEED_OWNERS"), "true") {
		return true
	}
	return strings.EqualFold(strings.TrimSpace(appEnv), "staging")
}

func minimumOwnerPasswordLength(appEnv string) int {
	if strings.EqualFold(strings.TrimSpace(appEnv), "staging") {
		return 10
	}
	return 12
}

func ensureOwnerCreateOnce(ctx context.Context, db *database.DB, email, hash string) (bool, error) {
	if err := validateExistingOwner(ctx, db, email); err == nil {
		return false, nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return false, err
	}

	firstName, lastName := ownerName(email)
	id := uuidV4()

	if database.IsMySQL(db.Driver()) {
		result, err := db.Exec(ctx, `
			INSERT IGNORE INTO users (
				id, tenant_id, email, password_hash, first_name, last_name, role,
				is_active, password_must_change, email_verified_at, global_tenant_key, created_at, updated_at
			)
			VALUES ($1, NULL, $2, $3, $4, $5, 'SUPER_ADMIN', TRUE, FALSE, NOW(), '__global__', NOW(), NOW())
		`, id, email, hash, firstName, lastName)
		if err != nil {
			return false, err
		}
		if result.RowsAffected() == 0 {
			return false, validateExistingOwner(ctx, db, email)
		}
		return true, nil
	}

	result, err := db.Exec(ctx, `
		INSERT INTO users (
			id, tenant_id, email, password_hash, first_name, last_name, role,
			is_active, password_must_change, email_verified_at, created_at, updated_at, deleted_at
		)
		VALUES ($1, NULL, $2, $3, $4, $5, 'SUPER_ADMIN', TRUE, FALSE, NOW(), NOW(), NOW(), NULL)
		ON CONFLICT (LOWER(email)) WHERE tenant_id IS NULL
		DO NOTHING
	`, id, email, hash, firstName, lastName)
	if err != nil {
		return false, err
	}
	if result.RowsAffected() == 0 {
		return false, validateExistingOwner(ctx, db, email)
	}
	return true, nil
}

func validateExistingOwner(ctx context.Context, db *database.DB, email string) error {
	var tenantID, role string
	var active, notDeleted bool
	err := db.QueryRow(ctx, `
		SELECT COALESCE(tenant_id::text, ''), role, is_active, deleted_at IS NULL
		FROM users
		WHERE LOWER(email) = LOWER($1)
		LIMIT 1
	`, email).Scan(&tenantID, &role, &active, &notDeleted)
	if err != nil {
		return err
	}
	if tenantID != "" || role != "SUPER_ADMIN" || !active || !notDeleted {
		return fmt.Errorf("existing owner account is not an active global SUPER_ADMIN; repair it manually")
	}
	return nil
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

func cleanSecret(value string) string {
	cleaned := strings.TrimSpace(value)
	if len(cleaned) >= 2 {
		first := cleaned[0]
		last := cleaned[len(cleaned)-1]
		if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
			cleaned = strings.TrimSpace(cleaned[1 : len(cleaned)-1])
		}
	}
	return cleaned
}
