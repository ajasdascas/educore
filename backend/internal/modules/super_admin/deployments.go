package superadmin

import (
	"crypto/subtle"
	"fmt"
	"regexp"
	"strings"

	"educore/internal/pkg/database"
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
)

const deploySecretHeader = "X-EduCore-Deploy-Secret"

var secretLikePattern = regexp.MustCompile(`(?i)(secret|token|password|passwd|pwd|mysql_dsn|database_url|jwt|stripe_secret|api[_-]?key)\s*[:=]\s*[^,\s;]+`)

type deploymentRecordRequest struct {
	Environment    string `json:"environment"`
	Service        string `json:"service"`
	Provider       string `json:"provider"`
	Status         string `json:"status"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	CommitSHA      string `json:"commit_sha"`
	CommitShortSHA string `json:"commit_short_sha"`
	Branch         string `json:"branch"`
	Actor          string `json:"actor"`
	Repository     string `json:"repository"`
	WorkflowName   string `json:"workflow_name"`
	RunID          string `json:"run_id"`
	RunNumber      string `json:"run_number"`
	RunAttempt     string `json:"run_attempt"`
	RunURL         string `json:"run_url"`
}

type deploymentInternalHandler struct {
	db     *database.DB
	secret string
}

func RegisterInternalDeploymentRoutes(router fiber.Router, db *database.DB, secret string) {
	h := &deploymentInternalHandler{db: db, secret: strings.TrimSpace(secret)}
	router.Post("/deployments/record", h.RecordDeployment)
}

func (h *Handler) RegisterDeploymentRoutes(router fiber.Router) {
	router.Get("/deployments", h.ListDeployments)
	router.Get("/deployments/:id", h.GetDeployment)
}

func (h *deploymentInternalHandler) RecordDeployment(c *fiber.Ctx) error {
	if !deploymentSecretMatches(c.Get(deploySecretHeader), h.secret) {
		return response.Error(c, fiber.StatusUnauthorized, "Invalid deployment secret")
	}

	var req deploymentRecordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Invalid deployment payload")
	}
	req = normalizeDeploymentRequest(req)
	if req.Title == "" {
		return response.Error(c, fiber.StatusBadRequest, "title is required")
	}
	if req.Service == "" {
		return response.Error(c, fiber.StatusBadRequest, "service is required")
	}
	if req.Status == "" {
		return response.Error(c, fiber.StatusBadRequest, "status is required")
	}
	if !validDeploymentStatus(req.Status) {
		return response.Error(c, fiber.StatusBadRequest, "invalid deployment status")
	}

	id, err := upsertDeploymentRecord(c, h.db, req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not record deployment")
	}

	return response.Success(c, fiber.Map{
		"id":               id,
		"service":          req.Service,
		"status":           req.Status,
		"title":            req.Title,
		"commit_short_sha": req.CommitShortSHA,
		"run_id":           req.RunID,
		"run_attempt":      req.RunAttempt,
	}, "Deployment recorded")
}

func (h *Handler) ListDeployments(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 50)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	offset := (page - 1) * limit
	service := strings.TrimSpace(c.Query("service"))
	status := strings.TrimSpace(c.Query("status"))

	query := `SELECT id, environment, service, provider, status, title, COALESCE(description, ''),
		COALESCE(commit_sha, ''), COALESCE(commit_short_sha, ''), COALESCE(branch, ''),
		COALESCE(actor, ''), COALESCE(repository, ''), COALESCE(workflow_name, ''),
		COALESCE(run_id, ''), COALESCE(run_number, ''), COALESCE(run_attempt, ''),
		COALESCE(run_url, ''), deployed_at, created_at, updated_at
		FROM deployment_history WHERE 1=1`
	countQuery := "SELECT COUNT(*) FROM deployment_history WHERE 1=1"
	args := []interface{}{}
	idx := 1
	addFilter := func(clause string, value interface{}) {
		query += fmt.Sprintf(clause, idx)
		countQuery += fmt.Sprintf(clause, idx)
		args = append(args, value)
		idx++
	}
	if service != "" && service != "all" {
		addFilter(" AND service = $%d", service)
	}
	if status != "" && status != "all" {
		addFilter(" AND status = $%d", status)
	}

	var total int
	_ = h.db.QueryRow(c.UserContext(), countQuery, args...).Scan(&total)

	query += fmt.Sprintf(" ORDER BY deployed_at DESC, created_at DESC LIMIT $%d OFFSET $%d", idx, idx+1)
	args = append(args, limit, offset)
	rows, err := h.db.Query(c.UserContext(), query, args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch deployments")
	}
	defer rows.Close()

	items := []fiber.Map{}
	for rows.Next() {
		item, err := scanDeploymentRow(rows)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "Could not read deployments")
		}
		items = append(items, item)
	}

	return response.SuccessWithMeta(c, fiber.Map{"deployments": items}, response.Meta{
		Page:    page,
		PerPage: limit,
		Total:   total,
	})
}

func (h *Handler) GetDeployment(c *fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return response.Error(c, fiber.StatusBadRequest, "Invalid deployment id")
	}
	rows, err := h.db.Query(c.UserContext(), `SELECT id, environment, service, provider, status, title, COALESCE(description, ''),
		COALESCE(commit_sha, ''), COALESCE(commit_short_sha, ''), COALESCE(branch, ''),
		COALESCE(actor, ''), COALESCE(repository, ''), COALESCE(workflow_name, ''),
		COALESCE(run_id, ''), COALESCE(run_number, ''), COALESCE(run_attempt, ''),
		COALESCE(run_url, ''), deployed_at, created_at, updated_at
		FROM deployment_history WHERE id = $1 LIMIT 1`, id)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not fetch deployment")
	}
	defer rows.Close()
	if !rows.Next() {
		return response.Error(c, fiber.StatusNotFound, "Deployment not found")
	}
	item, err := scanDeploymentRow(rows)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Could not read deployment")
	}
	return response.Success(c, fiber.Map{"deployment": item}, "Deployment retrieved")
}

func deploymentSecretMatches(provided, expected string) bool {
	provided = strings.TrimSpace(provided)
	expected = strings.TrimSpace(expected)
	if provided == "" || expected == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) == 1
}

func normalizeDeploymentRequest(req deploymentRecordRequest) deploymentRecordRequest {
	req.Environment = truncateDeploymentField(defaultString(req.Environment, "production"), 50)
	req.Service = truncateDeploymentField(req.Service, 50)
	req.Provider = truncateDeploymentField(defaultString(req.Provider, "github_actions"), 50)
	req.Status = truncateDeploymentField(strings.ToLower(req.Status), 30)
	req.Title = truncateDeploymentField(redactSecretLikeText(req.Title), 255)
	req.Description = redactSecretLikeText(strings.TrimSpace(req.Description))
	req.CommitSHA = truncateDeploymentField(req.CommitSHA, 64)
	req.CommitShortSHA = truncateDeploymentField(req.CommitShortSHA, 12)
	if req.CommitShortSHA == "" && len(req.CommitSHA) >= 7 {
		req.CommitShortSHA = req.CommitSHA[:7]
	}
	req.Branch = truncateDeploymentField(req.Branch, 100)
	req.Actor = truncateDeploymentField(req.Actor, 100)
	req.Repository = truncateDeploymentField(req.Repository, 150)
	req.WorkflowName = truncateDeploymentField(req.WorkflowName, 150)
	req.RunID = truncateDeploymentField(req.RunID, 100)
	req.RunNumber = truncateDeploymentField(req.RunNumber, 50)
	req.RunAttempt = truncateDeploymentField(req.RunAttempt, 50)
	req.RunURL = strings.TrimSpace(req.RunURL)
	return req
}

func truncateDeploymentField(value string, max int) string {
	value = strings.TrimSpace(value)
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}

func redactSecretLikeText(value string) string {
	if value == "" {
		return value
	}
	return secretLikePattern.ReplaceAllString(value, "$1=[redacted]")
}

func validDeploymentStatus(status string) bool {
	switch status {
	case "success", "failure", "in_progress", "cancelled":
		return true
	default:
		return false
	}
}

func upsertDeploymentRecord(c *fiber.Ctx, db *database.DB, req deploymentRecordRequest) (string, error) {
	if req.RunID != "" && req.RunAttempt != "" && req.Service != "" {
		result, err := db.Exec(c.UserContext(), `UPDATE deployment_history
			SET environment=$1, provider=$2, status=$3, title=$4, description=$5,
			    commit_sha=$6, commit_short_sha=$7, branch=$8, actor=$9,
			    repository=$10, workflow_name=$11, run_number=$12, run_url=$13,
			    deployed_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
			WHERE run_id=$14 AND run_attempt=$15 AND service=$16`,
			req.Environment, req.Provider, req.Status, req.Title, nilIfEmpty(req.Description),
			nilIfEmpty(req.CommitSHA), nilIfEmpty(req.CommitShortSHA), nilIfEmpty(req.Branch), nilIfEmpty(req.Actor),
			nilIfEmpty(req.Repository), nilIfEmpty(req.WorkflowName), nilIfEmpty(req.RunNumber), nilIfEmpty(req.RunURL),
			req.RunID, req.RunAttempt, req.Service)
		if err != nil {
			return "", err
		}
		if result.RowsAffected() > 0 {
			var id string
			err = db.QueryRow(c.UserContext(), "SELECT id FROM deployment_history WHERE run_id=$1 AND run_attempt=$2 AND service=$3 LIMIT 1", req.RunID, req.RunAttempt, req.Service).Scan(&id)
			return id, err
		}
	}

	id := database.NewID()
	_, err := db.Exec(c.UserContext(), `INSERT INTO deployment_history
		(id, environment, service, provider, status, title, description, commit_sha, commit_short_sha,
		 branch, actor, repository, workflow_name, run_id, run_number, run_attempt, run_url)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
		id, req.Environment, req.Service, req.Provider, req.Status, req.Title, nilIfEmpty(req.Description),
		nilIfEmpty(req.CommitSHA), nilIfEmpty(req.CommitShortSHA), nilIfEmpty(req.Branch), nilIfEmpty(req.Actor),
		nilIfEmpty(req.Repository), nilIfEmpty(req.WorkflowName), nilIfEmpty(req.RunID), nilIfEmpty(req.RunNumber),
		nilIfEmpty(req.RunAttempt), nilIfEmpty(req.RunURL))
	return id, err
}

func scanDeploymentRow(rows *database.Rows) (fiber.Map, error) {
	var id, environment, service, provider, status, title string
	var description, commitSHA, commitShortSHA, branch, actor, repository, workflowName string
	var runID, runNumber, runAttempt, runURL string
	var deployedAt, createdAt, updatedAt interface{}
	if err := rows.Scan(&id, &environment, &service, &provider, &status, &title, &description,
		&commitSHA, &commitShortSHA, &branch, &actor, &repository, &workflowName,
		&runID, &runNumber, &runAttempt, &runURL, &deployedAt, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	return fiber.Map{
		"id": id, "environment": environment, "service": service, "provider": provider,
		"status": status, "title": title, "description": description,
		"commit_sha": commitSHA, "commit_short_sha": commitShortSHA, "branch": branch,
		"actor": actor, "repository": repository, "workflow_name": workflowName,
		"run_id": runID, "run_number": runNumber, "run_attempt": runAttempt, "run_url": runURL,
		"deployed_at": deployedAt, "created_at": createdAt, "updated_at": updatedAt,
	}, nil
}

func nilIfEmpty(value string) interface{} {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return strings.TrimSpace(value)
}
