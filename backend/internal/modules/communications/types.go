package communications

import (
	"time"
)

// Request types
type SendMessageRequest struct {
	RecipientID   string              `json:"recipient_id" validate:"required"`
	RecipientType string              `json:"recipient_type" validate:"required,oneof=user group role"`
	Subject       string              `json:"subject" validate:"required,min=3,max=200"`
	Content       string              `json:"content" validate:"required,min=10,max=5000"`
	Type          string              `json:"type" validate:"required,oneof=direct announcement urgent"`
	Priority      string              `json:"priority" validate:"oneof=low normal high urgent"`
	Attachments   []AttachmentRequest `json:"attachments,omitempty"`
	ScheduledFor  *string             `json:"scheduled_for,omitempty"`
}

type AttachmentRequest struct {
	FileName string `json:"file_name" validate:"required"`
	FileURL  string `json:"file_url" validate:"required,url"`
	FileSize int64  `json:"file_size" validate:"required,min=1"`
	FileType string `json:"file_type" validate:"required"`
}

type CreateNotificationRequest struct {
	Title         string            `json:"title" validate:"required,min=5,max=200"`
	Content       string            `json:"content" validate:"required,min=10,max=1000"`
	Type          string            `json:"type" validate:"required,oneof=info warning error success"`
	Priority      string            `json:"priority" validate:"oneof=low normal high urgent"`
	Recipients    []RecipientTarget `json:"recipients" validate:"required,dive"`
	ExpiresAt     *string           `json:"expires_at,omitempty"`
	ActionURL     *string           `json:"action_url,omitempty"`
	ActionLabel   *string           `json:"action_label,omitempty"`
	SendEmail     bool              `json:"send_email"`
	SendSMS       bool              `json:"send_sms"`
	SendPush      bool              `json:"send_push"`
}

type RecipientTarget struct {
	Type string `json:"type" validate:"required,oneof=user group role"`
	ID   string `json:"id" validate:"required"`
}

type SendAnnouncementRequest struct {
	Title       string            `json:"title" validate:"required,min=5,max=200"`
	Content     string            `json:"content" validate:"required,min=10,max=5000"`
	Priority    string            `json:"priority" validate:"oneof=low normal high urgent"`
	Recipients  []RecipientTarget `json:"recipients" validate:"required,dive"`
	PublishAt   *string           `json:"publish_at,omitempty"`
	ExpiresAt   *string           `json:"expires_at,omitempty"`
	Attachments []AttachmentRequest `json:"attachments,omitempty"`
	SendEmail   bool              `json:"send_email"`
	SendSMS     bool              `json:"send_sms"`
	SendPush    bool              `json:"send_push"`
}

type UpdateMessageRequest struct {
	Subject     *string             `json:"subject,omitempty"`
	Content     *string             `json:"content,omitempty"`
	Attachments []AttachmentRequest `json:"attachments,omitempty"`
}

type MarkMessageRequest struct {
	MessageIDs []string `json:"message_ids" validate:"required,dive,uuid"`
	Action     string   `json:"action" validate:"required,oneof=read unread archive unarchive star unstar"`
}

// Response types
type MessageResponse struct {
	ID            string                `json:"id"`
	ConversationID string               `json:"conversation_id"`
	SenderID      string                `json:"sender_id"`
	SenderName    string                `json:"sender_name"`
	SenderAvatar  *string               `json:"sender_avatar,omitempty"`
	RecipientID   string                `json:"recipient_id"`
	RecipientName string                `json:"recipient_name"`
	RecipientType string                `json:"recipient_type"`
	Subject       string                `json:"subject"`
	Content       string                `json:"content"`
	Type          string                `json:"type"`
	Priority      string                `json:"priority"`
	Status        string                `json:"status"`
	ReadAt        *time.Time            `json:"read_at,omitempty"`
	Attachments   []AttachmentResponse  `json:"attachments,omitempty"`
	CreatedAt     time.Time             `json:"created_at"`
	UpdatedAt     time.Time             `json:"updated_at"`
}

