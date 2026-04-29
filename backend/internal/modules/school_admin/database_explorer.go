package school_admin

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
)

var tenantDBSafeIdent = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

type tenantDBTableConfig struct {
	Key         string
	Label       string
	Description string
	Direct      bool
	Protected   bool
	ReadOnly    bool
}

var tenantDatabaseTables = map[string]tenantDBTableConfig{
	"users":                    {Key: "users", Label: "Usuarios", Description: "Padres, docentes y administradores del tenant.", Direct: true},
	"students":                 {Key: "students", Label: "Alumnos", Description: "Expedientes de alumnos con padres e historial.", Direct: true},
	"parent_student":           {Key: "parent_student", Label: "Padres por alumno", Description: "Relaciones padre/tutor-alumno.", ReadOnly: true},
	"school_years":             {Key: "school_years", Label: "Ciclos escolares", Description: "Ciclos actuales y anteriores.", Direct: true},
	"grade_levels":             {Key: "grade_levels", Label: "Grados", Description: "Niveles y grados academicos.", Direct: true},
	"groups":                   {Key: "groups", Label: "Grupos", Description: "Grupos por ciclo escolar.", Direct: true},
	"group_students":           {Key: "group_students", Label: "Alumnos por grupo", Description: "Asignaciones de alumnos a grupos.", ReadOnly: true},
	"group_teachers":           {Key: "group_teachers", Label: "Profesores por grupo", Description: "Asignaciones de profesores y materias.", ReadOnly: true},
	"subjects":                 {Key: "subjects", Label: "Materias", Description: "Catalogo de materias.", Direct: true},
	"class_schedule_blocks":    {Key: "class_schedule_blocks", Label: "Horarios", Description: "Bloques de horario por grupo.", Direct: true},
	"attendance_records":       {Key: "attendance_records", Label: "Asistencias", Description: "Registros de asistencia.", Direct: true},
	"grade_records":            {Key: "grade_records", Label: "Calificaciones", Description: "Registros de evaluacion.", Direct: true},
	"student_academic_history": {Key: "student_academic_history", Label: "Historial academico", Description: "Historial por ciclo escolar.", Direct: true},
	"import_batches":           {Key: "import_batches", Label: "Importaciones", Description: "Bitacora de cargas masivas.", Direct: true, ReadOnly: true},
	"tenant_custom_fields":     {Key: "tenant_custom_fields", Label: "Campos personalizados", Description: "Columnas virtuales del tenant.", Direct: true},
	"tenant_custom_tables":     {Key: "tenant_custom_tables", Label: "Tablas personalizadas", Description: "Definiciones virtuales tenant-scoped.", Direct: true},
	"tenant_custom_rows":       {Key: "tenant_custom_rows", Label: "Filas personalizadas", Description: "Datos JSONB de tablas virtuales.", Direct: true},
}

var tenantDBBlockedColumns = map[string]bool{
	"id": true, "tenant_id": true, "created_at": true, "updated_at": true,
	"password_hash": true, "invitation_token": true, "invitation_expires": true,
	"invitation_expires_at": true, "email_verified_at": true, "last_login_at": true,
}

type tenantDatabaseRowRequest struct {
	Values map[string]interface{} `json:"values"`
}

type tenantCustomFieldRequest struct {
	TableName string        `json:"table_name"`
	FieldKey  string        `json:"field_key"`
	Label     string        `json:"label"`
	FieldType string        `json:"field_type"`
	Required  bool          `json:"required"`
	Options   []interface{} `json:"options"`
}

type tenantCustomTableRequest struct {
	TableKey    string                   `json:"table_key"`
	Name        string                   `json:"name"`
	Description string                   `json:"description"`
	Schema      []map[string]interface{} `json:"schema"`
}

