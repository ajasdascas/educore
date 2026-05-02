//go:build ignore

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
		log.Fatal("DATABASE_URL is required")
	}
	ctx := context.Background()

	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Error conectando a la BD: %v", err)
	}
	defer db.Close()

	// Ejecutar script 002
	sql2, err := os.ReadFile("migrations/002_add_modules_settings.sql")
	if err != nil {
		log.Fatalf("Error leyendo 002: %v", err)
	}
	_, err = db.Exec(ctx, string(sql2))
	if err != nil {
		fmt.Printf("Error ejecutando 002: %v\n", err)
	} else {
		fmt.Println("Migración 002 ejecutada con éxito.")
	}

	// Ejecutar script 003
	sql3, err := os.ReadFile("migrations/003_seed_super_admin.sql")
	if err != nil {
		log.Fatalf("Error leyendo 003: %v", err)
	}
	_, err = db.Exec(ctx, string(sql3))
	if err != nil {
		fmt.Printf("Error ejecutando 003: %v\n", err)
	} else {
		fmt.Println("Migración 003 (Seed Admin) ejecutada con éxito.")
	}
}
