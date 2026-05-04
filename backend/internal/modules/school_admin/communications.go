package school_admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// ─── Types ───────────────────────────────────────────────────────────────────

type SchoolCommunication struct {
	ID              string     `json:"id"`
	TenantID        string     `json:"tenant_id,omitempty"`
	Title           string     `json:"title"`
	Content         string     `json:"content"`
	Type            string     `json:"type"`
	Priority        string     `json:"priority"`
	Status          string     `json:"status"`
	RecipientType   string     `json:"recipient_type"`
	RecipientID     string     `json:"recipient_id"`
	RecipientLabel  string     `json:"recipient_label"`
	Channels        []string   `json:"channels"`
	TotalRecipients int        `json:"total_recipients"`
	DeliveredCount  int        `json:"delivered_count"`
	ReadCount       int        `json:"read_count"`
	CreatedAt       time.Time  `json:"created_at"`
	ScheduledFor    *time.Time `json:"scheduled_for,omitempty"`
	SentAt          *time.Time `json:"sent_at,omitempty"`
}

type CommunicationStats struct {
	TotalMessages     int `json:"total_messages"`
	SentMessages      int `json:"sent_messages"`
	ScheduledMessages int `json:"scheduled_messages"`
	DraftMessages     int `json:"draft_messages"`
	DeliveredCount    int `json:"delivered_count"`
	ReadCount         int `json:"read_count"`
}

type CreateCommunicationRequest struct {
	Title         string   `json:"title"`
	Content       string   `json:"content"`
	Type          string   `json:"type"`
	Priority      string   `json:"priority"`
	RecipientType string   `json:"recipient_type"`
	RecipientID   string   `json:"recipient_id"`
	Channels      []string `json:"channels"`
	ScheduledFor  string   `json:"scheduled_for"`
	Email         bool     `json:"email"`
	Push          bool     `json:"push"`
	SMS           bool     `json:"sms"`
}

// ─── Handler ─────────────────────────────────────────────────────────────────

func (h *Handler) GetCommunications(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	items, err := h.service.GetCommunications(c.Context(), tenantID, c.Query("status"), c.Query("search"))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, fiber.Map{"communications": items}, "Success")
}

func (h *Handler) GetCommunicationStats(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	stats, err := h.service.GetCommunicationStats(c.Context(), tenantID)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusInternalServerError, err)
	}
	return response.Success(c, stats, "Success")
}

func (h *Handler) GetCommunication(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	item, err := h.service.GetCommunication(c.Context(), tenantID, c.Params("id"))
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}
	return response.Success(c, item, "Success")
}

func (h *Handler) CreateCommunication(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	var req CreateCommunicationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	item, err := h.service.CreateCommunication(c.Context(), tenantID, userID, req, "draft")
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, item, "Communication saved")
}

func (h *Handler) SendCommunication(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	var req CreateCommunicationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	item, err := h.service.CreateCommunication(c.Context(), tenantID, userID, req, "sent")
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, item, "Communication sent")
}

func (h *Handler) UpdateCommunication(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	var req CreateCommunicationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	item, err := h.service.UpdateCommunication(c.Context(), tenantID, c.Params("id"), req)
	if err != nil {
		return response.ErrorFromErr(c, fiber.StatusBadRequest, err)
	}
	return response.Success(c, item, "Communication updated")
}

func (h *Handler) DeleteCommunication(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	if err := h.service.DeleteCommunication(c.Context(), tenantID, c.Params("id")); err != nil {
		return response.ErrorFromErr(c, fiber.StatusNotFound, err)
	}
	return response.SuccessMessage(c, "Communication deleted")
}

// ─── Service ─────────────────────────────────────────────────────────────────

func (s *Service) GetCommunications(ctx context.Context, tenantID, status, search string) ([]SchoolCommunication, error) {
	return s.repo.GetCommunications(ctx, tenantID, status, search)
}

func (s *Service) GetCommunicationStats(ctx context.Context, tenantID string) (*CommunicationStats, error) {
	return s.repo.GetCommunicationStats(ctx, tenantID)
}

