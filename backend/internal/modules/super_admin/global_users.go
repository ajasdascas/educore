package superadmin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/mail"
	"strings"

	"educore/internal/pkg/database"
	"educore/internal/pkg/passwordpolicy"
	"educore/internal/pkg/rbac"
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type scopedUserRequest struct {
	TenantID     string `json:"tenant_id"`
	Email        string `json:"email"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	Role         string `json:"role"`
	Password     string `json:"password"`
	IsActive     *bool  `json:"is_active"`
	StudentID    string `json:"student_id"`
	Relationship string `json:"relationship"`
}

type scopedUserView struct {
	ID                   string   `json:"id"`
	TenantID             string   `json:"tenant_id"`
	TenantName           string   `json:"tenant_name"`
	TenantSlug           string   `json:"tenant_slug"`
	Email                string   `json:"email"`
	FirstName            string   `json:"first_name"`
	LastName             string   `json:"last_name"`
	Role                 string   `json:"role"`
	RoleName             string   `json:"role_name"`
	IsActive             bool     `json:"is_active"`
	EffectivePermissions []string `json:"effective_permissions"`
	LinkedStudentID      string   `json:"linked_student_id"`
	LastLoginAt          any      `json:"last_login_at"`
	CreatedAt            any      `json:"created_at"`
	UpdatedAt            any      `json:"updated_at"`
}

type scopedUserIdentity struct {
	ID        string
	TenantID  string
	Email     string
	FirstName string
	LastName  string
	Role      string
	IsActive  bool
}

func (h *Handler) ListAllUsers(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	where, args, err := globalUserFilters(c)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	query := scopedUserSelect() + where
	countQuery := "SELECT COUNT(*) FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id " + where

	var total int
	if err := h.db.QueryRow(c.UserContext(), countQuery, args...).Scan(&total); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo contar los usuarios")
	}

	var active, inactive int
	summaryQuery := "SELECT COALESCE(SUM(CASE WHEN u.is_active THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN u.is_active THEN 0 ELSE 1 END), 0) FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id " + where
	if err := h.db.QueryRow(c.UserContext(), summaryQuery, args...).Scan(&active, &inactive); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo resumir el estado de los usuarios")
	}

	query += fmt.Sprintf(" ORDER BY u.created_at DESC LIMIT $%d OFFSET $%d", len(args)+1, len(args)+2)
	queryArgs := append(append([]interface{}{}, args...), limit, (page-1)*limit)
	rows, err := h.db.Query(c.UserContext(), query, queryArgs...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron cargar los usuarios")
	}
	defer rows.Close()

	users := []scopedUserView{}
	for rows.Next() {
		user, scanErr := scanScopedUser(rows.Scan)
		if scanErr != nil {
			return response.Error(c, fiber.StatusInternalServerError, "No se pudo leer un usuario")
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo completar la consulta de usuarios")
	}

	return response.SuccessWithMeta(c, fiber.Map{
		"users":   users,
		"summary": fiber.Map{"total": total, "active": active, "inactive": inactive},
	}, response.Meta{Page: page, PerPage: limit, Total: total})
}

func globalUserFilters(c *fiber.Ctx) (string, []interface{}, error) {
	where := "WHERE u.deleted_at IS NULL"
	args := []interface{}{}
	add := func(clause string, value interface{}) {
		args = append(args, value)
		where += fmt.Sprintf(clause, len(args))
	}

	if search := strings.TrimSpace(c.Query("search")); search != "" {
		args = append(args, "%"+search+"%")
		index := len(args)
		where += fmt.Sprintf(" AND (u.email ILIKE $%d OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $%d OR t.name ILIKE $%d)", index, index, index)
	}
	role := rbac.NormalizeRole(c.Query("role"))
	if role != "" && !strings.EqualFold(role, "all") {
		if _, ok := rbac.Definition(role); !ok {
			return "", nil, fmt.Errorf("rol de filtro no permitido")
		}
		add(" AND u.role = $%d", role)
	}
	tenantID := strings.TrimSpace(c.Query("tenant_id"))
	if strings.EqualFold(tenantID, "global") {
		where += " AND u.tenant_id IS NULL"
	} else if tenantID != "" && !strings.EqualFold(tenantID, "all") {
		add(" AND u.tenant_id::text = $%d", tenantID)
	}
	status := strings.ToLower(strings.TrimSpace(c.Query("status")))
	if status == "active" {
		add(" AND u.is_active = $%d", true)
	} else if status == "inactive" {
		add(" AND u.is_active = $%d", false)
	} else if status != "" && status != "all" {
		return "", nil, fmt.Errorf("estado de filtro no permitido")
	}
	return where, args, nil
}

func scopedUserSelect() string {
	return `SELECT u.id,
		COALESCE(u.tenant_id::text, ''), COALESCE(t.name, 'Plataforma EduCore'), COALESCE(t.slug, ''),
		u.email, u.first_name, u.last_name, u.role,
		COALESCE(tr.name, CASE u.role
			WHEN 'SUPER_ADMIN' THEN 'Super Admin'
			WHEN 'SCHOOL_ADMIN' THEN 'Director / Administrador'
			WHEN 'TEACHER' THEN 'Profesor'
			WHEN 'PARENT' THEN 'Padre / Tutor'
			WHEN 'STUDENT' THEN 'Estudiante'
			ELSE u.role END),
		u.is_active, COALESCE(tr.permissions, '[]'::jsonb), tr.id IS NOT NULL,
		COALESCE(CASE
			WHEN u.role = 'STUDENT' THEN (SELECT s.id::text FROM students s WHERE s.tenant_id = u.tenant_id AND s.user_id = u.id LIMIT 1)
			WHEN u.role = 'PARENT' THEN (SELECT ps.student_id::text FROM parent_student ps JOIN students s ON s.id = ps.student_id WHERE ps.parent_id = u.id AND s.tenant_id = u.tenant_id LIMIT 1)
			ELSE '' END, ''),
		u.last_login_at, u.created_at, u.updated_at
	FROM users u
	LEFT JOIN tenants t ON t.id = u.tenant_id
	LEFT JOIN tenant_roles tr ON tr.tenant_id = u.tenant_id AND tr.key = CASE u.role
		WHEN 'SCHOOL_ADMIN' THEN 'admin'
		WHEN 'TEACHER' THEN 'teacher'
		WHEN 'PARENT' THEN 'parent'
		WHEN 'STUDENT' THEN 'student'
		ELSE '' END `
}

func scanScopedUser(scan func(...interface{}) error) (scopedUserView, error) {
	var user scopedUserView
	var permissionsRaw []byte
	var tenantRoleExists bool
	err := scan(&user.ID, &user.TenantID, &user.TenantName, &user.TenantSlug,
		&user.Email, &user.FirstName, &user.LastName, &user.Role, &user.RoleName,
		&user.IsActive, &permissionsRaw, &tenantRoleExists, &user.LinkedStudentID,
		&user.LastLoginAt, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return user, err
	}
	definition, ok := rbac.Definition(user.Role)
	if ok {
		user.EffectivePermissions = append([]string(nil), definition.DefaultPermissions...)
	}
	if user.Role == rbac.RoleSuperAdmin {
		user.EffectivePermissions = []string{"platform:*"}
	} else if tenantRoleExists && len(permissionsRaw) > 0 {
		var stored []string
		if json.Unmarshal(permissionsRaw, &stored) == nil {
			user.EffectivePermissions = rbac.ResolvePermissions(user.Role, stored, true)
		}
	}
	if user.EffectivePermissions == nil {
		user.EffectivePermissions = []string{}
	}
	return user, nil
}

func (h *Handler) scopedUserByID(c *fiber.Ctx, id string) (scopedUserView, error) {
	row := h.db.QueryRow(c.UserContext(), scopedUserSelect()+" WHERE u.id = $1 AND u.deleted_at IS NULL", id)
	return scanScopedUser(row.Scan)
}

func (h *Handler) GlobalUserOptions(c *fiber.Ctx) error {
	tenantID := strings.TrimSpace(c.Query("tenant_id"))
	tenantRows, err := h.db.Query(c.UserContext(), `
		SELECT id, name, slug, status
		FROM tenants WHERE deleted_at IS NULL
		ORDER BY name ASC LIMIT 1000`)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron cargar las escuelas")
	}
	defer tenantRows.Close()
	tenants := []fiber.Map{}
	tenantFound := tenantID == ""
	for tenantRows.Next() {
		var id, name, slug, status string
		if err := tenantRows.Scan(&id, &name, &slug, &status); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "No se pudo leer una escuela")
		}
		if id == tenantID {
			tenantFound = true
		}
		tenants = append(tenants, fiber.Map{"id": id, "name": name, "slug": slug, "status": status})
	}
	if !tenantFound {
		return response.Error(c, fiber.StatusNotFound, "Escuela no encontrada")
	}

	storedPermissions := map[string][]string{}
	if tenantID != "" {
		rows, queryErr := h.db.Query(c.UserContext(), "SELECT key, permissions FROM tenant_roles WHERE tenant_id::text = $1", tenantID)
		if queryErr != nil {
			return response.Error(c, fiber.StatusInternalServerError, "No se pudieron cargar los roles de la escuela")
		}
		for rows.Next() {
			var key string
			var raw []byte
			if rows.Scan(&key, &raw) == nil {
				var permissions []string
				if json.Unmarshal(raw, &permissions) == nil {
					storedPermissions[key] = permissions
				}
			}
		}
		rows.Close()
	}

	roles := []fiber.Map{}
	for _, definition := range rbac.Definitions() {
		permissions := append([]string(nil), definition.DefaultPermissions...)
		if tenantID != "" && definition.Scope == "tenant" {
			if stored, ok := storedPermissions[definition.TenantRoleKey]; ok {
				permissions = rbac.ResolvePermissions(definition.Key, stored, true)
			}
		}
		roles = append(roles, fiber.Map{
			"key": definition.Key, "tenant_role_key": definition.TenantRoleKey,
			"name": definition.Name, "description": definition.Description, "scope": definition.Scope,
			"permissions": permissions, "allowed_permissions": definition.AllowedPermissions,
		})
	}

	students := []fiber.Map{}
	studentLinksAvailable := true
	if tenantID != "" {
		studentRows, queryErr := h.db.Query(c.UserContext(), `
			SELECT id, first_name, last_name, COALESCE(enrollment_number, ''), COALESCE(user_id::text, '')
			FROM students WHERE tenant_id::text = $1 AND deleted_at IS NULL
			ORDER BY last_name, first_name LIMIT 500`, tenantID)
		if queryErr != nil {
			studentLinksAvailable = false
		} else {
			for studentRows.Next() {
				var id, first, last, enrollment, userID string
				if studentRows.Scan(&id, &first, &last, &enrollment, &userID) == nil {
					students = append(students, fiber.Map{"id": id, "first_name": first, "last_name": last, "enrollment_number": enrollment, "user_id": userID})
				}
			}
			studentRows.Close()
		}
	}

	return response.Success(c, fiber.Map{
		"tenants": tenants, "roles": roles, "students": students,
		"student_links_available": studentLinksAvailable,
	}, "Opciones de usuarios cargadas")
}

func (h *Handler) CreateScopedUser(c *fiber.Ctx) error {
	var req scopedUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Solicitud de usuario inválida")
	}
	normalizeScopedUserRequest(&req)
	if err := validateScopedUserRequest(req, true); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	if err := h.validateTenantExists(c, req.TenantID); err != nil {
		return err
	}

	active := true
	if req.IsActive != nil {
		active = *req.IsActive
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo proteger la contraseña")
	}

	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo iniciar la creación del usuario")
	}
	defer tx.Rollback(c.UserContext())
	if exists, checkErr := scopedEmailExistsTx(c, tx, req.TenantID, req.Email, ""); checkErr != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo validar el correo")
	} else if exists {
		return response.Error(c, fiber.StatusConflict, "Ya existe un usuario con ese correo en el mismo alcance")
	}

	var id string
	err = tx.QueryRow(c.UserContext(), `
		INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active, password_must_change)
		VALUES (NULLIF($1, '')::uuid, $2, $3, $4, $5, $6, $7, true)
		RETURNING id`, req.TenantID, req.Email, string(hash), req.FirstName, req.LastName, req.Role, active).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusConflict, "No se pudo crear el usuario; revisa que el correo no esté duplicado")
	}
	if err := syncScopedUserLinks(c, tx, id, req.TenantID, "", req.Role, req.StudentID, req.Relationship); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo guardar el usuario")
	}

	h.auditSuperAdmin(c, "user.create", "users", id, "warning", fiber.Map{
		"role": req.Role, "tenant_id": req.TenantID, "is_active": active, "student_id": req.StudentID,
	}, "")
	user, err := h.scopedUserByID(c, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "El usuario se creó, pero no se pudo recargar")
	}
	return response.Success(c, user, "Usuario creado correctamente")
}

func (h *Handler) UpdateScopedUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var req scopedUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Solicitud de usuario inválida")
	}
	normalizeScopedUserRequest(&req)
	if err := validateScopedUserRequest(req, false); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	current, err := h.scopedUserIdentity(c, id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Usuario no encontrado")
	}
	if req.TenantID != current.TenantID {
		return response.Error(c, fiber.StatusBadRequest, "La escuela de un usuario existente no se puede cambiar; crea una cuenta en el nuevo alcance")
	}
	if current.ID == currentActorID(c) {
		if req.Role != current.Role || (req.IsActive != nil && !*req.IsActive) {
			return response.Error(c, fiber.StatusForbidden, "No puedes cambiar tu propio rol ni desactivar tu cuenta")
		}
	}
	if err := h.validateTenantExists(c, req.TenantID); err != nil {
		return err
	}

	active := current.IsActive
	if req.IsActive != nil {
		active = *req.IsActive
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo iniciar la actualización")
	}
	defer tx.Rollback(c.UserContext())
	if current.TenantID == "" {
		if err := guardLastActiveSuperAdminTx(c.UserContext(), tx, id, req.Role == rbac.RoleSuperAdmin && active); err != nil {
			return lastActiveSuperAdminResponse(c, err)
		}
	}
	if exists, checkErr := scopedEmailExistsTx(c, tx, req.TenantID, req.Email, id); checkErr != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo validar el correo")
	} else if exists {
		return response.Error(c, fiber.StatusConflict, "Ya existe otro usuario con ese correo en el mismo alcance")
	}
	if err := syncScopedUserLinks(c, tx, id, req.TenantID, current.Role, req.Role, req.StudentID, req.Relationship); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	result, err := tx.Exec(c.UserContext(), `
		UPDATE users SET email = $1, first_name = $2, last_name = $3, role = $4, is_active = $5,
			auth_version = auth_version + CASE WHEN email <> $1 OR role <> $4 OR is_active <> $5 THEN 1 ELSE 0 END,
			updated_at = NOW()
		WHERE id = $6 AND (($7 = '' AND tenant_id IS NULL) OR tenant_id::text = $7) AND deleted_at IS NULL`,
		req.Email, req.FirstName, req.LastName, req.Role, active, id, req.TenantID)
	if err != nil || result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo actualizar el usuario")
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo guardar la actualización")
	}

	h.auditSuperAdmin(c, "user.update", "users", id, "warning", fiber.Map{
		"tenant_id":  req.TenantID,
		"before":     fiber.Map{"email": current.Email, "role": current.Role, "is_active": current.IsActive},
		"after":      fiber.Map{"email": req.Email, "role": req.Role, "is_active": active},
		"student_id": req.StudentID,
	}, "")
	user, err := h.scopedUserByID(c, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "El usuario se actualizó, pero no se pudo recargar")
	}
	return response.Success(c, user, "Usuario actualizado correctamente")
}

func (h *Handler) ToggleScopedUserStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		IsActive *bool `json:"is_active"`
	}
	if err := c.BodyParser(&req); err != nil || req.IsActive == nil {
		return response.Error(c, fiber.StatusBadRequest, "is_active es obligatorio")
	}
	current, err := h.scopedUserIdentity(c, id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Usuario no encontrado")
	}
	if current.ID == currentActorID(c) && !*req.IsActive {
		return response.Error(c, fiber.StatusForbidden, "No puedes desactivar tu propia cuenta")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo iniciar el cambio de estado")
	}
	defer tx.Rollback(c.UserContext())
	if current.TenantID == "" {
		if err := guardLastActiveSuperAdminTx(c.UserContext(), tx, id, *req.IsActive); err != nil {
			return lastActiveSuperAdminResponse(c, err)
		}
	}
	result, err := tx.Exec(c.UserContext(), "UPDATE users SET is_active = $1, auth_version = auth_version + CASE WHEN is_active <> $1 THEN 1 ELSE 0 END, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL", *req.IsActive, id)
	if err != nil || result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo cambiar el estado del usuario")
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo guardar el cambio de estado")
	}
	h.auditSuperAdmin(c, "user.status", "users", id, "warning", fiber.Map{"before": current.IsActive, "after": *req.IsActive, "tenant_id": current.TenantID}, "")
	user, err := h.scopedUserByID(c, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "El estado cambió, pero no se pudo recargar")
	}
	return response.Success(c, user, "Estado actualizado correctamente")
}

// ToggleLegacyScopedUserStatus preserves the old PATCH /users/:id/toggle
// contract while applying the same self-lockout and last-admin protections.
func (h *Handler) ToggleLegacyScopedUserStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	current, err := h.scopedUserIdentity(c, id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Usuario no encontrado")
	}
	next := !current.IsActive
	if current.ID == currentActorID(c) && !next {
		return response.Error(c, fiber.StatusForbidden, "No puedes desactivar tu propia cuenta")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo iniciar el cambio de estado")
	}
	defer tx.Rollback(c.UserContext())
	if current.TenantID == "" {
		if err := guardLastActiveSuperAdminTx(c.UserContext(), tx, id, next); err != nil {
			return lastActiveSuperAdminResponse(c, err)
		}
	}
	result, err := tx.Exec(c.UserContext(), "UPDATE users SET is_active = $1, auth_version = auth_version + 1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL", next, id)
	if err != nil || result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo cambiar el estado del usuario")
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo guardar el cambio de estado")
	}
	h.auditSuperAdmin(c, "user.status", "users", id, "warning", fiber.Map{"before": current.IsActive, "after": next, "tenant_id": current.TenantID, "legacy_route": true}, "")
	return response.Success(c, fiber.Map{"id": id, "is_active": next}, "Estado actualizado correctamente")
}

func (h *Handler) UpdateTenantRolePermissions(c *fiber.Ctx) error {
	role := rbac.NormalizeRole(c.Params("role"))
	definition, ok := rbac.Definition(role)
	if !ok || definition.Scope != "tenant" {
		return response.Error(c, fiber.StatusBadRequest, "Los permisos de ese rol no son editables")
	}
	var req struct {
		TenantID    string   `json:"tenant_id"`
		Permissions []string `json:"permissions"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Solicitud de permisos inválida")
	}
	req.TenantID = strings.TrimSpace(req.TenantID)
	if err := h.validateTenantExists(c, req.TenantID); err != nil {
		return err
	}
	permissions, err := rbac.NormalizePermissions(role, req.Permissions)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	var previousRaw []byte
	_ = h.db.QueryRow(c.UserContext(), "SELECT permissions FROM tenant_roles WHERE tenant_id::text = $1 AND key = $2", req.TenantID, definition.TenantRoleKey).Scan(&previousRaw)
	previous := []string{}
	_ = json.Unmarshal(previousRaw, &previous)
	permissionsJSON, _ := json.Marshal(permissions)
	_, err = h.db.Exec(c.UserContext(), `
		INSERT INTO tenant_roles (tenant_id, key, name, description, permissions, is_system, policy_version)
		VALUES ($1, $2, $3, $4, $5::jsonb, true, 2)
		ON CONFLICT (tenant_id, key) DO UPDATE SET permissions = EXCLUDED.permissions, policy_version = 2, updated_at = NOW()`,
		req.TenantID, definition.TenantRoleKey, definition.Name, definition.Description, string(permissionsJSON))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron guardar los permisos")
	}
	h.auditSuperAdmin(c, "tenant_role.permissions_update", "tenant_roles", "", "critical", fiber.Map{
		"tenant_id": req.TenantID, "role": role, "before": previous, "after": permissions,
	}, "")
	return response.Success(c, fiber.Map{"tenant_id": req.TenantID, "role": role, "permissions": permissions}, "Permisos del rol actualizados")
}

