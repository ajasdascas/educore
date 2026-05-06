package school_admin

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
	k.Get("/students", h.KinderListStudents)

	k.Get("/daily-logs", h.KinderGetDailyLogs)
	k.Post("/daily-logs", h.KinderSaveDailyLog)
	k.Put("/daily-logs/:id", h.KinderUpdateDailyLog)
	k.Delete("/daily-logs/:id", h.KinderDeleteDailyLog)

	k.Get("/meals", h.KinderGetMeals)
	k.Post("/meals", h.KinderSaveMeal)
	k.Put("/meals/:id", h.KinderUpdateMeal)
	k.Delete("/meals/:id", h.KinderDeleteMeal)

	k.Get("/naps", h.KinderGetNaps)
	k.Post("/naps", h.KinderSaveNap)
	k.Put("/naps/:id", h.KinderUpdateNap)
	k.Delete("/naps/:id", h.KinderDeleteNap)

	k.Get("/diapers", h.KinderGetDiapers)
	k.Post("/diapers", h.KinderSaveDiaper)
	k.Put("/diapers/:id", h.KinderUpdateDiaper)
	k.Delete("/diapers/:id", h.KinderDeleteDiaper)

	k.Get("/mood", h.KinderGetMood)
	k.Post("/mood", h.KinderSaveMood)
	k.Put("/mood/:id", h.KinderUpdateMood)
	k.Delete("/mood/:id", h.KinderDeleteMood)

	k.Get("/incidents", h.KinderGetIncidents)
	k.Post("/incidents", h.KinderSaveIncident)
	k.Put("/incidents/:id", h.KinderUpdateIncident)
	k.Delete("/incidents/:id", h.KinderDeleteIncident)

	k.Get("/pickup-authorizations", h.KinderGetPickupAuths)
	k.Post("/pickup-authorizations", h.KinderSavePickupAuth)
	k.Put("/pickup-authorizations/:id", h.KinderUpdatePickupAuth)
	k.Delete("/pickup-authorizations/:id", h.KinderDeletePickupAuth)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func kinderDB(h *Handler) *database.DB { return h.service.repo.db }

func kinderTenant(c *fiber.Ctx) (string, error) { return getTenantID(c) }

func kinderQueryDate(c *fiber.Ctx) string {
	d := c.Query("date")
	if d == "" {
		d = time.Now().Format("2006-01-02")
	}
	return d
}


// ── Students list for kinder UI ───────────────────────────────────────────────

type KinderStudent struct {
	ID        string `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	GroupID   string `json:"group_id"`
	GroupName string `json:"group_name"`
}

func (h *Handler) KinderListStudents(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	groupID := c.Query("group_id")
	args := []interface{}{tenantID}
	extra := ""
	if groupID != "" {
		extra = " AND gs.group_id = " + database.Placeholder(db.Driver(), 2)
		args = append(args, groupID)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT s.id, s.first_name, s.last_name,
			       COALESCE(gs.group_id,''), COALESCE(g.name,'')
			FROM students s
			LEFT JOIN group_students gs ON gs.student_id = s.id
			LEFT JOIN groups g ON g.id = gs.group_id AND g.tenant_id = $1
			WHERE s.tenant_id = $1 AND s.status = 'active'`+extra+`
			ORDER BY s.first_name, s.last_name`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error listando alumnos")
	}
	defer rows.Close()
	students := []KinderStudent{}
	for rows.Next() {
		var s KinderStudent
		if err := rows.Scan(&s.ID, &s.FirstName, &s.LastName, &s.GroupID, &s.GroupName); err != nil {
			continue
		}
		students = append(students, s)
	}
	return response.Success(c, students, "ok")
}

// ── Daily Logs ────────────────────────────────────────────────────────────────

