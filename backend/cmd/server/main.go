package main

import (
	"context"
	"log"
	"time"

	"educore/internal/config"
	"educore/internal/middleware"
	"educore/internal/pkg/database"
	"educore/internal/pkg/redis"
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

func main() {
	// 1. Load config
	cfg := config.Load()

	// 2. Init Database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// 3. Init Redis
	redisClient, err := redis.New(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatalf("Failed to connect to redis: %v", err)
	}
	defer redisClient.Close()

	// 4. Setup Fiber
	app := fiber.New(fiber.Config{
		AppName:      "EduCore API",
		ErrorHandler: customErrorHandler,
	})

	// Middlewares globales
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*", // Cambiar en prod
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-Tenant-ID",
	}))

	// Tenant Middleware global (menos para rutas que no lo necesitan)
	app.Use(middleware.TenantResolver(db))

	// Rutas de prueba
	api := app.Group("/api/v1")
	
	api.Get("/health", func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id")
		return response.Success(c, fiber.Map{
			"status": "ok",
			"env":    cfg.AppEnv,
			"tenant": tenantID,
		}, "API is healthy")
	})

	// TODO: Registrar rutas de modules (auth, tenants, users)

	// 5. Iniciar servidor
	log.Printf("Server starting on port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return response.Error(c, code, err.Error())
}
