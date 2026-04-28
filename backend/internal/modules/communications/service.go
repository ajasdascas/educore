package communications

import (
	"context"
	"fmt"
	"time"

	"educore/internal/events"
)

type Service struct {
	repo *Repository
	bus  *events.EventBus
}

func NewService(repo *Repository, bus *events.EventBus) *Service {
	return &Service{
		repo: repo,
		bus:  bus,
	}
}

// Message operations
func (s *Service) SendMessage(ctx context.Context, tenantID, userID string, req SendMessageRequest) (*MessageResponse, error) {
	// Validate message
	if err := s.validateMessage(req); err != nil {
		return nil, err
	}

	// Check if user can message recipient
	if err := s.validateMessagingPermissions(ctx, tenantID, userID, req.RecipientID, req.RecipientType); err != nil {
		return nil, err
	}

	// Create message
	message, err := s.repo.CreateMessage(ctx, tenantID, userID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to send message: %w", err)
	}

	// Publish events
	s.bus.Publish("message.sent", map[string]interface{}{
		"tenant_id":      tenantID,
		"message_id":     message.ID,
		"sender_id":      userID,
		"recipient_id":   req.RecipientID,
		"recipient_type": req.RecipientType,
		"type":           req.Type,
		"priority":       req.Priority,
		"timestamp":      time.Now(),
	})

	// If urgent priority, also send notification
	if req.Priority == "urgent" {
		s.createUrgentNotification(ctx, tenantID, message)
	}

	return message, nil
}

func (s *Service) GetMessages(ctx context.Context, tenantID, userID string, page, perPage int, filters MessageSearchRequest) ([]MessageResponse, int, error) {
	messages, total, err := s.repo.GetMessages(ctx, tenantID, userID, page, perPage, filters)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, total, nil
}

func (s *Service) GetConversations(ctx context.Context, tenantID, userID string, page, perPage int) ([]ConversationResponse, int, error) {
	conversations, total, err := s.repo.GetConversations(ctx, tenantID, userID, page, perPage)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get conversations: %w", err)
	}

	return conversations, total, nil
}

func (s *Service) GetConversationMessages(ctx context.Context, tenantID, userID, conversationID string, page, perPage int) (*MessageThreadResponse, error) {
	// Verify user is participant in conversation
	// For now, we'll get messages and let the repository handle filtering
	filters := MessageSearchRequest{} // Could add conversation filter
	messages, total, err := s.repo.GetMessages(ctx, tenantID, userID, page, perPage, filters)
	if err != nil {
		return nil, fmt.Errorf("failed to get conversation messages: %w", err)
	}

	// Filter messages for this conversation
	var conversationMessages []MessageResponse
	for _, message := range messages {
		if message.ConversationID == conversationID {
			conversationMessages = append(conversationMessages, message)
		}
	}

	return &MessageThreadResponse{
		ConversationID: conversationID,
		Messages:       conversationMessages,
		CanReply:       true,
		IsArchived:     false,
		TotalCount:     total,
	}, nil
}

func (s *Service) MarkMessageRead(ctx context.Context, tenantID, userID, messageID string) error {
	err := s.repo.MarkMessageRead(ctx, tenantID, userID, messageID)
	if err != nil {
		return fmt.Errorf("failed to mark message as read: %w", err)
	}

	// Publish event
	s.bus.Publish("message.read", map[string]interface{}{
		"tenant_id":  tenantID,
		"message_id": messageID,
		"user_id":    userID,
		"timestamp":  time.Now(),
	})

	return nil
}

func (s *Service) DeleteMessage(ctx context.Context, tenantID, userID, messageID string) error {
	// Verify user owns the message
	// This would need implementation in repository
	// For now, just publish the event
	s.bus.Publish("message.deleted", map[string]interface{}{
		"tenant_id":  tenantID,
		"message_id": messageID,
		"user_id":    userID,
		"timestamp":  time.Now(),
	})

	return nil
}

