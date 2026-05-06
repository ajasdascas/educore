package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	apiKey    string
	from      string
	fromName  string
	appURL    string
	httpClient *http.Client
}

func NewClient(apiKey, from, fromName, appURL string) *Client {
	return &Client{
		apiKey:   apiKey,
		from:     from,
		fromName: fromName,
		appURL:   appURL,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) Configured() bool {
	return c.apiKey != ""
}

type sendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

func (c *Client) SendPasswordReset(ctx context.Context, toEmail, token string) error {
	if !c.Configured() {
		return fmt.Errorf("email provider not configured")
	}
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", c.appURL, token)
	html := passwordResetHTML(resetLink, c.fromName)

	payload := sendRequest{
		From:    fmt.Sprintf("%s <%s>", c.fromName, c.from),
		To:      []string{toEmail},
		Subject: "Recupera tu contraseña — " + c.fromName,
		HTML:    html,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("email.SendPasswordReset: marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("email.SendPasswordReset: build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("email.SendPasswordReset: http: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		var errBody map[string]interface{}
		_ = json.NewDecoder(resp.Body).Decode(&errBody)
		return fmt.Errorf("email.SendPasswordReset: resend status %d: %v", resp.StatusCode, errBody)
	}
	return nil
}

func passwordResetHTML(resetLink, appName string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:480px;margin:40px auto;color:#1a1a1a">
  <h2 style="color:#4f46e5">%s</h2>
  <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
  <p>Haz clic en el botón para elegir una nueva contraseña. Este enlace vence en <strong>1 hora</strong>.</p>
  <p style="text-align:center;margin:32px 0">
    <a href="%s" style="background:#4f46e5;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600">Restablecer contraseña</a>
  </p>
  <p style="font-size:13px;color:#666">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>%s</p>
  <p style="font-size:12px;color:#999;margin-top:40px">Si no solicitaste este cambio, ignora este correo.</p>
</body>
</html>`, appName, resetLink, resetLink)
}
