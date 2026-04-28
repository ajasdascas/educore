package sessions

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type service struct {
	repo SessionRepository
}

func NewService(repo SessionRepository) SessionService {
	return &service{
		repo: repo,
	}
}

func (s *service) CreateSession(userID string, tenantID *string, deviceInfo, ipAddress, userAgent string) (*Session, error) {
	refreshToken, err := generateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	session := &Session{
		ID:           uuid.New().String(),
		UserID:       userID,
		TenantID:     tenantID,
		RefreshToken: refreshToken,
		DeviceInfo:   deviceInfo,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		IsActive:     true,
		LastUsedAt:   time.Now(),
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(7 * 24 * time.Hour), // 7 days
	}

	err = s.repo.Create(session)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	return session, nil
}

func (s *service) RefreshSession(refreshToken string) (*Session, error) {
	session, err := s.repo.GetByRefreshToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid or expired refresh token: %w", err)
	}

	// Update last used time
	err = s.repo.UpdateLastUsed(session.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	session.LastUsedAt = time.Now()
	return session, nil
}

func (s *service) GetUserSessions(userID string) ([]*Session, error) {
	sessions, err := s.repo.GetActiveByUserID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user sessions: %w", err)
	}
	return sessions, nil
}

func (s *service) DeactivateSession(sessionID string) error {
	err := s.repo.DeactivateByID(sessionID)
	if err != nil {
		return fmt.Errorf("failed to deactivate session: %w", err)
	}
	return nil
}

func (s *service) DeactivateAllUserSessions(userID string) error {
	err := s.repo.DeactivateByUserID(userID)
	if err != nil {
		return fmt.Errorf("failed to deactivate user sessions: %w", err)
	}
	return nil
}

func (s *service) CleanupSessions() error {
	// Deactivate expired sessions
	err := s.repo.DeactivateExpired()
	if err != nil {
		return fmt.Errorf("failed to deactivate expired sessions: %w", err)
	}

	// Delete old sessions
	err = s.repo.CleanupOldSessions()
	if err != nil {
		return fmt.Errorf("failed to cleanup old sessions: %w", err)
	}

	return nil
}

func generateRefreshToken() (string, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}