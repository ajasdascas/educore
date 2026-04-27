package config

import (
	"log"
	"os"
	"time"
	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv       string
	Port         string
	DatabaseURL  string
	RedisURL     string
	JWTSecret    string
	JWTExpiration time.Duration
	RefreshExpiration time.Duration
}

func Load() *Config {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using environment variables")
	}

	jwtExp := 15 * time.Minute
	refreshExp := 7 * 24 * time.Hour

	return &Config{
		AppEnv:            getEnv("APP_ENV", "development"),
		Port:              getEnv("PORT", "8080"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://educore:educore_dev_password@localhost:5432/educore_dev?sslmode=disable"),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:         getEnv("JWT_SECRET", "super-secret-dev-key"),
		JWTExpiration:     jwtExp,
		RefreshExpiration: refreshExp,
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
