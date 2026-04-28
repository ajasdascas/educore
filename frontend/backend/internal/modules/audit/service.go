package audit

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

type service struct {
	repo AuditRepository
}

func NewService(repo AuditRepository) AuditService {
	return &service{repo: repo}
}

func (s *service) Log(tenantID *string, userID string, action AuditAction, resource string, resourceID *string, details map[string]interface{}, ipAddress, userAgent string) error {
	log := &AuditLog{
		ID:         uuid.New().String(),
		TenantID:   tenantID,
		UserID:     userID,
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		Details:    details,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		CreatedAt:  time.Now(),
	}

	if log.Details == nil {
		log.Details = make(map[string]interface{})
	}

	err := s.repo.Create(log)
	if err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}

func (s *service) GetLogs(tenantID *string, userID *string, action *AuditAction, resource *string, limit, offset int) ([]*AuditLog, error) {
	filters := make(map[string]interface{})

	if tenantID != nil {
		filters["tenant_id"] = *tenantID
	}
	if userID != nil {
		filters["user_id"] = *userID
	}
	if action != nil {
		filters["action"] = *action
	}
	if resource != nil {
		filters["resource"] = *resource
	}

	logs, err := s.repo.GetLogs(filters, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get audit logs: %w", err)
	}

	return logs, nil
}

func (s *service) GetLogsByResourceID(resourceID string, limit int) ([]*AuditLog, error) {
	logs, err := s.repo.GetLogsByResourceID(resourceID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get logs by resource ID: %w", err)
	}

	return logs, nil
}

func (s *service) GetUserActivity(userID string, days int) ([]*AuditLog, error) {
	since := time.Now().AddDate(0, 0, -days)

	logs, err := s.repo.GetUserActivity(userID, since)
	if err != nil {
		return nil, fmt.Errorf("failed to get user activity: %w", err)
	}

	return logs, nil
}

func (s *service) CleanupOldLogs(days int) error {
	before := time.Now().AddDate(0, 0, -days)

	err := s.repo.DeleteOldLogs(before)
	if err != nil {
		return fmt.Errorf("failed to cleanup old logs: %w", err)
	}

	return nil
}