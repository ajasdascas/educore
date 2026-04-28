package email

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) EmailRepository {
	return &repository{db: db}
}

func (r *repository) CreateEmailJob(job *EmailJob) error {
	dataJSON, err := json.Marshal(job.Data)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO email_queue (
			id, to_email, subject, body, is_html, email_type, data,
			status, attempts, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err = r.db.Exec(context.Background(), query,
		job.ID, job.To, job.Subject, job.Body, job.IsHTML,
		job.Type, string(dataJSON), job.Status, job.Attempts, job.CreatedAt)

	return err
}

func (r *repository) GetPendingEmailJobs(limit int) ([]*EmailJob, error) {
	query := `
		SELECT id, to_email, subject, body, is_html, email_type, data,
			   status, attempts, error, created_at, sent_at
		FROM email_queue
		WHERE status = 'pending' AND attempts < 5
		ORDER BY created_at ASC
		LIMIT $1`

	rows, err := r.db.Query(context.Background(), query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []*EmailJob
	for rows.Next() {
		job := &EmailJob{}
		var dataJSON string

		err := rows.Scan(
			&job.ID, &job.To, &job.Subject, &job.Body, &job.IsHTML,
			&job.Type, &dataJSON, &job.Status, &job.Attempts,
			&job.Error, &job.CreatedAt, &job.SentAt)
		if err != nil {
			return nil, err
		}

		err = json.Unmarshal([]byte(dataJSON), &job.Data)
		if err != nil {
			job.Data = make(map[string]interface{})
		}

		jobs = append(jobs, job)
	}

	return jobs, nil
}

func (r *repository) UpdateEmailJobStatus(id, status string, errorMsg *string) error {
	var sentAt *time.Time
	if status == "sent" {
		now := time.Now()
		sentAt = &now
	}

	query := `
		UPDATE email_queue
		SET status = $1, error = $2, attempts = attempts + 1, sent_at = $3
		WHERE id = $4`

	_, err := r.db.Exec(context.Background(), query, status, errorMsg, sentAt, id)
	return err
}

func (r *repository) CreateInvitation(invitation *Invitation) error {
	query := `
		INSERT INTO invitations (
			id, email, tenant_id, role, token, created_by, expires_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`

	_, err := r.db.Exec(context.Background(), query,
		invitation.ID, invitation.Email, invitation.TenantID, invitation.Role,
		invitation.Token, invitation.CreatedBy, invitation.ExpiresAt, invitation.CreatedAt)

	return err
}

func (r *repository) GetInvitationByToken(token string) (*Invitation, error) {
	query := `
		SELECT id, email, tenant_id, role, token, created_by, accepted_at, expires_at, created_at
		FROM invitations
		WHERE token = $1 AND expires_at > NOW() AND accepted_at IS NULL`

	invitation := &Invitation{}
	err := r.db.QueryRow(context.Background(), query, token).Scan(
		&invitation.ID, &invitation.Email, &invitation.TenantID, &invitation.Role,
		&invitation.Token, &invitation.CreatedBy, &invitation.AcceptedAt,
		&invitation.ExpiresAt, &invitation.CreatedAt)

	if err != nil {
		return nil, err
	}

	return invitation, nil
}

func (r *repository) AcceptInvitation(token string) error {
	query := `UPDATE invitations SET accepted_at = NOW() WHERE token = $1`
	_, err := r.db.Exec(context.Background(), query, token)
	return err
}

func (r *repository) CleanupExpiredInvitations() error {
	query := `DELETE FROM invitations WHERE expires_at <= NOW()`
	_, err := r.db.Exec(context.Background(), query)
	return err
}