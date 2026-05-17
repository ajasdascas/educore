package school_admin

import (
	"fmt"
	"time"

	"educore/internal/pkg/database"
	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

// ── Route registration ────────────────────────────────────────────────────────

func (h *Handler) RegisterPreschoolRoutes(app fiber.Router) {
	p := app.Group("/preschool")
	p.Get("/students", h.PreschoolListStudents)

	p.Get("/qualitative-assessments", h.PreschoolGetAssessments)
	p.Post("/qualitative-assessments", h.PreschoolSaveAssessment)
	p.Put("/qualitative-assessments/:id", h.PreschoolUpdateAssessment)
	p.Delete("/qualitative-assessments/:id", h.PreschoolDeleteAssessment)

	p.Get("/development-areas", h.PreschoolGetDevelopmentAreas)

	p.Get("/observations", h.PreschoolGetObservations)
	p.Post("/observations", h.PreschoolSaveObservation)
	p.Put("/observations/:id", h.PreschoolUpdateObservation)
	p.Delete("/observations/:id", h.PreschoolDeleteObservation)

	p.Get("/evidence", h.PreschoolGetEvidence)
	p.Post("/evidence", h.PreschoolSaveEvidence)
	p.Put("/evidence/:id", h.PreschoolUpdateEvidence)
	p.Delete("/evidence/:id", h.PreschoolDeleteEvidence)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func preschoolDB(h *Handler) *database.DB { return h.service.repo.db }

// ── Students list for preschool UI ───────────────────────────────────────────

func (h *Handler) PreschoolListStudents(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
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
	type Student struct {
		ID        string `json:"id"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		GroupID   string `json:"group_id"`
		GroupName string `json:"group_name"`
	}
	students := []Student{}
	for rows.Next() {
		var s Student
		if err := rows.Scan(&s.ID, &s.FirstName, &s.LastName, &s.GroupID, &s.GroupName); err != nil {
			continue
		}
		students = append(students, s)
	}
	return response.Success(c, students, "ok")
}

// ── Qualitative Assessments ───────────────────────────────────────────────────

type PreschoolAssessment struct {
	ID                  string `json:"id"`
	StudentID           string `json:"student_id"`
	StudentName         string `json:"student_name"`
	TeacherID           string `json:"teacher_id"`
	Period              string `json:"period"`
	CampoFormativo      string `json:"campo_formativo"`
	AprendizajeEsperado string `json:"aprendizaje_esperado"`
	Nivel               string `json:"nivel"`
	Notes               string `json:"notes"`
}

func (h *Handler) PreschoolGetAssessments(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
	period := c.Query("period", "current")
	args := []interface{}{tenantID, period}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND pqa.student_id = " + database.Placeholder(db.Driver(), 3)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT pqa.id, pqa.student_id, CONCAT(s.first_name,' ',s.last_name),
			       pqa.teacher_id, pqa.period, pqa.campo_formativo,
			       COALESCE(pqa.aprendizaje_esperado,''), pqa.nivel, COALESCE(pqa.notes,'')
			FROM preschool_qualitative_assessments pqa
			INNER JOIN students s ON s.id = pqa.student_id
			WHERE pqa.tenant_id = $1 AND pqa.period = $2`+extra+`
			ORDER BY s.first_name, pqa.campo_formativo`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando evaluaciones")
	}
	defer rows.Close()
	list := []PreschoolAssessment{}
	for rows.Next() {
		var r PreschoolAssessment
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.TeacherID, &r.Period, &r.CampoFormativo, &r.AprendizajeEsperado, &r.Nivel, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) PreschoolSaveAssessment(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	userID, _ := c.Locals("user_id").(string)
	db := preschoolDB(h)
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
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
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

func (h *Handler) PreschoolDeleteAssessment(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM preschool_qualitative_assessments WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}

// ── Development Areas (campos formativos — static catalog + student summary) ──

func (h *Handler) PreschoolGetDevelopmentAreas(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
	sid := c.Query("student_id")
	period := c.Query("period", "current")

	type AreaSummary struct {
		CampoFormativo string         `json:"campo_formativo"`
		Description    string         `json:"description"`
		Assessments    []interface{}  `json:"assessments"`
		Summary        map[string]int `json:"summary"`
	}

	campos := []string{
		"Lenguaje y Comunicación",
		"Pensamiento Matemático",
		"Exploración y Conocimiento del Mundo",
		"Desarrollo Personal y Social",
		"Expresión y Apreciación Artística",
		"Desarrollo Físico y Salud",
	}

	areas := make([]AreaSummary, 0, len(campos))
	for _, campo := range campos {
		summary := map[string]int{"logrado": 0, "en_proceso": 0, "iniciando": 0, "requiere_apoyo": 0}
		var assessments []interface{}

		if sid != "" {
			args := []interface{}{tenantID, period, campo, sid}
			rows, err2 := db.Query(c.UserContext(),
				database.RebindPlaceholders(db.Driver(), `
					SELECT id, nivel, COALESCE(aprendizaje_esperado,''), COALESCE(notes,'')
					FROM preschool_qualitative_assessments
					WHERE tenant_id=$1 AND period=$2 AND campo_formativo=$3 AND student_id=$4`),
				args...)
			if err2 == nil {
				for rows.Next() {
					var id, nivel, ap, notes string
					if err3 := rows.Scan(&id, &nivel, &ap, &notes); err3 == nil {
						summary[nivel]++
						assessments = append(assessments, map[string]string{
							"id": id, "nivel": nivel, "aprendizaje_esperado": ap, "notes": notes,
						})
					}
				}
				rows.Close()
			}
		}
		if assessments == nil {
			assessments = []interface{}{}
		}
		areas = append(areas, AreaSummary{
			CampoFormativo: campo,
			Description:    "",
			Assessments:    assessments,
			Summary:        summary,
		})
	}
	return response.Success(c, areas, "ok")
}

// ── Observations ──────────────────────────────────────────────────────────────

type PreschoolObservation struct {
	ID                string `json:"id"`
	StudentID         string `json:"student_id"`
	StudentName       string `json:"student_name"`
	TeacherID         string `json:"teacher_id"`
	ObservedAt        string `json:"observed_at"`
	Category          string `json:"category"`
	Content           string `json:"content"`
	IsVisibleToParent bool   `json:"is_visible_to_parent"`
}

func (h *Handler) PreschoolGetObservations(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
	args := []interface{}{tenantID}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND po.student_id = " + database.Placeholder(db.Driver(), 2)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT po.id, po.student_id, CONCAT(s.first_name,' ',s.last_name),
			       po.teacher_id, DATE_FORMAT(po.observed_at,'%Y-%m-%d'),
			       po.category, po.content, po.is_visible_to_parent
			FROM preschool_observations po
			INNER JOIN students s ON s.id = po.student_id
			WHERE po.tenant_id = $1`+extra+`
			ORDER BY po.observed_at DESC`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando observaciones")
	}
	defer rows.Close()
	list := []PreschoolObservation{}
	for rows.Next() {
		var r PreschoolObservation
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.TeacherID, &r.ObservedAt, &r.Category, &r.Content, &r.IsVisibleToParent); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) PreschoolSaveObservation(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	userID, _ := c.Locals("user_id").(string)
	db := preschoolDB(h)
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
	if !body.IsVisibleToParent {
		body.IsVisibleToParent = true
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
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
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

func (h *Handler) PreschoolDeleteObservation(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM preschool_observations WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}

// ── Evidence ──────────────────────────────────────────────────────────────────

type PreschoolEvidence struct {
	ID                string `json:"id"`
	StudentID         string `json:"student_id"`
	StudentName       string `json:"student_name"`
	TeacherID         string `json:"teacher_id"`
	Title             string `json:"title"`
	Description       string `json:"description"`
	Category          string `json:"category"`
	ImageURL          string `json:"image_url"`
	FileURL           string `json:"file_url"`
	IsVisibleToParent bool   `json:"is_visible_to_parent"`
	CreatedAt         string `json:"created_at"`
}

func (h *Handler) PreschoolGetEvidence(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
	args := []interface{}{tenantID}
	extra := ""
	if sid := c.Query("student_id"); sid != "" {
		extra = " AND pe.student_id = " + database.Placeholder(db.Driver(), 2)
		args = append(args, sid)
	}
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT pe.id, pe.student_id, CONCAT(s.first_name,' ',s.last_name),
			       pe.teacher_id, pe.title, COALESCE(pe.description,''),
			       COALESCE(pe.category,''), COALESCE(pe.image_url,''), COALESCE(pe.file_url,''),
			       pe.is_visible_to_parent, DATE_FORMAT(pe.created_at,'%Y-%m-%d')
			FROM preschool_evidence pe
			INNER JOIN students s ON s.id = pe.student_id
			WHERE pe.tenant_id = $1`+extra+`
			ORDER BY pe.created_at DESC`),
		args...)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando evidencias")
	}
	defer rows.Close()
	list := []PreschoolEvidence{}
	for rows.Next() {
		var r PreschoolEvidence
		if err := rows.Scan(&r.ID, &r.StudentID, &r.StudentName, &r.TeacherID, &r.Title, &r.Description, &r.Category, &r.ImageURL, &r.FileURL, &r.IsVisibleToParent, &r.CreatedAt); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, list, "ok")
}

func (h *Handler) PreschoolSaveEvidence(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	userID, _ := c.Locals("user_id").(string)
	db := preschoolDB(h)
	var body struct {
		StudentID         string `json:"student_id"`
		Title             string `json:"title"`
		Description       string `json:"description"`
		Category          string `json:"category"`
		ImageURL          string `json:"image_url"`
		FileURL           string `json:"file_url"`
		IsVisibleToParent bool   `json:"is_visible_to_parent"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Cuerpo inválido")
	}
	if body.StudentID == "" || body.Title == "" {
		return response.Error(c, fiber.StatusBadRequest, "student_id y title requeridos")
	}
	if !body.IsVisibleToParent {
		body.IsVisibleToParent = true
	}
	newID := database.NewID()
	_, err = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(),
			"INSERT INTO preschool_evidence (id,tenant_id,student_id,teacher_id,title,description,category,image_url,file_url,is_visible_to_parent) VALUES ($1,$2,$3,$4,$5,NULLIF($6,''),NULLIF($7,''),NULLIF($8,''),NULLIF($9,''),$10)"),
		newID, tenantID, body.StudentID, userID, body.Title, body.Description, body.Category, body.ImageURL, body.FileURL, body.IsVisibleToParent)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, fmt.Sprintf("Error guardando: %v", err))
	}
	return response.Success(c, fiber.Map{"id": newID}, "Evidencia guardada")
}

func (h *Handler) PreschoolUpdateEvidence(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
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

func (h *Handler) PreschoolDeleteEvidence(c *fiber.Ctx) error {
	tenantID, err := getTenantID(c)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	db := preschoolDB(h)
	_, _ = db.Exec(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), "DELETE FROM preschool_evidence WHERE id=$1 AND tenant_id=$2"),
		c.Params("id"), tenantID)
	return response.SuccessMessage(c, "Eliminado")
}
