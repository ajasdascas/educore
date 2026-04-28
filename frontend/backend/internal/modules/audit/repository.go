package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) AuditRepository {
	return &repository{db: db}
}

func (r *repository) Create(log *AuditLog) error {
	detailsJSON, err := json.Marshal(log.Details)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO audit_logs (
			id, tenant_id, user_id, action, resource, resource_id,
			details, ip_address, user_agent, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`

	_, err = r.db.Exec(context.Background(), query,
		log.ID, log.TenantID, log.UserID, log.Action, log.Resource,
		log.ResourceID, string(detailsJSON), log.IPAddress, log.UserAgent, log.CreatedAt)

	return err
}

func (r *repository) GetLogs(filters map[string]interface{}, limit, offset int) ([]*AuditLog, error) {
	var conditions []string
	var args []interface{}
	argIndex := 1

	for key, value := range filters {
		if value != nil {
			conditions = append(conditions, fmt.Sprintf("%s = $%d", key, argIndex))
			args = append(args, value)
			argIndex++
		}
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, user_id, action, resource, resource_id,
			   details, ip_address, user_agent, created_at
		FROM audit_logs
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, whereClause, argIndex, argIndex+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(context.Background(), query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*AuditLog
	for rows.Next() {
		log := &AuditLog{}
		var detailsJSON string

		err := rows.Scan(
			&log.ID, &log.TenantID, &log.UserID, &log.Action,
			&log.Resource, &log.ResourceID, &detailsJSON,
			&log.IPAddress, &log.UserAgent, &log.CreatedAt)
		if err != nil {
			return nil, err
		}

		err = json.Unmarshal([]byte(detailsJSON), &log.Details)
		if err != nil {
			log.Details = make(map[string]interface{})
		}

		logs = append(logs, log)
	}

	return logs, nil
}

func (r *repository) GetLogsByResourceID(resourceID string, limit int) ([]*AuditLog, error) {
	query := `
		SELECT id, tenant_id, user_id, action, resource, resource_id,
			   details, ip_address, user_agent, created_at
		FROM audit_logs
		WHERE resource_id = $1
		ORDER BY created_at DESC
		LIMIT $2`

	rows, err := r.db.Query(context.Background(), query, resourceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*AuditLog
	for rows.Next() {
		log := &AuditLog{}
		var detailsJSON string

		err := rows.Scan(
			&log.ID, &log.TenantID, &log.UserID, &log.Action,
			&log.Resource, &log.ResourceID, &detailsJSON,
			&log.IPAddress, &log.UserAgent, &log.CreatedAt)
		if err != nil {
			return nil, err
		}

		err = json.Unmarshal([]byte(detailsJSON), &log.Details)
		if err != nil {
			log.Details = make(map[string]interface{})
		}

		logs = append(logs, log)
	}

	return logs, nil
}

func (r *repository) GetUserActivity(userID string, since time.Time) ([]*AuditLog, error) {
	query := `
		SELECT id, tenant_id, user_id, action, resource, resource_id,
			   details, ip_address, user_agent, created_at
		FROM audit_logs
		WHERE user_id = $1 AND created_at >= $2
		ORDER BY created_at DESC`

	rows, err := r.db.Query(context.Background(), query, userID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*AuditLog
	for rows.Next() {
		log := &AuditLog{}
		var detailsJSON string

		err := rows.Scan(
			&log.ID, &log.TenantID, &log.UserID, &log.Action,
			&log.Resource, &log.ResourceID, &detailsJSON,
			&log.IPAddress, &log.UserAgent, &log.CreatedAt)
		if err != nil {
			return nil, err
		}

		err = json.Unmarshal([]byte(detailsJSON), &log.Details)
		if err != nil {
			log.Details = make(map[string]interface{})
		}

		logs = append(logs, log)
	}

	return logs, nil
}

func (r *repository) DeleteOldLogs(before time.Time) error {
	query := `DELETE FROM audit_logs WHERE created_at < $1`
	_, err := r.db.Exec(context.Background(), query, before)
	return err
}