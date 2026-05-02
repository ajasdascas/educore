package config

import (
	"github.com/joho/godotenv"
	"log"
	"os"
	"time"
)

type Config struct {
	AppEnv            string
	Port              string
	DBDriver          string
	DatabaseURL       string
	MySQLDSN          string
	RedisURL          string
	JWTSecret         string
	JWTExpiration     time.Duration
	RefreshExpiration time.Duration
	AllowDemoLogin    bool
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
		DBDriver:          getEnv("DB_DRIVER", "postgres"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://educore:educore_dev_password@localhost:5432/educore_dev?sslmode=disable"),
		MySQLDSN:          getEnv("MYSQL_DSN", ""),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:         getEnv("JWT_SECRET", "super-secret-dev-key"),
		JWTExpiration:     jwtExp,
		RefreshExpiration: refreshExp,
		AllowDemoLogin:    getEnv("ALLOW_DEMO_LOGIN", "false") == "true",
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
