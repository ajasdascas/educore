package sessions

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) SessionRepository {
	return &repository{
		db: db,
	}
}

func (r *repository) Create(session *Session) error {
	query := `
		INSERT INTO user_sessions (
			id, user_id, tenant_id, refresh_token, device_info,
			ip_address, user_agent, is_active, last_used_at, created_at, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`

	_, err := r.db.Exec(context.Background(), query,
		session.ID, session.UserID, session.TenantID, session.RefreshToken,
		session.DeviceInfo, session.IPAddress, session.UserAgent,
		session.IsActive, session.LastUsedAt, session.CreatedAt, session.ExpiresAt)

	return err
}

func (r *repository) GetByRefreshToken(token string) (*Session, error) {
	query := `
		SELECT id, user_id, tenant_id, refresh_token, device_info, ip_address,
			   user_agent, is_active, last_used_at, created_at, expires_at
		FROM user_sessions
		WHERE refresh_token = $1 AND is_active = true AND expires_at > NOW()`

	session := &Session{}
	err := r.db.QueryRow(context.Background(), query, token).Scan(
		&session.ID, &session.UserID, &session.TenantID, &session.RefreshToken,
		&session.DeviceInfo, &session.IPAddress, &session.UserAgent,
		&session.IsActive, &session.LastUsedAt, &session.CreatedAt, &session.ExpiresAt)

	if err != nil {
		return nil, err
	}

	return session, nil
}

func (r *repository) GetActiveByUserID(userID string) ([]*Session, error) {
	query := `
		SELECT id, user_id, tenant_id, refresh_token, device_info, ip_address,
			   user_agent, is_active, last_used_at, created_at, expires_at
		FROM user_sessions
		WHERE user_id = $1 AND is_active = true AND expires_at > NOW()
		ORDER BY last_used_at DESC`

	rows, err := r.db.Query(context.Background(), query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []*Session
	for rows.Next() {
		session := &Session{}
		err := rows.Scan(
			&session.ID, &session.UserID, &session.TenantID, &session.RefreshToken,
			&session.DeviceInfo, &session.IPAddress, &session.UserAgent,
			&session.IsActive, &session.LastUsedAt, &session.CreatedAt, &session.ExpiresAt)
		if err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}

	return sessions, nil
}

func (r *repository) UpdateLastUsed(sessionID string) error {
	query := `UPDATE user_sessions SET last_used_at = NOW() WHERE id = $1`
	_, err := r.db.Exec(context.Background(), query, sessionID)
	return err
}

func (r *repository) DeactivateByID(sessionID string) error {
	query := `UPDATE user_sessions SET is_active = false WHERE id = $1`
	_, err := r.db.Exec(context.Background(), query, sessionID)
	return err
}

func (r *repository) DeactivateByUserID(userID string) error {
	query := `UPDATE user_sessions SET is_active = false WHERE user_id = $1`
	_, err := r.db.Exec(context.Background(), query, userID)
	return err
}

func (r *repository) DeactivateExpired() error {
	query := `UPDATE user_sessions SET is_active = false WHERE expires_at <= NOW()`
	_, err := r.db.Exec(context.Background(), query)
	return err
}

func (r *repository) CleanupOldSessions() error {
	// Delete sessions older than 30 days
	query := `DELETE FROM user_sessions WHERE created_at < NOW() - INTERVAL '30 days'`
	_, err := r.db.Exec(context.Background(), query)
	return err
}