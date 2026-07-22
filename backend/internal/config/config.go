package config

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

const (
	defaultDevelopmentJWTSecret = "super-secret-dev-key"
	minimumProductionJWTBytes   = 32
)

var knownJWTSecretPlaceholders = map[string]struct{}{
	"change-me":                   {},
	"changeme":                    {},
	"default-jwt-secret":          {},
	"jwt-secret":                  {},
	"replace-me":                  {},
	"replace-with-64-byte-secret": {},
	"secret":                      {},
	"super-secret-dev-key":        {},
	"test-secret-with-more-than-32-characters":  {},
	"tu-jwt-secret-super-seguro":                {},
	"tu-jwt-secret-super-ultra-seguro-512-bits": {},
	"your-jwt-secret":                           {},
	"your-secret-key":                           {},
}

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

func Load() (*Config, error) {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using environment variables")
	}

	jwtExp := 15 * time.Minute
	refreshExp := 7 * 24 * time.Hour

	cfg := &Config{
		AppEnv:            getEnv("APP_ENV", "development"),
		Port:              getEnv("PORT", "8080"),
		DBDriver:          getEnv("DB_DRIVER", "postgres"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgres://educore:educore_dev_password@localhost:5432/educore_dev?sslmode=disable"),
		MySQLDSN:          getEnv("MYSQL_DSN", ""),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379/0"),
		JWTSecret:         getEnv("JWT_SECRET", defaultDevelopmentJWTSecret),
		JWTExpiration:     jwtExp,
		RefreshExpiration: refreshExp,
		AllowDemoLogin:    getEnv("ALLOW_DEMO_LOGIN", "false") == "true",
	}
	if err := cfg.Validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

// Validate rejects insecure secrets before any production dependency is
// initialized. Development keeps its local-only fallback for convenience.
func (c *Config) Validate() error {
	if c == nil {
		return fmt.Errorf("configuration is required")
	}

	environment := strings.ToLower(strings.TrimSpace(c.AppEnv))
	if environment != "production" && environment != "prod" {
		return nil
	}

	secret := strings.TrimSpace(c.JWTSecret)
	if secret == "" {
		return fmt.Errorf("JWT_SECRET is required in production")
	}
	if _, isPlaceholder := knownJWTSecretPlaceholders[strings.ToLower(secret)]; isPlaceholder {
		return fmt.Errorf("JWT_SECRET must not use a known placeholder in production")
	}
	if len([]byte(secret)) < minimumProductionJWTBytes {
		return fmt.Errorf("JWT_SECRET must be at least %d bytes in production", minimumProductionJWTBytes)
	}

	return nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
