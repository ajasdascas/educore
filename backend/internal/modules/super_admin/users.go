package superadmin

import (
	"context"
	"educore/internal/pkg/response"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// GlobalUser represents a super admin user
type GlobalUser struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateGlobalUserRequest struct {
	Email     string `json:"email" validate:"required,email"`
	FirstName string `json:"first_name" validate:"required,min=2,max=100"`
	LastName  string `json:"last_name" validate:"required,min=2,max=100"`
	Password  string `json:"password" validate:"required,min=8"`
	IsActive  *bool  `json:"is_active"`
}

type UpdateGlobalUserRequest struct {
	Email     string `json:"email" validate:"email"`
	FirstName string `json:"first_name" validate:"min=2,max=100"`
	LastName  string `json:"last_name" validate:"min=2,max=100"`
	IsActive  *bool  `json:"is_active"`
}

// RegisterUserRoutes adds user management routes
func (h *Handler) RegisterUserRoutes(router fiber.Router) {
	router.Get("/users", h.ListGlobalUsers)
	router.Post("/users", h.CreateGlobalUser)
	router.Get("/users/:id", h.GetGlobalUser)
	router.Put("/users/:id", h.UpdateGlobalUser)
	router.Patch("/users/:id/toggle", h.ToggleGlobalUserStatus)
	router.Delete("/users/:id", h.DeleteGlobalUser)
	router.Get("/users/:id/activity", h.GetGlobalUserActivity)
}

// ListGlobalUsers retrieves all super admin users with pagination and filters
func (h *Handler) ListGlobalUsers(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	search := c.Query("search", "")
	status := c.Query("status", "") // active, inactive, all

	offset := (page - 1) * perPage

	// Build query with filters
	baseQuery := `
		SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at
		FROM users
		WHERE tenant_id IS NULL AND role = 'SUPER_ADMIN'
	`
	countQuery := `
		SELECT COUNT(*)
		FROM users
		WHERE tenant_id IS NULL AND role = 'SUPER_ADMIN'
	`

	var args []interface{}
	argIndex := 1

	// Add search filter
	if search != "" {
		searchFilter := fmt.Sprintf(" AND (first_name ILIKE $%d OR last_name ILIKE $%d OR email ILIKE $%d)", argIndex, argIndex+1, argIndex+2)
		baseQuery += searchFilter
		countQuery += searchFilter
		searchPattern := "%" + search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
		argIndex += 3
	}

	// Add status filter
	if status == "active" {
		statusFilter := fmt.Sprintf(" AND is_active = $%d", argIndex)
		baseQuery += statusFilter
		countQuery += statusFilter
		args = append(args, true)
		argIndex++
	} else if status == "inactive" {
		statusFilter := fmt.Sprintf(" AND is_active = $%d", argIndex)
		baseQuery += statusFilter
		countQuery += statusFilter
		args = append(args, false)
		argIndex++
	}

	// Get total count
	var total int
	if err := h.db.QueryRow(c.UserContext(), countQuery, args...).Scan(&total); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error counting users")
	}

	// Get users with pagination
	finalQuery := baseQuery + fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, perPage, offset)

	rows, err := h.db.Query(c.UserContext(), finalQuery, args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching users")
	}
	defer rows.Close()

	var users []GlobalUser
	for rows.Next() {
		var user GlobalUser
		err := rows.Scan(
			&user.ID, &user.Email, &user.FirstName, &user.LastName,
			&user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
		)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error scanning user")
		}
		users = append(users, user)
	}

	if users == nil {
		users = []GlobalUser{}
	}

	return response.SuccessWithMeta(c, users, response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

// CreateGlobalUser creates a new super admin user
func (h *Handler) CreateGlobalUser(c *fiber.Ctx) error {
	var req CreateGlobalUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// Set default values
	if req.IsActive == nil {
		defaultActive := true
		req.IsActive = &defaultActive
	}

	// Check if email already exists
	var exists bool
	if err := h.db.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error checking email")
	}
	if exists {
		return response.Error(c, fiber.StatusConflict, "Email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error hashing password")
	}

	// Insert user
	var userID string
	err = h.db.QueryRow(c.UserContext(), `
		INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
		VALUES (NULL, $1, $2, $3, $4, 'SUPER_ADMIN', $5)
		RETURNING id
	`, req.Email, string(hashedPassword), req.FirstName, req.LastName, *req.IsActive).Scan(&userID)

	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error creating user")
	}

	// Fetch the created user
	user, err := h.fetchGlobalUser(c.UserContext(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching created user")
	}

	return response.Success(c, user, "Global user created successfully")
}

// GetGlobalUser retrieves a specific super admin user
func (h *Handler) GetGlobalUser(c *fiber.Ctx) error {
	id := c.Params("id")

	user, err := h.fetchGlobalUser(c.UserContext(), id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}

	return response.Success(c, user, "Global user retrieved")
}

