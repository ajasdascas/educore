package database

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
	"time"
)

type DB struct {
	driver string
	sqlDB  *sql.DB
}

type Tx struct {
	driver string
	tx     *sql.Tx
}

type Result struct {
	rowsAffected int64
}

func (r Result) RowsAffected() int64 {
	return r.rowsAffected
}

type Row struct {
	row    *sql.Row
	values []interface{}
	err    error
}

func (r Row) Scan(dest ...interface{}) error {
	if r.err != nil {
		return r.err
	}
	if r.values != nil {
		for i := range dest {
			if i >= len(r.values) {
				return fmt.Errorf("scan destination %d has no source value", i)
			}
			assignValue(dest[i], r.values[i])
		}
		return nil
	}
	scanDest, finish := prepareScanDest(dest)
	if err := r.row.Scan(scanDest...); err != nil {
		return err
	}
	return finish()
}

type FieldDescription struct {
	Name []byte
}

type Rows struct {
	rows    *sql.Rows
	columns []string
}

func (r *Rows) Close() {
	if r != nil && r.rows != nil {
		_ = r.rows.Close()
	}
}

func (r *Rows) Next() bool {
	return r != nil && r.rows != nil && r.rows.Next()
}

func (r *Rows) Scan(dest ...interface{}) error {
	scanDest, finish := prepareScanDest(dest)
	if err := r.rows.Scan(scanDest...); err != nil {
		return err
	}
	return finish()
}

func (r *Rows) Err() error {
	if r == nil || r.rows == nil {
		return nil
	}
	return r.rows.Err()
}

func (r *Rows) FieldDescriptions() []FieldDescription {
	fields := make([]FieldDescription, 0, len(r.columns))
	for _, column := range r.columns {
		fields = append(fields, FieldDescription{Name: []byte(column)})
	}
	return fields
}

func (r *Rows) Values() ([]interface{}, error) {
	values := make([]interface{}, len(r.columns))
	scanTargets := make([]interface{}, len(r.columns))
	for i := range values {
		scanTargets[i] = &values[i]
	}
	if err := r.rows.Scan(scanTargets...); err != nil {
		return nil, err
	}
	return values, nil
}

func NewPortable(ctx context.Context, driver, postgresURL, mysqlDSN string) (*DB, error) {
	sqlDB, err := NewSQLDBForDriver(ctx, driver, postgresURL, mysqlDSN)
	if err != nil {
		return nil, err
	}
	return &DB{driver: NormalizeDriver(driver), sqlDB: sqlDB}, nil
}

func (db *DB) Close() {
	if db != nil && db.sqlDB != nil {
		_ = db.sqlDB.Close()
	}
}

func (db *DB) Driver() string {
	if db == nil {
		return "postgres"
	}
	return db.driver
}

func (db *DB) SQLDB() *sql.DB {
	if db == nil {
		return nil
	}
	return db.sqlDB
}

func (db *DB) QueryRow(ctx context.Context, query string, args ...interface{}) Row {
	if IsMySQL(db.driver) {
		if synthetic, handled := db.execMySQLReturning(ctx, query, args); handled {
			return synthetic
		}
	}
	prepared, preparedArgs, synthetic := db.prepareQueryRow(query, args)
	if synthetic != nil {
		return *synthetic
	}
	return Row{row: db.sqlDB.QueryRowContext(ctx, prepared, preparedArgs...)}
}

func (db *DB) QueryRowContext(ctx context.Context, query string, args ...interface{}) Row {
	return db.QueryRow(ctx, query, args...)
}

func (db *DB) Query(ctx context.Context, query string, args ...interface{}) (*Rows, error) {
	prepared, preparedArgs := db.prepareQuery(query, args)
	rows, err := db.sqlDB.QueryContext(ctx, prepared, preparedArgs...)
	if err != nil {
		return nil, err
	}
	columns, _ := rows.Columns()
	return &Rows{rows: rows, columns: columns}, nil
}

func (db *DB) QueryContext(ctx context.Context, query string, args ...interface{}) (*Rows, error) {
	return db.Query(ctx, query, args...)
}