func (s *Service) GetCommunication(ctx context.Context, tenantID, id string) (*SchoolCommunication, error) {
	return s.repo.GetCommunication(ctx, tenantID, id)
}

func (s *Service) CreateCommunication(ctx context.Context, tenantID, userID string, req CreateCommunicationRequest, status string) (*SchoolCommunication, error) {
	if strings.TrimSpace(req.Title) == "" {
		return nil, fmt.Errorf("title is required")
	}
	if strings.TrimSpace(req.Content) == "" {
		return nil, fmt.Errorf("content is required")
	}

	channels := req.Channels
	if len(channels) == 0 {
		if req.Email {
			channels = append(channels, "email")
		}
		if req.Push {
			channels = append(channels, "push")
		}
		if req.SMS {
			channels = append(channels, "sms")
		}
	}
	if len(channels) == 0 {
		channels = []string{"email"}
	}

	recipientType := req.RecipientType
	if recipientType == "" {
		recipientType = "role"
	}
	recipientID := req.RecipientID
	if recipientID == "" {
		recipientID = "parents"
	}
	label := recipientID
	if recipientType == "role" {
		labels := map[string]string{"parents": "Padres", "teachers": "Profesores", "all": "Todos"}
		if l, ok := labels[recipientID]; ok {
			label = l
		}
	}

	commType := req.Type
	if commType == "" {
		commType = "announcement"
	}
	priority := req.Priority
	if priority == "" {
		priority = "normal"
	}

	var scheduledFor *time.Time
	if req.ScheduledFor != "" && status == "draft" {
		t, err := time.Parse("2006-01-02T15:04", req.ScheduledFor)
		if err == nil {
			scheduledFor = &t
			status = "scheduled"
		}
	}
	var sentAt *time.Time
	if status == "sent" {
		now := time.Now()
		sentAt = &now
	}

	return s.repo.CreateCommunication(ctx, tenantID, userID, SchoolCommunication{
		Title:          req.Title,
		Content:        req.Content,
		Type:           commType,
		Priority:       priority,
		Status:         status,
		RecipientType:  recipientType,
		RecipientID:    recipientID,
		RecipientLabel: label,
		Channels:       channels,
		ScheduledFor:   scheduledFor,
		SentAt:         sentAt,
	})
}

func (s *Service) UpdateCommunication(ctx context.Context, tenantID, id string, req CreateCommunicationRequest) (*SchoolCommunication, error) {
	return s.repo.UpdateCommunication(ctx, tenantID, id, req)
}

func (s *Service) DeleteCommunication(ctx context.Context, tenantID, id string) error {
	return s.repo.DeleteCommunication(ctx, tenantID, id)
}

// ─── Repository ──────────────────────────────────────────────────────────────

func (r *Repository) GetCommunications(ctx context.Context, tenantID, status, search string) ([]SchoolCommunication, error) {
	where := "tenant_id = $1 AND deleted_at IS NULL"
	args := []interface{}{tenantID}
	i := 2
	if status != "" {
		where += fmt.Sprintf(" AND status = $%d", i)
		args = append(args, status)
		i++
	}
	if search != "" {
		where += fmt.Sprintf(" AND (title ILIKE $%d OR content ILIKE $%d)", i, i)
		args = append(args, "%"+search+"%")
	}

	rows, err := r.db.Query(ctx, fmt.Sprintf(
		`SELECT id, title, content, type, priority, status, recipient_type, recipient_id,
		        recipient_label, channels, total_recipients, delivered_count, read_count,
		        created_at, scheduled_for, sent_at
		 FROM school_communications WHERE %s ORDER BY created_at DESC LIMIT 100`, where), args...)
	if err != nil {
		return nil, fmt.Errorf("GetCommunications: %w", err)
	}
	defer rows.Close()

	var items []SchoolCommunication
	for rows.Next() {
		var c SchoolCommunication
		var channelsJSON []byte
		if err := rows.Scan(&c.ID, &c.Title, &c.Content, &c.Type, &c.Priority, &c.Status,
			&c.RecipientType, &c.RecipientID, &c.RecipientLabel, &channelsJSON,
			&c.TotalRecipients, &c.DeliveredCount, &c.ReadCount,
			&c.CreatedAt, &c.ScheduledFor, &c.SentAt); err != nil {
			continue
		}
		_ = json.Unmarshal(channelsJSON, &c.Channels)
		items = append(items, c)
	}
	if items == nil {
		items = []SchoolCommunication{}
	}
	return items, nil
}

