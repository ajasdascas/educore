package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"educore/internal/pkg/database"
	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	db                 *database.DB
	secret             string
	expectedRepository string
}

func NewHandler(db *database.DB) *Handler {
	return &Handler{
		db:                 db,
		secret:             strings.TrimSpace(os.Getenv("GITHUB_WEBHOOK_SECRET")),
		expectedRepository: strings.TrimSpace(os.Getenv("GITHUB_WEBHOOK_REPOSITORY")),
	}
}

func RegisterRoutes(router fiber.Router, db *database.DB) {
	h := NewHandler(db)
	router.Post("/github", h.HandleGitHubPush)
}

type githubPushPayload struct {
	Ref        string `json:"ref"`
	Repository struct {
		FullName string `json:"full_name"`
		HTMLURL  string `json:"html_url"`
	} `json:"repository"`
	HeadCommit struct {
		ID        string `json:"id"`
		Message   string `json:"message"`
		URL       string `json:"url"`
		Timestamp string `json:"timestamp"`
		Author    struct {
			Name string `json:"name"`
		} `json:"author"`
	} `json:"head_commit"`
	Pusher struct {
		Name string `json:"name"`
	} `json:"pusher"`
}

func (h *Handler) HandleGitHubPush(c *fiber.Ctx) error {
	if h.secret == "" || h.expectedRepository == "" {
		return response.Error(c, fiber.StatusServiceUnavailable, "GitHub webhook is not configured")
	}

	sig := c.Get("X-Hub-Signature-256")
	if sig == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing signature"})
	}
	mac := hmac.New(sha256.New, []byte(h.secret))
	mac.Write(c.Body())
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid signature"})
	}

	// Only process push events
	event := c.Get("X-GitHub-Event")
	if event != "push" {
		return c.JSON(fiber.Map{"skipped": true, "event": event})
	}

	var payload githubPushPayload
	if err := json.Unmarshal(c.Body(), &payload); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid payload")
	}
	if !strings.EqualFold(strings.TrimSpace(payload.Repository.FullName), h.expectedRepository) {
		return response.Error(c, fiber.StatusForbidden, "Unexpected repository")
	}
	deliveryID := strings.TrimSpace(c.Get("X-GitHub-Delivery"))
	if deliveryID == "" || len(deliveryID) > 100 {
		return response.Error(c, fiber.StatusBadRequest, "Valid GitHub delivery ID required")
	}

	// Only process pushes to master or main
	branch := strings.TrimPrefix(payload.Ref, "refs/heads/")
	if branch != "master" && branch != "main" {
		return c.JSON(fiber.Map{"skipped": true, "branch": branch})
	}

	commit := payload.HeadCommit
	if commit.ID == "" {
		return c.JSON(fiber.Map{"skipped": true, "reason": "no head commit"})
	}

	shortHash := commit.ID
	if len(shortHash) > 7 {
		shortHash = shortHash[:7]
	}

	// Parse commit message
	lines := strings.Split(strings.TrimSpace(commit.Message), "\n")
	title := lines[0]
	description := ""
	if len(lines) > 1 {
		description = strings.TrimSpace(strings.Join(lines[1:], " "))
	}

	changelog := title
	if description != "" {
		changelog = title + "\n" + description
	}

	author := commit.Author.Name
	if author == "" {
		author = payload.Pusher.Name
	}

	deployedAt := time.Now()
	if t, err := time.Parse(time.RFC3339, commit.Timestamp); err == nil {
		deployedAt = t
	}

	metadata := map[string]string{
		"commit_hash": commit.ID,
		"short_hash":  shortHash,
		"commit_url":  commit.URL,
		"author":      author,
		"repo":        payload.Repository.FullName,
		"description": description,
		"branch":      branch,
		"delivery_id": deliveryID,
	}
	metadataJSON, _ := json.Marshal(metadata)

	version := fmt.Sprintf("commit-%s", shortHash)

	ctx := c.UserContext()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not start webhook transaction")
	}
	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback(ctx)
		}
	}()

	var alreadyRecorded bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM system_versions WHERE version = $1)`, version).Scan(&alreadyRecorded); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not verify webhook delivery")
	}
	if alreadyRecorded {
		return c.JSON(fiber.Map{"success": true, "skipped": true, "reason": "commit already recorded"})
	}

	if _, err := tx.Exec(ctx, `UPDATE system_versions SET status = 'previous' WHERE status = 'current'`); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not update version history")
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO system_versions (version, status, changelog, deployed_at, metadata)
		 VALUES ($1, 'current', $2, $3, $4)`,
		version, changelog, deployedAt, string(metadataJSON))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not save version history")
	}
	if err := tx.Commit(ctx); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not commit version history")
	}
	committed = true

	return c.JSON(fiber.Map{
		"success":    true,
		"version":    version,
		"short_hash": shortHash,
		"author":     author,
		"branch":     branch,
	})
}