type ConversationResponse struct {
	ID              string           `json:"id"`
	ParticipantIDs  []string         `json:"participant_ids"`
	Participants    []ParticipantInfo `json:"participants"`
	Subject         string           `json:"subject"`
	LastMessage     *MessageResponse `json:"last_message,omitempty"`
	MessageCount    int              `json:"message_count"`
	UnreadCount     int              `json:"unread_count"`
	IsArchived      bool             `json:"is_archived"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

type ParticipantInfo struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Email    string  `json:"email"`
	Role     string  `json:"role"`
	Avatar   *string `json:"avatar,omitempty"`
	IsOnline bool    `json:"is_online"`
	LastSeen *time.Time `json:"last_seen,omitempty"`
}

type AttachmentResponse struct {
	ID       string `json:"id"`
	FileName string `json:"file_name"`
	FileURL  string `json:"file_url"`
	FileSize int64  `json:"file_size"`
	FileType string `json:"file_type"`
	MimeType string `json:"mime_type"`
}

type NotificationResponse struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenant_id"`
	UserID      string     `json:"user_id"`
	Title       string     `json:"title"`
	Content     string     `json:"content"`
	Type        string     `json:"type"`
	Priority    string     `json:"priority"`
	Status      string     `json:"status"`
	ReadAt      *time.Time `json:"read_at,omitempty"`
	ActionURL   *string    `json:"action_url,omitempty"`
	ActionLabel *string    `json:"action_label,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type AnnouncementResponse struct {
	ID          string                `json:"id"`
	TenantID    string                `json:"tenant_id"`
	AuthorID    string                `json:"author_id"`
	AuthorName  string                `json:"author_name"`
	Title       string                `json:"title"`
	Content     string                `json:"content"`
	Priority    string                `json:"priority"`
	Status      string                `json:"status"`
	PublishAt   *time.Time            `json:"publish_at,omitempty"`
	ExpiresAt   *time.Time            `json:"expires_at,omitempty"`
	Recipients  []RecipientInfo       `json:"recipients"`
	Attachments []AttachmentResponse  `json:"attachments,omitempty"`
	Stats       AnnouncementStats     `json:"stats"`
	CreatedAt   time.Time             `json:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at"`
}

type RecipientInfo struct {
	Type  string `json:"type"`
	ID    string `json:"id"`
	Name  string `json:"name"`
	Count int    `json:"count,omitempty"` // For group/role recipients
}

type AnnouncementStats struct {
	TotalRecipients int `json:"total_recipients"`
	DeliveredCount  int `json:"delivered_count"`
	ReadCount       int `json:"read_count"`
	ClickedCount    int `json:"clicked_count"`
}

type MessageThreadResponse struct {
	ConversationID string            `json:"conversation_id"`
	Messages       []MessageResponse `json:"messages"`
	Participants   []ParticipantInfo `json:"participants"`
	CanReply       bool              `json:"can_reply"`
	IsArchived     bool              `json:"is_archived"`
	TotalCount     int               `json:"total_count"`
}

// Dashboard and statistics
type CommunicationStatsResponse struct {
	TotalMessages     int                      `json:"total_messages"`
	UnreadMessages    int                      `json:"unread_messages"`
	TotalNotifications int                     `json:"total_notifications"`
	UnreadNotifications int                    `json:"unread_notifications"`
	ActiveConversations int                    `json:"active_conversations"`
	RecentActivity    []RecentActivityItem     `json:"recent_activity"`
	MessagesByType    map[string]int           `json:"messages_by_type"`
	NotificationsByType map[string]int         `json:"notifications_by_type"`
}

type RecentActivityItem struct {
	Type      string    `json:"type"` // message, notification, announcement
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Summary   string    `json:"summary"`
	From      string    `json:"from"`
	CreatedAt time.Time `json:"created_at"`
}

// Communication preferences
type CommunicationPreferencesRequest struct {
	EmailNotifications  EmailPreferences  `json:"email_notifications"`
	SMSNotifications    SMSPreferences    `json:"sms_notifications"`
	PushNotifications   PushPreferences   `json:"push_notifications"`
	DigestSettings      DigestPreferences `json:"digest_settings"`
}

type EmailPreferences struct {
	Enabled          bool     `json:"enabled"`
	DirectMessages   bool     `json:"direct_messages"`
	Announcements    bool     `json:"announcements"`
	GradeUpdates     bool     `json:"grade_updates"`
	AttendanceAlerts bool     `json:"attendance_alerts"`
	SystemAlerts     bool     `json:"system_alerts"`
	Types            []string `json:"types,omitempty"`
}

type SMSPreferences struct {
	Enabled       bool     `json:"enabled"`
	PhoneNumber   string   `json:"phone_number"`
	UrgentOnly    bool     `json:"urgent_only"`
	Types         []string `json:"types,omitempty"`
}

type PushPreferences struct {
	Enabled       bool     `json:"enabled"`
	DirectMessages bool    `json:"direct_messages"`
	Announcements bool     `json:"announcements"`
	Types         []string `json:"types,omitempty"`
}

type DigestPreferences struct {
	Enabled   bool   `json:"enabled"`
	Frequency string `json:"frequency"` // daily, weekly, never
	Time      string `json:"time"`      // HH:MM format
}

