package auth

import (
	"crypto/rand"
	"educore/internal/pkg/email"
	"educore/internal/pkg/jwt"
	"educore/internal/pkg/redis"
	"educore/internal/pkg/response"
	"encoding/hex"
	"log"
	"strconv"
	"strings"
	"time"

	"educore/internal/pkg/database"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	db            *database.DB
	jwtSecret     string
	jwtExpiry     time.Duration
	refreshExpiry time.Duration
	redis         *redis.Client
	emailClient   *email.Client
}

func NewHandler(db *database.DB, secret string, expiry, refreshExpiry time.Duration, redisClient *redis.Client, emailClient *email.Client) *Handler {
	return &Handler{
		db:            db,
		jwtSecret:     secret,
		jwtExpiry:     expiry,
		refreshExpiry: refreshExpiry,
		redis:         redisClient,
		emailClient:   emailClient,
	}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Post("/login", h.Login)
	router.Post("/refresh", h.Refresh)
	router.Post("/logout", h.Logout)
	router.Post("/forgot-password", h.ForgotPassword)
	router.Post("/reset-password", h.ResetPassword)
	router.Post("/accept-invitation", h.AcceptInvitation)
}

func (h *Handler) RegisterProtectedRoutes(router fiber.Router) {
	router.Post("/change-password", h.ChangePassword)
}

// --- DTOs ---

type LoginRequest struct {
	Email         string `json:"email"`
	Password      string `json:"password"`
	Role          string `json:"role"`
	TenantID      string `json:"tenant_id"`
	TenantSlug    string `json:"tenant_slug"`
	RequestedRole string `json:"requested_role"` // portal role the user selected (teacher/parent/student/school_admin)
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

type AcceptInvitationRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

// --- Handlers ---

func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request body")
	}

	if req.Email == "" || req.Password == "" {
		return response.Error(c, fiber.StatusBadRequest, "Email and password are required")
	}

	var id, role, hash, email string
	var tenantIDPtr *string
	tenantScope := req.TenantID
	if tenantScope == "" && req.TenantSlug != "" {
		_ = h.db.QueryRow(c.Context(), "SELECT id FROM tenants WHERE slug = $1 AND status = 'active'", req.TenantSlug).Scan(&tenantScope)
	}

	query := `SELECT id, tenant_id, role, password_hash, email
		FROM users
		WHERE email = $1 AND is_active = true`
	args := []interface{}{req.Email}
	argCount := 1
	if req.Role != "" {
		argCount++
		query += ` AND role = $` + strconv.Itoa(argCount)
		args = append(args, req.Role)
	}
	if tenantScope != "" {
		argCount++
		query += ` AND tenant_id = $` + strconv.Itoa(argCount)
		args = append(args, tenantScope)
	} else if req.Role == "SUPER_ADMIN" {
		query += ` AND tenant_id IS NULL`
	} else if req.Role != "" && req.Role != "SUPER_ADMIN" {
		query += ` AND tenant_id IS NOT NULL`
	}
	query += ` ORDER BY CASE WHEN tenant_id IS NULL THEN 0 ELSE 1 END, created_at DESC LIMIT 1`

	err := h.db.QueryRow(c.Context(), query, args...).Scan(&id, &tenantIDPtr, &role, &hash, &email)

	if err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "Invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "Invalid credentials")
	}

	// Validate requested_role matches the user's actual role.
	// requested_role uses lowercase portal names; role in DB is uppercase.
	if req.RequestedRole != "" {
		// Map portal role names → accepted DB roles (uppercase)
		portalRoleMap := map[string][]string{
			"school_admin": {"SCHOOL_ADMIN", "ADMIN", "DIRECTOR"},
			"teacher":      {"TEACHER"},
			"parent":       {"PARENT"},
			"student":      {"STUDENT"},
		}
		accepted, known := portalRoleMap[strings.ToLower(req.RequestedRole)]
		if !known {
			return response.Error(c, fiber.StatusBadRequest, "Invalid requested_role")
		}
		// SUPER_ADMIN must not use school portals
		if role == "SUPER_ADMIN" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success":        false,
				"code":           "ROLE_MISMATCH",
				"message":        "SUPER_ADMIN debe usar el Manager Maestro o Modo Soporte.",
				"actual_role":    role,
				"requested_role": req.RequestedRole,
			})
		}
		// Check if actual role is in the accepted list
		matched := false
		for _, r := range accepted {
			if strings.EqualFold(role, r) {
				matched = true
				break
			}
		}
		if !matched {
			roleMessages := map[string]string{
				"teacher": "Este correo no pertenece a un profesor de esta escuela.",
				"parent":  "Este correo no pertenece a un padre/tutor de esta escuela.",
				"student": "Este correo no pertenece a un estudiante de esta escuela.",
			}
			msg, hasMSG := roleMessages[strings.ToLower(req.RequestedRole)]
			if !hasMSG {
				msg = "Este correo no pertenece al portal seleccionado."
			}
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success":        false,
				"code":           "ROLE_MISMATCH",
				"message":        msg,
				"actual_role":    role,
				"requested_role": req.RequestedRole,
			})
		}
	}

	tenantID := ""
	if tenantIDPtr != nil {
		tenantID = *tenantIDPtr
	}

	// Generate access token
	accessToken, err := jwt.GenerateToken(id, tenantID, role, email, h.jwtSecret, h.jwtExpiry)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error generating token")
	}

	// Generate refresh token
	refreshToken, err := jwt.GenerateToken(id, tenantID, role, email, h.jwtSecret, h.refreshExpiry)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error generating refresh token")
	}

	// Update last_login_at
	_, _ = h.db.Exec(c.Context(), "UPDATE users SET last_login_at = NOW() WHERE id = $1", id)

	// Set refresh token as httpOnly cookie
	secureCookie := c.Protocol() == "https" || c.Get("X-Forwarded-Proto") == "https"
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(h.refreshExpiry),
		HTTPOnly: true,
		Secure:   secureCookie,
		SameSite: "Lax",
		Path:     "/",
	})

	return response.Success(c, fiber.Map{
		"access_token": accessToken,
		"expires_in":   int(h.jwtExpiry.Seconds()),
		"user": fiber.Map{
			"id":        id,
			"role":      role,
			"email":     email,
			"tenant_id": tenantID,
		},
	}, "Login successful")
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		return response.Error(c, fiber.StatusUnauthorized, "No refresh token")
	}

	claims, err := jwt.ValidateToken(refreshToken, h.jwtSecret)
	if err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "Invalid refresh token")
	}

	accessToken, err := jwt.GenerateToken(claims.UserID, claims.TenantID, claims.Role, claims.Email, h.jwtSecret, h.jwtExpiry)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error generating token")
	}

	return response.Success(c, fiber.Map{
		"access_token": accessToken,
		"expires_in":   int(h.jwtExpiry.Seconds()),
	}, "Token refreshed")
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	secureCookie := c.Protocol() == "https" || c.Get("X-Forwarded-Proto") == "https"
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   secureCookie,
		SameSite: "Lax",
		Path:     "/",
	})
	return response.Success(c, nil, "Logged out")
}

