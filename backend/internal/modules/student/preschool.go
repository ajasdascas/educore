package student

import (
	"educore/internal/pkg/database"
	"educore/internal/pkg/response"
	"github.com/gofiber/fiber/v2"
)

func (h *Handler) GetQualitativeAssessments(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	tenantID, _ := c.Locals("tenant_id").(string)
	if tenantID == "" {
		return response.Error(c, fiber.StatusForbidden, "Student must belong to a school")
	}
	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Student profile not found")
	}
	db := h.svc.repo.db
	period := c.Query("period", "current")
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT id, period, campo_formativo,
			       COALESCE(aprendizaje_esperado,''), nivel, COALESCE(notes,'')
			FROM preschool_qualitative_assessments
			WHERE tenant_id = $1 AND student_id = $2 AND period = $3
			ORDER BY campo_formativo`),
		tenantID, profile.ID, period)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando evaluaciones")
	}
	defer rows.Close()
	type Row struct {
		ID                  string `json:"id"`
		Period              string `json:"period"`
		CampoFormativo      string `json:"campo_formativo"`
		AprendizajeEsperado string `json:"aprendizaje_esperado"`
		Nivel               string `json:"nivel"`
		Notes               string `json:"notes"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.Period, &r.CampoFormativo, &r.AprendizajeEsperado, &r.Nivel, &r.Notes); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, fiber.Map{"assessments": list}, "ok")
}

func (h *Handler) GetDevelopmentAreas(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	tenantID, _ := c.Locals("tenant_id").(string)
	if tenantID == "" {
		return response.Error(c, fiber.StatusForbidden, "Student must belong to a school")
	}
	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Student profile not found")
	}
	db := h.svc.repo.db
	period := c.Query("period", "current")

	campos := []string{
		"Lenguaje y Comunicación",
		"Pensamiento Matemático",
		"Exploración y Conocimiento del Mundo",
		"Desarrollo Personal y Social",
		"Expresión y Apreciación Artística",
		"Desarrollo Físico y Salud",
	}

	type AreaSummary struct {
		CampoFormativo string         `json:"campo_formativo"`
		Assessments    []interface{}  `json:"assessments"`
		Summary        map[string]int `json:"summary"`
	}

	areas := make([]AreaSummary, 0, len(campos))
	for _, campo := range campos {
		summary := map[string]int{"logrado": 0, "en_proceso": 0, "iniciando": 0, "requiere_apoyo": 0}
		var assessments []interface{}

		rows, err2 := db.Query(c.UserContext(),
			database.RebindPlaceholders(db.Driver(), `
				SELECT id, nivel, COALESCE(aprendizaje_esperado,''), COALESCE(notes,'')
				FROM preschool_qualitative_assessments
				WHERE tenant_id = $1 AND period = $2 AND campo_formativo = $3 AND student_id = $4`),
			tenantID, period, campo, profile.ID)
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
		if assessments == nil {
			assessments = []interface{}{}
		}
		areas = append(areas, AreaSummary{
			CampoFormativo: campo,
			Assessments:    assessments,
			Summary:        summary,
		})
	}
	return response.Success(c, fiber.Map{"development_areas": areas}, "ok")
}

func (h *Handler) GetObservations(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	tenantID, _ := c.Locals("tenant_id").(string)
	if tenantID == "" {
		return response.Error(c, fiber.StatusForbidden, "Student must belong to a school")
	}
	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Student profile not found")
	}
	db := h.svc.repo.db
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT id, DATE_FORMAT(observed_at,'%Y-%m-%d'), category, content
			FROM preschool_observations
			WHERE tenant_id = $1 AND student_id = $2 AND is_visible_to_parent = 1
			ORDER BY observed_at DESC`),
		tenantID, profile.ID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando observaciones")
	}
	defer rows.Close()
	type Row struct {
		ID         string `json:"id"`
		ObservedAt string `json:"observed_at"`
		Category   string `json:"category"`
		Content    string `json:"content"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.ObservedAt, &r.Category, &r.Content); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, fiber.Map{"observations": list}, "ok")
}

func (h *Handler) GetEvidence(c *fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	tenantID, _ := c.Locals("tenant_id").(string)
	if tenantID == "" {
		return response.Error(c, fiber.StatusForbidden, "Student must belong to a school")
	}
	profile, err := h.svc.repo.GetProfileByUserID(c.UserContext(), userID, tenantID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "Student profile not found")
	}
	db := h.svc.repo.db
	rows, err := db.Query(c.UserContext(),
		database.RebindPlaceholders(db.Driver(), `
			SELECT id, title, COALESCE(description,''), COALESCE(category,''),
			       COALESCE(image_url,''), DATE_FORMAT(created_at,'%Y-%m-%d')
			FROM preschool_evidence
			WHERE tenant_id = $1 AND student_id = $2 AND is_visible_to_parent = 1
			ORDER BY created_at DESC`),
		tenantID, profile.ID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "Error consultando evidencias")
	}
	defer rows.Close()
	type Row struct {
		ID          string `json:"id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Category    string `json:"category"`
		ImageURL    string `json:"image_url"`
		CreatedAt   string `json:"created_at"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.Title, &r.Description, &r.Category, &r.ImageURL, &r.CreatedAt); err != nil {
			continue
		}
		list = append(list, r)
	}
	return response.Success(c, fiber.Map{"evidence": list}, "ok")
}