type CommunicationPreferencesResponse struct {
	UserID            string                          `json:"user_id"`
	EmailNotifications  EmailPreferences            `json:"email_notifications"`
	SMSNotifications    SMSPreferences              `json:"sms_notifications"`
	PushNotifications   PushPreferences             `json:"push_notifications"`
	DigestSettings      DigestPreferences           `json:"digest_settings"`
	UpdatedAt         time.Time                     `json:"updated_at"`
}

// Bulk operations
type BulkMessageRequest struct {
	Recipients  []RecipientTarget `json:"recipients" validate:"required,dive"`
	Subject     string            `json:"subject" validate:"required,min=3,max=200"`
	Content     string            `json:"content" validate:"required,min=10,max=5000"`
	Type        string            `json:"type" validate:"required,oneof=announcement urgent"`
	Priority    string            `json:"priority" validate:"oneof=low normal high urgent"`
	ScheduledFor *string          `json:"scheduled_for,omitempty"`
	SendEmail   bool              `json:"send_email"`
	SendSMS     bool              `json:"send_sms"`
}

type BulkMessageResponse struct {
	JobID           string    `json:"job_id"`
	TotalRecipients int       `json:"total_recipients"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

// Template system
type MessageTemplateRequest struct {
	Name        string                 `json:"name" validate:"required,min=3,max=100"`
	Type        string                 `json:"type" validate:"required,oneof=email sms push announcement"`
	Subject     string                 `json:"subject" validate:"required,min=3,max=200"`
	Content     string                 `json:"content" validate:"required,min=10,max=5000"`
	Variables   []TemplateVariable     `json:"variables,omitempty"`
	IsDefault   bool                   `json:"is_default"`
}

type TemplateVariable struct {
	Key         string `json:"key"`
	Label       string `json:"label"`
	Type        string `json:"type"` // text, number, date, boolean
	Required    bool   `json:"required"`
	DefaultValue *string `json:"default_value,omitempty"`
}

type MessageTemplateResponse struct {
	ID          string             `json:"id"`
	TenantID    string             `json:"tenant_id"`
	Name        string             `json:"name"`
	Type        string             `json:"type"`
	Subject     string             `json:"subject"`
	Content     string             `json:"content"`
	Variables   []TemplateVariable `json:"variables"`
	IsDefault   bool               `json:"is_default"`
	CreatedBy   string             `json:"created_by"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

// Communication channels
type ChannelResponse struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Type        string              `json:"type"` // group, broadcast, direct
	IsPrivate   bool                `json:"is_private"`
	MemberCount int                 `json:"member_count"`
	Members     []ParticipantInfo   `json:"members,omitempty"`
	Moderators  []string            `json:"moderators"`
	Settings    ChannelSettings     `json:"settings"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

type ChannelSettings struct {
	AllowAttachments bool     `json:"allow_attachments"`
	MaxMessageLength int      `json:"max_message_length"`
	MembersCanInvite bool     `json:"members_can_invite"`
	AutoArchive      bool     `json:"auto_archive"`
	ArchiveAfterDays int      `json:"archive_after_days,omitempty"`
	AllowedFileTypes []string `json:"allowed_file_types,omitempty"`
}

type CreateChannelRequest struct {
	Name        string          `json:"name" validate:"required,min=3,max=100"`
	Description string          `json:"description,omitempty"`
	Type        string          `json:"type" validate:"required,oneof=group broadcast direct"`
	IsPrivate   bool            `json:"is_private"`
	Members     []string        `json:"members,omitempty"`
	Moderators  []string        `json:"moderators,omitempty"`
	Settings    ChannelSettings `json:"settings"`
}

// Search and filters
type MessageSearchRequest struct {
	Query         string   `json:"query,omitempty"`
	Type          string   `json:"type,omitempty"`
	SenderID      string   `json:"sender_id,omitempty"`
	RecipientID   string   `json:"recipient_id,omitempty"`
	StartDate     string   `json:"start_date,omitempty"`
	EndDate       string   `json:"end_date,omitempty"`
	Priority      string   `json:"priority,omitempty"`
	Status        string   `json:"status,omitempty"`
	HasAttachment bool     `json:"has_attachment,omitempty"`
	Tags          []string `json:"tags,omitempty"`
}

type MessageSearchResponse struct {
	Messages   []MessageResponse `json:"messages"`
	TotalCount int               `json:"total_count"`
	Page       int               `json:"page"`
	PerPage    int               `json:"per_page"`
	Query      string            `json:"query"`
}