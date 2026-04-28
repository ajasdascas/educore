package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:Peju751015@localhost:5432/educore_dev?sslmode=disable"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	fileBytes, err := os.ReadFile("migrations/006_alter_tenants_plan.sql")
	if err != nil {
		log.Fatalf("Unable to read migration file: %v", err)
	}

	_, err = pool.Exec(ctx, string(fileBytes))
	if err != nil {
		log.Fatalf("Error executing migration: %v", err)
	}

	fmt.Println("Migration 005 executed successfully!")
}
