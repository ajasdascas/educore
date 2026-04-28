package communications

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"educore/internal/pkg/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

// RegisterRoutes sets up all communication routes
func (h *Handler) RegisterRoutes(app fiber.Router) {
	// Communications routes - require authenticated user
	api := app.Group("/api/v1/communications")

	// Messages
	messages := api.Group("/messages")
	messages.Post("/", h.SendMessage)
	messages.Get("/", h.GetMessages)
	messages.Get("/search", h.SearchMessages)
	messages.Put("/:id/read", h.MarkMessageRead)
	messages.Delete("/:id", h.DeleteMessage)
	messages.Post("/bulk/mark", h.BulkMarkMessages)
	messages.Post("/bulk/send", h.SendBulkMessage)
	messages.Get("/bulk/:jobId/status", h.GetBulkMessageStatus)

	// Conversations
	conversations := api.Group("/conversations")
	conversations.Get("/", h.GetConversations)
	conversations.Get("/:id/messages", h.GetConversationMessages)

	// Notifications
	notifications := api.Group("/notifications")
	notifications.Post("/", h.CreateNotification)
	notifications.Get("/", h.GetNotifications)
	notifications.Put("/:id/read", h.MarkNotificationRead)
	notifications.Put("/mark-all-read", h.MarkAllNotificationsRead)

	// Announcements
	announcements := api.Group("/announcements")
	announcements.Post("/", h.CreateAnnouncement)
	announcements.Get("/", h.GetAnnouncements)
	announcements.Get("/:id", h.GetAnnouncementById)

	// Communication preferences
	preferences := api.Group("/preferences")
	preferences.Get("/", h.GetCommunicationPreferences)
	preferences.Put("/", h.UpdateCommunicationPreferences)

	// Statistics and dashboard
	api.Get("/stats", h.GetCommunicationStats)
	api.Get("/activity/recent", h.GetRecentActivity)
}

// Message handlers
func (h *Handler) SendMessage(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	message, err := h.service.SendMessage(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, message, "Success")
}

func (h *Handler) GetMessages(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)

	filters := h.parseMessageFilters(c)

	messages, total, err := h.service.GetMessages(c.Context(), tenantID, userID, page, perPage, filters)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.SuccessWithMeta(c, messages, response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

func (h *Handler) SearchMessages(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)

	var req MessageSearchRequest
	req.Query = c.Query("q")
	req.Type = c.Query("type")
	req.SenderID = c.Query("sender_id")
	req.RecipientID = c.Query("recipient_id")
	req.StartDate = c.Query("start_date")
	req.EndDate = c.Query("end_date")
	req.Priority = c.Query("priority")
	req.Status = c.Query("status")
	req.HasAttachment = c.QueryBool("has_attachment", false)

	if tags := c.Query("tags"); tags != "" {
		req.Tags = strings.Split(tags, ",")
	}

	searchResponse, err := h.service.SearchMessages(c.Context(), tenantID, userID, req, page, perPage)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, searchResponse, "Success")
}

