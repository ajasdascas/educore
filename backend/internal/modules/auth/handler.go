package auth

import (
	"educore/internal/pkg/jwt"
	"educore/internal/pkg/passwordpolicy"
	"educore/internal/pkg/redis"
	"educore/internal/pkg/response"
	"os"
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
	resetSender   passwordResetEmailSender
	appBaseURL    string
	rateLimiter   *authRateLimiter
	rateLimits    authRateLimitConfig
}

func NewHandler(db *database.DB, secret string, expiry, refreshExpiry time.Duration, redisClient *redis.Client) *Handler {
	return &Handler{
		db:            db,
		jwtSecret:     secret,
		jwtExpiry:     expiry,
		refreshExpiry: refreshExpiry,
		redis:         redisClient,
		resetSender:   newResendEmailSenderFromEnv(),
		appBaseURL:    strings.TrimSpace(os.Getenv("APP_BASE_URL")),
		rateLimiter:   newAuthRateLimiter(redisClient),
		rateLimits:    loadAuthRateLimitConfig(),
	}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Post("/login", h.rateLimiter.middleware(authRateLimitRule{
		name: "login", ipLimit: h.rateLimits.LoginIPLimit, subjectLimit: h.rateLimits.LoginSubjectLimit,
		window: h.rateLimits.Window, subject: loginRateLimitSubject,
	}), h.Login)
	router.Post("/refresh", h.Refresh)
	router.Post("/logout", h.Logout)
	router.Post("/forgot-password", h.rateLimiter.middleware(authRateLimitRule{
		name: "forgot", ipLimit: h.rateLimits.ForgotIPLimit, subjectLimit: h.rateLimits.ForgotSubjectLimit,
		window: h.rateLimits.Window, subject: forgotRateLimitSubject,
	}), h.ForgotPassword)
	router.Post("/reset-password", h.rateLimiter.middleware(authRateLimitRule{
		name: "reset", ipLimit: h.rateLimits.ResetIPLimit, subjectLimit: h.rateLimits.ResetSubjectLimit,
		window: h.rateLimits.Window, subject: resetRateLimitSubject,
	}), h.ResetPassword)
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
	Email      string `json:"email"`
	TenantSlug string `json:"tenant_slug"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
	TenantSlug  string `json:"tenant_slug"`
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

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.TenantSlug = strings.ToLower(strings.TrimSpace(req.TenantSlug))

	var id, role, hash, email, tenantSlug string
	var authVersion int
	var passwordMustChange bool
	var tenantIDPtr *string
	tenantScope := req.TenantID
	if tenantScope == "" && req.TenantSlug != "" {
		if err := h.db.QueryRow(c.Context(), `
			SELECT id FROM tenants
			WHERE slug = $1 AND status IN ('active', 'trial') AND deleted_at IS NULL`, req.TenantSlug).Scan(&tenantScope); err != nil {
			return response.Error(c, fiber.StatusUnauthorized, "Invalid credentials")
		}
	}

	query := `SELECT u.id, u.tenant_id, u.role, u.password_hash, u.email, u.auth_version,
		       u.password_must_change, COALESCE(t.slug, '')
		FROM users u
		LEFT JOIN tenants t ON t.id = u.tenant_id
		WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true AND u.deleted_at IS NULL
		  AND (u.tenant_id IS NULL OR (t.status IN ('active', 'trial') AND t.deleted_at IS NULL))`
	args := []interface{}{req.Email}
	argCount := 1
	if req.Role != "" {
		argCount++
		query += ` AND u.role = $` + strconv.Itoa(argCount)
		args = append(args, req.Role)
	}
	if tenantScope != "" {
		argCount++
		query += ` AND u.tenant_id = $` + strconv.Itoa(argCount)
		args = append(args, tenantScope)
	} else {
		// The main-domain login is the global scope. School accounts must carry
		// an explicit, active tenant slug so duplicate emails cannot cross tenants.
		query += ` AND u.tenant_id IS NULL AND u.role = 'SUPER_ADMIN'`
	}
	query += ` ORDER BY u.created_at DESC LIMIT 1`

	err := h.db.QueryRow(c.Context(), query, args...).Scan(
		&id, &tenantIDPtr, &role, &hash, &email, &authVersion, &passwordMustChange, &tenantSlug,
	)

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

	// Record the successful login before issuing tokens so the returned session
	// reflects the latest persisted account state.
	if _, err := h.db.Exec(c.Context(), "UPDATE users SET last_login_at = NOW() WHERE id = $1", id); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error recording login")
	}

	// Generate access token
	accessToken, err := jwt.GenerateToken(id, tenantID, role, email, authVersion, jwt.TokenTypeAccess, h.jwtSecret, h.jwtExpiry)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error generating token")
	}

	// Generate refresh token
	refreshToken, err := jwt.GenerateToken(id, tenantID, role, email, authVersion, jwt.TokenTypeRefresh, h.jwtSecret, h.refreshExpiry)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error generating refresh token")
	}

	// Set refresh token as httpOnly cookie
	secureCookie := c.Protocol() == "https" || c.Get("X-Forwarded-Proto") == "https"
	sameSite := "Lax"
	if secureCookie {
		// The static frontend and API may use different HTTPS origins in
		// production. SameSite=None is required for credentialed refresh calls.
		sameSite = "None"
	}
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(h.refreshExpiry),
		HTTPOnly: true,
		Secure:   secureCookie,
		SameSite: sameSite,
		Path:     "/",
	})

	return response.Success(c, fiber.Map{
		"access_token": accessToken,
		"expires_in":   int(h.jwtExpiry.Seconds()),
		"user": fiber.Map{
			"id":                   id,
			"role":                 role,
			"email":                email,
			"tenant_id":            tenantID,
			"tenant_slug":          tenantSlug,
			"password_must_change": passwordMustChange,
		},
	}, "Login successful")
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		return response.Error(c, fiber.StatusUnauthorized, "No refresh token")
	}

	claims, err := jwt.ValidateToken(refreshToken, h.jwtSecret, jwt.TokenTypeRefresh)
	if err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "Invalid refresh token")
	}
	var role, email string
	var authVersion int
	var passwordMustChange bool
	var tenantIDPtr *string
	if err := h.db.QueryRow(c.Context(), `
		SELECT role, email, tenant_id, auth_version, password_must_change
		FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL
		  AND (tenant_id IS NULL OR EXISTS (
		    SELECT 1 FROM tenants t WHERE t.id = users.tenant_id AND t.status IN ('active', 'trial') AND t.deleted_at IS NULL
		  ))`, claims.UserID).
		Scan(&role, &email, &tenantIDPtr, &authVersion, &passwordMustChange); err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "Account is inactive or no longer exists")
	}
	tenantID := ""
	if tenantIDPtr != nil {
		tenantID = *tenantIDPtr
	}
	if !strings.EqualFold(role, claims.Role) || !strings.EqualFold(email, claims.Email) || tenantID != claims.TenantID || claims.AuthVersion <= 0 || authVersion != claims.AuthVersion {
		return response.Error(c, fiber.StatusUnauthorized, "Session was revoked; sign in again")
	}
	if passwordMustChange {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"success": false,
			"code":    "PASSWORD_CHANGE_REQUIRED",
			"error":   "Debes cambiar tu contrasena temporal antes de continuar",
		})
	}

	accessToken, err := jwt.GenerateToken(claims.UserID, tenantID, role, email, authVersion, jwt.TokenTypeAccess, h.jwtSecret, h.jwtExpiry)
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
	sameSite := "Lax"
	if secureCookie {
		sameSite = "None"
	}
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   secureCookie,
		SameSite: sameSite,
		Path:     "/",
	})
	return response.Success(c, nil, "Logged out")
}

func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	return h.handleForgotPassword(c)
}

func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	return h.handleResetPassword(c)
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
	if strings.TrimSpace(req.CurrentPassword) == "" {
		return response.Error(c, fiber.StatusBadRequest, "Current password is required")
	}
	if err := passwordpolicy.Validate(req.NewPassword); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error processing password")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error starting password change")
	}
	defer tx.Rollback(c.UserContext())
	var currentHash string
	if err := tx.QueryRow(c.UserContext(), `
		SELECT password_hash FROM users
		WHERE id = $1 AND is_active = true AND deleted_at IS NULL
		FOR UPDATE`, userID).Scan(&currentHash); err != nil {
		return response.Error(c, fiber.StatusNotFound, "User not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)); err != nil {
		return response.Error(c, fiber.StatusUnauthorized, "Current password is incorrect")
	}
	result, err := tx.Exec(c.UserContext(), `
		UPDATE users SET password_hash = $1, password_must_change = false,
			auth_version = auth_version + 1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND is_active = true AND deleted_at IS NULL`, string(newHash), userID)
	if err != nil || result.RowsAffected() != 1 {
		return response.Error(c, fiber.StatusInternalServerError, "Error updating password")
	}
	if _, err := tx.Exec(c.UserContext(), `
		UPDATE password_reset_tokens SET revoked_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`, userID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error revoking password recovery links")
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error saving password")
	}
	return response.Success(c, nil, "Password updated successfully")
}

func (h *Handler) AcceptInvitation(c *fiber.Ctx) error {
	var req AcceptInvitationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid request")
	}

	if err := passwordpolicy.Validate(req.Password); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error processing password")
	}

	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error starting account activation")
	}
	defer tx.Rollback(c.UserContext())
	var userID string
	if err := tx.QueryRow(c.UserContext(), `
		SELECT id::text FROM users
		WHERE invitation_token = $1 AND invitation_expires_at > NOW()
		FOR UPDATE`, req.Token).Scan(&userID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid or expired invitation")
	}
	result, err := tx.Exec(c.UserContext(),
		`UPDATE users SET password_hash = $1, invitation_token = NULL, invitation_expires_at = NULL,
		 email_verified_at = NOW(), is_active = true, password_must_change = false,
		 auth_version = auth_version + 1, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $2 AND invitation_token = $3 AND invitation_expires_at > NOW()`,
		string(hash), userID, req.Token)

	if err != nil || result.RowsAffected() != 1 {
		return response.Error(c, fiber.StatusBadRequest, "Invalid or expired invitation")
	}
	if _, err := tx.Exec(c.UserContext(), `
		UPDATE password_reset_tokens SET revoked_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`, userID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error revoking password recovery links")
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error saving account activation")
	}

	return response.Success(c, nil, "Account activated successfully")
}
