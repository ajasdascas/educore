package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"strings"
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
	"educore/internal/modules/student"
	"educore/internal/modules/teacher"
	"educore/internal/modules/webhook"
	"educore/internal/modules/tenants"
	"educore/internal/pkg/database"
	"educore/internal/pkg/mysqlrepair"
	"educore/internal/pkg/ownerseed"
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

	normalizedDriver := database.NormalizeDriver(cfg.DBDriver)
	if cfg.AppEnv == "production" && normalizedDriver == "mysql" && !strings.EqualFold(os.Getenv("EDUCORE_ALLOW_MYSQL_RUNTIME"), "true") {
		log.Fatal("DB_DRIVER=mysql is blocked in production until EDUCORE_ALLOW_MYSQL_RUNTIME=true is set after full validation")
	}

	db, err := database.NewPortable(ctx, cfg.DBDriver, cfg.DatabaseURL, cfg.MySQLDSN)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	repairCtx, repairCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer repairCancel()
	if err := mysqlrepair.EnsureStagingSchema(repairCtx, db, cfg.AppEnv); err != nil {
		log.Fatalf("Failed to repair MySQL staging schema: %v", err)
	}

	seedCtx, seedCancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer seedCancel()
	if err := ownerseed.SeedFromEnv(seedCtx, db, cfg.AppEnv); err != nil {
		log.Fatalf("Failed to seed owner admins: %v", err)
	}

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
		AllowOrigins:     "http://localhost:3000, http://localhost:3001, http://localhost:3002, http://localhost:3003, https://onlineu.mx, https://www.onlineu.mx, https://educore-production-beef.up.railway.app, https://academic.lat, https://www.academic.lat",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, ngrok-skip-browser-warning, X-Support-Tenant-ID",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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
			"status":         "ok",
			"env":            cfg.AppEnv,
			"tenant":         tenantID,
			"db_driver":      normalizedDriver,
			"db_mysql_ready": normalizedDriver == "mysql" && (cfg.AppEnv != "production" || strings.EqualFold(os.Getenv("EDUCORE_ALLOW_MYSQL_RUNTIME"), "true")),
			"redis":          redisClient.IsAvailable(),
			"git_commit":     os.Getenv("RAILWAY_GIT_COMMIT_SHA"),
		}, "API is healthy")
	})

	// Auth module (public)
	authHandler := auth.NewHandler(db, cfg.JWTSecret, cfg.JWTExpiration, cfg.RefreshExpiration, redisClient)
	authHandler.RegisterRoutes(api.Group("/auth"))
	// Authenticated auth actions (requires valid JWT, any role)
	authHandler.RegisterProtectedRoutes(api.Group("/auth", middleware.Protected(cfg.JWTSecret)))

	// Webhooks (public, signature-verified)
	webhook.RegisterRoutes(api.Group("/webhooks"), db)

	// Internal deployment events (public route, shared-secret verified).
	superadmin.RegisterInternalDeploymentRoutes(api.Group("/internal"), db, os.Getenv("EDUCORE_DEPLOY_WEBHOOK_SECRET"))

	// Public school info (used by school landing page — no auth)
	api.Get("/public/school-info", func(c *fiber.Ctx) error {
		slug := c.Query("slug")
		if slug == "" {
			return response.Error(c, fiber.StatusBadRequest, "slug required")
		}
		var name, logoURL string
		var status string
		err := db.QueryRow(c.UserContext(),
			`SELECT name, COALESCE(logo_url, ''), status FROM tenants WHERE slug = $1 LIMIT 1`, slug).
			Scan(&name, &logoURL, &status)
		if err != nil || status == "suspended" {
			return response.Error(c, fiber.StatusNotFound, "School not found")
		}
		return response.Success(c, fiber.Map{
			"name":     name,
			"slug":     slug,
			"logo_url": logoURL,
		}, "ok")
	})

	// Public schools resolve endpoint (used by portal landing — no auth)
	// GET /api/v1/public/schools/resolve?slug=kinder1
	// GET /api/v1/public/schools/resolve?host=kinder1.onlineu.mx
	api.Get("/public/schools/resolve", func(c *fiber.Ctx) error {
		slug := c.Query("slug")
		host := c.Query("host")

		// Derive slug from host (kinder1.onlineu.mx → kinder1)
		if slug == "" && host != "" {
			parts := strings.Split(host, ".")
			if len(parts) >= 3 {
				slug = parts[0]
			}
		}
		if slug == "" {
			return response.Error(c, fiber.StatusBadRequest, "slug or host query param required")
		}

		var tenantID, name, status, plan string
		var logoURL *string
		err := db.QueryRow(c.UserContext(),
			database.RebindPlaceholders(db.Driver(),
				"SELECT id, name, COALESCE(logo_url, ''), status, COALESCE(plan, 'starter') FROM tenants WHERE slug = $1 LIMIT 1"),
			slug).Scan(&tenantID, &name, &logoURL, &status, &plan)
		if err != nil {
			return response.Error(c, fiber.StatusNotFound, "School not found")
		}
		if status == "suspended" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error":   fiber.Map{"code": "TENANT_SUSPENDED", "message": "Esta institución está suspendida."},
			})
		}

		logo := ""
		if logoURL != nil {
			logo = *logoURL
		}

		// Fetch enabled modules (public-safe keys only)
		var enabledModules []string
		rows, qErr := db.Query(c.UserContext(),
			database.RebindPlaceholders(db.Driver(),
				"SELECT module_key FROM tenant_modules WHERE tenant_id = $1 AND is_active = true AND enabled = true"),
			tenantID)
		if qErr == nil {
			defer rows.Close()
			for rows.Next() {
				var mk string
				if rows.Scan(&mk) == nil {
					// Only expose non-sensitive module keys
					enabledModules = append(enabledModules, mk)
				}
			}
		}
		if enabledModules == nil {
			enabledModules = []string{}
		}

		// Fetch levels from settings JSON (non-fatal)
		var levels []string
		var settingsRaw []byte
		if sErr := db.QueryRow(c.UserContext(),
			database.RebindPlaceholders(db.Driver(), "SELECT COALESCE(settings, '{}') FROM tenants WHERE id = $1"),
			tenantID).Scan(&settingsRaw); sErr == nil {
			var settingsMap map[string]interface{}
			if jsonErr := json.Unmarshal(settingsRaw, &settingsMap); jsonErr == nil {
				if rawLevels, ok := settingsMap["levels"].([]interface{}); ok {
					for _, l := range rawLevels {
						if s, ok := l.(string); ok {
							levels = append(levels, s)
						}
					}
				}
			}
		}
		if levels == nil {
			levels = []string{}
		}

		return response.Success(c, fiber.Map{
			"school_id":               tenantID,
			"name":                    name,
			"slug":                    slug,
			"status":                  status,
			"plan":                    plan,
			"logo_url":                logo,
			"portal_enabled":          true,
			"levels":                  levels,
			"enabled_modules_public":  enabledModules,
			"portal_internal_url":     "https://onlineu.mx/educore/escuela/?slug=" + slug,
			"portal_subdomain_url":    "https://" + slug + ".onlineu.mx",
			"dns_status":              "unknown",
			"hosting_status":          "basepath_conflict",
			"ssl_status":              "unknown",
		}, "ok")
	})

	// Tenants module (protected, SUPER_ADMIN only)
	tenantHandler := tenants.NewHandler(db)
	tenantGroup := api.Group("/tenants", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("SUPER_ADMIN"))
	tenantHandler.RegisterRoutes(tenantGroup)

	// Super Admin module
	superAdminGroup := api.Group("/super-admin", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("SUPER_ADMIN"))
	superAdminHandler := superadmin.NewHandler(db)
	superAdminHandler.RegisterRoutes(superAdminGroup)
	superAdminHandler.RegisterDeploymentRoutes(superAdminGroup)

	// Initialize module repositories, services, and handlers

	// School Admin module (SCHOOL_ADMIN + SUPER_ADMIN can impersonate)
	schoolAdminRepo := school_admin.NewRepository(db)
	schoolAdminService := school_admin.NewService(schoolAdminRepo, eventBus)
	schoolAdminHandler := school_admin.NewHandler(schoolAdminService)
	schoolAdminGroup := api.Group("/school-admin", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("SCHOOL_ADMIN", "SUPER_ADMIN"))
	schoolAdminHandler.RegisterRoutes(schoolAdminGroup)

	// Parent module
	parentRepo := parent.NewRepository(db)
	parentService := parent.NewService(parentRepo, eventBus)
	parentHandler := parent.NewHandler(parentService)
	parentGroupActive := api.Group("/parent", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("PARENT"))
	parentHandler.RegisterRoutes(parentGroupActive)

	// Teacher module
	teacherRepo := teacher.NewRepository(db)
	teacherService := teacher.NewService(teacherRepo, eventBus)
	teacherHandler := teacher.NewHandler(teacherService)
	teacherGroup := api.Group("/teacher", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("TEACHER"))
	teacherHandler.RegisterRoutes(teacherGroup)

	// Reports module (SCHOOL_ADMIN, TEACHER)
	reportsRepo := reports.NewRepository(db)
	reportsService := reports.NewService(reportsRepo, eventBus)
	reportsHandler := reports.NewHandler(reportsService)
	reportsGroup := api.Group("/reports", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("SCHOOL_ADMIN", "TEACHER"))
	reportsHandler.RegisterRoutes(reportsGroup)

	// Student module (STUDENT role — tenant-scoped)
	studentRepo := student.NewRepository(db)
	studentService := student.NewService(studentRepo)
	studentHandler := student.NewHandler(studentService)
	studentGroup := api.Group("/student", middleware.Protected(cfg.JWTSecret), middleware.RequireRoles("STUDENT"))
	studentHandler.RegisterRoutes(studentGroup)

	// Communications module (All authenticated users)
	communicationsRepo := communications.NewRepository(db)
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
