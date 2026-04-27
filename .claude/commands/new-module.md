# Comando: /new-module
# Uso: /new-module [nombre-modulo] [descripcion]
# Ejemplo: /new-module attendance "Sistema de control de asistencias"

Cuando el usuario ejecute este comando, sigue estos pasos EXACTAMENTE:

## PASO 1 — Leer contexto
1. Lee `docs/obsidian/CONTEXTO_ACTUAL.md`
2. Lee `docs/obsidian/DECISIONES_TECNICAS.md`
3. Lee `CLAUDE.md` para confirmar el stack

## PASO 2 — Crear estructura Backend (Go + Fiber)

Crea la siguiente estructura en `backend/internal/modules/[nombre]/`:
```
[nombre]/
├── handler.go          ← Fiber handlers (HTTP layer)
├── service.go          ← Business logic
├── repository.go       ← DB queries con pgx/v5
├── models.go           ← Structs del dominio
├── routes.go           ← Registro de rutas Fiber
└── dto/
    ├── request.go      ← Request DTOs con validación
    └── response.go     ← Response DTOs
```

**Patrón handler.go:**
```go
package [nombre]

import (
    "github.com/gofiber/fiber/v2"
    "educore/internal/pkg/response"
    "educore/internal/middleware"
)

type Handler struct {
    svc *Service
}

func NewHandler(svc *Service) *Handler {
    return &Handler{svc: svc}
}

func (h *Handler) RegisterRoutes(r fiber.Router) {
    // Define routes here
    r.Get("/", middleware.RequireRoles("SCHOOL_ADMIN"), h.List)
}
```

**Patrón service.go:**
```go
package [nombre]

import "context"

type Service struct {
    repo *Repository
}

func NewService(repo *Repository) *Service {
    return &Service{repo: repo}
}
```

**Patrón repository.go:**
```go
package [nombre]

import (
    "context"
    "github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
    db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
    return &Repository{db: db}
}
```

## PASO 3 — Crear migración SQL

Crea `backend/migrations/[timestamp]_create_[nombre]_tables.sql`:
```sql
-- migrate:up

-- TABLA PRINCIPAL (siempre incluir tenant_id para RLS)
CREATE TABLE [nombre]s (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX idx_[nombre]s_tenant_id ON [nombre]s(tenant_id);

-- ROW LEVEL SECURITY
ALTER TABLE [nombre]s ENABLE ROW LEVEL SECURITY;

CREATE POLICY [nombre]s_tenant_isolation ON [nombre]s
    USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- migrate:down
DROP TABLE IF EXISTS [nombre]s;
```

## PASO 4 — Crear componentes Frontend (Next.js)

Crea en `frontend/app/[tenant]/admin/[nombre]/`:
```
[nombre]/
├── page.tsx            ← Lista principal (Server Component)
├── new/
│   └── page.tsx        ← Formulario de creación
└── [id]/
    └── page.tsx        ← Detalle/edición
```

Crea en `frontend/components/modules/[nombre]/`:
```
[nombre]/
├── [nombre]-table.tsx  ← Tabla con TanStack Table
├── [nombre]-form.tsx   ← Formulario con React Hook Form + Zod
└── [nombre]-card.tsx   ← Card para vistas de lista
```

## PASO 5 — Registrar el módulo

1. Agrega el handler en `backend/cmd/server/main.go`
2. Agrega las rutas al router de Fiber
3. Inyecta dependencias (repo → service → handler)

## PASO 6 — Actualizar Obsidian

1. Crea `docs/obsidian/MODULOS/[nombre].md` con la documentación del módulo
2. Actualiza `docs/obsidian/CONTEXTO_ACTUAL.md` marcando el módulo como en progreso
3. Ejecuta: `./scripts/auto-commit.sh "feat: scaffold módulo [nombre]"`
