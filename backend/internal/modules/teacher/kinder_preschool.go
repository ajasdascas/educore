package teacher

import (
	"fmt"
	"time"

	"educore/internal/pkg/database"
	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// ── Route registration ────────────────────────────────────────────────────────

func (h *Handler) RegisterKinderRoutes(app fiber.Router) {
	k := app.Group("/kinder")
	k.Get("/daily-logs", h.KinderGetDailyLogs)
	k.Post("/daily-logs", h.KinderSaveDailyLog)
	k.Put("/daily-logs/:id", h.KinderUpdateDailyLog)

	k.Get("/meals", h.KinderGetMeals)
	k.Post("/meals", h.KinderSaveMeal)
	k.Put("/meals/:id", h.KinderUpdateMeal)

	k.Get("/naps", h.KinderGetNaps)
	k.Post("/naps", h.KinderSaveNap)
	k.Put("/naps/:id", h.KinderUpdateNap)

	k.Get("/diapers", h.KinderGetDiapers)
	k.Post("/diapers", h.KinderSaveDiaper)
	k.Put("/diapers/:id", h.KinderUpdateDiaper)

	k.Get("/mood", h.KinderGetMood)
	k.Post("/mood", h.KinderSaveMood)
	k.Put("/mood/:id", h.KinderUpdateMood)

	k.Get("/incidents", h.KinderGetIncidents)
	k.Post("/incidents", h.KinderSaveIncident)
	k.Put("/incidents/:id", h.KinderUpdateIncident)
}

func (h *Handler) RegisterPreschoolRoutes(app fiber.Router) {
	p := app.Group("/preschool")
	p.Get("/qualitative-assessments", h.PreschoolGetAssessments)
	p.Post("/qualitative-assessments", h.PreschoolSaveAssessment)
	p.Put("/qualitative-assessments/:id", h.PreschoolUpdateAssessment)

	p.Get("/observations", h.PreschoolGetObservations)
	p.Post("/observations", h.PreschoolSaveObservation)
	p.Put("/observations/:id", h.PreschoolUpdateObservation)

	p.Get("/evidence", h.PreschoolGetEvidence)
	p.Post("/evidence", h.PreschoolSaveEvidence)
	p.Put("/evidence/:id", h.PreschoolUpdateEvidence)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func (h *Handler) teacherTenantUser(c *fiber.Ctx) (tenantID, userID string, err error) {
	tenantID, _ = c.Locals("tenant_id").(string)
	userID, _ = c.Locals("user_id").(string)
	if tenantID == "" {
		return "", "", fmt.Errorf("tenant context required")
	}
	return
}

func (h *Handler) verifyTeacherGroupForKinder(c *fiber.Ctx, groupID string) (bool, error) {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return false, err
	}
	return h.service.repo.VerifyTeacherGroup(c.UserContext(), tenantID, userID, groupID)
}

func kinderDate(c *fiber.Ctx) string {
	d := c.Query("date")
	if d == "" {
		d = time.Now().Format("2006-01-02")
	}
	return d
}

// ── Kinder: Daily Logs ────────────────────────────────────────────────────────

func (h *Handler) KinderGetDailyLogs(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	date := kinderDate(c)
	args := []interface{}{tenantID, date, userID}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.log_date,'%Y-%m-%d'),
			       COALESCE(kr.general_mood,''), COALESCE(kr.notes,'')
			FROM kinder_daily_logs kr
			INNER JOIN students s ON s.id = kr.student_id
			INNER JOIN group_students gs ON gs.student_id = s.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $3
			WHERE kr.tenant_id = $1 AND kr.log_date = $2
			ORDER BY s.first_name`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando registros")
	}
	defer rows.Close()
	type Row struct {
		ID          string `json:"id"`
		StudentID   string `json:"student_id"`
		StudentName string `json:"student_name"`
		LogDate     string `json:"log_date"`
		GeneralMood string `json:"general_mood"`
		Notes       string `json:"notes"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.LogDate, &r.GeneralMood, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveDailyLog(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StudentID   string `json:"student_id"`
		LogDate     string `json:"log_date"`
		GeneralMood string `json:"general_mood"`
		Notes       string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id requerido")
	}
	if body.LogDate == "" {
		body.LogDate = time.Now().Format("2006-01-02")
	}
	if database.IsMySQL(db.Driver()) {
		newID := database.NewID()
		_, err = db.Exec(c.UserContext(),
			"INSERT INTO kinder_daily_logs (id,tenant_id,student_id,teacher_id,log_date,general_mood,notes) VALUES (?,?,?,?,?,NULLIF(?,''),NULLIF(?,'')) ON DUPLICATE KEY UPDATE general_mood=VALUES(general_mood), notes=VALUES(notes), teacher_id=VALUES(teacher_id)",
			newID, tenantID, body.StudentID, userID, body.LogDate, body.GeneralMood, body.Notes)
	} else {
		_, err = db.Exec(c.UserContext(),
			"INSERT INTO kinder_daily_logs (tenant_id,student_id,teacher_id,log_date,general_mood,notes) VALUES ($1,$2,$3,$4,NULLIF($5,''),NULLIF($6,'')) ON CONFLICT (tenant_id,student_id,log_date) DO UPDATE SET general_mood=EXCLUDED.general_mood, notes=EXCLUDED.notes, teacher_id=EXCLUDED.teacher_id",
			tenantID, body.StudentID, userID, body.LogDate, body.GeneralMood, body.Notes)
	}
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.SuccessMessage(c, "Registro diario guardado")
}

