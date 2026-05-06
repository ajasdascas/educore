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

	newParentID, err := createUserForPortal(c.UserContext(), h.service.repo, tenantID, parentEmail, string(hash), parentFirstName, parentLastName, "PARENT")
	if err != nil {
		if isUniqueConflict(err) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"success": false, "message": "Ya existe un usuario con ese correo.", "data": fiber.Map{"email": parentEmail}})
		}
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error creando usuario padre: %v", err))
	}

	// Link the new parent user to the student in parent_student.
	if database.IsMySQL(db.Driver()) {
		_, _ = db.Exec(c.UserContext(),
			"INSERT IGNORE INTO parent_student (parent_id, student_id, tenant_id, relationship, is_primary) VALUES (?, ?, ?, 'guardian', 1)",
			newParentID, studentID, tenantID)
	} else {
		_, _ = db.Exec(c.UserContext(),
			"INSERT INTO parent_student (parent_id, student_id, tenant_id, relationship, is_primary) VALUES ($1, $2, $3, 'guardian', true) ON CONFLICT (parent_id, student_id) DO NOTHING",
			newParentID, studentID, tenantID)
	}

	return response.Success(c, fiber.Map{"email": parentEmail, "password": password, "role": "PARENT"}, "Acceso portal padre creado")
}

// GetStudentParents — GET /api/v1/school-admin/academic/students/:id/parents
func (h *Handler) GetStudentParents(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	studentID := c.Params("id")
	db := h.service.repo.DB()

	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT u.id, u.first_name, u.last_name, u.email,
			       COALESCE(ps.relationship, 'guardian'),
			       COALESCE(ps.is_primary, false)
			FROM parent_student ps
			INNER JOIN users u ON u.id = ps.parent_id AND u.tenant_id = $1
			WHERE ps.student_id = $2 AND (ps.tenant_id = $1 OR ps.tenant_id IS NULL)
			ORDER BY ps.is_primary DESC, u.first_name
		`), tenantID, studentID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error listando padres")
	}
	defer rows.Close()

	type parentRow struct {
		ID           string `json:"id"`
		FirstName    string `json:"first_name"`
		LastName     string `json:"last_name"`
		Email        string `json:"email"`
		Relationship string `json:"relationship"`
		IsPrimary    bool   `json:"is_primary"`
	}
	parents := []parentRow{}
	for rows.Next() {
		var p parentRow
		if err := rows.Scan(&p.ID, &p.FirstName, &p.LastName, &p.Email, &p.Relationship, &p.IsPrimary); err != nil {
			continue
		}
		parents = append(parents, p)
	}
	return response.Success(c, parents, "ok")
}

// LinkParentToStudent — POST /api/v1/school-admin/academic/students/:id/parents
// Body: { "parent_id": "uuid", "relationship": "mother|father|guardian", "is_primary": true }
// OR:   { "email": "...", "first_name": "...", "last_name": "...", "relationship": "...", "is_primary": true }
func (h *Handler) LinkParentToStudent(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	studentID := c.Params("id")
	db := h.service.repo.DB()

	var body struct {
		ParentID     string `json:"parent_id"`
		Email        string `json:"email"`
		FirstName    string `json:"first_name"`
		LastName     string `json:"last_name"`
		Relationship string `json:"relationship"`
		IsPrimary    bool   `json:"is_primary"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.Relationship == "" {
		body.Relationship = "guardian"
	}

	parentID := body.ParentID
	if parentID == "" {
		if body.Email == "" {
			return response.Error(c, fiber.StatusBadRequest, "Se requiere parent_id o email")
		}
		// Look up existing PARENT user
		_ = db.QueryRow(c.UserContext(),
			database.RebindPlaceholders(db.Driver(), "SELECT id FROM users WHERE tenant_id = $1 AND email = $2 AND role = 'PARENT'"),
			tenantID, body.Email).Scan(&parentID)
		if parentID == "" {
			return response.Error(c, fiber.StatusNotFound, "No existe un usuario PARENT con ese correo en esta escuela. Usa 'Crear acceso al portal' primero.")
		}
	} else {
		// Verify the parent_id belongs to this tenant
		var check string
		_ = db.QueryRow(c.UserContext(),
			database.RebindPlaceholders(db.Driver(), "SELECT id FROM users WHERE tenant_id = $1 AND id = $2 AND role = 'PARENT'"),
			tenantID, parentID).Scan(&check)
		if check == "" {
			return response.Error(c, fiber.StatusNotFound, "Padre no encontrado en esta escuela")
		}
	}

	if database.IsMySQL(db.Driver()) {
		_, err = db.Exec(c.UserContext(),
			"INSERT INTO parent_student (parent_id, student_id, tenant_id, relationship, is_primary) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE relationship = VALUES(relationship), is_primary = VALUES(is_primary)",
			parentID, studentID, tenantID, body.Relationship, body.IsPrimary)
	} else {
		_, err = db.Exec(c.UserContext(),
			"INSERT INTO parent_student (parent_id, student_id, tenant_id, relationship, is_primary) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (parent_id, student_id) DO UPDATE SET relationship = EXCLUDED.relationship, is_primary = EXCLUDED.is_primary",
			parentID, studentID, tenantID, body.Relationship, body.IsPrimary)
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error vinculando padre: %v", err))
	}
	return response.Success(c, fiber.Map{"parent_id": parentID, "student_id": studentID}, "Padre vinculado correctamente")
}

// UnlinkParentFromStudent — DELETE /api/v1/school-admin/academic/students/:id/parents/:parentId
func (h *Handler) UnlinkParentFromStudent(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	studentID := c.Params("id")
	parentID := c.Params("parentId")
	db := h.service.repo.DB()

	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"DELETE FROM parent_student WHERE student_id = $1 AND parent_id = $2 AND (tenant_id = $3 OR tenant_id IS NULL)"),
		studentID, parentID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error desvinculando padre")
	}
	return response.Success(c, nil, "Padre desvinculado")
}