func (h *Handler) ResetScopedUserPassword(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil || passwordpolicy.Validate(req.Password) != nil {
		return response.Error(c, fiber.StatusBadRequest, "La contraseña temporal debe tener al menos 12 caracteres, mayúscula, minúscula, número y símbolo")
	}
	if _, err := h.scopedUserIdentity(c, id); err != nil {
		return response.Error(c, fiber.StatusNotFound, "Usuario no encontrado")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo proteger la contraseña")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo iniciar el restablecimiento")
	}
	defer tx.Rollback(c.UserContext())
	result, err := tx.Exec(c.UserContext(), "UPDATE users SET password_hash = $1, password_must_change = true, auth_version = auth_version + 1, updated_at = NOW() WHERE id = $2 AND deleted_at IS NULL", string(hash), id)
	if err != nil || result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo restablecer la contraseña")
	}
	if _, err := tx.Exec(c.UserContext(), `
		UPDATE password_reset_tokens SET revoked_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`, id); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron revocar los enlaces de recuperacion")
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo guardar el restablecimiento")
	}
	h.auditSuperAdmin(c, "user.reset_password", "users", id, "critical", fiber.Map{"password_must_change": true}, "")
	return response.Success(c, fiber.Map{"id": id, "password_must_change": true}, "Contraseña temporal actualizada")
}