func (h *Handler) KinderUpdateDailyLog(c *fiber.Ctx) error {
	tenantID, _, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		GeneralMood string `json:"general_mood"`
		Notes       string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE kinder_daily_logs SET general_mood=NULLIF($1,''), notes=NULLIF($2,''), updated_at=NOW() WHERE id=$3 AND tenant_id=$4"),
		body.GeneralMood, body.Notes, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

// ── Kinder: Meals ─────────────────────────────────────────────────────────────

func (h *Handler) KinderGetMeals(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	date := kinderDate(c)
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.meal_date,'%Y-%m-%d'), kr.meal_time, kr.meal_portion, COALESCE(kr.meal_note,'')
			FROM kinder_meals kr
			INNER JOIN students s ON s.id = kr.student_id
			INNER JOIN group_students gs ON gs.student_id = s.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $3
			WHERE kr.tenant_id = $1 AND kr.meal_date = $2
			ORDER BY s.first_name, kr.meal_time`),
		tenantID, date, userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando comidas")
	}
	defer rows.Close()
	type Row struct {
		ID          string `json:"id"`
		StudentID   string `json:"student_id"`
		StudentName string `json:"student_name"`
		MealDate    string `json:"meal_date"`
		MealTime    string `json:"meal_time"`
		Portion     string `json:"portion"`
		FoodNote    string `json:"food_note"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.MealDate, &r.MealTime, &r.Portion, &r.FoodNote); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveMeal(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StudentID string `json:"student_id"`
		MealDate  string `json:"meal_date"`
		MealTime  string `json:"meal_time"`
		Portion   string `json:"portion"`
		FoodNote  string `json:"food_note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id requerido")
	}
	if body.MealDate == "" {
		body.MealDate = time.Now().Format("2006-01-02")
	}
	if body.MealTime == "" {
		body.MealTime = "lunch"
	}
	if body.Portion == "" {
		body.Portion = "full"
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO kinder_meals (id,tenant_id,student_id,teacher_id,meal_date,meal_time,meal_portion,meal_note) VALUES ($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''))"),
		newID, tenantID, body.StudentID, userID, body.MealDate, body.MealTime, body.Portion, body.FoodNote)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Comida registrada")
}

func (h *Handler) KinderUpdateMeal(c *fiber.Ctx) error {
	tenantID, _, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		Portion  string `json:"portion"`
		FoodNote string `json:"food_note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE kinder_meals SET meal_portion=$1, meal_note=NULLIF($2,''), updated_at=NOW() WHERE id=$3 AND tenant_id=$4"),
		body.Portion, body.FoodNote, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

// ── Kinder: Naps ─────────────────────────────────────────────────────────────