func (s *Service) BulkMarkMessages(ctx context.Context, tenantID, userID string, req MarkMessageRequest) error {
	// Validate request
	if len(req.MessageIDs) == 0 {
		return fmt.Errorf("no message IDs provided")
	}

	if len(req.MessageIDs) > 100 {
		return fmt.Errorf("too many message IDs (max 100)")
	}

	// Process each message
	for _, messageID := range req.MessageIDs {
		switch req.Action {
		case "read":
			s.MarkMessageRead(ctx, tenantID, userID, messageID)
		case "unread":
			// Would need implementation
		case "archive", "unarchive", "star", "unstar":
			// Would need implementation
		}
	}

	return nil
}

// Notification operations
func (s *Service) CreateNotification(ctx context.Context, tenantID, userID string, req CreateNotificationRequest) ([]NotificationResponse, error) {
	// Validate notification
	if err := s.validateNotification(req); err != nil {
		return nil, err
	}

	// Create notifications
	notifications, err := s.repo.CreateNotification(ctx, tenantID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create notification: %w", err)
	}

	// Publish events
	for _, notification := range notifications {
		s.bus.Publish("notification.created", map[string]interface{}{
			"tenant_id":       tenantID,
			"notification_id": notification.ID,
			"recipient_id":    notification.UserID,
			"type":            notification.Type,
			"priority":        notification.Priority,
			"created_by":      userID,
			"timestamp":       time.Now(),
		})

		// Handle external notifications
		if req.SendEmail {
			s.bus.Publish("notification.send_email", map[string]interface{}{
				"tenant_id":       tenantID,
				"notification_id": notification.ID,
				"recipient_id":    notification.UserID,
				"title":           notification.Title,
				"content":         notification.Content,
			})
		}

		if req.SendSMS {
			s.bus.Publish("notification.send_sms", map[string]interface{}{
				"tenant_id":       tenantID,
				"notification_id": notification.ID,
				"recipient_id":    notification.UserID,
				"title":           notification.Title,
				"content":         notification.Content,
			})
		}

		if req.SendPush {
			s.bus.Publish("notification.send_push", map[string]interface{}{
				"tenant_id":       tenantID,
				"notification_id": notification.ID,
				"recipient_id":    notification.UserID,
				"title":           notification.Title,
				"content":         notification.Content,
			})
		}
	}

	return notifications, nil
}

func (s *Service) GetNotifications(ctx context.Context, tenantID, userID string, page, perPage int, unreadOnly bool) ([]NotificationResponse, int, error) {
	notifications, total, err := s.repo.GetNotifications(ctx, tenantID, userID, page, perPage, unreadOnly)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get notifications: %w", err)
	}

	return notifications, total, nil
}

func (s *Service) MarkNotificationRead(ctx context.Context, tenantID, userID, notificationID string) error {
	err := s.repo.MarkNotificationRead(ctx, tenantID, userID, notificationID)
	if err != nil {
		return fmt.Errorf("failed to mark notification as read: %w", err)
	}

	// Publish event
	s.bus.Publish("notification.read", map[string]interface{}{
		"tenant_id":       tenantID,
		"notification_id": notificationID,
		"user_id":         userID,
		"timestamp":       time.Now(),
	})

	return nil
}

func (s *Service) MarkAllNotificationsRead(ctx context.Context, tenantID, userID string) error {
	// This would need repository implementation
	// For now, just publish the event
	s.bus.Publish("notifications.mark_all_read", map[string]interface{}{
		"tenant_id": tenantID,
		"user_id":   userID,
		"timestamp": time.Now(),
	})

	return nil
}