func normalizeScopedUserRequest(req *scopedUserRequest) {
	req.TenantID = strings.TrimSpace(req.TenantID)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.Role = rbac.NormalizeRole(req.Role)
	req.StudentID = strings.TrimSpace(req.StudentID)
	req.Relationship = strings.ToLower(strings.TrimSpace(req.Relationship))
	if req.Relationship == "" {
		req.Relationship = "guardian"
	}
}

func validateScopedUserRequest(req scopedUserRequest, creating bool) error {
	parsed, err := mail.ParseAddress(req.Email)
	if err != nil || !strings.EqualFold(parsed.Address, req.Email) {
		return fmt.Errorf("correo electrónico inválido")
	}
	if len([]rune(req.FirstName)) < 2 || len([]rune(req.FirstName)) > 100 {
		return fmt.Errorf("el nombre debe tener entre 2 y 100 caracteres")
	}
	if len([]rune(req.LastName)) < 2 || len([]rune(req.LastName)) > 100 {
		return fmt.Errorf("el apellido debe tener entre 2 y 100 caracteres")
	}
	if err := rbac.ValidateScope(req.Role, req.TenantID); err != nil {
		return err
	}
	if creating {
		if err := passwordpolicy.Validate(req.Password); err != nil {
			return err
		}
	}
	if (req.Role == rbac.RoleStudent || req.Role == rbac.RoleParent) && creating && req.StudentID == "" {
		return fmt.Errorf("el rol %s requiere vincular un estudiante de la misma escuela", req.Role)
	}
	if req.Role == rbac.RoleParent {
		valid := map[string]bool{"mother": true, "father": true, "guardian": true, "other": true}
		if !valid[req.Relationship] {
			return fmt.Errorf("parentesco no permitido")
		}
	}
	return nil
}