func (db *DB) Exec(ctx context.Context, query string, args ...interface{}) (Result, error) {
	if IsMySQL(db.driver) && strings.HasPrefix(strings.TrimSpace(strings.ToUpper(query)), "SET LOCAL ") {
		return Result{}, nil
	}
	prepared, preparedArgs := db.prepareQuery(query, args)
	result, err := db.sqlDB.ExecContext(ctx, prepared, preparedArgs...)
	if err != nil {
		logSQLError(prepared, err)
		return Result{}, err
	}
	affected, _ := result.RowsAffected()
	return Result{rowsAffected: affected}, nil
}

func (db *DB) ExecContext(ctx context.Context, query string, args ...interface{}) (Result, error) {
	return db.Exec(ctx, query, args...)
}

func (db *DB) Begin(ctx context.Context) (*Tx, error) {
	tx, err := db.sqlDB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	return &Tx{driver: db.driver, tx: tx}, nil
}

func (tx *Tx) QueryRow(ctx context.Context, query string, args ...interface{}) Row {
	if IsMySQL(tx.driver) {
		if synthetic, handled := tx.execMySQLReturning(ctx, query, args); handled {
			return synthetic
		}
	}
	prepared, preparedArgs := translateQuery(tx.driver, query, args)
	return Row{row: tx.tx.QueryRowContext(ctx, prepared, preparedArgs...)}
}

func (tx *Tx) Query(ctx context.Context, query string, args ...interface{}) (*Rows, error) {
	prepared, preparedArgs := translateQuery(tx.driver, query, args)
	rows, err := tx.tx.QueryContext(ctx, prepared, preparedArgs...)
	if err != nil {
		return nil, err
	}
	columns, _ := rows.Columns()
	return &Rows{rows: rows, columns: columns}, nil
}

func (tx *Tx) Exec(ctx context.Context, query string, args ...interface{}) (Result, error) {
	if IsMySQL(tx.driver) && strings.HasPrefix(strings.TrimSpace(strings.ToUpper(query)), "SET LOCAL ") {
		return Result{}, nil
	}
	prepared, preparedArgs := translateQuery(tx.driver, query, args)
	result, err := tx.tx.ExecContext(ctx, prepared, preparedArgs...)
	if err != nil {
		logSQLError(prepared, err)
		return Result{}, err
	}
	affected, _ := result.RowsAffected()
	return Result{rowsAffected: affected}, nil
}

func (tx *Tx) Commit(ctx context.Context) error {
	_ = ctx
	return tx.tx.Commit()
}

func (tx *Tx) Rollback(ctx context.Context) error {
	_ = ctx
	return tx.tx.Rollback()
}

func (db *DB) prepareQuery(query string, args []interface{}) (string, []interface{}) {
	return translateQuery(db.driver, query, args)
}

func (db *DB) prepareQueryRow(query string, args []interface{}) (string, []interface{}, *Row) {
	prepared, preparedArgs := translateQuery(db.driver, query, args)
	return prepared, preparedArgs, nil
}

var (
	castPattern           = regexp.MustCompile(`::(jsonb|json|text|uuid|date|inet|int|integer|numeric|decimal|float8|bool|boolean|timestamp|timestamptz)`)
	intervalLiteral       = regexp.MustCompile(`INTERVAL\s+'([0-9]+)\s+(day|days|month|months|year|years|hour|hours)'`)
	dateTruncMonthPattern = regexp.MustCompile(`date_trunc\('month',\s*CURRENT_DATE\)`)
	toCharMonthPattern    = regexp.MustCompile(`(?i)TO_CHAR\(date_trunc\('month',\s*([^)]+)\),\s*'YYYY-MM'\)`)
	toCharDatePattern     = regexp.MustCompile(`(?i)TO_CHAR\(([^,]+),\s*'YYYY-MM-DD'\)`)
	toCharTimePattern     = regexp.MustCompile(`(?i)TO_CHAR\(([^,]+),\s*'HH24:MI'\)`)
	makeDateCurrentYear   = regexp.MustCompile(`(?i)make_date\(EXTRACT\(YEAR FROM CURRENT_DATE\)(?:::int)?,\s*([0-9]+),\s*([0-9]+)\)`)
	makeDateNextYear      = regexp.MustCompile(`(?i)make_date\(EXTRACT\(YEAR FROM CURRENT_DATE\)(?:::int)?\s*\+\s*1,\s*([0-9]+),\s*([0-9]+)\)`)
	onConflictDoNothing   = regexp.MustCompile(`(?is)\s+ON\s+CONFLICT(?:\s*\([^)]+\))?\s+DO\s+NOTHING`)
	onConflictDoUpdate    = regexp.MustCompile(`(?is)\s+ON\s+CONFLICT(?:\s*\([^)]+\))?\s+DO\s+UPDATE\s+SET\s+(.+)$`)
	excludedRefPattern    = regexp.MustCompile(`EXCLUDED\.([a-zA-Z_][a-zA-Z0-9_]*)`)
	insertReturning       = regexp.MustCompile(`(?is)^\s*INSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s+AS\s+[a-zA-Z_][a-zA-Z0-9_]*)?\s*\((.*?)\)\s*VALUES\s*\((.*)\)(.*?)\s+RETURNING\s+(.+)$`)
	jsonTextPattern       = regexp.MustCompile(`([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)->>'([a-zA-Z0-9_]+)'`)
)