type KinderDailyLog struct {
	ID          string `json:"id"`
	StudentID   string `json:"student_id"`
	StudentName string `json:"student_name"`
	TeacherID   string `json:"teacher_id"`
	LogDate     string `json:"log_date"`
	GeneralMood string `json:"general_mood"`
	Notes       string `json:"notes"`
}

func (h *Handler) KinderGetDailyLogs(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	date := kinderQueryDate(c)
	args := []interface{}{tenantID, date}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND kr.student_id = " + database.Placeholder(db.Driver(), 3)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id,
			       CONCAT(s.first_name,' ',s.last_name),
			       kr.teacher_id,
			       DATE_FORMAT(kr.log_date,'%Y-%m-%d'),
			       COALESCE(kr.general_mood,''),
			       COALESCE(kr.notes,'')
			FROM kinder_daily_logs kr
			INNER JOIN students s ON s.id = kr.student_id
			WHERE kr.tenant_id = $1 AND kr.log_date = $2`+extra+`
			ORDER BY s.first_name`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando registros")
	}
	defer rows.Close()
	list := []KinderDailyLog{}
	for rows.Next() {
		var r KinderDailyLog
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.TeacherID, &r.LogDate, &r.GeneralMood, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveDailyLog(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	userID, _ := c.Locals("user_id").(string)
	db := kinderDB(h)
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
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
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

func (h *Handler) KinderDeleteDailyLog(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM kinder_daily_logs WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}

// ── Meals ─────────────────────────────────────────────────────────────────────

type KinderMeal struct {
	ID          string `json:"id"`
	StudentID   string `json:"student_id"`
	StudentName string `json:"student_name"`
	MealDate    string `json:"meal_date"`
	MealTime    string `json:"meal_time"`
	Portion     string `json:"portion"`
	FoodNote    string `json:"food_note"`
}

func (h *Handler) KinderGetMeals(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	date := kinderQueryDate(c)
	args := []interface{}{tenantID, date}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND kr.student_id = " + database.Placeholder(db.Driver(), 3)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.meal_date,'%Y-%m-%d'), kr.meal_time, kr.portion, COALESCE(kr.food_note,'')
			FROM kinder_meals kr
			INNER JOIN students s ON s.id = kr.student_id
			WHERE kr.tenant_id = $1 AND kr.meal_date = $2`+extra+`
			ORDER BY s.first_name, kr.meal_time`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando")
	}
	defer rows.Close()
	list := []KinderMeal{}
	for rows.Next() {
		var r KinderMeal
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.MealDate, &r.MealTime, &r.Portion, &r.FoodNote); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveMeal(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	userID, _ := c.Locals("user_id").(string)
	db := kinderDB(h)
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
			"INSERT INTO kinder_meals (id,tenant_id,student_id,teacher_id,meal_date,meal_time,portion,food_note) VALUES ($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''))"),
		newID, tenantID, body.StudentID, userID, body.MealDate, body.MealTime, body.Portion, body.FoodNote)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Comida registrada")
}

