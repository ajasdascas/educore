package superadmin

import (
	"educore/internal/pkg/response"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"educore/internal/pkg/database"
	"github.com/gofiber/fiber/v2"
)

var safeSQLIdent = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

var protectedDatabaseTables = map[string]bool{
	"audit_logs":                    true,
	"schema_migrations":             true,
	"database_admin_table_states":   true,
	"database_admin_operation_logs": true,
	"impersonation_sessions":        true,
	"sessions":                      true,
	"user_sessions":                 true,
	"password_reset_tokens":         true,
	"refresh_tokens":                true,
}

type databaseRowRequest struct {
	Values map[string]interface{} `json:"values"`
}

type databaseTableRequest struct {
	Name    string                 `json:"name"`
	Columns []databaseColumnChange `json:"columns"`
}

type databaseStructureRequest struct {
	Operations []databaseColumnChange `json:"operations"`
}

type databaseColumnChange struct {
	Action   string `json:"action"`
	Name     string `json:"name"`
	NewName  string `json:"new_name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
	Default  string `json:"default"`
}

func (h *Handler) RegisterDatabaseAdminRoutes(router fiber.Router) {
	router.Get("/database/tables", h.ListDatabaseTables)
	router.Get("/database/tables/:table/schema", h.GetDatabaseTableSchema)
	router.Get("/database/tables/:table/rows", h.ListDatabaseTableRows)
	router.Post("/database/tables/:table/rows", h.InsertDatabaseTableRow)
	router.Put("/database/tables/:table/rows/:id", h.UpdateDatabaseTableRow)
	router.Delete("/database/tables/:table/rows/:id", h.SoftDeleteDatabaseTableRow)
	router.Post("/database/tables", h.CreateDatabaseTable)
	router.Put("/database/tables/:table/structure", h.UpdateDatabaseTableStructure)
	router.Patch("/database/tables/:table/soft-delete", h.SoftDeleteDatabaseTable)
	router.Get("/database/export/full", h.ExportDatabaseSnapshot)
	router.Get("/database/export/tables/:tables", h.ExportDatabaseTables)
	router.Post("/database/import/validate", h.ValidateDatabaseImport)
}

func (h *Handler) ListDatabaseTables(c *fiber.Ctx) error {
	query := `
		SELECT
			t.table_name,
			COALESCE(obj_description((quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass), '') AS description,
			COALESCE(s.n_live_tup, 0) AS estimated_rows,
			COALESCE(st.is_hidden, false) AS is_hidden,
			COALESCE(st.deleted_at::text, '') AS deleted_at
		FROM information_schema.tables t
		LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
		LEFT JOIN database_admin_table_states st ON st.table_name = t.table_name
		WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
		ORDER BY t.table_name`
	if database.IsMySQL(h.db.Driver()) {
		query = `
			SELECT
				t.table_name,
				'' AS description,
				COALESCE(t.table_rows, 0) AS estimated_rows,
				COALESCE(st.is_hidden, false) AS is_hidden,
				COALESCE(CAST(st.deleted_at AS CHAR), '') AS deleted_at
			FROM information_schema.tables t
			LEFT JOIN database_admin_table_states st ON st.table_name = t.table_name
			WHERE t.table_schema = DATABASE() AND t.table_type = 'BASE TABLE'
			ORDER BY t.table_name`
	}
	rows, err := h.db.Query(c.UserContext(), query)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, superAdminInternalErrorMessage("No se pudieron listar las tablas", err))
	}
	defer rows.Close()

	tables := make([]fiber.Map, 0)
	for rows.Next() {
		var name, description, deletedAt string
		var estimatedRows int64
		var isHiddenValue interface{}
		if err := rows.Scan(&name, &description, &estimatedRows, &isHiddenValue, &deletedAt); err != nil {
			return response.Error(c, fiber.StatusInternalServerError, superAdminInternalErrorMessage("No se pudo leer una tabla", err))
		}
		isHidden := databaseAdminBool(isHiddenValue)
		tables = append(tables, fiber.Map{
			"name":           name,
			"description":    description,
			"estimated_rows": estimatedRows,
			"is_hidden":      isHidden,
			"is_protected":   protectedDatabaseTables[name],
			"deleted_at":     deletedAt,
		})
	}

	return response.Success(c, fiber.Map{"tables": tables}, "Tablas disponibles")
}

func databaseAdminBool(value interface{}) bool {
	switch typed := value.(type) {
	case bool:
		return typed
	case int:
		return typed != 0
	case int64:
		return typed != 0
	case uint64:
		return typed != 0
	case []byte:
		return databaseAdminBool(string(typed))
	case string:
		normalized := strings.TrimSpace(strings.ToLower(typed))
		return normalized == "1" || normalized == "true" || normalized == "t" || normalized == "yes"
	default:
		return false
	}
}

func (h *Handler) GetDatabaseTableSchema(c *fiber.Ctx) error {
	table, ok := safeTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla invalida")
	}
	if exists, err := h.tableExists(c, table); err != nil || !exists {
		return response.Error(c, fiber.StatusNotFound, "Tabla no encontrada")
	}

	columns, err := h.databaseColumns(c, table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo leer el schema")
	}

	constraints, err := h.databaseConstraints(c, table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron leer constraints")
	}

	relationships, err := h.databaseRelationships(c, table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron leer relaciones")
	}

	return response.Success(c, fiber.Map{
		"table":         table,
		"is_protected":  protectedDatabaseTables[table],
		"columns":       columns,
		"constraints":   constraints,
		"relationships": relationships,
	}, "Schema de tabla")
}

func (h *Handler) ListDatabaseTableRows(c *fiber.Ctx) error {
	table, ok := safeTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla invalida")
	}
	if exists, err := h.tableExists(c, table); err != nil || !exists {
		return response.Error(c, fiber.StatusNotFound, "Tabla no encontrada")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "50"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 200 {
		perPage = 50
	}
	offset := (page - 1) * perPage

	columns, err := h.databaseColumns(c, table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo leer columnas")
	}
	orderColumn := "1"
	for _, column := range columns {
		name := fmt.Sprint(column["name"])
		if name == "created_at" {
			orderColumn = quoteIdent(name) + " DESC NULLS LAST"
			break
		}
		if orderColumn == "1" && name == "id" {
			orderColumn = quoteIdent(name)
		}
	}

	var total int
	if err := h.db.QueryRow(c.UserContext(), fmt.Sprintf("SELECT COUNT(*) FROM %s", quoteIdent(table))).Scan(&total); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo contar filas")
	}

	rows, err := h.db.Query(c.UserContext(), fmt.Sprintf("SELECT * FROM %s ORDER BY %s LIMIT $1 OFFSET $2", quoteIdent(table), orderColumn), perPage, offset)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron leer filas")
	}
	defer rows.Close()

	data, err := rowsToMaps(rows)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron serializar filas")
	}

	return response.Success(c, fiber.Map{
		"rows":     data,
		"page":     page,
		"per_page": perPage,
		"total":    total,
	}, "Filas de tabla")
}

func (h *Handler) InsertDatabaseTableRow(c *fiber.Ctx) error {
	table, ok := safeTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla invalida")
	}
	if blocked := h.blockProtectedDatabaseWrite(c, table); blocked {
		return nil
	}

	var req databaseRowRequest
	if err := c.BodyParser(&req); err != nil || len(req.Values) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "Valores invalidos")
	}

	values := make([]interface{}, 0, len(req.Values))
	columns := make([]string, 0, len(req.Values))
	placeholders := make([]string, 0, len(req.Values))
	i := 1
	for key, value := range req.Values {
		if !safeSQLIdent.MatchString(key) || key == "id" || key == "created_at" || key == "updated_at" {
			continue
		}
		columns = append(columns, quoteIdent(key))
		placeholders = append(placeholders, fmt.Sprintf("$%d", i))
		values = append(values, value)
		i++
	}
	if len(columns) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "No hay columnas editables")
	}

	query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s) RETURNING id", quoteIdent(table), strings.Join(columns, ","), strings.Join(placeholders, ","))
	var id string
	if err := h.db.QueryRow(c.UserContext(), query, values...).Scan(&id); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No se pudo insertar fila")
	}
	h.auditSuperAdmin(c, "database.row.insert", table, id, "warning", fiber.Map{"table": table, "columns": columns}, "")

	return response.Success(c, fiber.Map{"id": id}, "Fila insertada")
}

func (h *Handler) UpdateDatabaseTableRow(c *fiber.Ctx) error {
	table, ok := safeTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla invalida")
	}
	if blocked := h.blockProtectedDatabaseWrite(c, table); blocked {
		return nil
	}
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return response.Error(c, fiber.StatusBadRequest, "ID invalido")
	}

	var req databaseRowRequest
	if err := c.BodyParser(&req); err != nil || len(req.Values) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "Valores invalidos")
	}

	values := make([]interface{}, 0, len(req.Values)+1)
	sets := make([]string, 0, len(req.Values))
	i := 1
	for key, value := range req.Values {
		if !safeSQLIdent.MatchString(key) || key == "id" || key == "tenant_id" || key == "created_at" || key == "updated_at" {
			continue
		}
		sets = append(sets, fmt.Sprintf("%s = $%d", quoteIdent(key), i))
		values = append(values, value)
		i++
	}
	if len(sets) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "No hay columnas editables")
	}
	values = append(values, id)

	query := fmt.Sprintf("UPDATE %s SET %s WHERE id = $%d", quoteIdent(table), strings.Join(sets, ","), len(values))
	tag, err := h.db.Exec(c.UserContext(), query, values...)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No se pudo actualizar fila")
	}
	if tag.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "Fila no encontrada")
	}
	h.auditSuperAdmin(c, "database.row.update", table, id, "warning", fiber.Map{"table": table, "columns": len(sets)}, "")

	return response.Success(c, fiber.Map{"id": id}, "Fila actualizada")
}

func (h *Handler) SoftDeleteDatabaseTableRow(c *fiber.Ctx) error {
	table, ok := safeTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla invalida")
	}
	if blocked := h.blockProtectedDatabaseWrite(c, table); blocked {
		return nil
	}
	id := strings.TrimSpace(c.Params("id"))
	columns, err := h.databaseColumns(c, table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo leer columnas")
	}
	hasDeletedAt := false
	hasIsActive := false
	for _, column := range columns {
		name := fmt.Sprint(column["name"])
		hasDeletedAt = hasDeletedAt || name == "deleted_at"
		hasIsActive = hasIsActive || name == "is_active"
	}

	var query string
	if hasDeletedAt {
		query = fmt.Sprintf("UPDATE %s SET deleted_at = NOW() WHERE id = $1", quoteIdent(table))
	} else if hasIsActive {
		query = fmt.Sprintf("UPDATE %s SET is_active = false WHERE id = $1", quoteIdent(table))
	} else {
		return response.Error(c, fiber.StatusConflict, "La tabla no soporta soft delete seguro")
	}
	tag, err := h.db.Exec(c.UserContext(), query, id)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No se pudo aplicar soft delete")
	}
	if tag.RowsAffected() == 0 {
		return response.Error(c, fiber.StatusNotFound, "Fila no encontrada")
	}
	h.auditSuperAdmin(c, "database.row.soft_delete", table, id, "warning", fiber.Map{"table": table}, "")

	return response.Success(c, fiber.Map{"id": id}, "Soft delete aplicado")
}

func (h *Handler) CreateDatabaseTable(c *fiber.Ctx) error {
	if !databaseDDLEnabled() {
		return response.Error(c, fiber.StatusForbidden, "DDL deshabilitado. Activa EDUCORE_ENABLE_DB_ADMIN_DDL=true para ejecutar cambios de estructura.")
	}
	var req databaseTableRequest
	if err := c.BodyParser(&req); err != nil || !safeSQLIdent.MatchString(req.Name) || len(req.Columns) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "Definicion de tabla invalida")
	}
	defs := []string{"id UUID PRIMARY KEY DEFAULT gen_random_uuid()"}
	for _, column := range req.Columns {
		def, err := buildColumnDefinition(column)
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, err.Error())
		}
		defs = append(defs, def)
	}
	_, err := h.db.Exec(c.UserContext(), fmt.Sprintf("CREATE TABLE %s (%s)", quoteIdent(req.Name), strings.Join(defs, ",")))
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "No se pudo crear tabla")
	}
	h.auditSuperAdmin(c, "database.table.create", req.Name, "", "critical", fiber.Map{"table": req.Name}, "")
	return response.Success(c, fiber.Map{"table": req.Name}, "Tabla creada")
}

func (h *Handler) UpdateDatabaseTableStructure(c *fiber.Ctx) error {
	table, ok := safeTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla invalida")
	}
	if !databaseDDLEnabled() {
		return response.Error(c, fiber.StatusForbidden, "DDL deshabilitado. Activa EDUCORE_ENABLE_DB_ADMIN_DDL=true para ejecutar cambios de estructura.")
	}
	if protectedDatabaseTables[table] {
		return response.Error(c, fiber.StatusForbidden, "Tabla protegida")
	}

	var req databaseStructureRequest
	if err := c.BodyParser(&req); err != nil || len(req.Operations) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "Operaciones invalidas")
	}
	tx, err := h.db.Begin(c.UserContext())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo iniciar transaccion")
	}
	defer tx.Rollback(c.UserContext())

	for _, operation := range req.Operations {
		statement, err := buildAlterStatement(table, operation)
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, err.Error())
		}
		if _, err := tx.Exec(c.UserContext(), statement); err != nil {
			return response.Error(c, fiber.StatusBadRequest, "No se pudo aplicar cambio de estructura")
		}
	}
	if err := tx.Commit(c.UserContext()); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo confirmar cambio")
	}
	h.auditSuperAdmin(c, "database.table.structure_update", table, "", "critical", fiber.Map{"table": table, "operations": len(req.Operations)}, "")
	return response.Success(c, fiber.Map{"table": table}, "Estructura actualizada")
}

func (h *Handler) SoftDeleteDatabaseTable(c *fiber.Ctx) error {
	table, ok := safeTableParam(c)
	if !ok {
		return response.Error(c, fiber.StatusBadRequest, "Tabla invalida")
	}
	if protectedDatabaseTables[table] {
		return response.Error(c, fiber.StatusForbidden, "Tabla protegida")
	}
	_, err := h.db.Exec(c.UserContext(), `
		INSERT INTO database_admin_table_states (table_name, is_hidden, deleted_at, updated_at)
		VALUES ($1, true, NOW(), NOW())
		ON CONFLICT (table_name)
		DO UPDATE SET is_hidden = true, deleted_at = NOW(), updated_at = NOW()`, table)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudo ocultar tabla")
	}
	h.auditSuperAdmin(c, "database.table.soft_delete", table, "", "critical", fiber.Map{"table": table}, "")
	return response.Success(c, fiber.Map{"table": table}, "Tabla marcada como oculta")
}

func (h *Handler) ExportDatabaseSnapshot(c *fiber.Ctx) error {
	tables, err := h.exportableTables(c)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "No se pudieron listar tablas")
	}
	return h.exportTables(c, tables)
}

func (h *Handler) ExportDatabaseTables(c *fiber.Ctx) error {
	raw := strings.Split(c.Params("tables"), ",")
	tables := make([]string, 0, len(raw))
	for _, item := range raw {
		table := strings.TrimSpace(item)
		if safeSQLIdent.MatchString(table) {
			tables = append(tables, table)
		}
	}
	if len(tables) == 0 {
		return response.Error(c, fiber.StatusBadRequest, "No hay tablas validas")
	}
	return h.exportTables(c, tables)
}

func (h *Handler) ValidateDatabaseImport(c *fiber.Ctx) error {
	return response.Success(c, fiber.Map{
		"valid": true,
		"warnings": []string{
			"Validacion de estructura recibida. La carga final debe ejecutarse por endpoint especifico de modulo.",
			"Para alumnos usa /api/v1/school-admin/academic/imports/students/commit con mapeo revisado.",
		},
		"required_steps": []string{"map_columns", "preview", "validate", "commit_with_audit"},
	}, "Importacion validada en modo seguro")
}

func (h *Handler) exportTables(c *fiber.Ctx, tables []string) error {
	payload := fiber.Map{}
	for _, table := range tables {
		if exists, err := h.tableExists(c, table); err != nil || !exists {
			continue
		}
		rows, err := h.db.Query(c.UserContext(), fmt.Sprintf("SELECT * FROM %s LIMIT 5000", quoteIdent(table)))
		if err != nil {
			continue
		}
		data, err := rowsToMaps(rows)
		rows.Close()
		if err != nil {
			continue
		}
		payload[table] = data
	}
	h.auditSuperAdmin(c, "database.export", "database", "", "warning", fiber.Map{"tables": tables}, "")
	return response.Success(c, fiber.Map{
		"generated_at": time.Now().UTC(),
		"tables":       payload,
		"format":       "json-workbook-source",
	}, "Snapshot listo para exportacion Excel")
}

func (h *Handler) databaseColumns(c *fiber.Ctx, table string) ([]fiber.Map, error) {
	query := `
		SELECT
			c.column_name,
			c.data_type,
			COALESCE(c.udt_name, '') AS udt_name,
			c.is_nullable,
			COALESCE(c.column_default, '') AS column_default,
			COALESCE(pk.is_primary, false) AS is_primary
		FROM information_schema.columns c
		LEFT JOIN (
			SELECT kcu.column_name, true AS is_primary
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage kcu
				ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
			WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
		) pk ON pk.column_name = c.column_name
		WHERE c.table_schema = 'public' AND c.table_name = $1
		ORDER BY c.ordinal_position`
	if database.IsMySQL(h.db.Driver()) {
		query = `
			SELECT
				c.column_name,
				c.data_type,
				'' AS udt_name,
				c.is_nullable,
				COALESCE(c.column_default, '') AS column_default,
				CASE WHEN kcu.column_name IS NULL THEN false ELSE true END AS is_primary
			FROM information_schema.columns c
			LEFT JOIN information_schema.key_column_usage kcu
				ON kcu.table_schema = c.table_schema
				AND kcu.table_name = c.table_name
				AND kcu.column_name = c.column_name
				AND kcu.constraint_name = 'PRIMARY'
			WHERE c.table_schema = DATABASE() AND c.table_name = $1
			ORDER BY c.ordinal_position`
	}
	rows, err := h.db.Query(c.UserContext(), query, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	columns := make([]fiber.Map, 0)
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
			"is_protected": name == "id" || name == "tenant_id" || name == "created_at" || name == "updated_at",
		})
	}
	return columns, nil
}

func (h *Handler) databaseConstraints(c *fiber.Ctx, table string) ([]fiber.Map, error) {
	query := `
		SELECT constraint_name, constraint_type
		FROM information_schema.table_constraints
		WHERE table_schema = 'public' AND table_name = $1
		ORDER BY constraint_type, constraint_name`
	if database.IsMySQL(h.db.Driver()) {
		query = `
			SELECT constraint_name, constraint_type
			FROM information_schema.table_constraints
			WHERE table_schema = DATABASE() AND table_name = $1
			ORDER BY constraint_type, constraint_name`
	}
	rows, err := h.db.Query(c.UserContext(), query, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]fiber.Map, 0)
	for rows.Next() {
		var name, kind string
		if err := rows.Scan(&name, &kind); err != nil {
			return nil, err
		}
		items = append(items, fiber.Map{"name": name, "type": kind})
	}
	return items, nil
}

func (h *Handler) databaseRelationships(c *fiber.Ctx, table string) ([]fiber.Map, error) {
	query := `
		SELECT
			kcu.column_name,
			ccu.table_name AS foreign_table,
			ccu.column_name AS foreign_column
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
			ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
		JOIN information_schema.constraint_column_usage ccu
			ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
		WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_schema = 'public'
			AND tc.table_name = $1
		ORDER BY kcu.column_name`
	if database.IsMySQL(h.db.Driver()) {
		query = `
			SELECT
				kcu.column_name,
				kcu.referenced_table_name AS foreign_table,
				kcu.referenced_column_name AS foreign_column
			FROM information_schema.key_column_usage kcu
			WHERE kcu.table_schema = DATABASE()
				AND kcu.table_name = $1
				AND kcu.referenced_table_name IS NOT NULL
			ORDER BY kcu.column_name`
	}
	rows, err := h.db.Query(c.UserContext(), query, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]fiber.Map, 0)
	for rows.Next() {
		var column, foreignTable, foreignColumn string
		if err := rows.Scan(&column, &foreignTable, &foreignColumn); err != nil {
			return nil, err
		}
		items = append(items, fiber.Map{"column": column, "foreign_table": foreignTable, "foreign_column": foreignColumn})
	}
	return items, nil
}

func (h *Handler) tableExists(c *fiber.Ctx, table string) (bool, error) {
	var exists bool
	query := `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = $1 AND table_type = 'BASE TABLE'
		)`
	if database.IsMySQL(h.db.Driver()) {
		query = `
			SELECT EXISTS (
				SELECT 1 FROM information_schema.tables
				WHERE table_schema = DATABASE() AND table_name = $1 AND table_type = 'BASE TABLE'
			)`
	}
	err := h.db.QueryRow(c.UserContext(), query, table).Scan(&exists)
	return exists, err
}

func (h *Handler) exportableTables(c *fiber.Ctx) ([]string, error) {
	query := `
		SELECT t.table_name
		FROM information_schema.tables t
		LEFT JOIN database_admin_table_states st ON st.table_name = t.table_name
		WHERE t.table_schema = 'public'
			AND t.table_type = 'BASE TABLE'
			AND COALESCE(st.is_hidden, false) = false
		ORDER BY t.table_name`
	if database.IsMySQL(h.db.Driver()) {
		query = `
			SELECT t.table_name
			FROM information_schema.tables t
			LEFT JOIN database_admin_table_states st ON st.table_name = t.table_name
			WHERE t.table_schema = DATABASE()
				AND t.table_type = 'BASE TABLE'
				AND COALESCE(st.is_hidden, false) = false
			ORDER BY t.table_name`
	}
	rows, err := h.db.Query(c.UserContext(), query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tables := []string{}
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			return nil, err
		}
		tables = append(tables, table)
	}
	sort.Strings(tables)
	return tables, nil
}

func (h *Handler) blockProtectedDatabaseWrite(c *fiber.Ctx, table string) bool {
	if protectedDatabaseTables[table] {
		_ = response.Error(c, fiber.StatusForbidden, "Tabla protegida")
		return true
	}
	return false
}

func rowsToMaps(rows *database.Rows) ([]fiber.Map, error) {
	fields := rows.FieldDescriptions()
	result := make([]fiber.Map, 0)
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}
		item := fiber.Map{}
		for i, field := range fields {
			item[string(field.Name)] = normalizeDatabaseValue(values[i])
		}
		result = append(result, item)
	}
	return result, nil
}

func normalizeDatabaseValue(value interface{}) interface{} {
	switch typed := value.(type) {
	case []byte:
		return string(typed)
	case time.Time:
		return typed.Format(time.RFC3339)
	default:
		return typed
	}
}

func safeTableParam(c *fiber.Ctx) (string, bool) {
	table := strings.TrimSpace(c.Params("table"))
	return table, safeSQLIdent.MatchString(table)
}

func quoteIdent(value string) string {
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func databaseDDLEnabled() bool {
	return strings.EqualFold(os.Getenv("EDUCORE_ENABLE_DB_ADMIN_DDL"), "true")
}

func buildColumnDefinition(column databaseColumnChange) (string, error) {
	if !safeSQLIdent.MatchString(column.Name) {
		return "", fmt.Errorf("nombre de columna invalido")
	}
	columnType := strings.ToLower(strings.TrimSpace(column.Type))
	allowedTypes := map[string]bool{
		"text": true, "varchar": true, "integer": true, "numeric": true, "boolean": true,
		"date": true, "timestamp": true, "timestamptz": true, "uuid": true, "jsonb": true,
	}
	if !allowedTypes[columnType] {
		return "", fmt.Errorf("tipo de columna no permitido")
	}
	definition := fmt.Sprintf("%s %s", quoteIdent(column.Name), columnType)
	if !column.Nullable {
		definition += " NOT NULL"
	}
	if strings.TrimSpace(column.Default) != "" {
		definition += " DEFAULT " + strings.TrimSpace(column.Default)
	}
	return definition, nil
}

func buildAlterStatement(table string, operation databaseColumnChange) (string, error) {
	action := strings.ToLower(strings.TrimSpace(operation.Action))
	switch action {
	case "add_column":
		definition, err := buildColumnDefinition(operation)
		if err != nil {
			return "", err
		}
		return fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s", quoteIdent(table), definition), nil
	case "drop_column":
		if !safeSQLIdent.MatchString(operation.Name) {
			return "", fmt.Errorf("nombre de columna invalido")
		}
		return fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s", quoteIdent(table), quoteIdent(operation.Name)), nil
	case "rename_column":
		if !safeSQLIdent.MatchString(operation.Name) || !safeSQLIdent.MatchString(operation.NewName) {
			return "", fmt.Errorf("nombre de columna invalido")
		}
		return fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s TO %s", quoteIdent(table), quoteIdent(operation.Name), quoteIdent(operation.NewName)), nil
	case "change_type":
		if !safeSQLIdent.MatchString(operation.Name) {
			return "", fmt.Errorf("nombre de columna invalido")
		}
		columnType := strings.ToLower(strings.TrimSpace(operation.Type))
		if _, err := buildColumnDefinition(databaseColumnChange{Name: operation.Name, Type: columnType, Nullable: true}); err != nil {
			return "", err
		}
		return fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s TYPE %s", quoteIdent(table), quoteIdent(operation.Name), columnType), nil
	default:
		return "", fmt.Errorf("operacion no permitida")
	}
}
