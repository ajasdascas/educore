package email

import (
	"time"
)

type EmailType string

const (
	EmailTypeInvitation     EmailType = "invitation"
	EmailTypePasswordReset  EmailType = "password_reset"
	EmailTypeWelcome       EmailType = "welcome"
	EmailTypeNotification  EmailType = "notification"
)

type EmailTemplate struct {
	Type    EmailType `json:"type"`
	Subject string    `json:"subject"`
	Body    string    `json:"body"`
	IsHTML  bool      `json:"is_html"`
}

type EmailJob struct {
	ID        string                 `json:"id" db:"id"`
	To        string                 `json:"to" db:"to_email"`
	Subject   string                 `json:"subject" db:"subject"`
	Body      string                 `json:"body" db:"body"`
	IsHTML    bool                   `json:"is_html" db:"is_html"`
	Type      EmailType              `json:"type" db:"email_type"`
	Data      map[string]interface{} `json:"data" db:"data"`
	Status    string                 `json:"status" db:"status"`
	Attempts  int                    `json:"attempts" db:"attempts"`
	Error     *string                `json:"error" db:"error"`
	CreatedAt time.Time              `json:"created_at" db:"created_at"`
	SentAt    *time.Time             `json:"sent_at" db:"sent_at"`
}

type Invitation struct {
	ID        string    `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	TenantID  *string   `json:"tenant_id" db:"tenant_id"`
	Role      string    `json:"role" db:"role"`
	Token     string    `json:"-" db:"token"`
	CreatedBy string    `json:"created_by" db:"created_by"`
	AcceptedAt *time.Time `json:"accepted_at" db:"accepted_at"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type EmailService interface {
	SendInvitation(email, role, tenantID, createdBy string) error
	SendPasswordReset(email, token string) error
	SendWelcomeEmail(email, firstName string) error
	QueueEmail(to, subject, body string, emailType EmailType, data map[string]interface{}) error
	ProcessEmailQueue() error
	GetInvitationByToken(token string) (*Invitation, error)
	AcceptInvitation(token string) (*Invitation, error)
}

type EmailRepository interface {
	CreateEmailJob(job *EmailJob) error
	GetPendingEmailJobs(limit int) ([]*EmailJob, error)
	UpdateEmailJobStatus(id, status string, error *string) error
	CreateInvitation(invitation *Invitation) error
	GetInvitationByToken(token string) (*Invitation, error)
	AcceptInvitation(token string) error
	CleanupExpiredInvitations() error
}