func (h *Handler) KinderUpdateMeal(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	var body struct {
		Portion  string `json:"portion"`
		FoodNote string `json:"food_note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE kinder_meals SET portion=$1, food_note=NULLIF($2,''), updated_at=NOW() WHERE id=$3 AND tenant_id=$4"),
		body.Portion, body.FoodNote, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

func (h *Handler) KinderDeleteMeal(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM kinder_meals WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}

// ── Naps ─────────────────────────────────────────────────────────────────────

type KinderNap struct {
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

func (h *Handler) KinderGetNaps(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	date := kinderQueryDate(c)
	args := []interface{}{tenantID, date}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND kr.student_id = " + database.Placeholder(db.Driver(), 3)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.nap_date,'%Y-%m-%d'),
			       COALESCE(TIME_FORMAT(kr.start_time,'%H:%i'),''),
			       COALESCE(TIME_FORMAT(kr.end_time,'%H:%i'),''),
			       COALESCE(kr.duration_minutes,0), kr.quality, COALESCE(kr.notes,'')
			FROM kinder_naps kr
			INNER JOIN students s ON s.id = kr.student_id
			WHERE kr.tenant_id = $1 AND kr.nap_date = $2`+extra+`
			ORDER BY s.first_name`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando")
	}
	defer rows.Close()
	list := []KinderNap{}
	for rows.Next() {
		var r KinderNap
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.NapDate, &r.StartTime, &r.EndTime, &r.DurationMinutes, &r.Quality, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveNap(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	userID, _ := c.Locals("user_id").(string)
	db := kinderDB(h)
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
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
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

func (h *Handler) KinderDeleteNap(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM kinder_naps WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}

// ── Diapers ───────────────────────────────────────────────────────────────────

type KinderDiaper struct {
	ID          string `json:"id"`
	StudentID   string `json:"student_id"`
	StudentName string `json:"student_name"`
	ChangedAt   string `json:"changed_at"`
	DiaperType  string `json:"diaper_type"`
	Notes       string `json:"notes"`
}

func (h *Handler) KinderGetDiapers(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	date := kinderQueryDate(c)
	args := []interface{}{tenantID, date}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND kr.student_id = " + database.Placeholder(db.Driver(), 3)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.changed_at,'%Y-%m-%dT%H:%i:00'),
			       kr.diaper_type, COALESCE(kr.notes,'')
			FROM kinder_diapers kr
			INNER JOIN students s ON s.id = kr.student_id
			WHERE kr.tenant_id = $1 AND DATE(kr.changed_at) = $2`+extra+`
			ORDER BY kr.changed_at`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando")
	}
	defer rows.Close()
	list := []KinderDiaper{}
	for rows.Next() {
		var r KinderDiaper
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.ChangedAt, &r.DiaperType, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveDiaper(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	userID, _ := c.Locals("user_id").(string)
	db := kinderDB(h)
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
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
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

func (h *Handler) KinderDeleteDiaper(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM kinder_diapers WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}

// ── Mood ──────────────────────────────────────────────────────────────────────

type KinderMoodEntry struct {
	ID          string `json:"id"`
	StudentID   string `json:"student_id"`
	StudentName string `json:"student_name"`
	RecordedAt  string `json:"recorded_at"`
	MoodCode    string `json:"mood_code"`
	Notes       string `json:"notes"`
}

func (h *Handler) KinderGetMood(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	date := kinderQueryDate(c)
	args := []interface{}{tenantID, date}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND kr.student_id = " + database.Placeholder(db.Driver(), 3)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.recorded_at,'%Y-%m-%dT%H:%i:00'),
			       kr.mood_code, COALESCE(kr.notes,'')
			FROM kinder_mood kr
			INNER JOIN students s ON s.id = kr.student_id
			WHERE kr.tenant_id = $1 AND DATE(kr.recorded_at) = $2`+extra+`
			ORDER BY kr.recorded_at`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando")
	}
	defer rows.Close()
	list := []KinderMoodEntry{}
	for rows.Next() {
		var r KinderMoodEntry
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.RecordedAt, &r.MoodCode, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveMood(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	userID, _ := c.Locals("user_id").(string)
	db := kinderDB(h)
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
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
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

func (h *Handler) KinderDeleteMood(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM kinder_mood WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}

// ── Incidents ─────────────────────────────────────────────────────────────────

type KinderIncident struct {
	ID              string `json:"id"`
	StudentID       string `json:"student_id"`
	StudentName     string `json:"student_name"`
	OccurredAt      string `json:"occurred_at"`
	IncidentType    string `json:"incident_type"`
	Description     string `json:"description"`
	ActionTaken     string `json:"action_taken"`
	NotifiedParent  bool   `json:"notified_parent"`
}

func (h *Handler) KinderGetIncidents(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	args := []interface{}{tenantID}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND kr.student_id = " + database.Placeholder(db.Driver(), 2)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT kr.id, kr.student_id, CONCAT(s.first_name,' ',s.last_name),
			       DATE_FORMAT(kr.occurred_at,'%Y-%m-%dT%H:%i:00'),
			       kr.incident_type, kr.description, COALESCE(kr.action_taken,''), kr.notified_parent
			FROM kinder_incidents kr
			INNER JOIN students s ON s.id = kr.student_id
			WHERE kr.tenant_id = $1`+extra+`
			ORDER BY kr.occurred_at DESC`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando")
	}
	defer rows.Close()
	list := []KinderIncident{}
	for rows.Next() {
		var r KinderIncident
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.OccurredAt, &r.IncidentType, &r.Description, &r.ActionTaken, &r.NotifiedParent); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSaveIncident(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	userID, _ := c.Locals("user_id").(string)
	db := kinderDB(h)
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
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
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

func (h *Handler) KinderDeleteIncident(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM kinder_incidents WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}

// ── Pickup Authorizations ─────────────────────────────────────────────────────

type PickupAuth struct {
	ID             string `json:"id"`
	StudentID      string `json:"student_id"`
	StudentName    string `json:"student_name"`
	AuthorizedName string `json:"authorized_name"`
	Relationship   string `json:"relationship"`
	Phone          string `json:"phone"`
	Notes          string `json:"notes"`
	IsActive       bool   `json:"is_active"`
}

func (h *Handler) KinderGetPickupAuths(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	args := []interface{}{tenantID}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND pa.student_id = " + database.Placeholder(db.Driver(), 2)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT pa.id, pa.student_id, CONCAT(s.first_name,' ',s.last_name),
			       pa.authorized_name, pa.relationship, COALESCE(pa.phone,''), COALESCE(pa.notes,''), pa.is_active
			FROM pickup_authorizations pa
			INNER JOIN students s ON s.id = pa.student_id
			WHERE pa.tenant_id = $1`+extra+`
			ORDER BY s.first_name, pa.authorized_name`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando")
	}
	defer rows.Close()
	list := []PickupAuth{}
	for rows.Next() {
		var r PickupAuth
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.AuthorizedName, &r.Relationship, &r.Phone, &r.Notes, &r.IsActive); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) KinderSavePickupAuth(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	var body struct {
		StudentID      string `json:"student_id"`
		AuthorizedName string `json:"authorized_name"`
		Relationship   string `json:"relationship"`
		Phone          string `json:"phone"`
		Notes          string `json:"notes"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" || body.AuthorizedName == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id y authorized_name requeridos")
	}
	if body.Relationship == "" {
		body.Relationship = "family"
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO pickup_authorizations (id,tenant_id,student_id,authorized_name,relationship,phone,notes) VALUES ($1,$2,$3,$4,$5,NULLIF($6,''),NULLIF($7,''))"),
		newID, tenantID, body.StudentID, body.AuthorizedName, body.Relationship, body.Phone, body.Notes)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Autorización registrada")
}

func (h *Handler) KinderUpdatePickupAuth(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	var body struct {
		AuthorizedName string `json:"authorized_name"`
		Relationship   string `json:"relationship"`
		Phone          string `json:"phone"`
		Notes          string `json:"notes"`
		IsActive       bool   `json:"is_active"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"UPDATE pickup_authorizations SET authorized_name=$1, relationship=$2, phone=NULLIF($3,''), notes=NULLIF($4,''), is_active=$5, updated_at=NOW() WHERE id=$6 AND tenant_id=$7"),
		body.AuthorizedName, body.Relationship, body.Phone, body.Notes, body.IsActive, c.Params("id"), tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error actualizando")
	}
	return response.SuccessMessage(c, "Actualizado")
}

func (h *Handler) KinderDeletePickupAuth(c *fiber.Ctx) error {
	tenantID, err := kinderTenant(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := kinderDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM pickup_authorizations WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}
