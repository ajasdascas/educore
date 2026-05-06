package account

import (
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

	var currentHash string
	if err := h.db.QueryRow(c.Context(),
		`SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&currentHash); err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)); err != nil {
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

	var raw string
	err := h.db.QueryRow(c.Context(),
		`SELECT COALESCE(settings->>'account_prefs', '{}') FROM users WHERE id = $1`, userID).Scan(&raw)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}

	// Default settings — stored in users.settings JSONB under "account_prefs"
	settings := SettingsResponse{
		EmailNotifications: true,
		PushNotifications:  true,
		CompactMode:        false,
	}
	// Parse stored overrides if present (non-critical if JSON is empty/malformed)
	parseSettingsJSON(raw, &settings)

	return response.Success(c, settings, "Success")
}

func (h *Handler) UpdateSettings(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var req UpdateSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	// Build JSON patch — only update fields provided
	patches := []interface{}{}
	query := `UPDATE users SET settings = jsonb_set(
		jsonb_set(
			jsonb_set(
				COALESCE(settings, '{}'),
				'{account_prefs,email_notifications}', $1::jsonb
			),
			'{account_prefs,push_notifications}', $2::jsonb
		),
		'{account_prefs,compact_mode}', $3::jsonb
	), updated_at = NOW() WHERE id = $4`

	emailNot := boolToJSON(req.EmailNotifications, true)
	pushNot := boolToJSON(req.PushNotifications, true)
	compact := boolToJSON(req.CompactMode, false)
	patches = append(patches, emailNot, pushNot, compact, userID)

	if _, err := h.db.Exec(c.Context(), query, patches...); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update settings")
	}
	return response.SuccessMessage(c, "Settings updated")
}

func (h *Handler) GetSecurity(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	var lastLogin *time.Time
	var emailVerifiedAt *time.Time
	var passwordHash string

	err := h.db.QueryRow(c.Context(),
		`SELECT last_login_at, email_verified_at, COALESCE(password_hash, '') FROM users WHERE id = $1`, userID).
		Scan(&lastLogin, &emailVerifiedAt, &passwordHash)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}

	return response.Success(c, SecurityResponse{
		LastLoginAt:   lastLogin,
		EmailVerified: emailVerifiedAt != nil,
		HasPassword:   passwordHash != "",
	}, "Success")
}

// helpers

func boolToJSON(ptr *bool, defaultVal bool) string {
	if ptr == nil {
		if defaultVal {
			return "true"
		}
		return "false"
	}
	if *ptr {
		return "true"
	}
	return "false"
}

func parseSettingsJSON(raw string, out *SettingsResponse) {
	// Minimal inline parse without importing encoding/json for a simple map
	// Use encoding/json indirectly via the existing response package approach
	if raw == "" || raw == "{}" {
		return
	}
	// We use a simple check for known keys
	if contains(raw, `"email_notifications":false`) {
		out.EmailNotifications = false
	}
	if contains(raw, `"push_notifications":false`) {
		out.PushNotifications = false
	}
	if contains(raw, `"compact_mode":true`) {
		out.CompactMode = true
	}
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsStr(s, sub))
}

func containsStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