func (h *Handler) MarkMessageRead(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	messageID := c.Params("id")

	err := h.service.MarkMessageRead(c.Context(), tenantID, userID, messageID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Message marked as read")
}

func (h *Handler) DeleteMessage(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	messageID := c.Params("id")

	err := h.service.DeleteMessage(c.Context(), tenantID, userID, messageID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Message deleted successfully")
}

func (h *Handler) BulkMarkMessages(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req MarkMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	err := h.service.BulkMarkMessages(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Messages updated successfully")
}

func (h *Handler) SendBulkMessage(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req BulkMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	bulkResponse, err := h.service.SendBulkMessage(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, bulkResponse, "Success")
}

func (h *Handler) GetBulkMessageStatus(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	jobID := c.Params("jobId")

	status, err := h.service.GetBulkMessageStatus(c.Context(), tenantID, userID, jobID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}

	return response.Success(c, status, "Success")
}

// Conversation handlers
func (h *Handler) GetConversations(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)

	conversations, total, err := h.service.GetConversations(c.Context(), tenantID, userID, page, perPage)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.SuccessWithMeta(c, conversations, response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

func (h *Handler) GetConversationMessages(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	conversationID := c.Params("id")

	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 50)

	thread, err := h.service.GetConversationMessages(c.Context(), tenantID, userID, conversationID, page, perPage)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, thread, "Success")
}

// Notification handlers
func (h *Handler) CreateNotification(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req CreateNotificationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	notifications, err := h.service.CreateNotification(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, map[string]interface{}{
		"notifications": notifications,
		"total_sent":    len(notifications),
	}, "Bulk notification sent successfully")
}

func (h *Handler) GetNotifications(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)
	unreadOnly := c.QueryBool("unread_only", false)

	notifications, total, err := h.service.GetNotifications(c.Context(), tenantID, userID, page, perPage, unreadOnly)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.SuccessWithMeta(c, notifications, response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

func (h *Handler) MarkNotificationRead(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	notificationID := c.Params("id")

	err := h.service.MarkNotificationRead(c.Context(), tenantID, userID, notificationID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "Notification marked as read")
}

func (h *Handler) MarkAllNotificationsRead(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	err := h.service.MarkAllNotificationsRead(c.Context(), tenantID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.SuccessMessage(c, "All notifications marked as read")
}

// Announcement handlers
func (h *Handler) CreateAnnouncement(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req SendAnnouncementRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	announcement, err := h.service.CreateAnnouncement(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, announcement, "Success")
}

func (h *Handler) GetAnnouncements(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)

	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 20)

	announcements, total, err := h.service.GetAnnouncements(c.Context(), tenantID, page, perPage)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.SuccessWithMeta(c, announcements, response.Meta{
		Page:    page,
		PerPage: perPage,
		Total:   total,
	})
}

func (h *Handler) GetAnnouncementById(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	announcementID := c.Params("id")

	announcement, err := h.service.GetAnnouncementById(c.Context(), tenantID, announcementID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}

	return response.Success(c, announcement, "Success")
}

// Preference handlers
func (h *Handler) GetCommunicationPreferences(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	preferences, err := h.service.GetCommunicationPreferences(c.Context(), tenantID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, preferences, "Success")
}

func (h *Handler) UpdateCommunicationPreferences(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	var req CommunicationPreferencesRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	preferences, err := h.service.UpdateCommunicationPreferences(c.Context(), tenantID, userID, req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}

	return response.Success(c, preferences, "Success")
}

// Statistics handlers
func (h *Handler) GetCommunicationStats(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	stats, err := h.service.GetCommunicationStats(c.Context(), tenantID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, stats, "Success")
}

func (h *Handler) GetRecentActivity(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	limitStr := c.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 10
	}

	activity, err := h.service.GetRecentActivity(c.Context(), tenantID, userID, limit)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, map[string]interface{}{
		"activity": activity,
		"limit":    limit,
	}, "Recent activity retrieved successfully")
}

// Helper methods
func (h *Handler) parseMessageFilters(c *fiber.Ctx) MessageSearchRequest {
	filters := MessageSearchRequest{}

	filters.Query = c.Query("q")
	filters.Type = c.Query("type")
	filters.SenderID = c.Query("sender_id")
	filters.RecipientID = c.Query("recipient_id")
	filters.StartDate = c.Query("start_date")
	filters.EndDate = c.Query("end_date")
	filters.Priority = c.Query("priority")
	filters.Status = c.Query("status")
	filters.HasAttachment = c.QueryBool("has_attachment", false)

	if tags := c.Query("tags"); tags != "" {
		filters.Tags = strings.Split(tags, ",")
	}

	return filters
}

// Additional utility endpoints
func (h *Handler) GetUnreadCounts(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)

	stats, err := h.service.GetCommunicationStats(c.Context(), tenantID, userID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}

	return response.Success(c, map[string]interface{}{
		"unread_messages":     stats.UnreadMessages,
		"unread_notifications": stats.UnreadNotifications,
		"active_conversations": stats.ActiveConversations,
	}, "Communication stats retrieved successfully")
}

func (h *Handler) GetMessageThread(c *fiber.Ctx) error {
	_ = c.Locals("tenant_id").(string)
	_ = c.Locals("user_id").(string)
	messageID := c.Params("id")

	// This would get the conversation for a specific message
	// For now, redirect to conversation messages
	return response.Success(c, map[string]interface{}{
		"message_id": messageID,
		"redirect":   "/api/v1/communications/conversations/{conversation_id}/messages",
	}, "Message thread redirect")
}

// Register additional utility routes
func (h *Handler) RegisterUtilityRoutes(app *fiber.App) {
	api := app.Group("/api/v1/communications")

	// Quick access endpoints
	api.Get("/unread-counts", h.GetUnreadCounts)
	api.Get("/messages/:id/thread", h.GetMessageThread)

	// Health check for communications
	api.Get("/health", func(c *fiber.Ctx) error {
		return response.Success(c, map[string]interface{}{
			"status":    "healthy",
			"module":    "communications",
			"timestamp": c.Locals("timestamp"),
		}, "Communications module is healthy")
	})
}