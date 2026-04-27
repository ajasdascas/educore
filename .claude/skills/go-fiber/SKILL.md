# SKILL: Go + Fiber — EduCore Backend
# Lee esto ANTES de escribir cualquier código Go

## DEPENDENCIAS (go.mod)

```go
module educore

go 1.22

require (
    github.com/gofiber/fiber/v2 v2.52.5
    github.com/jackc/pgx/v5 v5.6.0           // PostgreSQL driver
    github.com/go-redis/redis/v9 v9.6.1       // Redis
    github.com/golang-jwt/jwt/v5 v5.2.1       // JWT
    github.com/go-playground/validator/v10 v10.22.1  // Validación
    github.com/joho/godotenv v1.5.1            // .env files
    golang.org/x/crypto v0.27.0               // bcrypt
    github.com/google/uuid v1.6.0             // UUIDs
    github.com/resend/resend-go/v2 v2.9.0     // Emails
)
```

## ESTRUCTURA DEL main.go

```go
package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"
    
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "github.com/gofiber/fiber/v2/middleware/requestid"
)

func main() {
    cfg := config.Load()
    
    db := database.Connect(cfg.DatabaseURL)
    defer db.Close()
    
    rdb := redis.Connect(cfg.RedisURL)
    defer rdb.Close()
    
    app := fiber.New(fiber.Config{
        ErrorHandler: response.ErrorHandler,
        AppName:      "EduCore API v1",
    })
    
    // Middlewares globales
    app.Use(recover.New())
    app.Use(requestid.New())
    app.Use(logger.New())
    app.Use(cors.New(cors.Config{
        AllowOrigins:     cfg.CORSOrigins,
        AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Tenant-ID",
        AllowCredentials: true,
    }))
    
    // Registrar rutas
    v1 := app.Group("/api/v1")
    auth.RegisterRoutes(v1, db, rdb, cfg)
    tenants.RegisterRoutes(v1, db, cfg)
    // ... otros módulos
    
    // Graceful shutdown
    c := make(chan os.Signal, 1)
    signal.Notify(c, os.Interrupt, syscall.SIGTERM)
    
    go func() {
        <-c
        app.Shutdown()
    }()
    
    log.Fatal(app.Listen(":" + cfg.Port))
}
```

## PATRÓN: TENANT MIDDLEWARE

```go
// internal/middleware/tenant.go
package middleware

import (
    "github.com/gofiber/fiber/v2"
    "educore/internal/pkg/response"
)

// ExtractTenant resuelve el tenant desde subdominio o header
func ExtractTenant(db *pgxpool.Pool) fiber.Handler {
    return func(c *fiber.Ctx) error {
        // 1. Intentar del header X-Tenant-ID (para mobile/API)
        tenantID := c.Get("X-Tenant-ID")
        
        // 2. Si no, del subdominio
        if tenantID == "" {
            host := c.Hostname()
            slug := extractSlug(host) // "colegio-la-paz" de "colegio-la-paz.educore.mx"
            tenant, err := resolveTenantBySlug(c.Context(), db, slug)
            if err != nil {
                return response.Error(c, 404, ErrTenantNotFound)
            }
            tenantID = tenant.ID
        }
        
        c.Locals("tenant_id", tenantID)
        
        // 3. Inyectar en sesión PostgreSQL para RLS
        _, err := db.Exec(c.Context(), 
            "SELECT set_config('app.current_tenant', $1, true)", tenantID)
        if err != nil {
            return response.Error(c, 500, err)
        }
        
        return c.Next()
    }
}

// Helper para obtener tenant_id en handlers
func GetTenantID(c *fiber.Ctx) string {
    return c.Locals("tenant_id").(string)
}
```

## PATRÓN: JWT MIDDLEWARE

```go
// internal/middleware/jwt.go
package middleware

import (
    jwtware "github.com/gofiber/contrib/jwt"
    "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
    UserID   string `json:"sub"`
    TenantID string `json:"tenant_id"`  // null para SUPER_ADMIN
    Role     string `json:"role"`
    Email    string `json:"email"`
    jwt.RegisteredClaims
}

func RequireAuth(secret string) fiber.Handler {
    return jwtware.New(jwtware.Config{
        SigningKey: jwtware.SigningKey{Key: []byte(secret)},
        ErrorHandler: func(c *fiber.Ctx, err error) error {
            return response.Error(c, 401, ErrUnauthorized)
        },
    })
}

func RequireRoles(roles ...string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        claims := GetClaims(c)
        for _, role := range roles {
            if claims.Role == role {
                return c.Next()
            }
        }
        return response.Error(c, 403, ErrForbidden)
    }
}

func GetClaims(c *fiber.Ctx) *Claims {
    user := c.Locals("user").(*jwt.Token)
    return user.Claims.(*Claims)
}
```

## PATRÓN: RESPUESTA ESTÁNDAR

```go
// internal/pkg/response/response.go
package response

import "github.com/gofiber/fiber/v2"

type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *APIError   `json:"error,omitempty"`
    Meta    *PaginMeta  `json:"meta,omitempty"`
}

type APIError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

type PaginMeta struct {
    Page    int   `json:"page"`
    PerPage int   `json:"per_page"`
    Total   int64 `json:"total"`
}

func Success(c *fiber.Ctx, data interface{}, meta ...*PaginMeta) error {
    r := APIResponse{Success: true, Data: data}
    if len(meta) > 0 {
        r.Meta = meta[0]
    }
    return c.JSON(r)
}

func Error(c *fiber.Ctx, status int, err error) error {
    return c.Status(status).JSON(APIResponse{
        Success: false,
        Error:   &APIError{Message: err.Error()},
    })
}
```

## POSTGRESQL CON pgx/v5 (NO GORM)

```go
// internal/pkg/database/database.go
package database

import (
    "context"
    "github.com/jackc/pgx/v5/pgxpool"
)

func Connect(url string) *pgxpool.Pool {
    config, err := pgxpool.ParseConfig(url)
    if err != nil {
        log.Fatal("Invalid DB URL:", err)
    }
    
    config.MaxConns = 25
    config.MinConns = 5
    
    pool, err := pgxpool.NewWithConfig(context.Background(), config)
    if err != nil {
        log.Fatal("Cannot connect to DB:", err)
    }
    
    if err := pool.Ping(context.Background()); err != nil {
        log.Fatal("DB ping failed:", err)
    }
    
    return pool
}

// Ejemplo de query típica con RLS
func (r *StudentRepository) ListByGroup(ctx context.Context, groupID string) ([]*Student, error) {
    // RLS ya filtra por tenant automáticamente (via middleware)
    rows, err := r.db.Query(ctx, `
        SELECT s.id, s.first_name, s.last_name, s.enrollment_number
        FROM students s
        JOIN group_students gs ON gs.student_id = s.id
        WHERE gs.group_id = $1 AND s.status = 'active'
        ORDER BY s.last_name, s.first_name
    `, groupID)
    if err != nil {
        return nil, fmt.Errorf("StudentRepository.ListByGroup: %w", err)
    }
    defer rows.Close()
    
    return pgx.CollectRows(rows, pgx.RowToAddrOfStructByName[Student])
}
```