func (h *Handler) validateTenantExists(c *fiber.Ctx, tenantID string) error {
	if tenantID == "" {
		return nil
	}
	var exists bool
	if err := h.db.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM tenants WHERE id::text = $1 AND deleted_at IS NULL)", tenantID).Scan(&exists); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo validar la escuela")
	}
	if !exists {
		return response.Error(c, fiber.StatusNotFound, "Escuela no encontrada")
	}
	return nil
}

func scopedEmailExistsTx(c *fiber.Ctx, tx *database.Tx, tenantID, email, excludeID string) (bool, error) {
	var exists bool
	err := tx.QueryRow(c.UserContext(), `
		SELECT EXISTS(
			SELECT 1 FROM users
			WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL
			  AND (($2 = '' AND tenant_id IS NULL) OR tenant_id::text = $2)
			  AND ($3 = '' OR id::text <> $3)
		)`, email, tenantID, excludeID).Scan(&exists)
	return exists, err
}

func syncScopedUserLinks(c *fiber.Ctx, tx *database.Tx, userID, tenantID, previousRole, nextRole, studentID, relationship string) error {
	if tenantID == "" {
		return nil
	}
	roleChanged := previousRole != "" && previousRole != nextRole
	if roleChanged && previousRole == rbac.RoleStudent {
		if _, err := tx.Exec(c.UserContext(), "UPDATE students SET user_id = NULL WHERE tenant_id::text = $1 AND user_id::text = $2", tenantID, userID); err != nil {
			return fmt.Errorf("no se pudo retirar la vinculación anterior del estudiante")
		}
	}
	if roleChanged && previousRole == rbac.RoleParent {
		if _, err := tx.Exec(c.UserContext(), "DELETE FROM parent_student WHERE parent_id::text = $1", userID); err != nil {
			return fmt.Errorf("no se pudieron retirar las vinculaciones anteriores del tutor")
		}
	}

	if nextRole == rbac.RoleStudent {
		if studentID == "" {
			if previousRole == rbac.RoleStudent {
				return nil
			}
			return fmt.Errorf("debes seleccionar el estudiante que usará esta cuenta")
		}
		if previousRole == rbac.RoleStudent {
			_, _ = tx.Exec(c.UserContext(), "UPDATE students SET user_id = NULL WHERE tenant_id::text = $1 AND user_id::text = $2 AND id::text <> $3", tenantID, userID, studentID)
		}
		result, err := tx.Exec(c.UserContext(), `
			UPDATE students SET user_id = $1
			WHERE id::text = $2 AND tenant_id::text = $3 AND deleted_at IS NULL
			  AND (user_id IS NULL OR user_id::text = $1)`, userID, studentID, tenantID)
		if err != nil || result.RowsAffected() == 0 {
			return fmt.Errorf("el estudiante no pertenece a la escuela o ya tiene otra cuenta")
		}
	}
	if nextRole == rbac.RoleParent {
		if studentID == "" {
			if previousRole == rbac.RoleParent {
				return nil
			}
			return fmt.Errorf("debes seleccionar al menos un estudiante vinculado")
		}
		var studentExists bool
		if err := tx.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM students WHERE id::text = $1 AND tenant_id::text = $2 AND deleted_at IS NULL)", studentID, tenantID).Scan(&studentExists); err != nil || !studentExists {
			return fmt.Errorf("el estudiante seleccionado no pertenece a la escuela")
		}
		_, err := tx.Exec(c.UserContext(), `
			INSERT INTO parent_student (parent_id, student_id, relationship, is_primary, tenant_id)
			VALUES ($1, $2, $3, true, $4)
			ON CONFLICT (parent_id, student_id)
			DO UPDATE SET relationship = EXCLUDED.relationship, tenant_id = EXCLUDED.tenant_id`,
			userID, studentID, relationship, tenantID)
		if err != nil {
			return fmt.Errorf("no se pudo vincular el tutor con el estudiante")
		}
	}
	return nil
}