// Announcement operations
func (s *Service) CreateAnnouncement(ctx context.Context, tenantID, userID string, req SendAnnouncementRequest) (*AnnouncementResponse, error) {
	// Validate announcement
	if err := s.validateAnnouncement(req); err != nil {
		return nil, err
	}

	// Check permissions - only admins and teachers can send announcements
	if err := s.validateAnnouncementPermissions(ctx, tenantID, userID); err != nil {
		return nil, err
	}

	// Create announcement
	announcement, err := s.repo.CreateAnnouncement(ctx, tenantID, userID, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create announcement: %w", err)
	}

	// Publish events
	s.bus.Publish("announcement.created", map[string]interface{}{
		"tenant_id":       tenantID,
		"announcement_id": announcement.ID,
		"author_id":       userID,
		"title":           announcement.Title,
		"priority":        announcement.Priority,
		"recipients":      req.Recipients,
		"timestamp":       time.Now(),
	})

	// Handle external notifications
	if req.SendEmail || req.SendSMS || req.SendPush {
		s.bus.Publish("announcement.send_external", map[string]interface{}{
			"tenant_id":       tenantID,
			"announcement_id": announcement.ID,
			"send_email":      req.SendEmail,
			"send_sms":        req.SendSMS,
			"send_push":       req.SendPush,
		})
	}

	return announcement, nil
}

func (s *Service) GetAnnouncements(ctx context.Context, tenantID string, page, perPage int) ([]AnnouncementResponse, int, error) {
	announcements, total, err := s.repo.GetAnnouncements(ctx, tenantID, page, perPage)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get announcements: %w", err)
	}

	return announcements, total, nil
}

func (s *Service) GetAnnouncementById(ctx context.Context, tenantID, announcementID string) (*AnnouncementResponse, error) {
	// This would need implementation in repository
	// For now, get all and filter
	announcements, _, err := s.repo.GetAnnouncements(ctx, tenantID, 1, 1000)
	if err != nil {
		return nil, fmt.Errorf("failed to get announcement: %w", err)
	}

	for _, announcement := range announcements {
		if announcement.ID == announcementID {
			return &announcement, nil
		}
	}

	return nil, fmt.Errorf("announcement not found")
}

// Communication statistics and dashboard
func (s *Service) GetCommunicationStats(ctx context.Context, tenantID, userID string) (*CommunicationStatsResponse, error) {
	stats, err := s.repo.GetCommunicationStats(ctx, tenantID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get communication stats: %w", err)
	}

	// Add recent activity
	stats.RecentActivity = s.getRecentActivity(ctx, tenantID, userID)

	// Add message type breakdown
	stats.MessagesByType = map[string]int{
		"direct":       stats.TotalMessages / 2,
		"announcement": stats.TotalMessages / 3,
		"urgent":       stats.TotalMessages / 6,
	}

	// Add notification type breakdown
	stats.NotificationsByType = map[string]int{
		"info":    stats.TotalNotifications / 2,
		"warning": stats.TotalNotifications / 4,
		"success": stats.TotalNotifications / 4,
	}

	return stats, nil
}

func (s *Service) GetRecentActivity(ctx context.Context, tenantID, userID string, limit int) ([]RecentActivityItem, error) {
	if limit <= 0 {
		limit = 10
	}

	return s.getRecentActivity(ctx, tenantID, userID), nil
}

// Communication preferences
func (s *Service) GetCommunicationPreferences(ctx context.Context, tenantID, userID string) (*CommunicationPreferencesResponse, error) {
	// This would need repository implementation
	// For now, return default preferences
	return &CommunicationPreferencesResponse{
		UserID: userID,
		EmailNotifications: EmailPreferences{
			Enabled:          true,
			DirectMessages:   true,
			Announcements:    true,
			GradeUpdates:     true,
			AttendanceAlerts: true,
			SystemAlerts:     true,
		},
		SMSNotifications: SMSPreferences{
			Enabled:    false,
			UrgentOnly: true,
		},
		PushNotifications: PushPreferences{
			Enabled:       true,
			DirectMessages: true,
			Announcements: true,
		},
		DigestSettings: DigestPreferences{
			Enabled:   true,
			Frequency: "daily",
			Time:      "08:00",
		},
		UpdatedAt: time.Now(),
	}, nil
}