func (h *Handler) registerDatabaseExplorerRoutes(api fiber.Router) {
	db := api.Group("/database")
	db.Get("/tables", h.ListTenantDatabaseTables)
	db.Get("/tables/:table/schema", h.GetTenantDatabaseTableSchema)
	db.Get("/tables/:table/rows", h.ListTenantDatabaseTableRows)
	db.Post("/tables/:table/rows", h.InsertTenantDatabaseTableRow)
	db.Put("/tables/:table/rows/:id", h.UpdateTenantDatabaseTableRow)
	db.Delete("/tables/:table/rows/:id", h.DeleteTenantDatabaseTableRow)
	db.Post("/custom-fields", h.CreateTenantCustomField)
	db.Post("/custom-tables", h.CreateTenantCustomTable)
	db.Get("/export/table/:table", h.ExportTenantDatabaseTable)
	db.Get("/export/all", h.ExportTenantDatabaseAll)
	db.Post("/import/validate", h.ValidateTenantDatabaseImport)
	db.Post("/import/commit", h.CommitTenantDatabaseImport)
}

func (h *Handler) ListTenantDatabaseTables(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	tables := make([]fiber.Map, 0, len(tenantDatabaseTables))
	keys := make([]string, 0, len(tenantDatabaseTables))
	for key := range tenantDatabaseTables {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	for _, key := range keys {
		cfg := tenantDatabaseTables[key]
		count := h.tenantTableCount(c, tenantID, cfg)
		tables = append(tables, fiber.Map{
			"name":           cfg.Key,
			"label":          cfg.Label,
			"description":    cfg.Description,
			"estimated_rows": count,
			"tenant_scoped":  true,
			"is_protected":   cfg.Protected,
			"is_read_only":   cfg.ReadOnly,
			"is_custom":      strings.HasPrefix(cfg.Key, "tenant_custom"),
		})
	}

	return response.Success(c, fiber.Map{"tables": tables}, "Tablas del tenant")
}

func (h *Handler) GetTenantDatabaseTableSchema(c *fiber.Ctx) error {
	table, cfg, ok := tenantTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla no permitida")
	}

	columns, err := h.tenantDatabaseColumns(c, table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo leer schema")
	}
	customFields, err := h.tenantCustomFields(c, c.Locals("tenant_id").(string), table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron leer campos personalizados")
	}
	relationships, err := h.tenantDatabaseRelationships(c, table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron leer relaciones")
	}

	return response.Success(c, fiber.Map{
		"table":         table,
		"label":         cfg.Label,
		"columns":       columns,
		"custom_fields": customFields,
		"relationships": relationships,
		"tenant_scoped": true,
		"is_read_only":  cfg.ReadOnly,
	}, "Schema del tenant")
}

func (h *Handler) ListTenantDatabaseTableRows(c *fiber.Ctx) error {
	_, cfg, ok := tenantTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla no permitida")
	}
	tenantID := c.Locals("tenant_id").(string)
	page := c.QueryInt("page", 1)
	perPage := c.QueryInt("per_page", 50)
	search := strings.TrimSpace(c.Query("search"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 200 {
		perPage = 50
	}

	rows, total, err := h.tenantDatabaseRows(c, tenantID, cfg, page, perPage, search)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron leer filas")
	}

	return response.Success(c, fiber.Map{
		"rows":     rows,
		"page":     page,
		"per_page": perPage,
		"total":    total,
	}, "Filas del tenant")
}

func (h *Handler) InsertTenantDatabaseTableRow(c *fiber.Ctx) error {
	table, cfg, ok := tenantTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla no permitida")
	}
	if cfg.ReadOnly || !cfg.Direct {
		return response.Error(c, fiber.StatusForbidden, "Tabla de solo lectura")
	}

	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	var req tenantDatabaseRowRequest
	if err := c.BodyParser(&req); err != nil || len(req.Values) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "Valores invalidos")
	}

	if table == "tenant_custom_rows" {
		return h.insertTenantCustomRow(c, tenantID, userID, req.Values)
	}
	if table == "users" {
		if _, ok := req.Values["role"]; !ok {
			req.Values["role"] = "PARENT"
		}
		if _, ok := req.Values["password_hash"]; !ok {
			req.Values["password_hash"] = ""
		}
		if _, ok := req.Values["first_name"]; !ok {
			req.Values["first_name"] = "Usuario"
		}
		if _, ok := req.Values["last_name"]; !ok {
			req.Values["last_name"] = "Tenant"
		}
		if strings.EqualFold(fmt.Sprint(req.Values["role"]), "SUPER_ADMIN") {
			return response.Error(c, fiber.StatusForbidden, "No se pueden crear SuperAdmins desde el tenant")
		}
	}

	values, columns, placeholders := tenantWritableValues(table, req.Values, true)
	columns = append([]string{tenantQuoteIdent("tenant_id")}, columns...)
	placeholders = append([]string{"$1"}, shiftPlaceholders(placeholders, 1)...)
	values = append([]interface{}{tenantID}, values...)
	if len(columns) <= 1 {
		return response.Error(c, fiber.StatusBadRequest, "No hay columnas editables")
	}

	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING id", tenantQuoteIdent(table), strings.Join(columns, ","), strings.Join(placeholders, ","))
	var id string
	if err := h.service.repo.db.QueryRow(c.UserContext(), query, values...).Scan(&id); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No se pudo crear fila")
	}
	h.auditTenantDatabase(c, tenantID, userID, "tenant_database.row.insert", table, id, fiber.Map{"columns": len(columns) - 1})
	return response.Success(c, fiber.Map{"id": id}, "Fila creada")
}