func (h *Handler) scopedUserIdentity(c *fiber.Ctx, id string) (scopedUserIdentity, error) {
	var user scopedUserIdentity
	err := h.db.QueryRow(c.UserContext(), `
		SELECT id, COALESCE(tenant_id::text, ''), email, first_name, last_name, role, is_active
		FROM users WHERE id::text = $1 AND deleted_at IS NULL`, id).
		Scan(&user.ID, &user.TenantID, &user.Email, &user.FirstName, &user.LastName, &user.Role, &user.IsActive)
	return user, err
}

var errLastActiveSuperAdmin = errors.New("last active super admin")

// guardLastActiveSuperAdminTx locks every global account in deterministic
// order, then evaluates the invariant from that same locked result set. This
// serializes concurrent deactivation, demotion and deletion attempts on both
// PostgreSQL and MySQL without a count-then-update race.
func guardLastActiveSuperAdminTx(ctx context.Context, tx *database.Tx, targetID string, targetWillRemainActiveSuper bool) error {
	rows, err := tx.Query(ctx, `
		SELECT id::text, role, is_active
		FROM users
		WHERE tenant_id IS NULL AND deleted_at IS NULL
		ORDER BY id
		FOR UPDATE`)
	if err != nil {
		return fmt.Errorf("lock global administrators: %w", err)
	}
	defer rows.Close()
	targetIsActiveSuper := false
	otherActiveSupers := 0
	for rows.Next() {
		var id, role string
		var active bool
		if err := rows.Scan(&id, &role, &active); err != nil {
			return fmt.Errorf("read global administrator lock: %w", err)
		}
		if role != rbac.RoleSuperAdmin || !active {
			continue
		}
		if id == targetID {
			targetIsActiveSuper = true
		} else {
			otherActiveSupers++
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("read global administrator locks: %w", err)
	}
	if targetIsActiveSuper && !targetWillRemainActiveSuper && otherActiveSupers == 0 {
		return errLastActiveSuperAdmin
	}
	return nil
}

func lastActiveSuperAdminResponse(c *fiber.Ctx, err error) error {
	if errors.Is(err, errLastActiveSuperAdmin) {
		return response.Error(c, fiber.StatusConflict, "No se puede desactivar, degradar ni eliminar el ultimo Super Admin activo")
	}
	return response.Error(c, fiber.StatusInternalServerError, "No se pudo validar la continuidad administrativa")
}

func currentActorID(c *fiber.Ctx) string {
	id, _ := c.Locals("user_id").(string)
	return id
}
