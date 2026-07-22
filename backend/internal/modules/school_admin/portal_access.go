package school_admin

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"strings"

	"educore/internal/pkg/database"
	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

const portalPasswordRandomBytes = 18

var errPortalAccountAlreadyActive = errors.New("portal account already has a password")

func markOneTimeCredentialResponse(c *fiber.Ctx) {
	c.Set("Cache-Control", "no-store, max-age=0")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
}

// generatePortalPassword creates a one-time, high-entropy credential. It is
// returned only by the successful activation response and is never stored in
// plain text.
func generatePortalPassword() (string, error) {
	buf := make([]byte, portalPasswordRandomBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "Ec!7" + base64.RawURLEncoding.EncodeToString(buf), nil
}

func generatePortalCredential() (password, passwordHash string, err error) {
	password, err = generatePortalPassword()
	if err != nil {
		return "", "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", "", err
	}
	return password, string(hash), nil
}

func portalPasswordConfigured(hash sql.NullString) bool {
	return hash.Valid && strings.TrimSpace(hash.String) != ""
}

func createUserForPortal(
	ctx context.Context,
	tx *database.Tx,
	driver, tenantID, email, passwordHash, firstName, lastName, role string,
) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if database.IsMySQL(driver) {
		newID := database.NewID()
		_, err := tx.Exec(ctx, `
			INSERT INTO users (
				id, tenant_id, email, password_hash, first_name, last_name,
				role, is_active, password_must_change
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
		`, newID, tenantID, email, passwordHash, firstName, lastName, role)
		return newID, err
	}

	var newID string
	err := tx.QueryRow(ctx, `
		INSERT INTO users (
			tenant_id, email, password_hash, first_name, last_name,
			role, is_active, password_must_change
		)
		VALUES ($1, $2, $3, $4, $5, $6, true, true)
		RETURNING id
	`, tenantID, email, passwordHash, firstName, lastName, role).Scan(&newID)
	return newID, err
}

func activateUserForPortal(
	ctx context.Context,
	tx *database.Tx,
	tenantID, userID, passwordHash string,
) error {
	result, err := tx.Exec(ctx, `
		UPDATE users
		SET password_hash = $1,
			password_must_change = true,
			auth_version = auth_version + 1,
			updated_at = NOW()
		WHERE id = $2
		  AND tenant_id = $3
		  AND (password_hash IS NULL OR TRIM(password_hash) = '')
	`, passwordHash, userID, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() != 1 {
		return errPortalAccountAlreadyActive
	}
	return nil
}

func isUniqueConflict(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "duplicate") || strings.Contains(s, "unique") || strings.Contains(s, "already exists")
}

func portalAlreadyActiveResponse(c *fiber.Ctx, message, email string) error {
	return c.Status(fiber.StatusConflict).JSON(fiber.Map{
		"success": false,
		"message": message,
		"data":    fiber.Map{"email": email},
	})
}

// CreateTeacherPortalAccess activates the user row that owns the teacher profile.
func (h *Handler) CreateTeacherPortalAccess(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}

	ctx := c.UserContext()
	db := h.service.repo.DB()
	tx, err := db.Begin(ctx)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo iniciar la activación del portal")
	}
	defer tx.Rollback(ctx)

	var email string
	var passwordHash sql.NullString
	var isActive bool
	err = tx.QueryRow(ctx, `
		SELECT u.email, u.password_hash, u.is_active
		FROM users u
		INNER JOIN teacher_profiles tp ON tp.user_id = u.id
		WHERE u.id = $1
		  AND u.tenant_id = $2
		  AND u.role = 'TEACHER'
		  AND u.deleted_at IS NULL
		FOR UPDATE
	`, c.Params("id"), tenantID).Scan(&email, &passwordHash, &isActive)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Profesor no encontrado")
	}
	if strings.TrimSpace(email) == "" {
		return response.Error(c, fiber.StatusBadRequest, "El profesor no tiene correo. Agrega uno antes de crear el acceso al portal.")
	}
	if !isActive {
		return response.Error(c, fiber.StatusBadRequest, "Activa al profesor antes de habilitar su acceso al portal.")
	}
	if portalPasswordConfigured(passwordHash) {
		return portalAlreadyActiveResponse(c, "El profesor ya tiene acceso al portal.", email)
	}

	password, hash, err := generatePortalCredential()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo generar la contraseña temporal")
	}
	if err := activateUserForPortal(ctx, tx, tenantID, c.Params("id"), hash); err != nil {
		if errors.Is(err, errPortalAccountAlreadyActive) {
			return portalAlreadyActiveResponse(c, "El profesor ya tiene acceso al portal.", email)
		}
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo activar el acceso del profesor")
	}
	if err := tx.Commit(ctx); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo confirmar el acceso del profesor")
	}

	markOneTimeCredentialResponse(c)
	return response.Success(c, fiber.Map{
		"email":                strings.ToLower(strings.TrimSpace(email)),
		"password":             password,
		"password_must_change": true,
		"role":                 "TEACHER",
	}, "Acceso portal profesor creado")
}

