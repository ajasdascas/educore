package auth

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"strings"
	"time"

	"educore/internal/pkg/passwordpolicy"
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

const (
	passwordResetLifetime = 30 * time.Minute
	resendDefaultAPIURL   = "https://api.resend.com"
)

const genericRecoveryMessage = "Solicitud procesada. Si los datos coinciden y el correo puede entregarse, recibirás un enlace de recuperación."

type passwordResetEmailSender interface {
	Configured() bool
	SendPasswordReset(ctx context.Context, recipient, displayName, resetURL, idempotencyKey string) (string, error)
}

type resendEmailSender struct {
	apiKey string
	from   string
	apiURL string
	client *http.Client
}

func newResendEmailSenderFromEnv() passwordResetEmailSender {
	fromEmail := strings.TrimSpace(os.Getenv("EMAIL_FROM"))
	fromName := strings.TrimSpace(os.Getenv("EMAIL_FROM_NAME"))
	from := fromEmail
	if fromEmail != "" {
		from = (&mail.Address{Name: fromName, Address: fromEmail}).String()
	}
	apiURL := strings.TrimRight(strings.TrimSpace(os.Getenv("RESEND_API_URL")), "/")
	if apiURL == "" {
		apiURL = resendDefaultAPIURL
	}
	return &resendEmailSender{
		apiKey: strings.TrimSpace(os.Getenv("RESEND_API_KEY")),
		from:   from,
		apiURL: apiURL,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *resendEmailSender) Configured() bool {
	if s == nil || s.apiKey == "" || s.from == "" || s.apiURL == "" || s.client == nil {
		return false
	}
	_, err := mail.ParseAddress(s.from)
	return err == nil
}

func (s *resendEmailSender) SendPasswordReset(ctx context.Context, recipient, displayName, resetURL, idempotencyKey string) (string, error) {
	if !s.Configured() {
		return "", fmt.Errorf("resend is not configured")
	}
	recipientAddress, err := mail.ParseAddress(strings.TrimSpace(recipient))
	if err != nil {
		return "", fmt.Errorf("invalid recipient")
	}
	escapedName := html.EscapeString(strings.TrimSpace(displayName))
	escapedURL := html.EscapeString(resetURL)
	textBody := fmt.Sprintf("Hola %s,\n\nUsa este enlace para restablecer tu contraseña de EduCore. Caduca en 30 minutos y solo puede utilizarse una vez:\n%s\n\nSi no solicitaste este cambio, ignora este correo.", strings.TrimSpace(displayName), resetURL)
	htmlBody := fmt.Sprintf(`<p>Hola %s,</p><p>Usa el siguiente enlace para restablecer tu contraseña de EduCore. Caduca en 30 minutos y solo puede utilizarse una vez.</p><p><a href="%s">Restablecer contraseña</a></p><p>Si no solicitaste este cambio, ignora este correo.</p>`, escapedName, escapedURL)
	payload, err := json.Marshal(map[string]any{
		"from":    s.from,
		"to":      []string{recipientAddress.Address},
		"subject": "Restablece tu contraseña de EduCore",
		"text":    textBody,
		"html":    htmlBody,
	})
	if err != nil {
		return "", fmt.Errorf("encode resend payload: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.apiURL+"/emails", bytes.NewReader(payload))
	if err != nil {
		return "", fmt.Errorf("create resend request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "EduCore/1.0")
	req.Header.Set("Idempotency-Key", idempotencyKey)

	res, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("resend request failed: %w", err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		return "", fmt.Errorf("resend returned HTTP %d", res.StatusCode)
	}
	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &result); err != nil || strings.TrimSpace(result.ID) == "" {
		return "", fmt.Errorf("resend returned an invalid success response")
	}
	return result.ID, nil
}

type recoveryAccount struct {
	ID        string
	TenantID  string
	Email     string
	FirstName string
	LastName  string
}

func (h *Handler) handleForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Solicitud inválida")
	}
	if h.resetSender == nil || !h.resetSender.Configured() || !validAppBaseURL(h.appBaseURL) {
		return response.Error(c, fiber.StatusServiceUnavailable, "La recuperación por correo no está disponible temporalmente")
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	tenantSlug := strings.ToLower(strings.TrimSpace(req.TenantSlug))
	account, err := h.findRecoveryAccount(c.UserContext(), email, tenantSlug)
	if err != nil {
		if err != sql.ErrNoRows {
			log.Printf("password recovery account lookup failed: %v", err)
		}
		return response.Success(c, nil, genericRecoveryMessage)
	}
	if err := h.issuePasswordReset(c.UserContext(), account, tenantSlug); err != nil {
		// The public response remains identical to prevent account enumeration.
		// No raw token or email address is logged.
		log.Printf("password recovery delivery was not completed: %v", err)
	}
	return response.Success(c, nil, genericRecoveryMessage)
}

func (h *Handler) findRecoveryAccount(ctx context.Context, email, tenantSlug string) (recoveryAccount, error) {
	var account recoveryAccount
	err := h.db.QueryRow(ctx, `
		SELECT u.id, COALESCE(u.tenant_id::text, ''), u.email, u.first_name, u.last_name
		FROM users u
		LEFT JOIN tenants t ON t.id = u.tenant_id
		WHERE LOWER(u.email) = LOWER($1)
		  AND u.is_active = true AND u.deleted_at IS NULL
		  AND (
		    ($2 = '' AND u.tenant_id IS NULL AND u.role = 'SUPER_ADMIN')
		    OR
		    ($2 <> '' AND u.tenant_id = t.id AND t.slug = $2
		      AND u.role <> 'SUPER_ADMIN' AND t.status IN ('active', 'trial') AND t.deleted_at IS NULL)
		  )
		ORDER BY u.created_at DESC
		LIMIT 1`, email, tenantSlug).
		Scan(&account.ID, &account.TenantID, &account.Email, &account.FirstName, &account.LastName)
	return account, err
}

func (h *Handler) issuePasswordReset(ctx context.Context, account recoveryAccount, tenantSlug string) error {
	rawToken, tokenHash, err := generatePasswordResetToken()
	if err != nil {
		return err
	}
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin password reset: %w", err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `
		UPDATE password_reset_tokens SET revoked_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`, account.ID); err != nil {
		return fmt.Errorf("revoke previous password resets: %w", err)
	}
	var resetID string
	if err := tx.QueryRow(ctx, `
		INSERT INTO password_reset_tokens (user_id, tenant_id, token_hash, expires_at)
		VALUES ($1, NULLIF($2, '')::uuid, $3, $4)
		RETURNING id`, account.ID, account.TenantID, tokenHash, time.Now().UTC().Add(passwordResetLifetime)).Scan(&resetID); err != nil {
		return fmt.Errorf("store password reset digest: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit password reset digest: %w", err)
	}

	resetURL, err := buildPasswordResetURL(h.appBaseURL, rawToken, tenantSlug)
	if err != nil {
		h.revokePendingReset(ctx, resetID)
		return err
	}
	providerID, err := h.resetSender.SendPasswordReset(ctx, account.Email, strings.TrimSpace(account.FirstName+" "+account.LastName), resetURL, "password-reset-"+resetID)
	if err != nil {
		h.revokePendingReset(ctx, resetID)
		return err
	}
	result, err := h.db.Exec(ctx, `
		UPDATE password_reset_tokens
		SET delivered_at = CURRENT_TIMESTAMP, provider_message_id = $1
		WHERE id = $2 AND used_at IS NULL AND revoked_at IS NULL AND delivered_at IS NULL`, providerID, resetID)
	if err != nil || result.RowsAffected() != 1 {
		h.revokePendingReset(ctx, resetID)
		return fmt.Errorf("mark password reset delivered")
	}
	return nil
}

func (h *Handler) revokePendingReset(ctx context.Context, resetID string) {
	_, _ = h.db.Exec(ctx, `
		UPDATE password_reset_tokens SET revoked_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND used_at IS NULL AND delivered_at IS NULL`, resetID)
}

func (h *Handler) handleResetPassword(c *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Solicitud inválida")
	}
	if err := passwordpolicy.Validate(req.NewPassword); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	tokenHash, err := passwordResetTokenHash(strings.TrimSpace(req.Token))
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "El enlace de recuperación es inválido o expiró")
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo proteger la contraseña")
	}
	tenantSlug := strings.ToLower(strings.TrimSpace(req.TenantSlug))
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo procesar la recuperación")
	}
	defer tx.Rollback(c.UserContext())
	var resetID, userID string
	err = tx.QueryRow(c.UserContext(), `
		SELECT prt.id, u.id
		FROM password_reset_tokens prt
		JOIN users u ON u.id = prt.user_id
		WHERE prt.token_hash = $1
		  AND prt.delivered_at IS NOT NULL
		  AND prt.used_at IS NULL AND prt.revoked_at IS NULL
		  AND prt.expires_at > CURRENT_TIMESTAMP
		  AND u.is_active = true AND u.deleted_at IS NULL
		  AND (
		    ($2 = '' AND prt.tenant_id IS NULL AND u.tenant_id IS NULL AND u.role = 'SUPER_ADMIN')
		    OR
		    ($2 <> '' AND prt.tenant_id = u.tenant_id AND u.role <> 'SUPER_ADMIN'
		      AND EXISTS (
		        SELECT 1 FROM tenants t
		        WHERE t.id = prt.tenant_id AND t.slug = $2
		          AND t.status IN ('active', 'trial') AND t.deleted_at IS NULL
		      ))
		  )
		FOR UPDATE`, tokenHash, tenantSlug).Scan(&resetID, &userID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "El enlace de recuperación es inválido o expiró")
	}
	result, err := tx.Exec(c.UserContext(), `
		UPDATE users SET password_hash = $1, password_must_change = false,
			auth_version = auth_version + 1, invitation_token = NULL,
			invitation_expires_at = NULL, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND is_active = true AND deleted_at IS NULL`, string(passwordHash), userID)
	if err != nil || result.RowsAffected() != 1 {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo actualizar la contraseña")
	}
	result, err = tx.Exec(c.UserContext(), `
		UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL`, resetID)
	if err != nil || result.RowsAffected() != 1 {
		return response.Error(c, fiber.StatusBadRequest, "El enlace de recuperación ya fue utilizado")
	}
	if _, err := tx.Exec(c.UserContext(), `
		UPDATE password_reset_tokens SET revoked_at = CURRENT_TIMESTAMP
		WHERE user_id = $1 AND id <> $2 AND used_at IS NULL AND revoked_at IS NULL`, userID, resetID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo cerrar la recuperación")
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo guardar la nueva contraseña")
	}
	return response.Success(c, nil, "Contraseña actualizada correctamente")
}

func generatePasswordResetToken() (rawToken, tokenHash string, err error) {
	bytes := make([]byte, 32)
	if _, err = rand.Read(bytes); err != nil {
		return "", "", fmt.Errorf("generate password reset token: %w", err)
	}
	rawToken = hex.EncodeToString(bytes)
	tokenHash, _ = passwordResetTokenHash(rawToken)
	return rawToken, tokenHash, nil
}

func passwordResetTokenHash(rawToken string) (string, error) {
	if len(rawToken) != 64 {
		return "", fmt.Errorf("invalid password reset token length")
	}
	if _, err := hex.DecodeString(rawToken); err != nil {
		return "", fmt.Errorf("invalid password reset token encoding")
	}
	digest := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(digest[:]), nil
}

func validAppBaseURL(baseURL string) bool {
	parsed, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil || parsed.Host == "" {
		return false
	}
	if parsed.Scheme == "https" {
		return true
	}
	host := strings.ToLower(parsed.Hostname())
	return parsed.Scheme == "http" && (host == "localhost" || host == "127.0.0.1")
}

func buildPasswordResetURL(baseURL, rawToken, tenantSlug string) (string, error) {
	if !validAppBaseURL(baseURL) {
		return "", fmt.Errorf("APP_BASE_URL is not configured with a secure public URL")
	}
	parsed, _ := url.Parse(strings.TrimSpace(baseURL))
	parsed.Path = strings.TrimRight(parsed.Path, "/") + "/reset-password"
	query := parsed.Query()
	query.Set("token", rawToken)
	if tenantSlug != "" {
		query.Set("slug", tenantSlug)
	}
	parsed.RawQuery = query.Encode()
	parsed.Fragment = ""
	return parsed.String(), nil
}