func translateQuery(driver, query string, args []interface{}) (string, []interface{}) {
	if !IsMySQL(driver) {
		return query, args
	}
	q := query
	q = strings.ReplaceAll(q, " ILIKE ", " LIKE ")
	q = strings.ReplaceAll(q, " iLIKE ", " LIKE ")
	q = strings.ReplaceAll(q, "ILIKE", "LIKE")
	q = translateConcatPipes(q)
	q = quoteMySQLReservedIdentifiers(q)
	q = translateDoubleQuotedIdentifiers(q)
	q = strings.ReplaceAll(q, "CURRENT_DATE - INTERVAL '30 days'", "DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)")
	q = strings.ReplaceAll(q, "CURRENT_DATE - INTERVAL '7 days'", "DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)")
	q = strings.ReplaceAll(q, "CURRENT_DATE - INTERVAL '1 year'", "DATE_SUB(CURRENT_DATE, INTERVAL 1 YEAR)")
	q = dateTruncMonthPattern.ReplaceAllString(q, "DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')")
	q = toCharMonthPattern.ReplaceAllString(q, "DATE_FORMAT($1, '%Y-%m')")
	q = toCharDatePattern.ReplaceAllString(q, "DATE_FORMAT($1, '%Y-%m-%d')")
	q = toCharTimePattern.ReplaceAllString(q, "DATE_FORMAT($1, '%H:%i')")
	q = makeDateCurrentYear.ReplaceAllString(q, "STR_TO_DATE(CONCAT(YEAR(CURRENT_DATE), '-$1-$2'), '%Y-%m-%d')")
	q = makeDateNextYear.ReplaceAllString(q, "STR_TO_DATE(CONCAT(YEAR(CURRENT_DATE) + 1, '-$1-$2'), '%Y-%m-%d')")
	q = jsonTextPattern.ReplaceAllString(q, "JSON_UNQUOTE(JSON_EXTRACT($1, '$.$2'))")
	q = intervalLiteral.ReplaceAllStringFunc(q, func(match string) string {
		parts := intervalLiteral.FindStringSubmatch(match)
		unit := strings.ToUpper(strings.TrimSuffix(parts[2], "s"))
		return fmt.Sprintf("INTERVAL %s %s", parts[1], unit)
	})
	q = strings.ReplaceAll(q, "NULLS LAST", "")
	q = strings.ReplaceAll(q, "NULLS FIRST", "")
	q = strings.ReplaceAll(q, "NOW()", "CURRENT_TIMESTAMP")
	q = strings.ReplaceAll(q, "now()", "CURRENT_TIMESTAMP")
	q = strings.ReplaceAll(q, "gen_random_uuid()", "UUID()")
	q = strings.ReplaceAll(q, "JSONB_BUILD_OBJECT", "JSON_OBJECT")
	q = strings.ReplaceAll(q, "jsonb_build_object", "JSON_OBJECT")
	q = castPattern.ReplaceAllString(q, "")
	q = translateMySQLUpsert(q)
	return rebindMySQLPlaceholders(q, args)
}

func translateConcatPipes(query string) string {
	pattern := regexp.MustCompile(`([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\s*\|\|\s*' '\s*\|\|\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)`)
	return pattern.ReplaceAllString(query, "CONCAT($1, ' ', $2)")
}