func (h *Handler) UpdateTenantDatabaseTableRow(c *fiber.Ctx) error {
	table, cfg, ok := tenantTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla no permitida")
	}
	if cfg.ReadOnly || !cfg.Direct {
		return response.Error(c, fiber.StatusForbidden, "Tabla de solo lectura")
	}
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return response.Error(c, fiber.StatusBadRequest, "ID invalido")
	}

	var req tenantDatabaseRowRequest
	if err := c.BodyParser(&req); err != nil || len(req.Values) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "Valores invalidos")
	}
	if table == "tenant_custom_rows" {
		return h.updateTenantCustomRow(c, tenantID, userID, id, req.Values)
	}

	values, sets := tenantUpdateValues(table, req.Values)
	if len(sets) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "No hay columnas editables")
	}
	values = append(values, tenantID, id)
	query := fmt.Sprintf("UPDATE %s SET %s WHERE tenant_id = $%d AND id = $%d", tenantQuoteIdent(table), strings.Join(sets, ","), len(values)-1, len(values))
	tag, err := h.service.repo.db.Exec(c.UserContext(), query, values...)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No se pudo actualizar fila")
	}
	if tag.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "Fila no encontrada")
	}
	h.auditTenantDatabase(c, tenantID, userID, "tenant_database.row.update", table, id, fiber.Map{"columns": len(sets)})
	return response.Success(c, fiber.Map{"id": id}, "Fila actualizada")
}

func (h *Handler) DeleteTenantDatabaseTableRow(c *fiber.Ctx) error {
	table, cfg, ok := tenantTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla no permitida")
	}
	if cfg.ReadOnly || !cfg.Direct {
		return response.Error(c, fiber.StatusForbidden, "Tabla de solo lectura")
	}
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	id := strings.TrimSpace(c.Params("id"))

	if table == "tenant_custom_rows" {
		tag, err := h.service.repo.db.Exec(c.UserContext(), `UPDATE tenant_custom_rows SET deleted_at = NOW(), updated_by = $1 WHERE tenant_id = $2 AND id = $3`, userID, tenantID, id)
		if err != nil || tag.RowsAffected() == 0 {
			return response.Error(c, fiber.StatusNotFound, "Fila no encontrada")
		}
		h.auditTenantDatabase(c, tenantID, userID, "tenant_database.row.soft_delete", table, id, fiber.Map{})
		return response.Success(c, fiber.Map{"id": id}, "Soft delete aplicado")
	}

	columns, err := h.tenantDatabaseColumns(c, table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo leer columnas")
	}
	hasDeletedAt := false
	hasIsActive := false
	hasStatus := false
	for _, column := range columns {
		name := fmt.Sprint(column["name"])
		hasDeletedAt = hasDeletedAt || name == "deleted_at"
		hasIsActive = hasIsActive || name == "is_active"
		hasStatus = hasStatus || name == "status"
	}

	var query string
	if hasDeletedAt {
		query = fmt.Sprintf("UPDATE %s SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2", tenantQuoteIdent(table))
	} else if hasIsActive {
		query = fmt.Sprintf("UPDATE %s SET is_active = false WHERE tenant_id = $1 AND id = $2", tenantQuoteIdent(table))
	} else if hasStatus {
		query = fmt.Sprintf("UPDATE %s SET status = 'inactive' WHERE tenant_id = $1 AND id = $2", tenantQuoteIdent(table))
	} else {
		return response.Error(c, fiber.StatusConflict, "La tabla no soporta soft delete seguro")
	}
	tag, err := h.service.repo.db.Exec(c.UserContext(), query, tenantID, id)
	if err != nil || tag.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "Fila no encontrada")
	}
	h.auditTenantDatabase(c, tenantID, userID, "tenant_database.row.soft_delete", table, id, fiber.Map{})
	return response.Success(c, fiber.Map{"id": id}, "Soft delete aplicado")
}

