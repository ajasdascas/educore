package school_admin

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"

	"educore/internal/pkg/database"
	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// generatePortalPassword returns a random password like "Edu<10hex>"
func generatePortalPassword() (string, error) {
	buf := make([]byte, 6)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "Edu" + hex.EncodeToString(buf)[:10], nil
}

// createUserForPortal inserts a new user row and returns the new user ID.
// Returns ("", conflictErr) when the email already exists for that tenant.
func createUserForPortal(ctx context.Context, repo *Repository, tenantID, email, passwordHash, firstName, lastName, role string) (string, error) {
	db := repo.db
	var newID string
	if database.IsMySQL(db.Driver()) {
		newID = database.NewID()
		_, err := db.Exec(ctx,
			"INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, true)",
			newID, tenantID, email, passwordHash, firstName, lastName, role)
		if err != nil {
			return "", err
		}
	} else {
		err := db.QueryRow(ctx,
			"INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id",
			tenantID, email, passwordHash, firstName, lastName, role).Scan(&newID)
		if err != nil {
			return "", err
		}
	}
	return newID, nil
}

func isUniqueConflict(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "duplicate") || strings.Contains(s, "unique") || strings.Contains(s, "already exists")
}

// CreateTeacherPortalAccess — POST /api/v1/school-admin/academic/teachers/:id/portal-access
func (h *Handler) CreateTeacherPortalAccess(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	teacherID := c.Params("id")
	db := h.service.repo.DB()

	var email, firstName, lastName string
	err = db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"SELECT COALESCE(email,''), COALESCE(first_name,''), COALESCE(last_name,'') FROM teachers WHERE id = $1 AND tenant_id = $2"),
		teacherID, tenantID).Scan(&email, &firstName, &lastName)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Profesor no encontrado")
	}
	if email == "" {
		return response.Error(c, fiber.StatusBadRequest, "El profesor no tiene correo. Agrega uno antes de crear el acceso al portal.")
	}

	var existingID string
	_ = db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"SELECT id FROM users WHERE tenant_id = $1 AND email = $2 AND role = 'TEACHER'"),
		tenantID, email).Scan(&existingID)
	if existingID != "" {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "El usuario ya existe para este profesor.",
			"data":    fiber.Map{"email": email},
		})
	}

	password, err := generatePortalPassword()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error generando contraseña")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error hasheando contraseña")
	}

	if _, err = createUserForPortal(c.UserContext(), h.service.repo, tenantID, email, string(hash), firstName, lastName, "TEACHER"); err != nil {
		if isUniqueConflict(err) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"success": false, "message": "El usuario ya existe.", "data": fiber.Map{"email": email}})
		}
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error creando usuario: %v", err))
	}

	return response.Success(c, fiber.Map{"email": email, "password": password, "role": "TEACHER"}, "Acceso portal profesor creado")
}

// CreateStudentPortalAccess — POST /api/v1/school-admin/academic/students/:id/portal-access
func (h *Handler) CreateStudentPortalAccess(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	studentID := c.Params("id")
	db := h.service.repo.DB()

	var email, firstName, lastName string
	var userIDPtr *string
	err = db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"SELECT COALESCE(email,''), COALESCE(first_name,''), COALESCE(last_name,''), user_id FROM students WHERE id = $1 AND tenant_id = $2"),
		studentID, tenantID).Scan(&email, &firstName, &lastName, &userIDPtr)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Estudiante no encontrado")
	}
	if userIDPtr != nil && *userIDPtr != "" {
		var linkedEmail string
		_ = db.QueryRow(c.UserContext(),
			database.RebindPlaceholders(db.Driver(), "SELECT email FROM users WHERE id = $1"),
			*userIDPtr).Scan(&linkedEmail)
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "El estudiante ya tiene acceso al portal.",
			"data":    fiber.Map{"email": linkedEmail},
		})
	}
	if email == "" {
		return response.Error(c, fiber.StatusBadRequest, "El estudiante no tiene correo. Agrega uno antes de crear el acceso al portal.")
	}

	password, err := generatePortalPassword()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error generando contraseña")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error hasheando contraseña")
	}

	newUserID, err := createUserForPortal(c.UserContext(), h.service.repo, tenantID, email, string(hash), firstName, lastName, "STUDENT")
	if err != nil {
		if isUniqueConflict(err) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"success": false, "message": "Ya existe un usuario con ese correo.", "data": fiber.Map{"email": email}})
		}
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error creando usuario estudiante: %v", err))
	}

	if newUserID != "" {
		_, _ = db.Exec(c.UserContext(),
			database.RebindPlaceholders(db.Driver(),
				"UPDATE students SET user_id = $1 WHERE id = $2 AND tenant_id = $3"),
			newUserID, studentID, tenantID)
	}

	return response.Success(c, fiber.Map{"email": email, "password": password, "role": "STUDENT"}, "Acceso portal estudiante creado")
}

// CreateParentPortalAccess — POST /api/v1/school-admin/academic/students/:id/parent-portal-access
func (h *Handler) CreateParentPortalAccess(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	studentID := c.Params("id")
	db := h.service.repo.DB()

	var parentEmail, parentFirstName, parentLastName string
	err = db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			`SELECT COALESCE(pc.email,''),
			        COALESCE(pc.first_name,''),
			        COALESCE(NULLIF(pc.last_name,''), COALESCE(pc.paternal_last_name,''), '')
			 FROM parent_contacts pc
			 WHERE pc.student_id = $1 AND pc.tenant_id = $2
			 ORDER BY pc.is_primary DESC, pc.created_at ASC LIMIT 1`),
		studentID, tenantID).Scan(&parentEmail, &parentFirstName, &parentLastName)

	if err != nil || parentEmail == "" {
		return response.Error(c, fiber.StatusNotFound,
			"No se encontró un padre/tutor con correo para este estudiante. Registra el contacto primario primero.")
	}

	var existingID string
	_ = db.QueryRow(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"SELECT id FROM users WHERE tenant_id = $1 AND email = $2 AND role = 'PARENT'"),
		tenantID, parentEmail).Scan(&existingID)
	if existingID != "" {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"message": "El padre/tutor ya tiene acceso al portal.",
			"data":    fiber.Map{"email": parentEmail},
		})
	}

	password, err := generatePortalPassword()
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error generando contraseña")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error hasheando contraseña")
	}

	if _, err = createUserForPortal(c.UserContext(), h.service.repo, tenantID, parentEmail, string(hash), parentFirstName, parentLastName, "PARENT"); err != nil {
		if isUniqueConflict(err) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"success": false, "message": "Ya existe un usuario con ese correo.", "data": fiber.Map{"email": parentEmail}})
		}
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error creando usuario padre: %v", err))
	}

	return response.Success(c, fiber.Map{"email": parentEmail, "password": password, "role": "PARENT"}, "Acceso portal padre creado")
}