func translateDoubleQuotedIdentifiers(query string) string {
	var out strings.Builder
	inSingle := false
	for i := 0; i < len(query); i++ {
		ch := query[i]
		if ch == '\'' {
			out.WriteByte(ch)
			if i+1 < len(query) && query[i+1] == '\'' {
				i++
				out.WriteByte(query[i])
				continue
			}
			inSingle = !inSingle
			continue
		}
		if ch == '"' && !inSingle {
			j := i + 1
			for j < len(query) && (query[j] == '_' || query[j] >= '0' && query[j] <= '9' || query[j] >= 'A' && query[j] <= 'Z' || query[j] >= 'a' && query[j] <= 'z') {
				j++
			}
			if j < len(query) && query[j] == '"' && j > i+1 {
				out.WriteByte('`')
				out.WriteString(query[i+1 : j])
				out.WriteByte('`')
				i = j
				continue
			}
		}
		out.WriteByte(ch)
	}
	return out.String()
}

func rebindMySQLPlaceholders(query string, args []interface{}) (string, []interface{}) {
	if !postgresPlaceholderPattern.MatchString(query) {
		return query, args
	}
	outArgs := []interface{}{}
	q := postgresPlaceholderPattern.ReplaceAllStringFunc(query, func(match string) string {
		matches := postgresPlaceholderPattern.FindStringSubmatch(match)
		if len(matches) == 2 {
			var index int
			if _, err := fmt.Sscanf(matches[1], "%d", &index); err == nil && index > 0 && index <= len(args) {
				outArgs = append(outArgs, args[index-1])
			}
		}
		return "?"
	})
	return q, outArgs
}

func quoteMySQLReservedIdentifiers(query string) string {
	if !strings.Contains(query, "modules_catalog") &&
		!strings.Contains(query, "tenant_roles") &&
		!strings.Contains(query, "feature_flags") &&
		!strings.Contains(query, "platform_settings") {
		return query
	}
	replacements := []struct {
		from string
		to   string
	}{
		{"INSERT INTO feature_flags (key,", "INSERT INTO feature_flags (`key`,"},
		{"INSERT INTO platform_settings (key,", "INSERT INTO platform_settings (`key`,"},
		{"ON CONFLICT (key)", "ON CONFLICT (`key`)"},
		{"SELECT key,", "SELECT `key`,"},
		{"SELECT key ", "SELECT `key` "},
		{"SELECT mc.key", "SELECT mc.`key`"},
		{" mc.key", " mc.`key`"},
		{" WHERE key ", " WHERE `key` "},
		{" AND key ", " AND `key` "},
		{"ORDER BY category, key", "ORDER BY category, `key`"},
		{" ORDER BY key", " ORDER BY `key`"},
		{"(tenant_id, key)", "(tenant_id, `key`)"},
		{"(tenant_id, key,", "(tenant_id, `key`,"},
	}
	q := query
	for _, replacement := range replacements {
		q = strings.ReplaceAll(q, replacement.from, replacement.to)
	}
	return q
}

func translateMySQLUpsert(query string) string {
	q := onConflictDoNothing.ReplaceAllStringFunc(query, func(match string) string {
		noOpColumn := firstInsertColumn(query)
		if noOpColumn == "" {
			noOpColumn = "id"
		}
		return fmt.Sprintf(" ON DUPLICATE KEY UPDATE %s = %s", noOpColumn, noOpColumn)
	})
	if matches := onConflictDoUpdate.FindStringSubmatch(q); len(matches) == 2 {
		update := excludedRefPattern.ReplaceAllString(matches[1], "VALUES($1)")
		q = onConflictDoUpdate.ReplaceAllString(q, " ON DUPLICATE KEY UPDATE "+update)
	}
	return q
}

func firstInsertColumn(query string) string {
	matches := regexp.MustCompile(`(?is)^\s*INSERT\s+INTO\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\((.*?)\)`).FindStringSubmatch(query)
	if len(matches) != 2 {
		return ""
	}
	columns := splitTopLevel(matches[1])
	if len(columns) == 0 {
		return ""
	}
	return normalizeColumnName(columns[0])
}

func (db *DB) execMySQLReturning(ctx context.Context, query string, args []interface{}) (Row, bool) {
	return execMySQLReturning(ctx, query, args, func(q string, a ...interface{}) (Result, error) {
		return db.Exec(ctx, q, a...)
	})
}