// CreateStudentPortalAccess creates or activates the STUDENT user linked to a student.
func (h *Handler) CreateStudentPortalAccess(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}

	ctx := c.UserContext()
	db := h.service.repo.DB()
	tx, err := db.Begin(ctx)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo iniciar la activación del portal")
	}
	defer tx.Rollback(ctx)

	studentID := c.Params("id")
	var email, firstName, lastName, status string
	var userID sql.NullString
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(email, ''), first_name, last_name, status, user_id
		FROM students
		WHERE id = $1 AND tenant_id = $2
		FOR UPDATE
	`, studentID, tenantID).Scan(&email, &firstName, &lastName, &status, &userID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Estudiante no encontrado")
	}
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return response.Error(c, fiber.StatusBadRequest, "El estudiante no tiene correo. Agrega uno antes de crear el acceso al portal.")
	}
	if status != "active" {
		return response.Error(c, fiber.StatusBadRequest, "Activa al estudiante antes de habilitar su acceso al portal.")
	}

	password, hash, err := generatePortalCredential()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo generar la contraseña temporal")
	}

	if userID.Valid && strings.TrimSpace(userID.String) != "" {
		var linkedEmail, linkedRole string
		var linkedHash sql.NullString
		var linkedActive bool
		err = tx.QueryRow(ctx, `
			SELECT email, role, password_hash, is_active
			FROM users
			WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
			FOR UPDATE
		`, userID.String, tenantID).Scan(&linkedEmail, &linkedRole, &linkedHash, &linkedActive)
		if err == nil {
			if linkedRole != "STUDENT" {
				return response.Error(c, fiber.StatusConflict, "El expediente está vinculado a una cuenta con un rol incompatible.")
			}
			if !linkedActive {
				return response.Error(c, fiber.StatusBadRequest, "Activa la cuenta del estudiante antes de habilitar su acceso al portal.")
			}
			if portalPasswordConfigured(linkedHash) {
				return portalAlreadyActiveResponse(c, "El estudiante ya tiene acceso al portal.", linkedEmail)
			}
			if err := activateUserForPortal(ctx, tx, tenantID, userID.String, hash); err != nil {
				if errors.Is(err, errPortalAccountAlreadyActive) {
					return portalAlreadyActiveResponse(c, "El estudiante ya tiene acceso al portal.", linkedEmail)
				}
				return response.Error(c, fiber.StatusInternalServerError, "No se pudo activar el acceso del estudiante")
			}
			if err := tx.Commit(ctx); err != nil {
				return response.Error(c, fiber.StatusInternalServerError, "No se pudo confirmar el acceso del estudiante")
			}
			markOneTimeCredentialResponse(c)
			return response.Success(c, fiber.Map{
				"email":                linkedEmail,
				"password":             password,
				"password_must_change": true,
				"role":                 "STUDENT",
			}, "Acceso portal estudiante creado")
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return response.Error(c, fiber.StatusInternalServerError, "No se pudo revisar la cuenta del estudiante")
		}
	}

	newUserID, err := createUserForPortal(ctx, tx, db.Driver(), tenantID, email, hash, firstName, lastName, "STUDENT")
	if err != nil {
		if isUniqueConflict(err) {
			return portalAlreadyActiveResponse(c, "Ya existe un usuario con ese correo en la escuela.", email)
		}
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo crear la cuenta del estudiante")
	}

	result, err := tx.Exec(ctx, `
		UPDATE students
		SET user_id = $1, updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3
	`, newUserID, studentID, tenantID)
	if err != nil || result.RowsAffected() != 1 {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo vincular la cuenta al estudiante")
	}
	if err := tx.Commit(ctx); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo confirmar el acceso del estudiante")
	}

	markOneTimeCredentialResponse(c)
	return response.Success(c, fiber.Map{
		"email":                email,
		"password":             password,
		"password_must_change": true,
		"role":                 "STUDENT",
	}, "Acceso portal estudiante creado")
}

// CreateParentPortalAccess activates the primary parent already linked to the student.
func (h *Handler) CreateParentPortalAccess(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}

	ctx := c.UserContext()
	db := h.service.repo.DB()
	tx, err := db.Begin(ctx)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo iniciar la activación del portal")
	}
	defer tx.Rollback(ctx)

	var parentID, parentEmail string
	var passwordHash sql.NullString
	var isActive bool
	err = tx.QueryRow(ctx, `
		SELECT u.id, u.email, u.password_hash, u.is_active
		FROM parent_student ps
		INNER JOIN students s ON s.id = ps.student_id
		INNER JOIN users u ON u.id = ps.parent_id
		WHERE s.id = $1
		  AND s.tenant_id = $2
		  AND u.tenant_id = $2
		  AND u.role = 'PARENT'
		  AND u.deleted_at IS NULL
		ORDER BY ps.is_primary DESC, ps.created_at ASC, u.created_at ASC
		LIMIT 1
		FOR UPDATE
	`, c.Params("id"), tenantID).Scan(&parentID, &parentEmail, &passwordHash, &isActive)
	if err != nil || strings.TrimSpace(parentEmail) == "" {
		return response.Error(c, fiber.StatusNotFound,
			"No se encontró un padre/tutor con correo para este estudiante. Registra el contacto principal primero.")
	}
	if !isActive {
		return response.Error(c, fiber.StatusBadRequest, "Activa la cuenta del padre/tutor antes de habilitar su acceso al portal.")
	}
	if portalPasswordConfigured(passwordHash) {
		return portalAlreadyActiveResponse(c, "El padre/tutor ya tiene acceso al portal.", parentEmail)
	}

	password, hash, err := generatePortalCredential()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo generar la contraseña temporal")
	}
	if err := activateUserForPortal(ctx, tx, tenantID, parentID, hash); err != nil {
		if errors.Is(err, errPortalAccountAlreadyActive) {
			return portalAlreadyActiveResponse(c, "El padre/tutor ya tiene acceso al portal.", parentEmail)
		}
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo activar el acceso del padre/tutor")
	}
	if err := tx.Commit(ctx); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo confirmar el acceso del padre/tutor")
	}

	markOneTimeCredentialResponse(c)
	return response.Success(c, fiber.Map{
		"email":                strings.ToLower(strings.TrimSpace(parentEmail)),
		"password":             password,
		"password_must_change": true,
		"role":                 "PARENT",
	}, "Acceso portal padre creado")
}