func (h *Handler) KinderGetNaps(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	date := kinderDate(c)
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.nap_date,'%Y-%m-%d'),
			       COALESCE(TIME_FORMAT(kr.start_time,'%H:%i'),''),
			       COALESCE(TIME_FORMAT(kr.end_time,'%H:%i'),''),
			       COALESCE(kr.duration_minutes,0), kr.quality, COALESCE(kr.notes,'')
			FROM kinder_naps kr
			INNER JOIN students s ON s.id = kr.student_id
			INNER JOIN group_students gs ON gs.student_id = s.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $3
			WHERE kr.tenant_id = $1 AND kr.nap_date = $2
			ORDER BY s.first_name`),
		tenantID, date, userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando siestas")
	}
	defer rows.Close()
	type Row struct {
		ID              string `json:"id"`
		StudentID       string `json:"student_id"`
		StudentName     string `json:"student_name"`
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
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.NapDate, &r.StartTime, &r.EndTime, &r.DurationMinutes, &r.Quality, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveNap(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StudentID       string `json:"student_id"`
		NapDate         string `json:"nap_date"`
		StartTime       string `json:"start_time"`
		EndTime         string `json:"end_time"`
		DurationMinutes int    `json:"duration_minutes"`
		Quality         string `json:"quality"`
		Notes           string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id requerido")
	}
	if body.NapDate == "" {
		body.NapDate = time.Now().Format("2006-01-02")
	}
	if body.Quality == "" {
		body.Quality = "good"
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO kinder_naps (id,tenant_id,student_id,teacher_id,nap_date,start_time,end_time,duration_minutes,quality,notes) VALUES ($1,$2,$3,$4,$5,NULLIF($6,''),NULLIF($7,''),NULLIF($8,0),$9,NULLIF($10,''))"),
		newID, tenantID, body.StudentID, userID, body.NapDate, body.StartTime, body.EndTime, body.DurationMinutes, body.Quality, body.Notes)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Siesta registrada")
}

func (h *Handler) KinderUpdateNap(c *fiber.Ctx) error {
	tenantID, _, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StartTime       string `json:"start_time"`
		EndTime         string `json:"end_time"`
		DurationMinutes int    `json:"duration_minutes"`
		Quality         string `json:"quality"`
		Notes           string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE kinder_naps SET start_time=NULLIF($1,''), end_time=NULLIF($2,''), duration_minutes=NULLIF($3,0), quality=$4, notes=NULLIF($5,''), updated_at=NOW() WHERE id=$6 AND tenant_id=$7"),
		body.StartTime, body.EndTime, body.DurationMinutes, body.Quality, body.Notes, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

// ── Kinder: Diapers ───────────────────────────────────────────────────────────

func (h *Handler) KinderGetDiapers(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	date := kinderDate(c)
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.changed_at,'%Y-%m-%dT%H:%i:00'), kr.diaper_type, COALESCE(kr.notes,'')
			FROM kinder_diapers kr
			INNER JOIN students s ON s.id = kr.student_id
			INNER JOIN group_students gs ON gs.student_id = s.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $3
			WHERE kr.tenant_id = $1 AND DATE(kr.changed_at) = $2
			ORDER BY kr.changed_at`),
		tenantID, date, userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando")
	}
	defer rows.Close()
	type Row struct {
		ID          string `json:"id"`
		StudentID   string `json:"student_id"`
		StudentName string `json:"student_name"`
		ChangedAt   string `json:"changed_at"`
		DiaperType  string `json:"diaper_type"`
		Notes       string `json:"notes"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.ChangedAt, &r.DiaperType, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveDiaper(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StudentID  string `json:"student_id"`
		ChangedAt  string `json:"changed_at"`
		DiaperType string `json:"diaper_type"`
		Notes      string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id requerido")
	}
	if body.ChangedAt == "" {
		body.ChangedAt = time.Now().Format("2006-01-02 15:04:05")
	}
	if body.DiaperType == "" {
		body.DiaperType = "wet"
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO kinder_diapers (id,tenant_id,student_id,teacher_id,changed_at,diaper_type,notes) VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,''))"),
		newID, tenantID, body.StudentID, userID, body.ChangedAt, body.DiaperType, body.Notes)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Cambio registrado")
}

func (h *Handler) KinderUpdateDiaper(c *fiber.Ctx) error {
	tenantID, _, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		DiaperType string `json:"diaper_type"`
		Notes      string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE kinder_diapers SET diaper_type=$1, notes=NULLIF($2,'') WHERE id=$3 AND tenant_id=$4"),
		body.DiaperType, body.Notes, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

// ── Kinder: Mood ─────────────────────────────────────────────────────────────

func (h *Handler) KinderGetMood(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	date := kinderDate(c)
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.recorded_at,'%Y-%m-%dT%H:%i:00'), kr.mood_code, COALESCE(kr.notes,'')
			FROM kinder_mood kr
			INNER JOIN students s ON s.id = kr.student_id
			INNER JOIN group_students gs ON gs.student_id = s.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $3
			WHERE kr.tenant_id = $1 AND DATE(kr.recorded_at) = $2
			ORDER BY kr.recorded_at`),
		tenantID, date, userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando")
	}
	defer rows.Close()
	type Row struct {
		ID          string `json:"id"`
		StudentID   string `json:"student_id"`
		StudentName string `json:"student_name"`
		RecordedAt  string `json:"recorded_at"`
		MoodCode    string `json:"mood_code"`
		Notes       string `json:"notes"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.RecordedAt, &r.MoodCode, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveMood(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StudentID  string `json:"student_id"`
		RecordedAt string `json:"recorded_at"`
		MoodCode   string `json:"mood_code"`
		Notes      string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id requerido")
	}
	if body.RecordedAt == "" {
		body.RecordedAt = time.Now().Format("2006-01-02 15:04:05")
	}
	if body.MoodCode == "" {
		body.MoodCode = "calm"
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO kinder_mood (id,tenant_id,student_id,teacher_id,recorded_at,mood_code,notes) VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,''))"),
		newID, tenantID, body.StudentID, userID, body.RecordedAt, body.MoodCode, body.Notes)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Estado de ánimo registrado")
}

func (h *Handler) KinderUpdateMood(c *fiber.Ctx) error {
	tenantID, _, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		MoodCode string `json:"mood_code"`
		Notes    string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE kinder_mood SET mood_code=$1, notes=NULLIF($2,'') WHERE id=$3 AND tenant_id=$4"),
		body.MoodCode, body.Notes, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

// ── Kinder: Incidents ─────────────────────────────────────────────────────────

func (h *Handler) KinderGetIncidents(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.occurred_at,'%Y-%m-%dT%H:%i:00'),
			       kr.incident_type, kr.description, COALESCE(kr.action_taken,''), kr.notified_parent
			FROM kinder_incidents kr
			INNER JOIN students s ON s.id = kr.student_id
			INNER JOIN group_students gs ON gs.student_id = s.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $2
			WHERE kr.tenant_id = $1
			ORDER BY kr.occurred_at DESC`),
		tenantID, userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando incidentes")
	}
	defer rows.Close()
	type Row struct {
		ID             string `json:"id"`
		StudentID      string `json:"student_id"`
		StudentName    string `json:"student_name"`
		OccurredAt     string `json:"occurred_at"`
		IncidentType   string `json:"incident_type"`
		Description    string `json:"description"`
		ActionTaken    string `json:"action_taken"`
		NotifiedParent bool   `json:"notified_parent"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.OccurredAt, &r.IncidentType, &r.Description, &r.ActionTaken, &r.NotifiedParent); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveIncident(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StudentID      string `json:"student_id"`
		OccurredAt     string `json:"occurred_at"`
		IncidentType   string `json:"incident_type"`
		Description    string `json:"description"`
		ActionTaken    string `json:"action_taken"`
		NotifiedParent bool   `json:"notified_parent"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" || body.Description == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id y description requeridos")
	}
	if body.OccurredAt == "" {
		body.OccurredAt = time.Now().Format("2006-01-02 15:04:05")
	}
	if body.IncidentType == "" {
		body.IncidentType = "other"
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO kinder_incidents (id,tenant_id,student_id,teacher_id,occurred_at,incident_type,description,action_taken,notified_parent) VALUES ($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''),$9)"),
		newID, tenantID, body.StudentID, userID, body.OccurredAt, body.IncidentType, body.Description, body.ActionTaken, body.NotifiedParent)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Incidente registrado")
}