func (tx *Tx) execMySQLReturning(ctx context.Context, query string, args []interface{}) (Row, bool) {
	return execMySQLReturning(ctx, query, args, func(q string, a ...interface{}) (Result, error) {
		return tx.Exec(ctx, q, a...)
	})
}

func execMySQLReturning(ctx context.Context, query string, args []interface{}, exec func(string, ...interface{}) (Result, error)) (Row, bool) {
	_ = ctx
	matches := insertReturning.FindStringSubmatch(query)
	if len(matches) != 6 {
		return Row{}, false
	}
	table := matches[1]
	columns := splitTopLevel(matches[2])
	values := splitTopLevel(matches[3])
	tail := strings.TrimSpace(matches[4])
	returning := splitTopLevel(matches[5])

	generatedID := ""
	if !containsColumn(columns, "id") && returningWantsID(returning) {
		generatedID = newUUID()
		columns = append([]string{"id"}, columns...)
		values = append([]string{"'" + generatedID + "'"}, values...)
	}

	insertQuery := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)", table, strings.Join(columns, ", "), strings.Join(values, ", "))
	if tail != "" {
		insertQuery += " " + tail
	}

	if _, err := exec(insertQuery, args...); err != nil {
		return Row{err: err}, true
	}

	inserted := map[string]interface{}{}
	argIndex := 0
	for i, col := range columns {
		col = normalizeColumnName(col)
		if i >= len(values) {
			continue
		}
		valueExpr := strings.TrimSpace(values[i])
		if matches := postgresPlaceholderPattern.FindStringSubmatch(valueExpr); len(matches) == 2 {
			var index int
			if _, err := fmt.Sscanf(matches[1], "%d", &index); err == nil && index > 0 && index <= len(args) {
				inserted[col] = args[index-1]
				continue
			}
		}
		switch {
		case strings.HasPrefix(valueExpr, "$") || valueExpr == "?":
			if argIndex < len(args) {
				inserted[col] = args[argIndex]
				argIndex++
			}
		case strings.EqualFold(valueExpr, "true"):
			inserted[col] = true
		case strings.EqualFold(valueExpr, "false"):
			inserted[col] = false
		case strings.HasPrefix(valueExpr, "'") && strings.HasSuffix(valueExpr, "'"):
			inserted[col] = strings.Trim(valueExpr, "'")
		}
	}

	now := time.Now().UTC()
	valuesOut := make([]interface{}, 0, len(returning))
	for _, field := range returning {
		clean := normalizeReturningField(field)
		switch clean {
		case "id":
			if generatedID != "" {
				valuesOut = append(valuesOut, generatedID)
			} else {
				valuesOut = append(valuesOut, inserted["id"])
			}
		case "created_at", "updated_at":
			valuesOut = append(valuesOut, now)
		default:
			if v, ok := inserted[clean]; ok {
				valuesOut = append(valuesOut, v)
			} else if strings.Contains(strings.ToLower(clean), " is not null") {
				valuesOut = append(valuesOut, false)
			} else {
				valuesOut = append(valuesOut, nil)
			}
		}
	}
	return Row{values: valuesOut}, true
}

func containsColumn(columns []string, wanted string) bool {
	for _, col := range columns {
		if normalizeColumnName(col) == wanted {
			return true
		}
	}
	return false
}

func returningWantsID(fields []string) bool {
	for _, field := range fields {
		if normalizeReturningField(field) == "id" {
			return true
		}
	}
	return false
}

func normalizeColumnName(col string) string {
	col = strings.TrimSpace(col)
	col = strings.Trim(col, "`\"")
	parts := strings.Split(col, ".")
	return strings.TrimSpace(parts[len(parts)-1])
}

func normalizeReturningField(field string) string {
	field = strings.TrimSpace(field)
	field = strings.TrimSuffix(field, ";")
	field = strings.Trim(field, "`\"")
	field = castPattern.ReplaceAllString(field, "")
	if strings.HasPrefix(strings.ToUpper(field), "COALESCE(") && strings.HasSuffix(field, ")") {
		inner := strings.TrimSuffix(strings.TrimPrefix(field, "COALESCE("), ")")
		parts := splitTopLevel(inner)
		if len(parts) > 0 {
			field = strings.TrimSpace(parts[0])
		}
	}
	if idx := strings.LastIndex(strings.ToUpper(field), " AS "); idx >= 0 {
		field = strings.TrimSpace(field[idx+4:])
	}
	parts := strings.Split(field, ".")
	return strings.TrimSpace(parts[len(parts)-1])
}

