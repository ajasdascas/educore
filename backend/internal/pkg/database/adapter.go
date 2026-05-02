package database

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"fmt"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
)

// NewSQLDB creates a database/sql.DB from a pgxpool.Pool
// This is needed for modules that still use database/sql interface
func NewSQLDB(pool *pgxpool.Pool) (*sql.DB, error) {
	// Get the config from the pool
	config := pool.Config()

	// Create a new pgx config for stdlib
	connConfig := config.ConnConfig

	// Register pgx driver and open connection
	connector := stdlib.GetConnector(*connConfig)

	return sql.OpenDB(connector), nil
}

// Alternative approach using connection string
func NewSQLDBFromURL(databaseURL string) (*sql.DB, error) {
	config, err := pgx.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	connector := stdlib.GetConnector(*config)
	return sql.OpenDB(connector), nil
}

// NewSQLDBForDriver opens the database/sql adapter used by modules that have
// already been made SQL-portable. PostgreSQL remains the default runtime.
func NewSQLDBForDriver(ctx context.Context, driver, postgresURL, mysqlDSN string) (*sql.DB, error) {
	switch NormalizeDriver(driver) {
	case "postgres":
		db, err := NewSQLDBFromURL(postgresURL)
		if err != nil {
			return nil, err
		}
		if err := db.PingContext(ctx); err != nil {
			_ = db.Close()
			return nil, err
		}
		return db, nil
	case "mysql":
		if strings.TrimSpace(mysqlDSN) == "" {
			return nil, errors.New("MYSQL_DSN is required when DB_DRIVER=mysql")
		}
		db, err := sql.Open("mysql", mysqlDSN)
		if err != nil {
			return nil, err
		}
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(5)
		if err := db.PingContext(ctx); err != nil {
			_ = db.Close()
			return nil, err
		}
		return db, nil
	default:
		return nil, fmt.Errorf("unsupported DB_DRIVER %q", driver)
	}
}

func NormalizeDriver(driver string) string {
	switch strings.ToLower(strings.TrimSpace(driver)) {
	case "", "postgres", "postgresql", "pg":
		return "postgres"
	case "mysql", "mariadb":
		return "mysql"
	default:
		return strings.ToLower(strings.TrimSpace(driver))
	}
}

func IsMySQL(driver string) bool {
	return NormalizeDriver(driver) == "mysql"
}

// Dummy driver interface implementation for compatibility
type pgxDriver struct{}

func (d pgxDriver) Open(name string) (driver.Conn, error) {
	connector, err := pgx.ParseConfig(name)
	if err != nil {
		return nil, err
	}
	return stdlib.GetConnector(*connector).Connect(nil)
}