func (h *Handler) CreateTenantCustomField(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	var req tenantCustomFieldRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Solicitud invalida")
	}
	table, _, ok := tenantTableName(req.TableName)
	if !ok || strings.HasPrefix(table, "tenant_custom") {
		return response.Error(c, fiber.StatusBadRequest, "Tabla no permitida para campo personalizado")
	}
	fieldKey := strings.TrimSpace(req.FieldKey)
	if !tenantDBSafeIdent.MatchString(fieldKey) || tenantDBBlockedColumns[fieldKey] {
		return response.Error(c, fiber.StatusBadRequest, "Clave de campo invalida")
	}
	fieldType := req.FieldType
	if fieldType == "" {
		fieldType = "text"
	}
	optionsJSON := "[]"
	if req.Options != nil {
		optionsJSON = mustJSON(req.Options)
	}
	var id string
	err := h.service.repo.db.QueryRow(c.UserContext(), `
		INSERT INTO tenant_custom_fields (tenant_id, table_name, field_key, label, field_type, required, options, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
		ON CONFLICT (tenant_id, table_name, field_key)
		DO UPDATE SET label = EXCLUDED.label, field_type = EXCLUDED.field_type, required = EXCLUDED.required,
		              options = EXCLUDED.options, updated_at = NOW()
		RETURNING id
	`, tenantID, table, fieldKey, req.Label, fieldType, req.Required, optionsJSON, userID).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No se pudo crear campo personalizado")
	}
	h.auditTenantDatabase(c, tenantID, userID, "tenant_database.custom_field.upsert", table, id, fiber.Map{"field_key": fieldKey})
	return response.Success(c, fiber.Map{"id": id}, "Campo personalizado guardado")
}

func (h *Handler) CreateTenantCustomTable(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	userID := c.Locals("user_id").(string)
	var req tenantCustomTableRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "Solicitud invalida")
	}
	if !tenantDBSafeIdent.MatchString(req.TableKey) {
		return response.Error(c, fiber.StatusBadRequest, "Clave de tabla invalida")
	}
	schemaJSON := mustJSON(req.Schema)
	var id string
	err := h.service.repo.db.QueryRow(c.UserContext(), `
		INSERT INTO tenant_custom_tables (tenant_id, table_key, name, description, schema, created_by)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6)
		ON CONFLICT (tenant_id, table_key)
		DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, schema = EXCLUDED.schema, updated_at = NOW()
		RETURNING id
	`, tenantID, req.TableKey, req.Name, req.Description, schemaJSON, userID).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No se pudo crear tabla personalizada")
	}
	h.auditTenantDatabase(c, tenantID, userID, "tenant_database.custom_table.upsert", "tenant_custom_tables", id, fiber.Map{"table_key": req.TableKey})
	return response.Success(c, fiber.Map{"id": id}, "Tabla personalizada guardada")
}

func (h *Handler) ExportTenantDatabaseTable(c *fiber.Ctx) error {
	table, cfg, ok := tenantTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla no permitida")
	}
	tenantID := c.Locals("tenant_id").(string)
	rows, _, err := h.tenantDatabaseRows(c, tenantID, cfg, 1, 5000, "")
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo exportar tabla")
	}
	h.auditTenantDatabase(c, tenantID, c.Locals("user_id").(string), "tenant_database.export.table", table, "", fiber.Map{"rows": len(rows)})
	return response.Success(c, fiber.Map{"generated_at": time.Now().UTC(), "tables": fiber.Map{table: rows}, "format": "json-workbook-source"}, "Export de tabla listo")
}