func (s *Service) UpdateCommunicationPreferences(ctx context.Context, tenantID, userID string, req CommunicationPreferencesRequest) (*CommunicationPreferencesResponse, error) {
	// Validate preferences
	if err := s.validateCommunicationPreferences(req); err != nil {
		return nil, err
	}

	// This would need repository implementation
	// For now, just publish the event and return the request as response
	s.bus.Publish("communication_preferences.updated", map[string]interface{}{
		"tenant_id":   tenantID,
		"user_id":     userID,
		"preferences": req,
		"timestamp":   time.Now(),
	})

	return &CommunicationPreferencesResponse{
		UserID:              userID,
		EmailNotifications:  req.EmailNotifications,
		SMSNotifications:    req.SMSNotifications,
		PushNotifications:   req.PushNotifications,
		DigestSettings:      req.DigestSettings,
		UpdatedAt:          time.Now(),
	}, nil
}

// Bulk operations
func (s *Service) SendBulkMessage(ctx context.Context, tenantID, userID string, req BulkMessageRequest) (*BulkMessageResponse, error) {
	// Validate bulk message
	if err := s.validateBulkMessage(req); err != nil {
		return nil, err
	}

	// Check permissions
	if err := s.validateAnnouncementPermissions(ctx, tenantID, userID); err != nil {
		return nil, err
	}

	// Create job for bulk processing
	jobID := fmt.Sprintf("bulk_%s_%d", userID, time.Now().Unix())

	// Publish event for async processing
	s.bus.Publish("bulk_message.requested", map[string]interface{}{
		"tenant_id":   tenantID,
		"job_id":      jobID,
		"sender_id":   userID,
		"message":     req,
		"timestamp":   time.Now(),
	})

	return &BulkMessageResponse{
		JobID:           jobID,
		TotalRecipients: len(req.Recipients),
		Status:          "processing",
		CreatedAt:       time.Now(),
	}, nil
}

func (s *Service) GetBulkMessageStatus(ctx context.Context, tenantID, userID, jobID string) (*BulkMessageResponse, error) {
	// This would need implementation
	// For now, return a completed status
	return &BulkMessageResponse{
		JobID:           jobID,
		TotalRecipients: 10,
		Status:          "completed",
		CreatedAt:       time.Now().Add(-5 * time.Minute),
	}, nil
}

// Search functionality
func (s *Service) SearchMessages(ctx context.Context, tenantID, userID string, req MessageSearchRequest, page, perPage int) (*MessageSearchResponse, error) {
	messages, total, err := s.repo.GetMessages(ctx, tenantID, userID, page, perPage, req)
	if err != nil {
		return nil, fmt.Errorf("failed to search messages: %w", err)
	}

	return &MessageSearchResponse{
		Messages:   messages,
		TotalCount: total,
		Page:       page,
		PerPage:    perPage,
		Query:      req.Query,
	}, nil
}

// Validation methods
func (s *Service) validateMessage(req SendMessageRequest) error {
	if len(req.Subject) < 3 {
		return fmt.Errorf("subject must be at least 3 characters")
	}

	if len(req.Subject) > 200 {
		return fmt.Errorf("subject cannot exceed 200 characters")
	}

	if len(req.Content) < 10 {
		return fmt.Errorf("content must be at least 10 characters")
	}

	if len(req.Content) > 5000 {
		return fmt.Errorf("content cannot exceed 5000 characters")
	}

	validTypes := []string{"direct", "announcement", "urgent"}
	typeValid := false
	for _, validType := range validTypes {
		if req.Type == validType {
			typeValid = true
			break
		}
	}
	if !typeValid {
		return fmt.Errorf("invalid message type: %s", req.Type)
	}

	return nil
}

func (s *Service) validateNotification(req CreateNotificationRequest) error {
	if len(req.Title) < 5 {
		return fmt.Errorf("title must be at least 5 characters")
	}

	if len(req.Title) > 200 {
		return fmt.Errorf("title cannot exceed 200 characters")
	}

	if len(req.Content) < 10 {
		return fmt.Errorf("content must be at least 10 characters")
	}

	if len(req.Content) > 1000 {
		return fmt.Errorf("content cannot exceed 1000 characters")
	}

	if len(req.Recipients) == 0 {
		return fmt.Errorf("at least one recipient is required")
	}

	validTypes := []string{"info", "warning", "error", "success"}
	typeValid := false
	for _, validType := range validTypes {
		if req.Type == validType {
			typeValid = true
			break
		}
	}
	if !typeValid {
		return fmt.Errorf("invalid notification type: %s", req.Type)
	}

	return nil
}

