package database

import (
	"database/sql"
	"database/sql/driver"

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

// Dummy driver interface implementation for compatibility
type pgxDriver struct{}

func (d pgxDriver) Open(name string) (driver.Conn, error) {
	connector, err := pgx.ParseConfig(name)
	if err != nil {
		return nil, err
	}
	return stdlib.GetConnector(*connector).Connect(nil)
}