func (h *Handler) ExportTenantDatabaseAll(c *fiber.Ctx) error {
	tenantID := c.Locals("tenant_id").(string)
	payload := fiber.Map{}
	for _, cfg := range tenantDatabaseTables {
		rows, _, err := h.tenantDatabaseRows(c, tenantID, cfg, 1, 5000, "")
		if err == nil {
			payload[cfg.Key] = rows
		}
	}
	h.auditTenantDatabase(c, tenantID, c.Locals("user_id").(string), "tenant_database.export.all", "tenant_database", "", fiber.Map{"tables": len(payload)})
	return response.Success(c, fiber.Map{"generated_at": time.Now().UTC(), "tables": payload, "format": "json-workbook-source"}, "Export completo listo")
}

func (h *Handler) ValidateTenantDatabaseImport(c *fiber.Ctx) error {
	return response.Success(c, fiber.Map{
		"valid":          true,
		"tenant_scoped":  true,
		"required_steps": []string{"map_columns", "preview", "validate", "commit"},
		"warnings": []string{
			"Los datos se importaran solo al tenant actual.",
			"Para alumnos se exige nombre, apellido paterno, apellido materno y fecha por dia/mes/ano.",
		},
	}, "Import tenant validado")
}

func (h *Handler) CommitTenantDatabaseImport(c *fiber.Ctx) error {
	return h.CommitStudentImport(c)
}