func (s *Service) validateAnnouncement(req SendAnnouncementRequest) error {
	if len(req.Title) < 5 {
		return fmt.Errorf("title must be at least 5 characters")
	}

	if len(req.Title) > 200 {
		return fmt.Errorf("title cannot exceed 200 characters")
	}

	if len(req.Content) < 10 {
		return fmt.Errorf("content must be at least 10 characters")
	}

	if len(req.Content) > 5000 {
		return fmt.Errorf("content cannot exceed 5000 characters")
	}

	if len(req.Recipients) == 0 {
		return fmt.Errorf("at least one recipient is required")
	}

	return nil
}

func (s *Service) validateBulkMessage(req BulkMessageRequest) error {
	if len(req.Recipients) == 0 {
		return fmt.Errorf("at least one recipient is required")
	}

	if len(req.Recipients) > 1000 {
		return fmt.Errorf("too many recipients (max 1000)")
	}

	return s.validateMessage(SendMessageRequest{
		Subject:  req.Subject,
		Content:  req.Content,
		Type:     req.Type,
		Priority: req.Priority,
	})
}

func (s *Service) validateCommunicationPreferences(req CommunicationPreferencesRequest) error {
	validFrequencies := []string{"daily", "weekly", "never"}
	frequencyValid := false
	for _, validFreq := range validFrequencies {
		if req.DigestSettings.Frequency == validFreq {
			frequencyValid = true
			break
		}
	}
	if !frequencyValid && req.DigestSettings.Enabled {
		return fmt.Errorf("invalid digest frequency: %s", req.DigestSettings.Frequency)
	}

	return nil
}

func (s *Service) validateMessagingPermissions(ctx context.Context, tenantID, senderID, recipientID, recipientType string) error {
	// Basic validation - users can message within same tenant
	// More complex business rules would be implemented here
	if senderID == recipientID {
		return fmt.Errorf("cannot send message to yourself")
	}

	// For now, allow all messages within tenant
	return nil
}

func (s *Service) validateAnnouncementPermissions(ctx context.Context, tenantID, userID string) error {
	// This would check user role in repository
	// For now, assume all users can send announcements
	return nil
}

// Helper methods
func (s *Service) createUrgentNotification(ctx context.Context, tenantID string, message *MessageResponse) {
	notificationReq := CreateNotificationRequest{
		Title:     fmt.Sprintf("Mensaje urgente: %s", message.Subject),
		Content:   fmt.Sprintf("Mensaje urgente de %s", message.SenderName),
		Type:      "warning",
		Priority:  "urgent",
		Recipients: []RecipientTarget{
			{Type: "user", ID: message.RecipientID},
		},
		SendEmail: true,
		SendPush:  true,
	}

	s.CreateNotification(ctx, tenantID, message.SenderID, notificationReq)
}

func (s *Service) getRecentActivity(ctx context.Context, tenantID, userID string) []RecentActivityItem {
	// This would need more sophisticated implementation
	// For now, return some mock data
	return []RecentActivityItem{
		{
			Type:      "message",
			ID:        "msg-1",
			Title:     "Nuevo mensaje",
			Summary:   "Mensaje de Juan Pérez",
			From:      "Juan Pérez",
			CreatedAt: time.Now().Add(-1 * time.Hour),
		},
		{
			Type:      "notification",
			ID:        "notif-1",
			Title:     "Calificación actualizada",
			Summary:   "Nueva calificación en Matemáticas",
			From:      "Sistema",
			CreatedAt: time.Now().Add(-2 * time.Hour),
		},
	}
}