func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	tokenBytes := make([]byte, 32)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	result, err := h.db.Exec(c.Context(),
		"UPDATE users SET invitation_token = $1, invitation_expires_at = NOW() + INTERVAL '1 hour' WHERE email = $2",
		token, req.Email)

	if err != nil || result.RowsAffected() == 0 {
		return response.Success(c, nil, "If the email exists, a reset link has been sent")
	}

	if h.emailClient != nil && h.emailClient.Configured() {
		if sendErr := h.emailClient.SendPasswordReset(c.Context(), req.Email, token); sendErr != nil {
			log.Printf("auth.ForgotPassword: email send failed for %s: %v", req.Email, sendErr)
		}
	} else {
		log.Printf("auth.ForgotPassword: email provider not configured — reset token saved but not sent")
	}

	return response.Success(c, nil, "If the email exists, a reset link has been sent")
}

func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	if len(req.NewPassword) < 8 {
		return response.Error(c, fiber.StatusBadRequest, "Password must be at least 8 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error processing password")
	}

	result, err := h.db.Exec(c.Context(),
		"UPDATE users SET password_hash = $1, invitation_token = NULL, invitation_expires_at = NULL WHERE invitation_token = $2 AND invitation_expires_at > NOW()",
		string(hash), req.Token)

	if err != nil || result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusBadRequest, "Invalid or expired token")
	}

	return response.Success(c, nil, "Password updated successfully")
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return response.Error(c, fiber.StatusUnauthorized, "Unauthorized")
	}

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}
	if len(req.NewPassword) < 8 {
		return response.Error(c, fiber.StatusBadRequest, "New password must be at least 8 characters")
	}

	var currentHash string
	row := h.db.QueryRow(c.UserContext(), `SELECT password_hash FROM users WHERE id = $1`, userID)
	if err := row.Scan(&currentHash); err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)); err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "Current password is incorrect")
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error processing password")
	}
	if _, err := h.db.Exec(c.UserContext(), `UPDATE users SET password_hash = $1 WHERE id = $2`, string(newHash), userID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating password")
	}
	return response.Success(c, nil, "Password updated successfully")
}

func (h *Handler) AcceptInvitation(c *fiber.Ctx) error {
	var req AcceptInvitationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	if len(req.Password) < 8 {
		return response.Error(c, fiber.StatusBadRequest, "Password must be at least 8 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error processing password")
	}

	result, err := h.db.Exec(c.Context(),
		`UPDATE users SET password_hash = $1, invitation_token = NULL, invitation_expires_at = NULL, 
		 email_verified_at = NOW(), is_active = true 
		 WHERE invitation_token = $2 AND invitation_expires_at > NOW()`,
		string(hash), req.Token)

	if err != nil || result.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusBadRequest, "Invalid or expired invitation")
	}

	return response.Success(c, nil, "Account activated successfully")
}