func (h *Handler) tenantTableCount(c *fiber.Ctx, tenantID string, cfg tenantDBTableConfig) int {
	if cfg.Key == "tenant_custom_rows" {
		var count int
		_ = h.service.repo.db.QueryRow(c.UserContext(), `SELECT COUNT(*) FROM tenant_custom_rows WHERE tenant_id = $1 AND deleted_at IS NULL`, tenantID).Scan(&count)
		return count
	}
	if cfg.Direct {
		var count int
		_ = h.service.repo.db.QueryRow(c.UserContext(), fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE tenant_id = $1", tenantQuoteIdent(cfg.Key)), tenantID).Scan(&count)
		return count
	}
	var count int
	switch cfg.Key {
	case "parent_student":
		_ = h.service.repo.db.QueryRow(c.UserContext(), `SELECT COUNT(*) FROM parent_student ps INNER JOIN students s ON s.id = ps.student_id WHERE s.tenant_id = $1`, tenantID).Scan(&count)
	case "group_students":
		_ = h.service.repo.db.QueryRow(c.UserContext(), `SELECT COUNT(*) FROM group_students gs INNER JOIN groups g ON g.id = gs.group_id WHERE g.tenant_id = $1`, tenantID).Scan(&count)
	case "group_teachers":
		_ = h.service.repo.db.QueryRow(c.UserContext(), `SELECT COUNT(*) FROM group_teachers gt INNER JOIN groups g ON g.id = gt.group_id WHERE g.tenant_id = $1`, tenantID).Scan(&count)
	}
	return count
}

func (h *Handler) tenantDatabaseRows(c *fiber.Ctx, tenantID string, cfg tenantDBTableConfig, page, perPage int, search string) ([]fiber.Map, int, error) {
	offset := (page - 1) * perPage
	if cfg.Key == "tenant_custom_rows" {
		return h.customTableRows(c, tenantID, perPage, offset, search)
	}
	if cfg.Direct {
		where := "t.tenant_id = $1"
		args := []interface{}{tenantID}
		if search != "" {
			where += " AND row_to_json(t)::text ILIKE $2"
			args = append(args, "%"+search+"%")
		}
		var total int
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s t WHERE %s", tenantQuoteIdent(cfg.Key), where)
		if err := h.service.repo.db.QueryRow(c.UserContext(), countQuery, args...).Scan(&total); err != nil {
			return nil, 0, err
		}
		orderColumn := "t.id"
		if columns, err := h.tenantDatabaseColumns(c, cfg.Key); err == nil {
			for _, column := range columns {
				name := fmt.Sprint(column["name"])
				if name == "updated_at" {
					orderColumn = "t." + tenantQuoteIdent(name) + " DESC NULLS LAST"
					break
				}
				if name == "created_at" {
					orderColumn = "t." + tenantQuoteIdent(name) + " DESC NULLS LAST"
				}
			}
		}
		args = append(args, perPage, offset)
		query := fmt.Sprintf("SELECT t.* FROM %s t WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d", tenantQuoteIdent(cfg.Key), where, orderColumn, len(args)-1, len(args))
		rows, err := h.service.repo.db.Query(c.UserContext(), query, args...)
		if err != nil {
			return nil, 0, err
		}
		defer rows.Close()
		data, err := tenantRowsToMaps(rows)
		return data, total, err
	}
	return h.bridgeRows(c, tenantID, cfg.Key, perPage, offset, search)
}

func (h *Handler) bridgeRows(c *fiber.Ctx, tenantID, table string, perPage, offset int, search string) ([]fiber.Map, int, error) {
	var query, countQuery string
	args := []interface{}{tenantID}
	searchClause := ""
	if search != "" {
		searchClause = " AND row_to_json(src)::text ILIKE $2"
		args = append(args, "%"+search+"%")
	}
	switch table {
	case "parent_student":
		countQuery = `SELECT COUNT(*) FROM parent_student ps INNER JOIN students s ON s.id = ps.student_id WHERE s.tenant_id = $1`
		query = `SELECT * FROM (
			SELECT (ps.parent_id::text || ':' || ps.student_id::text) AS id, ps.parent_id, ps.student_id,
			       ps.relationship, ps.is_primary, COALESCE(ps.phone, '') AS phone, COALESCE(ps.notes, '') AS notes,
			       TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS parent_name,
			       TRIM(CONCAT(s.first_name, ' ', s.last_name)) AS student_name,
			       ps.created_at, ps.updated_at
			FROM parent_student ps
			INNER JOIN students s ON s.id = ps.student_id
			INNER JOIN users u ON u.id = ps.parent_id
			WHERE s.tenant_id = $1
		) src WHERE true` + searchClause + ` ORDER BY updated_at DESC LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2)
	case "group_students":
		countQuery = `SELECT COUNT(*) FROM group_students gs INNER JOIN groups g ON g.id = gs.group_id WHERE g.tenant_id = $1`
		query = `SELECT * FROM (
			SELECT (gs.group_id::text || ':' || gs.student_id::text) AS id, gs.group_id, gs.student_id, gs.enrolled_at,
			       g.name AS group_name, TRIM(CONCAT(s.first_name, ' ', s.last_name)) AS student_name
			FROM group_students gs
			INNER JOIN groups g ON g.id = gs.group_id
			INNER JOIN students s ON s.id = gs.student_id
			WHERE g.tenant_id = $1
		) src WHERE true` + searchClause + ` ORDER BY enrolled_at DESC LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2)
	case "group_teachers":
		countQuery = `SELECT COUNT(*) FROM group_teachers gt INNER JOIN groups g ON g.id = gt.group_id WHERE g.tenant_id = $1`
		query = `SELECT * FROM (
			SELECT gt.id, gt.group_id, gt.teacher_id, COALESCE(gt.subject_id::text, '') AS subject_id,
			       g.name AS group_name, TRIM(CONCAT(u.first_name, ' ', u.last_name)) AS teacher_name,
			       COALESCE(s.name, '') AS subject_name
			FROM group_teachers gt
			INNER JOIN groups g ON g.id = gt.group_id
			INNER JOIN users u ON u.id = gt.teacher_id
			LEFT JOIN subjects s ON s.id = gt.subject_id
			WHERE g.tenant_id = $1
		) src WHERE true` + searchClause + ` ORDER BY group_name, teacher_name LIMIT $` + strconv.Itoa(len(args)+1) + ` OFFSET $` + strconv.Itoa(len(args)+2)
	default:
		return []fiber.Map{}, 0, nil
	}
	var total int
	if err := h.service.repo.db.QueryRow(c.UserContext(), countQuery, tenantID).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, perPage, offset)
	rows, err := h.service.repo.db.Query(c.UserContext(), query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	data, err := tenantRowsToMaps(rows)
	return data, total, err
}