func (r *Repository) GetCommunicationStats(ctx context.Context, tenantID string) (*CommunicationStats, error) {
	var s CommunicationStats
	row := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'sent'),
			COUNT(*) FILTER (WHERE status = 'scheduled'),
			COUNT(*) FILTER (WHERE status = 'draft'),
			COALESCE(SUM(delivered_count), 0),
			COALESCE(SUM(read_count), 0)
		FROM school_communications WHERE tenant_id = $1 AND deleted_at IS NULL`, tenantID)
	if err := row.Scan(&s.TotalMessages, &s.SentMessages, &s.ScheduledMessages, &s.DraftMessages, &s.DeliveredCount, &s.ReadCount); err != nil {
		return &CommunicationStats{}, nil
	}
	return &s, nil
}

func (r *Repository) GetCommunication(ctx context.Context, tenantID, id string) (*SchoolCommunication, error) {
	var c SchoolCommunication
	var channelsJSON []byte
	err := r.db.QueryRow(ctx, `
		SELECT id, title, content, type, priority, status, recipient_type, recipient_id,
		       recipient_label, channels, total_recipients, delivered_count, read_count,
		       created_at, scheduled_for, sent_at
		FROM school_communications WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
		id, tenantID).Scan(&c.ID, &c.Title, &c.Content, &c.Type, &c.Priority, &c.Status,
		&c.RecipientType, &c.RecipientID, &c.RecipientLabel, &channelsJSON,
		&c.TotalRecipients, &c.DeliveredCount, &c.ReadCount,
		&c.CreatedAt, &c.ScheduledFor, &c.SentAt)
	if err != nil {
		return nil, fmt.Errorf("communication not found")
	}
	_ = json.Unmarshal(channelsJSON, &c.Channels)
	return &c, nil
}

func (r *Repository) CreateCommunication(ctx context.Context, tenantID, userID string, c SchoolCommunication) (*SchoolCommunication, error) {
	channelsJSON, _ := json.Marshal(c.Channels)
	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO school_communications
		  (tenant_id, title, content, type, priority, status, recipient_type, recipient_id,
		   recipient_label, channels, created_by, scheduled_for, sent_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING id`,
		tenantID, c.Title, c.Content, c.Type, c.Priority, c.Status,
		c.RecipientType, c.RecipientID, c.RecipientLabel, channelsJSON,
		userID, c.ScheduledFor, c.SentAt).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("CreateCommunication: %w", err)
	}
	return r.GetCommunication(ctx, tenantID, id)
}

func (r *Repository) UpdateCommunication(ctx context.Context, tenantID, id string, req CreateCommunicationRequest) (*SchoolCommunication, error) {
	channels := req.Channels
	if len(channels) == 0 {
		if req.Email {
			channels = append(channels, "email")
		}
		if req.Push {
			channels = append(channels, "push")
		}
		if req.SMS {
			channels = append(channels, "sms")
		}
	}
	channelsJSON, _ := json.Marshal(channels)
	_, err := r.db.Exec(ctx, `
		UPDATE school_communications SET title=$3, content=$4, type=$5, priority=$6,
		  recipient_type=$7, recipient_id=$8, channels=$9, updated_at=NOW()
		WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL`,
		id, tenantID, req.Title, req.Content, req.Type, req.Priority,
		req.RecipientType, req.RecipientID, channelsJSON)
	if err != nil {
		return nil, fmt.Errorf("UpdateCommunication: %w", err)
	}
	return r.GetCommunication(ctx, tenantID, id)
}

func (r *Repository) DeleteCommunication(ctx context.Context, tenantID, id string) error {
	res, err := r.db.Exec(ctx, `
		UPDATE school_communications SET deleted_at=NOW()
		WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL`, id, tenantID)
	if err != nil {
		return fmt.Errorf("DeleteCommunication: %w", err)
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("communication not found")
	}
	return nil
}
