package audit

import (
	"time"
)

type AuditAction string

const (
	ActionLogin          AuditAction = "login"
	ActionLogout         AuditAction = "logout"
	ActionCreate         AuditAction = "create"
	ActionUpdate         AuditAction = "update"
	ActionDelete         AuditAction = "delete"
	ActionPasswordReset  AuditAction = "password_reset"
	ActionInviteSent     AuditAction = "invite_sent"
	ActionInviteAccepted AuditAction = "invite_accepted"
	ActionTenantSuspend  AuditAction = "tenant_suspend"
	ActionTenantActivate AuditAction = "tenant_activate"
	ActionModuleToggle   AuditAction = "module_toggle"
)

type AuditLog struct {
	ID          string                 `json:"id" db:"id"`
	TenantID    *string                `json:"tenant_id" db:"tenant_id"`
	UserID      string                 `json:"user_id" db:"user_id"`
	Action      AuditAction            `json:"action" db:"action"`
	Resource    string                 `json:"resource" db:"resource"`
	ResourceID  *string                `json:"resource_id" db:"resource_id"`
	Details     map[string]interface{} `json:"details" db:"details"`
	IPAddress   string                 `json:"ip_address" db:"ip_address"`
	UserAgent   string                 `json:"user_agent" db:"user_agent"`
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
}

type AuditService interface {
	Log(tenantID *string, userID string, action AuditAction, resource string, resourceID *string, details map[string]interface{}, ipAddress, userAgent string) error
	GetLogs(tenantID *string, userID *string, action *AuditAction, resource *string, limit, offset int) ([]*AuditLog, error)
	GetLogsByResourceID(resourceID string, limit int) ([]*AuditLog, error)
	GetUserActivity(userID string, days int) ([]*AuditLog, error)
	CleanupOldLogs(days int) error
}

type AuditRepository interface {
	Create(log *AuditLog) error
	GetLogs(filters map[string]interface{}, limit, offset int) ([]*AuditLog, error)
	GetLogsByResourceID(resourceID string, limit int) ([]*AuditLog, error)
	GetUserActivity(userID string, since time.Time) ([]*AuditLog, error)
	DeleteOldLogs(before time.Time) error
}