func (h *Handler) customTableRows(c *fiber.Ctx, tenantID string, perPage, offset int, search string) ([]fiber.Map, int, error) {
	where := "r.tenant_id = $1 AND r.deleted_at IS NULL"
	args := []interface{}{tenantID}
	if search != "" {
		where += " AND r.data::text ILIKE $2"
		args = append(args, "%"+search+"%")
	}
	var total int
	if err := h.service.repo.db.QueryRow(c.UserContext(), "SELECT COUNT(*) FROM tenant_custom_rows r WHERE "+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, perPage, offset)
	rows, err := h.service.repo.db.Query(c.UserContext(), `
		SELECT r.id, t.table_key, t.name AS custom_table, r.data, r.created_at, r.updated_at
		FROM tenant_custom_rows r
		INNER JOIN tenant_custom_tables t ON t.id = r.custom_table_id
		WHERE `+where+` ORDER BY r.updated_at DESC LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	data, err := tenantRowsToMaps(rows)
	return data, total, err
}

func (h *Handler) insertTenantCustomRow(c *fiber.Ctx, tenantID, userID string, values map[string]interface{}) error {
	customTableID := fmt.Sprint(values["custom_table_id"])
	if customTableID == "" || customTableID == "<nil>" {
		return response.Error(c, fiber.StatusBadRequest, "custom_table_id requerido")
	}
	data := values["data"]
	if data == nil {
		data = values
	}
	var id string
	err := h.service.repo.db.QueryRow(c.UserContext(), `
		INSERT INTO tenant_custom_rows (tenant_id, custom_table_id, data, created_by, updated_by)
		SELECT $1, id, $2::jsonb, $3, $3
		FROM tenant_custom_tables
		WHERE tenant_id = $1 AND id = $4 AND tenant_scoped = true AND is_active = true
		RETURNING id
	`, tenantID, mustJSON(data), userID, customTableID).Scan(&id)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No se pudo crear fila personalizada")
	}
	h.auditTenantDatabase(c, tenantID, userID, "tenant_database.custom_row.insert", "tenant_custom_rows", id, fiber.Map{})
	return response.Success(c, fiber.Map{"id": id}, "Fila personalizada creada")
}

func (h *Handler) updateTenantCustomRow(c *fiber.Ctx, tenantID, userID, id string, values map[string]interface{}) error {
	data := values["data"]
	if data == nil {
		data = values
	}
	tag, err := h.service.repo.db.Exec(c.UserContext(), `
		UPDATE tenant_custom_rows
		SET data = $1::jsonb, updated_by = $2, updated_at = NOW()
		WHERE tenant_id = $3 AND id = $4 AND deleted_at IS NULL
	`, mustJSON(data), userID, tenantID, id)
	if err != nil || tag.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "Fila personalizada no encontrada")
	}
	h.auditTenantDatabase(c, tenantID, userID, "tenant_database.custom_row.update", "tenant_custom_rows", id, fiber.Map{})
	return response.Success(c, fiber.Map{"id": id}, "Fila personalizada actualizada")
}

func (h *Handler) tenantDatabaseColumns(c *fiber.Ctx, table string) ([]fiber.Map, error) {
	rows, err := h.service.repo.db.Query(c.UserContext(), `
		SELECT c.column_name, c.data_type, COALESCE(c.udt_name, ''), c.is_nullable,
		       COALESCE(c.column_default, ''),
		       COALESCE(pk.is_primary, false)
		FROM information_schema.columns c
		LEFT JOIN (
			SELECT kcu.column_name, true AS is_primary
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage kcu
			  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
			WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
		) pk ON pk.column_name = c.column_name
		WHERE c.table_schema = 'public' AND c.table_name = $1
		ORDER BY c.ordinal_position`, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	columns := []fiber.Map{}
	for rows.Next() {
		var name, dataType, udtName, nullable, defaultValue string
		var isPrimary bool
		if err := rows.Scan(&name, &dataType, &udtName, &nullable, &defaultValue, &isPrimary); err != nil {
			return nil, err
		}
		columns = append(columns, fiber.Map{
			"name":         name,
			"type":         dataType,
			"udt_name":     udtName,
			"nullable":     nullable == "YES",
			"default":      defaultValue,
			"is_primary":   isPrimary,
			"is_protected": tenantDBBlockedColumns[name],
		})
	}
	return columns, nil
}

func (h *Handler) tenantCustomFields(c *fiber.Ctx, tenantID, table string) ([]fiber.Map, error) {
	rows, err := h.service.repo.db.Query(c.UserContext(), `
		SELECT id, field_key, label, field_type, required, options, created_at
		FROM tenant_custom_fields
		WHERE tenant_id = $1 AND table_name = $2
		ORDER BY created_at`, tenantID, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	fields := []fiber.Map{}
	for rows.Next() {
		var id, key, label, fieldType string
		var required bool
		var options interface{}
		var createdAt time.Time
		if err := rows.Scan(&id, &key, &label, &fieldType, &required, &options, &createdAt); err != nil {
			return nil, err
		}
		fields = append(fields, fiber.Map{"id": id, "name": key, "label": label, "type": fieldType, "required": required, "options": options, "is_virtual": true, "created_at": createdAt})
	}
	return fields, nil
}

func (h *Handler) tenantDatabaseRelationships(c *fiber.Ctx, table string) ([]fiber.Map, error) {
	rows, err := h.service.repo.db.Query(c.UserContext(), `
		SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
		  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage ccu
		  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = $1
		ORDER BY kcu.column_name`, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []fiber.Map{}
	for rows.Next() {
		var column, foreignTable, foreignColumn string
		if err := rows.Scan(&column, &foreignTable, &foreignColumn); err != nil {
			return nil, err
		}
		items = append(items, fiber.Map{"column": column, "foreign_table": foreignTable, "foreign_column": foreignColumn})
	}
	return items, nil
}

func (h *Handler) auditTenantDatabase(c *fiber.Ctx, tenantID, userID, action, table, rowID string, details fiber.Map) {
	_, _ = h.service.repo.db.Exec(c.UserContext(), `
		INSERT INTO tenant_database_operation_logs (tenant_id, user_id, action, table_name, row_id, details, ip_address)
		VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, $6::jsonb, NULLIF($7, '')::inet)
	`, tenantID, userID, action, table, rowID, mustJSON(details), c.IP())
}

func tenantTableParam(c *fiber.Ctx) (string, tenantDBTableConfig, bool) {
	return tenantTableName(c.Params("table"))
}

func tenantTableName(raw string) (string, tenantDBTableConfig, bool) {
	table := strings.TrimSpace(raw)
	if !tenantDBSafeIdent.MatchString(table) {
		return "", tenantDBTableConfig{}, false
	}
	cfg, ok := tenantDatabaseTables[table]
	return table, cfg, ok
}

func tenantWritableValues(table string, values map[string]interface{}, insert bool) ([]interface{}, []string, []string) {
	out := []interface{}{}
	columns := []string{}
	placeholders := []string{}
	for key, value := range values {
		if !tenantDBSafeIdent.MatchString(key) || tenantDBBlockedColumns[key] {
			continue
		}
		if table == "users" && key == "role" && strings.EqualFold(fmt.Sprint(value), "SUPER_ADMIN") {
			continue
		}
		columns = append(columns, tenantQuoteIdent(key))
		out = append(out, value)
		placeholders = append(placeholders, fmt.Sprintf("$%d", len(out)))
	}
	return out, columns, placeholders
}

func tenantUpdateValues(table string, values map[string]interface{}) ([]interface{}, []string) {
	out := []interface{}{}
	sets := []string{}
	for key, value := range values {
		if !tenantDBSafeIdent.MatchString(key) || tenantDBBlockedColumns[key] {
			continue
		}
		if table == "users" && key == "role" && strings.EqualFold(fmt.Sprint(value), "SUPER_ADMIN") {
			continue
		}
		out = append(out, value)
		sets = append(sets, fmt.Sprintf("%s = $%d", tenantQuoteIdent(key), len(out)))
	}
	return out, sets
}

func tenantRowsToMaps(rows pgx.Rows) ([]fiber.Map, error) {
	fields := rows.FieldDescriptions()
	result := []fiber.Map{}
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}
		item := fiber.Map{}
		for i, field := range fields {
			item[string(field.Name)] = tenantNormalizeDatabaseValue(values[i])
		}
		result = append(result, item)
	}
	return result, nil
}

func tenantNormalizeDatabaseValue(value interface{}) interface{} {
	switch typed := value.(type) {
	case []byte:
		return string(typed)
	case time.Time:
		return typed.Format(time.RFC3339)
	default:
		return typed
	}
}

func tenantQuoteIdent(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func shiftPlaceholders(placeholders []string, shift int) []string {
	next := make([]string, 0, len(placeholders))
	for index := range placeholders {
		next = append(next, fmt.Sprintf("$%d", index+1+shift))
	}
	return next
}

func mustJSON(value interface{}) string {
	raw, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(raw)
}
