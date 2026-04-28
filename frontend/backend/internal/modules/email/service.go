package email

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type service struct {
	repo EmailRepository
}

func NewService(repo EmailRepository) EmailService {
	return &service{repo: repo}
}

func (s *service) SendInvitation(email, role, tenantID, createdBy string) error {
	// Generate invitation token
	token, err := generateToken()
	if err != nil {
		return fmt.Errorf("failed to generate invitation token: %w", err)
	}

	// Create invitation record
	invitation := &Invitation{
		ID:        uuid.New().String(),
		Email:     email,
		TenantID:  &tenantID,
		Role:      role,
		Token:     token,
		CreatedBy: createdBy,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour), // 7 days
		CreatedAt: time.Now(),
	}

	if role == "SUPER_ADMIN" {
		invitation.TenantID = nil
	}

	err = s.repo.CreateInvitation(invitation)
	if err != nil {
		return fmt.Errorf("failed to create invitation: %w", err)
	}

	// Queue invitation email
	subject := "Invitación a EduCore"
	body := s.buildInvitationEmail(email, role, token)

	data := map[string]interface{}{
		"invitation_id": invitation.ID,
		"role":          role,
		"token":         token,
	}

	return s.QueueEmail(email, subject, body, EmailTypeInvitation, data)
}

func (s *service) SendPasswordReset(email, token string) error {
	subject := "Restablecer contraseña - EduCore"
	body := s.buildPasswordResetEmail(email, token)

	data := map[string]interface{}{
		"email": email,
		"token": token,
	}

	return s.QueueEmail(email, subject, body, EmailTypePasswordReset, data)
}

func (s *service) SendWelcomeEmail(email, firstName string) error {
	subject := "¡Bienvenido a EduCore!"
	body := s.buildWelcomeEmail(firstName)

	data := map[string]interface{}{
		"email":      email,
		"first_name": firstName,
	}

	return s.QueueEmail(email, subject, body, EmailTypeWelcome, data)
}

func (s *service) QueueEmail(to, subject, body string, emailType EmailType, data map[string]interface{}) error {
	job := &EmailJob{
		ID:        uuid.New().String(),
		To:        to,
		Subject:   subject,
		Body:      body,
		IsHTML:    true,
		Type:      emailType,
		Data:      data,
		Status:    "pending",
		Attempts:  0,
		CreatedAt: time.Now(),
	}

	return s.repo.CreateEmailJob(job)
}

func (s *service) ProcessEmailQueue() error {
	jobs, err := s.repo.GetPendingEmailJobs(10)
	if err != nil {
		return fmt.Errorf("failed to get pending email jobs: %w", err)
	}

	for _, job := range jobs {
		err := s.sendEmail(job)
		if err != nil {
			errorMsg := err.Error()
			s.repo.UpdateEmailJobStatus(job.ID, "failed", &errorMsg)
		} else {
			s.repo.UpdateEmailJobStatus(job.ID, "sent", nil)
		}
	}

	return nil
}

func (s *service) GetInvitationByToken(token string) (*Invitation, error) {
	return s.repo.GetInvitationByToken(token)
}

func (s *service) AcceptInvitation(token string) (*Invitation, error) {
	invitation, err := s.repo.GetInvitationByToken(token)
	if err != nil {
		return nil, fmt.Errorf("invalid or expired invitation: %w", err)
	}

	err = s.repo.AcceptInvitation(token)
	if err != nil {
		return nil, fmt.Errorf("failed to accept invitation: %w", err)
	}

	return invitation, nil
}

func (s *service) sendEmail(job *EmailJob) error {
	// TODO: Implement actual email sending with Resend
	// For now, just log the email
	fmt.Printf("Sending email to %s: %s\n", job.To, job.Subject)
	return nil
}

func (s *service) buildInvitationEmail(email, role, token string) string {
	roleText := map[string]string{
		"SUPER_ADMIN":  "Super Administrador",
		"SCHOOL_ADMIN": "Director de Escuela",
		"TEACHER":      "Profesor",
		"PARENT":       "Padre de Familia",
	}

	return fmt.Sprintf(`
		<h2>Invitación a EduCore</h2>
		<p>Hola,</p>
		<p>Has sido invitado a unirte a EduCore como <strong>%s</strong>.</p>
		<p>Para aceptar la invitación y crear tu cuenta, haz clic en el siguiente enlace:</p>
		<p><a href="https://onlineu.mx/educore/auth/accept-invitation?token=%s">Aceptar Invitación</a></p>
		<p>Esta invitación expira en 7 días.</p>
		<p>Saludos,<br>Equipo EduCore</p>
	`, roleText[role], token)
}

func (s *service) buildPasswordResetEmail(email, token string) string {
	return fmt.Sprintf(`
		<h2>Restablecer Contraseña</h2>
		<p>Hola,</p>
		<p>Has solicitado restablecer tu contraseña en EduCore.</p>
		<p>Para crear una nueva contraseña, haz clic en el siguiente enlace:</p>
		<p><a href="https://onlineu.mx/educore/auth/reset-password?token=%s">Restablecer Contraseña</a></p>
		<p>Este enlace expira en 1 hora.</p>
		<p>Si no solicitaste este cambio, ignora este correo.</p>
		<p>Saludos,<br>Equipo EduCore</p>
	`, token)
}

func (s *service) buildWelcomeEmail(firstName string) string {
	return fmt.Sprintf(`
		<h2>¡Bienvenido a EduCore!</h2>
		<p>Hola %s,</p>
		<p>Tu cuenta ha sido creada exitosamente en EduCore.</p>
		<p>Ya puedes acceder a la plataforma con tus credenciales.</p>
		<p><a href="https://onlineu.mx/educore/">Acceder a EduCore</a></p>
		<p>Saludos,<br>Equipo EduCore</p>
	`, firstName)
}

func generateToken() (string, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}