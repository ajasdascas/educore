package main

import (
	"context"
	"log"
	"time"

	"educore/internal/config"
	"educore/internal/events"
	"educore/internal/middleware"
	"educore/internal/modules/auth"
	"educore/internal/modules/communications"
	"educore/internal/modules/parent"
	"educore/internal/modules/reports"
	"educore/internal/modules/school_admin"
	superadmin "educore/internal/modules/super_admin"
	"educore/internal/modules/tenants"
	"educore/internal/pkg/database"
	"educore/internal/pkg/redis"
	"educore/internal/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
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

	// Create SQL DB adapter for modules that use database/sql
	sqlDB, err := database.NewSQLDBFromURL(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to create SQL DB adapter: %v", err)
	}
	defer sqlDB.Close()

	// 3. Init Redis (optional in dev)
	redisClient, err := redis.New(ctx, cfg.RedisURL)
	if err != nil {
		log.Printf("Redis not available: %v — continuing without cache", err)
	}
	defer redisClient.Close()

	// 4. Initialize Event Bus
	eventBus := events.NewEventBus()
	eventBus.Start()

	// 4. Setup Fiber
	app := fiber.New(fiber.Config{
		AppName:      "EduCore API",
		ErrorHandler: customErrorHandler,
	})

	// Global middlewares
	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(fiberlogger.New(fiberlogger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000, http://localhost:3001, http://localhost:3002, http://localhost:3003, https://onlineu.mx, http://onlineu.mx, https://educore-production-beef.up.railway.app",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Tenant-ID, ngrok-skip-browser-warning",
		AllowCredentials: true,
	}))

	// Tenant middleware
	app.Use(middleware.TenantResolver(db))

	// Static files (Uploads)
	app.Static("/uploads", "./uploads")

	// Routes
	api := app.Group("/api/v1")

	// Health check
	api.Get("/health", func(c *fiber.Ctx) error {
		tenantID := c.Locals("tenant_id")
		return response.Success(c, fiber.Map{
			"status": "ok",
			"env":    cfg.AppEnv,
			"tenant": tenantID,
			"redis":  redisClient.IsAvailable(),
		}, "API is healthy")
	})

	// Auth module (public)
	authHandler := auth.NewHandler(db, cfg.JWTSecret, cfg.JWTExpiration, cfg.RefreshExpiration, redisClient)
	authHandler.RegisterRoutes(api.Group("/auth"))

	// Tenants module (protected, SUPER_ADMIN only)
	tenantHandler := tenants.NewHandler(db)
	tenantGroup := api.Group("/tenants", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("SUPER_ADMIN"))
	tenantHandler.RegisterRoutes(tenantGroup)

	// Super Admin module
	superAdminGroup := api.Group("/super-admin", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("SUPER_ADMIN"))
	superAdminHandler := superadmin.NewHandler(db)
	superAdminHandler.RegisterRoutes(superAdminGroup)

	// Initialize module repositories, services, and handlers

	// School Admin module (SCHOOL_ADMIN, TEACHER)
	schoolAdminRepo := school_admin.NewRepository(db)
	schoolAdminService := school_admin.NewService(schoolAdminRepo, eventBus)
	schoolAdminHandler := school_admin.NewHandler(schoolAdminService)
	schoolAdminGroup := api.Group("/school-admin", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("SCHOOL_ADMIN"))
	schoolAdminHandler.RegisterRoutes(schoolAdminGroup)

	// Parent module
	parentRepo := parent.NewRepository(db)
	parentService := parent.NewService(parentRepo, eventBus)
	parentHandler := parent.NewHandler(parentService)
	parentGroupActive := api.Group("/parent", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("PARENT"))
	parentHandler.RegisterRoutes(parentGroupActive)

	// Reports module (SCHOOL_ADMIN, TEACHER)
	reportsRepo := reports.NewRepository(sqlDB)
	reportsService := reports.NewService(reportsRepo, eventBus)
	reportsHandler := reports.NewHandler(reportsService)
	reportsGroup := api.Group("/reports", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("SCHOOL_ADMIN", "TEACHER"))
	reportsHandler.RegisterRoutes(reportsGroup)

	// Communications module (All authenticated users)
	communicationsRepo := communications.NewRepository(sqlDB)
	communicationsService := communications.NewService(communicationsRepo, eventBus)
	communicationsHandler := communications.NewHandler(communicationsService)
	communicationsGroup := api.Group("/communications", middleware.Protected(cfg.JWTSecret))
	communicationsHandler.RegisterRoutes(communicationsGroup)

	// Academic module (placeholder)
	academicGroup := api.Group("/academic", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("SCHOOL_ADMIN", "TEACHER"))
	_ = academicGroup

	// 5. Start server
	log.Printf("EduCore API starting on port %s", cfg.Port)
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
