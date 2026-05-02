package auth

import (
	"crypto/rand"
	"educore/internal/pkg/jwt"
	"educore/internal/pkg/redis"
	"educore/internal/pkg/response"
	"encoding/hex"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Handler struct {
	db            *pgxpool.Pool
	jwtSecret     string
	jwtExpiry     time.Duration
	refreshExpiry time.Duration
	redis         *redis.Client
}

func NewHandler(db *pgxpool.Pool, secret string, expiry, refreshExpiry time.Duration, redisClient *redis.Client) *Handler {
	return &Handler{
		db:            db,
		jwtSecret:     secret,
		jwtExpiry:     expiry,
		refreshExpiry: refreshExpiry,
		redis:         redisClient,
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

// --- DTOs ---

type LoginRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	Role       string `json:"role"`
	TenantID   string `json:"tenant_id"`
	TenantSlug string `json:"tenant_slug"`
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

	// Generate reset token
	tokenBytes := make([]byte, 32)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	// Save token in DB
	_, err := h.db.Exec(c.Context(),
		"UPDATE users SET invitation_token = $1, invitation_expires_at = NOW() + INTERVAL '1 hour' WHERE email = $2",
		token, req.Email)

	if err != nil {
		// Don't reveal if email exists
		return response.Success(c, nil, "If the email exists, a reset link has been sent")
	}

	// TODO: Send email via Resend with link: APP_BASE_URL/reset-password?token=<token>

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
