package communications

import (
	"context"
	"database/sql"
	"educore/internal/pkg/database"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// Message operations
func (r *Repository) CreateMessage(ctx context.Context, tenantID, senderID string, req SendMessageRequest) (*MessageResponse, error) {
	// First create or get conversation
	conversationID, err := r.getOrCreateConversation(ctx, tenantID, senderID, req.RecipientID)
	if err != nil {
		return nil, err
	}

	query := `
		INSERT INTO messages (tenant_id, conversation_id, sender_id, recipient_id, recipient_type,
							 subject, content, type, priority, status, scheduled_for)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at
	`

	var id string
	var createdAt, updatedAt time.Time
	var scheduledFor *time.Time

	if req.ScheduledFor != nil {
		parsed, err := time.Parse(time.RFC3339, *req.ScheduledFor)
		if err == nil {
			scheduledFor = &parsed
		}
	}

	err = r.db.QueryRowContext(ctx, query,
		tenantID, conversationID, senderID, req.RecipientID, req.RecipientType,
		req.Subject, req.Content, req.Type, req.Priority, "sent", scheduledFor,
	).Scan(&id, &createdAt, &updatedAt)

	if err != nil {
		return nil, err
	}

	// Handle attachments
	if len(req.Attachments) > 0 {
		if err := r.createAttachments(ctx, tenantID, id, req.Attachments); err != nil {
			return nil, err
		}
	}

	// Get sender info
	senderInfo, err := r.getUserInfo(ctx, tenantID, senderID)
	if err != nil {
		return nil, err
	}

	// Get recipient info
	recipientInfo, err := r.getUserInfo(ctx, tenantID, req.RecipientID)
	if err != nil {
		return nil, err
	}

	// Get attachments
	attachments, _ := r.getAttachments(ctx, tenantID, id)

	return &MessageResponse{
		ID:             id,
		ConversationID: conversationID,
		SenderID:       senderID,
		SenderName:     senderInfo.Name,
		SenderAvatar:   senderInfo.Avatar,
		RecipientID:    req.RecipientID,
		RecipientName:  recipientInfo.Name,
		RecipientType:  req.RecipientType,
		Subject:        req.Subject,
		Content:        req.Content,
		Type:           req.Type,
		Priority:       req.Priority,
		Status:         "sent",
		Attachments:    attachments,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}, nil
}

func (r *Repository) GetMessages(ctx context.Context, tenantID, userID string, page, perPage int, filters MessageSearchRequest) ([]MessageResponse, int, error) {
	whereConditions := []string{"m.tenant_id = $1", "(m.sender_id = $2 OR m.recipient_id = $2)"}
	args := []interface{}{tenantID, userID}
	argCount := 2

	// Add filters
	if filters.Query != "" {
		argCount++
		whereConditions = append(whereConditions, fmt.Sprintf("(m.subject ILIKE $%d OR m.content ILIKE $%d)", argCount, argCount))
		args = append(args, "%"+filters.Query+"%")
	}

	if filters.Type != "" {
		argCount++
		whereConditions = append(whereConditions, fmt.Sprintf("m.type = $%d", argCount))
		args = append(args, filters.Type)
	}

	if filters.SenderID != "" {
		argCount++
		whereConditions = append(whereConditions, fmt.Sprintf("m.sender_id = $%d", argCount))
		args = append(args, filters.SenderID)
	}

	if filters.StartDate != "" {
		argCount++
		whereConditions = append(whereConditions, fmt.Sprintf("m.created_at >= $%d", argCount))
		args = append(args, filters.StartDate)
	}

	if filters.EndDate != "" {
		argCount++
		whereConditions = append(whereConditions, fmt.Sprintf("m.created_at <= $%d", argCount))
		args = append(args, filters.EndDate)
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM messages m WHERE %s`, whereClause)
	var total int
	r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)

	// Get messages
	query := fmt.Sprintf(`
		SELECT m.id, m.conversation_id, m.sender_id, m.recipient_id, m.recipient_type,
			   m.subject, m.content, m.type, m.priority, m.status, m.read_at,
			   m.created_at, m.updated_at,
			   s.first_name || ' ' || s.last_name as sender_name,
			   r.first_name || ' ' || r.last_name as recipient_name
		FROM messages m
		JOIN users s ON s.id = m.sender_id
		JOIN users r ON r.id = m.recipient_id
		WHERE %s
		ORDER BY m.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argCount+1, argCount+2)

	offset := (page - 1) * perPage
	args = append(args, perPage, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var messages []MessageResponse
	for rows.Next() {
		var message MessageResponse
		var readAt sql.NullString

		err := rows.Scan(
			&message.ID, &message.ConversationID, &message.SenderID, &message.RecipientID,
			&message.RecipientType, &message.Subject, &message.Content, &message.Type,
			&message.Priority, &message.Status, &readAt, &message.CreatedAt, &message.UpdatedAt,
			&message.SenderName, &message.RecipientName,
		)
		if err != nil {
			return nil, 0, err
		}

		if readAt.Valid {
			parsed, _ := time.Parse(time.RFC3339, readAt.String)
			message.ReadAt = &parsed
		}

		// Get attachments
		message.Attachments, _ = r.getAttachments(ctx, tenantID, message.ID)

		messages = append(messages, message)
	}

	return messages, total, nil
}

func (r *Repository) GetConversations(ctx context.Context, tenantID, userID string, page, perPage int) ([]ConversationResponse, int, error) {
	countQuery := `
		SELECT COUNT(DISTINCT c.id)
		FROM conversations c
		WHERE c.tenant_id = $1 AND $2 = ANY(c.participant_ids)
	`
	if database.IsMySQL(r.db.Driver()) {
		countQuery = `
			SELECT COUNT(DISTINCT c.id)
			FROM conversations c
			WHERE c.tenant_id = $1 AND JSON_CONTAINS(c.participant_ids, JSON_QUOTE($2))
		`
	}
	var total int
	r.db.QueryRowContext(ctx, countQuery, tenantID, userID).Scan(&total)

	query := `
		SELECT c.id, c.participant_ids, c.subject, c.is_archived, c.created_at, c.updated_at,
			   COUNT(m.id) as message_count,
			   COUNT(CASE WHEN m.status = 'sent' AND m.recipient_id = $2 AND m.read_at IS NULL THEN 1 END) as unread_count
		FROM conversations c
		LEFT JOIN messages m ON m.conversation_id = c.id
		WHERE c.tenant_id = $1 AND $2 = ANY(c.participant_ids)
		GROUP BY c.id, c.participant_ids, c.subject, c.is_archived, c.created_at, c.updated_at
		ORDER BY c.updated_at DESC
		LIMIT $3 OFFSET $4
	`
	if database.IsMySQL(r.db.Driver()) {
		query = `
			SELECT c.id, c.participant_ids, c.subject, c.is_archived, c.created_at, c.updated_at,
				   COUNT(m.id) as message_count,
				   COUNT(CASE WHEN m.status = 'sent' AND m.recipient_id = $2 AND m.read_at IS NULL THEN 1 END) as unread_count
			FROM conversations c
			LEFT JOIN messages m ON m.conversation_id = c.id
			WHERE c.tenant_id = $1 AND JSON_CONTAINS(c.participant_ids, JSON_QUOTE($2))
			GROUP BY c.id, c.participant_ids, c.subject, c.is_archived, c.created_at, c.updated_at
			ORDER BY c.updated_at DESC
			LIMIT $3 OFFSET $4
		`
	}

	offset := (page - 1) * perPage
	rows, err := r.db.QueryContext(ctx, query, tenantID, userID, perPage, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var conversations []ConversationResponse
	for rows.Next() {
		var conv ConversationResponse
		if database.IsMySQL(r.db.Driver()) {
			var participantIDs []string
			err := rows.Scan(
				&conv.ID, &participantIDs, &conv.Subject, &conv.IsArchived,
				&conv.CreatedAt, &conv.UpdatedAt, &conv.MessageCount, &conv.UnreadCount,
			)
			if err != nil {
				return nil, 0, err
			}
			conv.ParticipantIDs = participantIDs
		} else {
			var participantIDs pq.StringArray
			err := rows.Scan(
				&conv.ID, &participantIDs, &conv.Subject, &conv.IsArchived,
				&conv.CreatedAt, &conv.UpdatedAt, &conv.MessageCount, &conv.UnreadCount,
			)
			if err != nil {
				return nil, 0, err
			}
			conv.ParticipantIDs = []string(participantIDs)
		}

		// Get participant info
		conv.Participants, _ = r.getParticipantInfo(ctx, tenantID, conv.ParticipantIDs)

		// Get last message
		conv.LastMessage, _ = r.getLastMessage(ctx, tenantID, conv.ID)

		conversations = append(conversations, conv)
	}

	return conversations, total, nil
}

func (r *Repository) MarkMessageRead(ctx context.Context, tenantID, userID, messageID string) error {
	query := `
		UPDATE messages
		SET read_at = NOW(), status = 'read'
		WHERE tenant_id = $1 AND id = $2 AND recipient_id = $3 AND read_at IS NULL
	`
	_, err := r.db.ExecContext(ctx, query, tenantID, messageID, userID)
	return err
}

// Notification operations
func (r *Repository) CreateNotification(ctx context.Context, tenantID string, req CreateNotificationRequest) ([]NotificationResponse, error) {
	var notifications []NotificationResponse

	// Resolve recipients
	recipients, err := r.resolveRecipients(ctx, tenantID, req.Recipients)
	if err != nil {
		return nil, err
	}

	for _, recipientID := range recipients {
		query := `
			INSERT INTO notifications (tenant_id, user_id, title, content, type, priority,
									  status, action_url, action_label, expires_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id, created_at
		`

		var id string
		var createdAt time.Time
		var expiresAt *time.Time

		if req.ExpiresAt != nil {
			parsed, err := time.Parse(time.RFC3339, *req.ExpiresAt)
			if err == nil {
				expiresAt = &parsed
			}
		}

		err := r.db.QueryRowContext(ctx, query,
			tenantID, recipientID, req.Title, req.Content, req.Type,
			req.Priority, "unread", req.ActionURL, req.ActionLabel, expiresAt,
		).Scan(&id, &createdAt)

		if err != nil {
			continue
		}

		notification := NotificationResponse{
			ID:          id,
			TenantID:    tenantID,
			UserID:      recipientID,
			Title:       req.Title,
			Content:     req.Content,
			Type:        req.Type,
			Priority:    req.Priority,
			Status:      "unread",
			ActionURL:   req.ActionURL,
			ActionLabel: req.ActionLabel,
			ExpiresAt:   expiresAt,
			CreatedAt:   createdAt,
		}

		notifications = append(notifications, notification)
	}

	return notifications, nil
}

func (r *Repository) GetNotifications(ctx context.Context, tenantID, userID string, page, perPage int, unreadOnly bool) ([]NotificationResponse, int, error) {
	whereConditions := []string{"tenant_id = $1", "user_id = $2"}
	args := []interface{}{tenantID, userID}

	if unreadOnly {
		whereConditions = append(whereConditions, "status = 'unread'")
	}

	// Add expiration filter
	whereConditions = append(whereConditions, "(expires_at IS NULL OR expires_at > NOW())")

	whereClause := strings.Join(whereConditions, " AND ")

	// Count total
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM notifications WHERE %s`, whereClause)
	var total int
	r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)

	// Get notifications
	query := fmt.Sprintf(`
		SELECT id, title, content, type, priority, status, read_at,
			   action_url, action_label, expires_at, created_at
		FROM notifications
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`, whereClause)

	offset := (page - 1) * perPage
	rows, err := r.db.QueryContext(ctx, query, args[0], args[1], perPage, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var notifications []NotificationResponse
	for rows.Next() {
		var notification NotificationResponse
		var readAt, actionURL, actionLabel, expiresAt sql.NullString

		err := rows.Scan(
			&notification.ID, &notification.Title, &notification.Content,
			&notification.Type, &notification.Priority, &notification.Status, &readAt,
			&actionURL, &actionLabel, &expiresAt, &notification.CreatedAt,
		)
		if err != nil {
			return nil, 0, err
		}

		notification.TenantID = tenantID
		notification.UserID = userID

		if readAt.Valid {
			parsed, _ := time.Parse(time.RFC3339, readAt.String)
			notification.ReadAt = &parsed
		}
		if actionURL.Valid {
			notification.ActionURL = &actionURL.String
		}
		if actionLabel.Valid {
			notification.ActionLabel = &actionLabel.String
		}
		if expiresAt.Valid {
			parsed, _ := time.Parse(time.RFC3339, expiresAt.String)
			notification.ExpiresAt = &parsed
		}

		notifications = append(notifications, notification)
	}

	return notifications, total, nil
}

func (r *Repository) MarkNotificationRead(ctx context.Context, tenantID, userID, notificationID string) error {
	query := `
		UPDATE notifications
		SET status = 'read', read_at = NOW()
		WHERE tenant_id = $1 AND user_id = $2 AND id = $3
	`
	_, err := r.db.ExecContext(ctx, query, tenantID, userID, notificationID)
	return err
}

// Announcement operations
func (r *Repository) CreateAnnouncement(ctx context.Context, tenantID, authorID string, req SendAnnouncementRequest) (*AnnouncementResponse, error) {
	query := `
		INSERT INTO announcements (tenant_id, author_id, title, content, priority,
								  status, publish_at, expires_at, recipients)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`

	var id string
	var createdAt, updatedAt time.Time
	var publishAt, expiresAt *time.Time

	if req.PublishAt != nil {
		parsed, err := time.Parse(time.RFC3339, *req.PublishAt)
		if err == nil {
			publishAt = &parsed
		}
	}

	if req.ExpiresAt != nil {
		parsed, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err == nil {
			expiresAt = &parsed
		}
	}

	recipientsJSON, _ := json.Marshal(req.Recipients)

	err := r.db.QueryRowContext(ctx, query,
		tenantID, authorID, req.Title, req.Content, req.Priority,
		"published", publishAt, expiresAt, recipientsJSON,
	).Scan(&id, &createdAt, &updatedAt)

	if err != nil {
		return nil, err
	}

	// Get author info
	authorInfo, err := r.getUserInfo(ctx, tenantID, authorID)
	if err != nil {
		return nil, err
	}

	// Handle attachments
	var attachments []AttachmentResponse
	if len(req.Attachments) > 0 {
		if err := r.createAttachments(ctx, tenantID, id, req.Attachments); err == nil {
			attachments, _ = r.getAttachments(ctx, tenantID, id)
		}
	}

	// Calculate recipient info
	recipients := r.buildRecipientInfo(ctx, tenantID, req.Recipients)

	return &AnnouncementResponse{
		ID:          id,
		TenantID:    tenantID,
		AuthorID:    authorID,
		AuthorName:  authorInfo.Name,
		Title:       req.Title,
		Content:     req.Content,
		Priority:    req.Priority,
		Status:      "published",
		PublishAt:   publishAt,
		ExpiresAt:   expiresAt,
		Recipients:  recipients,
		Attachments: attachments,
		Stats:       AnnouncementStats{}, // Will be calculated later
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}, nil
}

func (r *Repository) GetAnnouncements(ctx context.Context, tenantID string, page, perPage int) ([]AnnouncementResponse, int, error) {
	countQuery := `SELECT COUNT(*) FROM announcements WHERE tenant_id = $1`
	var total int
	r.db.QueryRowContext(ctx, countQuery, tenantID).Scan(&total)

	query := `
		SELECT a.id, a.author_id, a.title, a.content, a.priority, a.status,
			   a.publish_at, a.expires_at, a.recipients, a.created_at, a.updated_at,
			   u.first_name || ' ' || u.last_name as author_name
		FROM announcements a
		JOIN users u ON u.id = a.author_id
		WHERE a.tenant_id = $1
		ORDER BY a.created_at DESC
		LIMIT $2 OFFSET $3
	`

	offset := (page - 1) * perPage
	rows, err := r.db.QueryContext(ctx, query, tenantID, perPage, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var announcements []AnnouncementResponse
	for rows.Next() {
		var announcement AnnouncementResponse
		var publishAt, expiresAt sql.NullString
		var recipientsJSON string

		err := rows.Scan(
			&announcement.ID, &announcement.AuthorID, &announcement.Title,
			&announcement.Content, &announcement.Priority, &announcement.Status,
			&publishAt, &expiresAt, &recipientsJSON, &announcement.CreatedAt,
			&announcement.UpdatedAt, &announcement.AuthorName,
		)
		if err != nil {
			return nil, 0, err
		}

		announcement.TenantID = tenantID

		if publishAt.Valid {
			parsed, _ := time.Parse(time.RFC3339, publishAt.String)
			announcement.PublishAt = &parsed
		}
		if expiresAt.Valid {
			parsed, _ := time.Parse(time.RFC3339, expiresAt.String)
			announcement.ExpiresAt = &parsed
		}

		// Parse recipients
		var recipients []RecipientTarget
		json.Unmarshal([]byte(recipientsJSON), &recipients)
		announcement.Recipients = r.buildRecipientInfo(ctx, tenantID, recipients)

		// Get attachments
		announcement.Attachments, _ = r.getAttachments(ctx, tenantID, announcement.ID)

		announcements = append(announcements, announcement)
	}

	return announcements, total, nil
}

// Communication statistics
func (r *Repository) GetCommunicationStats(ctx context.Context, tenantID, userID string) (*CommunicationStatsResponse, error) {
	stats := &CommunicationStatsResponse{}

	// Get message counts
	messageQuery := `
		SELECT
			COUNT(*) as total,
			COUNT(CASE WHEN recipient_id = $2 AND read_at IS NULL THEN 1 END) as unread
		FROM messages
		WHERE tenant_id = $1 AND (sender_id = $2 OR recipient_id = $2)
	`
	r.db.QueryRowContext(ctx, messageQuery, tenantID, userID).Scan(&stats.TotalMessages, &stats.UnreadMessages)

	// Get notification counts
	notificationQuery := `
		SELECT
			COUNT(*) as total,
			COUNT(CASE WHEN status = 'unread' THEN 1 END) as unread
		FROM notifications
		WHERE tenant_id = $1 AND user_id = $2 AND (expires_at IS NULL OR expires_at > NOW())
	`
	r.db.QueryRowContext(ctx, notificationQuery, tenantID, userID).Scan(&stats.TotalNotifications, &stats.UnreadNotifications)

	// Get active conversations
	conversationQuery := `
		SELECT COUNT(DISTINCT id)
		FROM conversations
		WHERE tenant_id = $1 AND $2 = ANY(participant_ids) AND is_archived = false
	`
	if database.IsMySQL(r.db.Driver()) {
		conversationQuery = `
			SELECT COUNT(DISTINCT id)
			FROM conversations
			WHERE tenant_id = $1 AND JSON_CONTAINS(participant_ids, JSON_QUOTE($2)) AND is_archived = false
		`
	}
	r.db.QueryRowContext(ctx, conversationQuery, tenantID, userID).Scan(&stats.ActiveConversations)

	return stats, nil
}

// Helper methods
func (r *Repository) getOrCreateConversation(ctx context.Context, tenantID, user1, user2 string) (string, error) {
	if database.IsMySQL(r.db.Driver()) {
		checkQuery := `
			SELECT id FROM conversations
			WHERE tenant_id = $1
			  AND JSON_CONTAINS(participant_ids, JSON_QUOTE($2))
			  AND JSON_CONTAINS(participant_ids, JSON_QUOTE($3))
			LIMIT 1
		`
		var conversationID string
		err := r.db.QueryRowContext(ctx, checkQuery, tenantID, user1, user2).Scan(&conversationID)
		if err == sql.ErrNoRows {
			participantsJSON, _ := json.Marshal([]string{user1, user2})
			createQuery := `
				INSERT INTO conversations (tenant_id, participant_ids, subject, is_archived)
				VALUES ($1, $2, $3, false)
				RETURNING id
			`
			err = r.db.QueryRowContext(ctx, createQuery, tenantID, string(participantsJSON), "Direct Message").Scan(&conversationID)
		}
		return conversationID, err
	}

	// Check if conversation exists
	checkQuery := `
		SELECT id FROM conversations
		WHERE tenant_id = $1 AND participant_ids @> $2 AND participant_ids @> $3
		LIMIT 1
	`

	var conversationID string
	err := r.db.QueryRowContext(ctx, checkQuery, tenantID, pq.Array([]string{user1}), pq.Array([]string{user2})).Scan(&conversationID)

	if err == sql.ErrNoRows {
		// Create new conversation
		createQuery := `
			INSERT INTO conversations (tenant_id, participant_ids, subject, is_archived)
			VALUES ($1, $2, $3, false)
			RETURNING id
		`
		err = r.db.QueryRowContext(ctx, createQuery, tenantID, pq.Array([]string{user1, user2}), "Direct Message").Scan(&conversationID)
	}

	return conversationID, err
}

func (r *Repository) createAttachments(ctx context.Context, tenantID, messageID string, attachments []AttachmentRequest) error {
	for _, att := range attachments {
		query := `
			INSERT INTO message_attachments (tenant_id, message_id, file_name, file_url, file_size, file_type)
			VALUES ($1, $2, $3, $4, $5, $6)
		`
		_, err := r.db.ExecContext(ctx, query, tenantID, messageID, att.FileName, att.FileURL, att.FileSize, att.FileType)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) getAttachments(ctx context.Context, tenantID, messageID string) ([]AttachmentResponse, error) {
	query := `
		SELECT id, file_name, file_url, file_size, file_type, mime_type
		FROM message_attachments
		WHERE tenant_id = $1 AND message_id = $2
		ORDER BY file_name
	`

	rows, err := r.db.QueryContext(ctx, query, tenantID, messageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attachments []AttachmentResponse
	for rows.Next() {
		var att AttachmentResponse
		var mimeType sql.NullString

		err := rows.Scan(&att.ID, &att.FileName, &att.FileURL, &att.FileSize, &att.FileType, &mimeType)
		if err != nil {
			continue
		}

		if mimeType.Valid {
			att.MimeType = mimeType.String
		}

		attachments = append(attachments, att)
	}

	return attachments, nil
}

func (r *Repository) getUserInfo(ctx context.Context, tenantID, userID string) (*ParticipantInfo, error) {
	query := `
		SELECT first_name || ' ' || last_name, email, role, avatar_url
		FROM users
		WHERE tenant_id = $1 AND id = $2
	`

	var info ParticipantInfo
	var avatarURL sql.NullString

	err := r.db.QueryRowContext(ctx, query, tenantID, userID).Scan(&info.Name, &info.Email, &info.Role, &avatarURL)
	if err != nil {
		return nil, err
	}

	info.ID = userID
	if avatarURL.Valid {
		info.Avatar = &avatarURL.String
	}

	return &info, nil
}

func (r *Repository) getParticipantInfo(ctx context.Context, tenantID string, participantIDs []string) ([]ParticipantInfo, error) {
	if len(participantIDs) == 0 {
		return nil, nil
	}

	args := []interface{}{tenantID}
	placeholders := make([]string, 0, len(participantIDs))
	for i, id := range participantIDs {
		args = append(args, id)
		placeholders = append(placeholders, fmt.Sprintf("$%d", i+2))
	}
	query := `
		SELECT id, first_name || ' ' || last_name, email, role, avatar_url
		FROM users
		WHERE tenant_id = $1 AND id IN (` + strings.Join(placeholders, ",") + `)
	`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var participants []ParticipantInfo
	for rows.Next() {
		var participant ParticipantInfo
		var avatarURL sql.NullString

		err := rows.Scan(&participant.ID, &participant.Name, &participant.Email, &participant.Role, &avatarURL)
		if err != nil {
			continue
		}

		if avatarURL.Valid {
			participant.Avatar = &avatarURL.String
		}

		participants = append(participants, participant)
	}

	return participants, nil
}

func (r *Repository) getLastMessage(ctx context.Context, tenantID, conversationID string) (*MessageResponse, error) {
	query := `
		SELECT m.id, m.sender_id, m.recipient_id, m.subject, m.content,
			   m.type, m.priority, m.status, m.read_at, m.created_at,
			   s.first_name || ' ' || s.last_name as sender_name
		FROM messages m
		JOIN users s ON s.id = m.sender_id
		WHERE m.tenant_id = $1 AND m.conversation_id = $2
		ORDER BY m.created_at DESC
		LIMIT 1
	`

	var message MessageResponse
	var readAt sql.NullString

	err := r.db.QueryRowContext(ctx, query, tenantID, conversationID).Scan(
		&message.ID, &message.SenderID, &message.RecipientID,
		&message.Subject, &message.Content, &message.Type, &message.Priority,
		&message.Status, &readAt, &message.CreatedAt, &message.SenderName,
	)

	if err != nil {
		return nil, err
	}

	message.ConversationID = conversationID
	if readAt.Valid {
		parsed, _ := time.Parse(time.RFC3339, readAt.String)
		message.ReadAt = &parsed
	}

	return &message, nil
}

func (r *Repository) resolveRecipients(ctx context.Context, tenantID string, targets []RecipientTarget) ([]string, error) {
	var allRecipients []string

	for _, target := range targets {
		switch target.Type {
		case "user":
			allRecipients = append(allRecipients, target.ID)
		case "group":
			// Get all students in the group
			query := `SELECT id FROM students WHERE tenant_id = $1 AND group_id = $2 AND status = 'active'`
			rows, err := r.db.QueryContext(ctx, query, tenantID, target.ID)
			if err != nil {
				continue
			}
			for rows.Next() {
				var userID string
				if rows.Scan(&userID) == nil {
					allRecipients = append(allRecipients, userID)
				}
			}
			rows.Close()
		case "role":
			// Get all users with the specified role
			query := `SELECT id FROM users WHERE tenant_id = $1 AND role = $2 AND is_active = true`
			rows, err := r.db.QueryContext(ctx, query, tenantID, target.ID)
			if err != nil {
				continue
			}
			for rows.Next() {
				var userID string
				if rows.Scan(&userID) == nil {
					allRecipients = append(allRecipients, userID)
				}
			}
			rows.Close()
		}
	}

	// Remove duplicates
	uniqueRecipients := make([]string, 0, len(allRecipients))
	seen := make(map[string]bool)
	for _, recipient := range allRecipients {
		if !seen[recipient] {
			seen[recipient] = true
			uniqueRecipients = append(uniqueRecipients, recipient)
		}
	}

	return uniqueRecipients, nil
}

func (r *Repository) buildRecipientInfo(ctx context.Context, tenantID string, targets []RecipientTarget) []RecipientInfo {
	var recipients []RecipientInfo

	for _, target := range targets {
		info := RecipientInfo{
			Type: target.Type,
			ID:   target.ID,
		}

		switch target.Type {
		case "user":
			userInfo, err := r.getUserInfo(ctx, tenantID, target.ID)
			if err == nil {
				info.Name = userInfo.Name
				info.Count = 1
			}
		case "group":
			// Get group name and count
			query := `
				SELECT g.name, COUNT(s.id)
				FROM groups g
				LEFT JOIN students s ON s.group_id = g.id AND s.status = 'active'
				WHERE g.tenant_id = $1 AND g.id = $2
				GROUP BY g.name
			`
			r.db.QueryRowContext(ctx, query, tenantID, target.ID).Scan(&info.Name, &info.Count)
		case "role":
			// Get role name and count
			query := `SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = $2 AND is_active = true`
			r.db.QueryRowContext(ctx, query, tenantID, target.ID).Scan(&info.Count)
			info.Name = target.ID // Use role name directly
		}

		recipients = append(recipients, info)
	}

	return recipients
}
