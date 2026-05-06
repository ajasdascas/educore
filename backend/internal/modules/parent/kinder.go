package parent

import (
	"educore/internal/pkg/database"
	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// verifyAndGetChild checks parent access and returns the studentID (childId param).
// Returns "" and writes the error response itself when access is denied.
func (h *Handler) verifyAndGetChild(c *fiber.Ctx) (tenantID, childID string, ok bool) {
	tenantID = c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	childID = c.Params("childId")
	isSupport, _ := c.Locals("support_mode").(bool)

	hasAccess, err := h.service.VerifyParentAccess(c.Context(), tenantID, userID, childID, isSupport)
	if err != nil || !hasAccess {
		_ = response.Error(c, fiber.StatusForbidden, "Access denied")
		return "", "", false
	}
	return tenantID, childID, true
}

func (h *Handler) GetChildDailyLogs(c *fiber.Ctx) error {
	tenantID, childID, ok := h.verifyAndGetChild(c)
	if !ok {
		return nil
	}
	db := h.service.repo.db
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT id, DATE_FORMAT(log_date,'%Y-%m-%d'),
			       COALESCE(general_mood,''), COALESCE(notes,'')
			FROM kinder_daily_logs
			WHERE tenant_id = $1 AND student_id = $2
			ORDER BY log_date DESC`),
		tenantID, childID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando registros")
	}
	defer rows.Close()
	type Row struct {
		ID          string `json:"id"`
		LogDate     string `json:"log_date"`
		GeneralMood string `json:"general_mood"`
		Notes       string `json:"notes"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.LogDate, &r.GeneralMood, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, fiber.Map{"daily_logs": list}, "ok")
}

func (h *Handler) GetChildMeals(c *fiber.Ctx) error {
	tenantID, childID, ok := h.verifyAndGetChild(c)
	if !ok {
		return nil
	}
	db := h.service.repo.db
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT id, DATE_FORMAT(meal_date,'%Y-%m-%d'), meal_time, portion, COALESCE(food_note,'')
			FROM kinder_meals
			WHERE tenant_id = $1 AND student_id = $2
			ORDER BY meal_date DESC, meal_time`),
		tenantID, childID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando comidas")
	}
	defer rows.Close()
	type Row struct {
		ID       string `json:"id"`
		MealDate string `json:"meal_date"`
		MealTime string `json:"meal_time"`
		Portion  string `json:"portion"`
		FoodNote string `json:"food_note"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.MealDate, &r.MealTime, &r.Portion, &r.FoodNote); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, fiber.Map{"meals": list}, "ok")
}

func (h *Handler) GetChildNaps(c *fiber.Ctx) error {
	tenantID, childID, ok := h.verifyAndGetChild(c)
	if !ok {
		return nil
	}
	db := h.service.repo.db
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT id, DATE_FORMAT(nap_date,'%Y-%m-%d'),
			       COALESCE(TIME_FORMAT(start_time,'%H:%i'),''),
			       COALESCE(TIME_FORMAT(end_time,'%H:%i'),''),
			       COALESCE(duration_minutes,0), quality, COALESCE(notes,'')
			FROM kinder_naps
			WHERE tenant_id = $1 AND student_id = $2
			ORDER BY nap_date DESC`),
		tenantID, childID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando siestas")
	}
	defer rows.Close()
	type Row struct {
		ID              string `json:"id"`
		NapDate         string `json:"nap_date"`
		StartTime       string `json:"start_time"`
		EndTime         string `json:"end_time"`
		DurationMinutes int    `json:"duration_minutes"`
		Quality         string `json:"quality"`
		Notes           string `json:"notes"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.NapDate, &r.StartTime, &r.EndTime, &r.DurationMinutes, &r.Quality, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, fiber.Map{"naps": list}, "ok")
}

func (h *Handler) GetChildDiapers(c *fiber.Ctx) error {
	tenantID, childID, ok := h.verifyAndGetChild(c)
	if !ok {
		return nil
	}
	db := h.service.repo.db
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT id, DATE_FORMAT(changed_at,'%Y-%m-%dT%H:%i:00'), diaper_type, COALESCE(notes,'')
			FROM kinder_diapers
			WHERE tenant_id = $1 AND student_id = $2
			ORDER BY changed_at DESC`),
		tenantID, childID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando cambios")
	}
	defer rows.Close()
	type Row struct {
		ID         string `json:"id"`
		ChangedAt  string `json:"changed_at"`
		DiaperType string `json:"diaper_type"`
		Notes      string `json:"notes"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.ChangedAt, &r.DiaperType, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, fiber.Map{"diapers": list}, "ok")
}

func (h *Handler) GetChildMood(c *fiber.Ctx) error {
	tenantID, childID, ok := h.verifyAndGetChild(c)
	if !ok {
		return nil
	}
	db := h.service.repo.db
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT id, DATE_FORMAT(recorded_at,'%Y-%m-%dT%H:%i:00'), mood_code, COALESCE(notes,'')
			FROM kinder_mood
			WHERE tenant_id = $1 AND student_id = $2
			ORDER BY recorded_at DESC`),
		tenantID, childID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando estados de ánimo")
	}
	defer rows.Close()
	type Row struct {
		ID         string `json:"id"`
		RecordedAt string `json:"recorded_at"`
		MoodCode   string `json:"mood_code"`
		Notes      string `json:"notes"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.RecordedAt, &r.MoodCode, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, fiber.Map{"mood": list}, "ok")
}

func (h *Handler) GetChildIncidents(c *fiber.Ctx) error {
	tenantID, childID, ok := h.verifyAndGetChild(c)
	if !ok {
		return nil
	}
	db := h.service.repo.db
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT id, DATE_FORMAT(occurred_at,'%Y-%m-%dT%H:%i:00'),
			       incident_type, description, COALESCE(action_taken,''), notified_parent
			FROM kinder_incidents
			WHERE tenant_id = $1 AND student_id = $2
			ORDER BY occurred_at DESC`),
		tenantID, childID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando incidentes")
	}
	defer rows.Close()
	type Row struct {
		ID             string `json:"id"`
		OccurredAt     string `json:"occurred_at"`
		IncidentType   string `json:"incident_type"`
		Description    string `json:"description"`
		ActionTaken    string `json:"action_taken"`
		NotifiedParent bool   `json:"notified_parent"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.OccurredAt, &r.IncidentType, &r.Description, &r.ActionTaken, &r.NotifiedParent); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, fiber.Map{"incidents": list}, "ok")
}