// UpdateGlobalUser updates a super admin user
func (h *Handler) UpdateGlobalUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var req UpdateGlobalUserRequest

	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	// Check if user exists
	exists, err := h.globalUserExists(c.UserContext(), id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error checking user")
	}
	if !exists {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}

	// Build dynamic update query
	setParts := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Email != "" {
		// Check if new email already exists (excluding current user)
		var emailExists bool
		if err := h.db.QueryRow(c.UserContext(), "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND id != $2)", req.Email, id).Scan(&emailExists); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Error checking email")
		}
		if emailExists {
			return response.Error(c, fiber.StatusConflict, "Email already exists")
		}
		setParts = append(setParts, fmt.Sprintf("email = $%d", argIndex))
		args = append(args, req.Email)
		argIndex++
	}

	if req.FirstName != "" {
		setParts = append(setParts, fmt.Sprintf("first_name = $%d", argIndex))
		args = append(args, req.FirstName)
		argIndex++
	}

	if req.LastName != "" {
		setParts = append(setParts, fmt.Sprintf("last_name = $%d", argIndex))
		args = append(args, req.LastName)
		argIndex++
	}

	if req.IsActive != nil {
		setParts = append(setParts, fmt.Sprintf("is_active = $%d", argIndex))
		args = append(args, *req.IsActive)
		argIndex++
	}

	if len(setParts) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "No fields to update")
	}

	// Add updated_at
	setParts = append(setParts, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now())
	argIndex++

	// Add WHERE clause
	args = append(args, id)

	query := fmt.Sprintf("UPDATE users SET %s WHERE id = $%d AND tenant_id IS NULL AND role = 'SUPER_ADMIN'",
		strings.Join(setParts, ", "), argIndex)

	_, err = h.db.Exec(c.UserContext(), query, args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating user")
	}

	// Fetch updated user
	user, err := h.fetchGlobalUser(c.UserContext(), id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error fetching updated user")
	}

	return response.Success(c, user, "Global user updated successfully")
}

// ToggleGlobalUserStatus toggles the active status of a user
func (h *Handler) ToggleGlobalUserStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	// Get current status
	var currentStatus bool
	err := h.db.QueryRow(c.UserContext(),
		"SELECT is_active FROM users WHERE id = $1 AND tenant_id IS NULL AND role = 'SUPER_ADMIN'",
		id).Scan(&currentStatus)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}

	// Toggle status
	newStatus := !currentStatus
	_, err = h.db.Exec(c.UserContext(),
		"UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3 AND tenant_id IS NULL AND role = 'SUPER_ADMIN'",
		newStatus, time.Now(), id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating user status")
	}

	return response.Success(c, fiber.Map{
		"id":        id,
		"is_active": newStatus,
	}, "User status updated successfully")
}

// DeleteGlobalUser deactivates a user (soft delete)
func (h *Handler) DeleteGlobalUser(c *fiber.Ctx) error {
	id := c.Params("id")

	// Cannot delete yourself
	currentUser := c.Locals("user")
	if currentUser != nil {
		if userMap, ok := currentUser.(map[string]interface{}); ok {
			if currentUserID, ok := userMap["id"].(string); ok && currentUserID == id {
				return response.Error(c, fiber.StatusForbidden, "Cannot delete your own account")
			}
		}
	}

	// Soft delete (deactivate)
	result, err := h.db.Exec(c.UserContext(),
		"UPDATE users SET is_active = false, updated_at = $1 WHERE id = $2 AND tenant_id IS NULL AND role = 'SUPER_ADMIN'",
		time.Now(), id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error deactivating user")
	}

	if result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}

	return response.Success(c, fiber.Map{"id": id}, "User deactivated successfully")
}

// GetGlobalUserActivity gets recent activity log for a user
func (h *Handler) GetGlobalUserActivity(c *fiber.Ctx) error {
	id := c.Params("id")

	// Check if user exists
	exists, err := h.globalUserExists(c.UserContext(), id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error checking user")
	}
	if !exists {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}

	// For now, return placeholder data
	// TODO: Implement actual activity tracking
	activities := []fiber.Map{
		{
			"action":      "login",
			"description": "Logged into the platform",
			"ip_address":  "192.168.1.100",
			"timestamp":   time.Now().Add(-2 * time.Hour),
		},
		{
			"action":      "school_created",
			"description": "Created school: Colegio San Miguel",
			"ip_address":  "192.168.1.100",
			"timestamp":   time.Now().Add(-24 * time.Hour),
		},
	}

	return response.Success(c, activities, "User activity retrieved")
}

// Helper functions

func (h *Handler) fetchGlobalUser(ctx context.Context, id string) (GlobalUser, error) {
	var user GlobalUser
	err := h.db.QueryRow(ctx, `
		SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at
		FROM users
		WHERE id = $1 AND tenant_id IS NULL AND role = 'SUPER_ADMIN'
	`, id).Scan(
		&user.ID, &user.Email, &user.FirstName, &user.LastName,
		&user.Role, &user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)
	return user, err
}

func (h *Handler) globalUserExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := h.db.QueryRow(ctx,
		"SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND tenant_id IS NULL AND role = 'SUPER_ADMIN')",
		id).Scan(&exists)
	return exists, err
}