func (h *Handler) KinderUpdateIncident(c *fiber.Ctx) error {
	tenantID, _, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		IncidentType   string `json:"incident_type"`
		Description    string `json:"description"`
		ActionTaken    string `json:"action_taken"`
		NotifiedParent bool   `json:"notified_parent"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE kinder_incidents SET incident_type=$1, description=$2, action_taken=NULLIF($3,''), notified_parent=$4, updated_at=NOW() WHERE id=$5 AND tenant_id=$6"),
		body.IncidentType, body.Description, body.ActionTaken, body.NotifiedParent, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

// ── Preschool: Qualitative Assessments ───────────────────────────────────────

func (h *Handler) PreschoolGetAssessments(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	period := c.Query("period", "current")
	args := []interface{}{tenantID, period, userID}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND pqa.student_id = " + database.Placeholder(db.Driver(), 4)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT pqa.id, pqa.student_id, CONCAT(s.first_name,' ',s.last_name),
			       pqa.period, pqa.campo_formativo,
			       COALESCE(pqa.aprendizaje_esperado,''), pqa.nivel, COALESCE(pqa.notes,'')
			FROM preschool_qualitative_assessments pqa
			INNER JOIN students s ON s.id = pqa.student_id
			INNER JOIN group_students gs ON gs.student_id = s.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $3
			WHERE pqa.tenant_id = $1 AND pqa.period = $2`+extra+`
			ORDER BY s.first_name, pqa.campo_formativo`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando evaluaciones")
	}
	defer rows.Close()
	type Row struct {
		ID                  string `json:"id"`
		StudentID           string `json:"student_id"`
		StudentName         string `json:"student_name"`
		Period              string `json:"period"`
		CampoFormativo      string `json:"campo_formativo"`
		AprendizajeEsperado string `json:"aprendizaje_esperado"`
		Nivel               string `json:"nivel"`
		Notes               string `json:"notes"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.Period, &r.CampoFormativo, &r.AprendizajeEsperado, &r.Nivel, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) PreschoolSaveAssessment(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StudentID           string `json:"student_id"`
		Period              string `json:"period"`
		CampoFormativo      string `json:"campo_formativo"`
		AprendizajeEsperado string `json:"aprendizaje_esperado"`
		Nivel               string `json:"nivel"`
		Notes               string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" || body.CampoFormativo == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id y campo_formativo requeridos")
	}
	if body.Period == "" {
		body.Period = "current"
	}
	if body.Nivel == "" {
		body.Nivel = "en_proceso"
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO preschool_qualitative_assessments (id,tenant_id,student_id,teacher_id,period,campo_formativo,aprendizaje_esperado,nivel,notes) VALUES ($1,$2,$3,$4,$5,$6,NULLIF($7,''),$8,NULLIF($9,''))"),
		newID, tenantID, body.StudentID, userID, body.Period, body.CampoFormativo, body.AprendizajeEsperado, body.Nivel, body.Notes)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Evaluación guardada")
}

func (h *Handler) PreschoolUpdateAssessment(c *fiber.Ctx) error {
	tenantID, _, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		Nivel               string `json:"nivel"`
		AprendizajeEsperado string `json:"aprendizaje_esperado"`
		Notes               string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE preschool_qualitative_assessments SET nivel=$1, aprendizaje_esperado=NULLIF($2,''), notes=NULLIF($3,''), updated_at=NOW() WHERE id=$4 AND tenant_id=$5"),
		body.Nivel, body.AprendizajeEsperado, body.Notes, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

// ── Preschool: Observations ───────────────────────────────────────────────────

func (h *Handler) PreschoolGetObservations(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	args := []interface{}{tenantID, userID}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND po.student_id = " + database.Placeholder(db.Driver(), 3)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT po.id, po.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(po.observed_at,'%Y-%m-%d'), po.category, po.content, po.is_visible_to_parent
			FROM preschool_observations po
			INNER JOIN students s ON s.id = po.student_id
			INNER JOIN group_students gs ON gs.student_id = s.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $2
			WHERE po.tenant_id = $1`+extra+`
			ORDER BY po.observed_at DESC`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando observaciones")
	}
	defer rows.Close()
	type Row struct {
		ID                string `json:"id"`
		StudentID         string `json:"student_id"`
		StudentName       string `json:"student_name"`
		ObservedAt        string `json:"observed_at"`
		Category          string `json:"category"`
		Content           string `json:"content"`
		IsVisibleToParent bool   `json:"is_visible_to_parent"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.ObservedAt, &r.Category, &r.Content, &r.IsVisibleToParent); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) PreschoolSaveObservation(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StudentID         string `json:"student_id"`
		ObservedAt        string `json:"observed_at"`
		Category          string `json:"category"`
		Content           string `json:"content"`
		IsVisibleToParent bool   `json:"is_visible_to_parent"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" || body.Content == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id y content requeridos")
	}
	if body.ObservedAt == "" {
		body.ObservedAt = time.Now().Format("2006-01-02")
	}
	if body.Category == "" {
		body.Category = "general"
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO preschool_observations (id,tenant_id,student_id,teacher_id,observed_at,category,content,is_visible_to_parent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)"),
		newID, tenantID, body.StudentID, userID, body.ObservedAt, body.Category, body.Content, body.IsVisibleToParent)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Observación guardada")
}

