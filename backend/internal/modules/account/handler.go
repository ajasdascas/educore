package account

import (
	"database/sql"
	"educore/internal/pkg/database"
	"educore/internal/pkg/response"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	db *database.DB
}

func NewHandler(db *database.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/profile", h.GetProfile)
	router.Put("/profile", h.UpdateProfile)
	router.Put("/password", h.UpdatePassword)
	router.Get("/settings", h.GetSettings)
	router.Put("/settings", h.UpdateSettings)
	router.Get("/security", h.GetSecurity)
}

// --- DTOs ---

type ProfileResponse struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Role      string  `json:"role"`
	AvatarURL *string `json:"avatar_url"`
	IsActive  bool    `json:"is_active"`
}

type UpdateProfileRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type UpdatePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type SettingsResponse struct {
	EmailNotifications bool `json:"email_notifications"`
	PushNotifications  bool `json:"push_notifications"`
	CompactMode        bool `json:"compact_mode"`
}

type UpdateSettingsRequest struct {
	EmailNotifications *bool `json:"email_notifications"`
	PushNotifications  *bool `json:"push_notifications"`
	CompactMode        *bool `json:"compact_mode"`
}

type SecurityResponse struct {
	LastLoginAt    *time.Time `json:"last_login_at"`
	EmailVerified  bool       `json:"email_verified"`
	HasPassword    bool       `json:"has_password"`
}

// --- Handlers ---

func (h *Handler) GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var p ProfileResponse
	var avatarURL *string
	err := h.db.QueryRow(c.Context(),
		`SELECT id, email, first_name, last_name, role, avatar_url, is_active
		 FROM users WHERE id = $1`, userID).
		Scan(&p.ID, &p.Email, &p.FirstName, &p.LastName, &p.Role, &avatarURL, &p.IsActive)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}
	p.AvatarURL = avatarURL
	return response.Success(c, p, "Success")
}

func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if len(req.FirstName) < 2 || len(req.LastName) < 2 {
		return response.Error(c, fiber.StatusUnprocessableEntity, "First and last name must be at least 2 characters")
	}

	_, err := h.db.Exec(c.Context(),
		`UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3`,
		req.FirstName, req.LastName, userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update profile")
	}
	return response.SuccessMessage(c, "Profile updated")
}

func (h *Handler) UpdatePassword(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req UpdatePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if len(req.NewPassword) < 8 {
		return response.Error(c, fiber.StatusUnprocessableEntity, "New password must be at least 8 characters")
	}

	var currentHash sql.NullString
	if err := h.db.QueryRow(c.Context(),
		`SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&currentHash); err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}
	if !currentHash.Valid || currentHash.String == "" {
		return response.Error(c, fiber.StatusBadRequest, "Account has no password set — use invitation flow")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash.String), []byte(req.CurrentPassword)); err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "Current password is incorrect")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error processing password")
	}

	if _, err := h.db.Exec(c.Context(),
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
		string(hash), userID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update password")
	}
	return response.SuccessMessage(c, "Password updated")
}

func (h *Handler) GetSettings(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	// Verify user exists first
	var exists bool
	if err := h.db.QueryRow(c.Context(),
		`SELECT COUNT(*) > 0 FROM users WHERE id = $1`, userID).Scan(&exists); err != nil || !exists {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}

	settings := SettingsResponse{
		EmailNotifications: true,
		PushNotifications:  true,
		CompactMode:        false,
	}

	var emailNot, pushNot, compact sql.NullBool
	row := h.db.QueryRow(c.Context(),
		`SELECT email_notifications, push_notifications, compact_mode
		 FROM account_settings WHERE user_id = $1 LIMIT 1`, userID)
	if err := row.Scan(&emailNot, &pushNot, &compact); err == nil {
		if emailNot.Valid {
			settings.EmailNotifications = emailNot.Bool
		}
		if pushNot.Valid {
			settings.PushNotifications = pushNot.Bool
		}
		if compact.Valid {
			settings.CompactMode = compact.Bool
		}
	}
	// If no row, defaults are returned as-is

	return response.Success(c, settings, "Success")
}

func (h *Handler) UpdateSettings(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req UpdateSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	// Read current to apply partial updates
	current := SettingsResponse{EmailNotifications: true, PushNotifications: true, CompactMode: false}
	var emailNot, pushNot, compact sql.NullBool
	row := h.db.QueryRow(c.Context(),
		`SELECT email_notifications, push_notifications, compact_mode
		 FROM account_settings WHERE user_id = $1 LIMIT 1`, userID)
	if err := row.Scan(&emailNot, &pushNot, &compact); err == nil {
		if emailNot.Valid {
			current.EmailNotifications = emailNot.Bool
		}
		if pushNot.Valid {
			current.PushNotifications = pushNot.Bool
		}
		if compact.Valid {
			current.CompactMode = compact.Bool
		}
	}

	if req.EmailNotifications != nil {
		current.EmailNotifications = *req.EmailNotifications
	}
	if req.PushNotifications != nil {
		current.PushNotifications = *req.PushNotifications
	}
	if req.CompactMode != nil {
		current.CompactMode = *req.CompactMode
	}

	_, err := h.db.Exec(c.Context(),
		`INSERT INTO account_settings (user_id, email_notifications, push_notifications, compact_mode, updated_at)
		 VALUES ($1, $2, $3, $4, NOW())
		 ON CONFLICT (user_id) DO UPDATE SET
		   email_notifications = $2,
		   push_notifications  = $3,
		   compact_mode        = $4,
		   updated_at          = NOW()`,
		userID, current.EmailNotifications, current.PushNotifications, current.CompactMode)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update settings")
	}
	return response.SuccessMessage(c, "Settings updated")
}

func (h *Handler) GetSecurity(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var lastLogin *time.Time
	var emailVerifiedAt *time.Time
	var passwordHash sql.NullString

	err := h.db.QueryRow(c.Context(),
		`SELECT last_login_at, email_verified_at, password_hash FROM users WHERE id = $1`, userID).
		Scan(&lastLogin, &emailVerifiedAt, &passwordHash)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}

	return response.Success(c, SecurityResponse{
		LastLoginAt:   lastLogin,
		EmailVerified: emailVerifiedAt != nil,
		HasPassword:   passwordHash.Valid && passwordHash.String != "",
	}, "Success")
}

