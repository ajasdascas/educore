package sessions

import (
	"time"
)

type Session struct {
	ID           string    `json:"id" db:"id"`
	UserID       string    `json:"user_id" db:"user_id"`
	TenantID     *string   `json:"tenant_id" db:"tenant_id"`
	RefreshToken string    `json:"-" db:"refresh_token"`
	DeviceInfo   string    `json:"device_info" db:"device_info"`
	IPAddress    string    `json:"ip_address" db:"ip_address"`
	UserAgent    string    `json:"user_agent" db:"user_agent"`
	IsActive     bool      `json:"is_active" db:"is_active"`
	LastUsedAt   time.Time `json:"last_used_at" db:"last_used_at"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	ExpiresAt    time.Time `json:"expires_at" db:"expires_at"`
}

type SessionRepository interface {
	Create(session *Session) error
	GetByRefreshToken(token string) (*Session, error)
	GetActiveByUserID(userID string) ([]*Session, error)
	UpdateLastUsed(sessionID string) error
	DeactivateByID(sessionID string) error
	DeactivateByUserID(userID string) error
	DeactivateExpired() error
	CleanupOldSessions() error
}

type SessionService interface {
	CreateSession(userID string, tenantID *string, deviceInfo, ipAddress, userAgent string) (*Session, error)
	RefreshSession(refreshToken string) (*Session, error)
	GetUserSessions(userID string) ([]*Session, error)
	DeactivateSession(sessionID string) error
	DeactivateAllUserSessions(userID string) error
	CleanupSessions() error
}