func splitTopLevel(input string) []string {
	var parts []string
	level := 0
	start := 0
	inString := false
	for i := 0; i < len(input); i++ {
		ch := input[i]
		if ch == '\'' {
			inString = !inString
			continue
		}
		if inString {
			continue
		}
		switch ch {
		case '(':
			level++
		case ')':
			if level > 0 {
				level--
			}
		case ',':
			if level == 0 {
				parts = append(parts, strings.TrimSpace(input[start:i]))
				start = i + 1
			}
		}
	}
	tail := strings.TrimSpace(input[start:])
	if tail != "" {
		parts = append(parts, tail)
	}
	return parts
}

func newUUID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func NewID() string {
	return newUUID()
}

func logSQLError(query string, err error) {
	if os.Getenv("EDUCORE_SQL_DEBUG") != "true" {
		return
	}
	log.Printf("SQL portable error: %v; query=%s", err, strings.Join(strings.Fields(query), " "))
}

func assignValue(dest interface{}, value interface{}) {
	switch target := dest.(type) {
	case *string:
		if value == nil {
			*target = ""
			return
		}
		*target = fmt.Sprint(value)
	case **string:
		if value == nil {
			*target = nil
			return
		}
		v := fmt.Sprint(value)
		*target = &v
	case *int:
		switch typed := value.(type) {
		case int64:
			*target = int(typed)
		case int:
			*target = typed
		default:
			fmt.Sscan(fmt.Sprint(value), target)
		}
	case *int64:
		switch typed := value.(type) {
		case int64:
			*target = typed
		default:
			fmt.Sscan(fmt.Sprint(value), target)
		}
	case *float64:
		switch typed := value.(type) {
		case float64:
			*target = typed
		default:
			fmt.Sscan(fmt.Sprint(value), target)
		}
	case *bool:
		switch typed := value.(type) {
		case bool:
			*target = typed
		case int64:
			*target = typed != 0
		default:
			*target = strings.EqualFold(fmt.Sprint(value), "true") || fmt.Sprint(value) == "1"
		}
	case *time.Time:
		if typed, ok := value.(time.Time); ok {
			*target = typed
		}
	case *sql.NullString:
		if value == nil {
			*target = sql.NullString{}
			return
		}
		*target = sql.NullString{String: fmt.Sprint(value), Valid: true}
	default:
		if scanner, ok := dest.(sql.Scanner); ok {
			_ = scanner.Scan(value)
		}
	}
}

func prepareScanDest(dest []interface{}) ([]interface{}, func() error) {
	scanDest := make([]interface{}, len(dest))
	finishers := make([]func() error, 0)
	for i, target := range dest {
		switch typed := target.(type) {
		case *map[string]interface{}:
			var raw sql.NullString
			scanDest[i] = &raw
			finishers = append(finishers, func() error {
				if !raw.Valid || strings.TrimSpace(raw.String) == "" {
					*typed = map[string]interface{}{}
					return nil
				}
				return json.Unmarshal([]byte(raw.String), typed)
			})
		case *map[string]bool:
			var raw sql.NullString
			scanDest[i] = &raw
			finishers = append(finishers, func() error {
				if !raw.Valid || strings.TrimSpace(raw.String) == "" {
					*typed = map[string]bool{}
					return nil
				}
				return json.Unmarshal([]byte(raw.String), typed)
			})
		case *[]string:
			var raw sql.NullString
			scanDest[i] = &raw
			finishers = append(finishers, func() error {
				if !raw.Valid || strings.TrimSpace(raw.String) == "" {
					*typed = []string{}
					return nil
				}
				return json.Unmarshal([]byte(raw.String), typed)
			})
		default:
			scanDest[i] = target
		}
	}
	return scanDest, func() error {
		for _, finish := range finishers {
			if err := finish(); err != nil {
				return err
			}
		}
		return nil
	}
}