func (h *Handler) PreschoolUpdateObservation(c *fiber.Ctx) error {
	tenantID, _, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		Category          string `json:"category"`
		Content           string `json:"content"`
		IsVisibleToParent bool   `json:"is_visible_to_parent"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE preschool_observations SET category=$1, content=$2, is_visible_to_parent=$3, updated_at=NOW() WHERE id=$4 AND tenant_id=$5"),
		body.Category, body.Content, body.IsVisibleToParent, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

// ── Preschool: Evidence ────────────────────────────────────────────────────────

func (h *Handler) PreschoolGetEvidence(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	args := []interface{}{tenantID, userID}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND pe.student_id = " + database.Placeholder(db.Driver(), 3)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT pe.id, pe.student_id, CONCAT(s.first_name,' ',s.last_name),
			       pe.title, COALESCE(pe.description,''), COALESCE(pe.category,''),
			       COALESCE(pe.image_url,''), pe.is_visible_to_parent,
			       DATE_FORMAT(pe.created_at,'%Y-%m-%d')
			FROM preschool_evidence pe
			INNER JOIN students s ON s.id = pe.student_id
			INNER JOIN group_students gs ON gs.student_id = s.id
			INNER JOIN group_teachers gt ON gt.group_id = gs.group_id AND gt.teacher_id = $2
			WHERE pe.tenant_id = $1`+extra+`
			ORDER BY pe.created_at DESC`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando evidencias")
	}
	defer rows.Close()
	type Row struct {
		ID                string `json:"id"`
		StudentID         string `json:"student_id"`
		StudentName       string `json:"student_name"`
		Title             string `json:"title"`
		Description       string `json:"description"`
		Category          string `json:"category"`
		ImageURL          string `json:"image_url"`
		IsVisibleToParent bool   `json:"is_visible_to_parent"`
		CreatedAt         string `json:"created_at"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.Title, &r.Description, &r.Category, &r.ImageURL, &r.IsVisibleToParent, &r.CreatedAt); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) PreschoolSaveEvidence(c *fiber.Ctx) error {
	tenantID, userID, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		StudentID         string `json:"student_id"`
		Title             string `json:"title"`
		Description       string `json:"description"`
		Category          string `json:"category"`
		ImageURL          string `json:"image_url"`
		IsVisibleToParent bool   `json:"is_visible_to_parent"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" || body.Title == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id y title requeridos")
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO preschool_evidence (id,tenant_id,student_id,teacher_id,title,description,category,image_url,is_visible_to_parent) VALUES ($1,$2,$3,$4,$5,NULLIF($6,''),NULLIF($7,''),NULLIF($8,''),$9)"),
		newID, tenantID, body.StudentID, userID, body.Title, body.Description, body.Category, body.ImageURL, body.IsVisibleToParent)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Evidencia guardada")
}

func (h *Handler) PreschoolUpdateEvidence(c *fiber.Ctx) error {
	tenantID, _, err := h.teacherTenantUser(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := h.service.repo.db
	var body struct {
		Title             string `json:"title"`
		Description       string `json:"description"`
		Category          string `json:"category"`
		ImageURL          string `json:"image_url"`
		IsVisibleToParent bool   `json:"is_visible_to_parent"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE preschool_evidence SET title=$1, description=NULLIF($2,''), category=NULLIF($3,''), image_url=NULLIF($4,''), is_visible_to_parent=$5, updated_at=NOW() WHERE id=$6 AND tenant_id=$7"),
		body.Title, body.Description, body.Category, body.ImageURL, body.IsVisibleToParent, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}
