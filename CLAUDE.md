# EduCore — SaaS de Administración Escolar
# 🤖 INSTRUCCIONES PARA EL AGENTE IA (CLAUDE CODE / CURSOR / WINDSURF)

---

## 🧠 PROTOCOLO DE MEMORIA OBLIGATORIO

**ANTES de hacer CUALQUIER COSA, ejecuta estos pasos:**

1. Lee `docs/obsidian/CONTEXTO_ACTUAL.md` → Estado actual del proyecto
2. Lee `docs/obsidian/CAMBIOS_RECIENTES.md` → Qué se hizo recientemente
3. Lee `docs/obsidian/DECISIONES_TECNICAS.md` → Decisiones ya tomadas (no cuestionar)

**AL TERMINAR cualquier tarea:**

1. Actualiza `docs/obsidian/CAMBIOS_RECIENTES.md` con un entry del formato:
   ```
   ## [FECHA] - [DESCRIPCIÓN CORTA]
   - Módulo: [módulo afectado]
   - Archivos: [lista de archivos creados/modificados]
   - Notas: [algo importante que el agente debe saber]
   ```
2. Ejecuta: `./scripts/auto-commit.sh "[descripción del cambio]"`

---

## 🏗️ STACK TECNOLÓGICO (INMUTABLE — NO CAMBIAR SIN APROBACIÓN)

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Backend | Go + Fiber | Go 1.22+, Fiber v2 |
| BD Principal | PostgreSQL | 16 (local dev) |
| BD Driver | pgx/v5 | NO usar GORM |
| Cache | Redis | 7 (go-redis v9) |
| Query Builder | sqlc | Para queries tipadas |
| Frontend | Next.js App Router | 14 |
| Lenguaje FE | TypeScript | 5+ strict mode |
| UI Base | shadcn/ui + Tailwind | CSS 3 |
| Animaciones | Framer Motion | + Magic UI (copy-paste) |
| Charts | Tremor | Para dashboards |
| Auth | JWT httpOnly | 15min access + 7d refresh |
| Emails | Resend | |
| PDF | chromedp (Go) | Para boletas |
| Storage | Local → AWS S3 | S3 solo en prod |

---

## 📐 ARQUITECTURA

### Backend (Go + Fiber)
- Patrón: **Clean Architecture** estricta
- Capas: `handler → service → repository → DB`
- Multi-tenancy: **Row Level Security PostgreSQL** + `TenantMiddleware`
- Estructura de módulos: cada módulo es independiente con sus propias capas
- **REGLA**: Nunca saltar capas. Handler NO habla con repository directamente.

### Frontend (Next.js)
- **Server Components** por defecto, `use client` solo cuando sea necesario
- **React Hook Form + Zod** para todos los formularios
- **TanStack Query** para data fetching y cache del cliente
- **Zustand** para estado global ligero
- Layouts separados por rol: SuperAdmin, SchoolAdmin, Teacher, Parent

### Multi-Tenancy
- Tenant se resuelve del subdominio: `[slug].educore.mx`
- Se inyecta en cada request via `X-Tenant-ID` header interno
- PostgreSQL RLS: `SET app.current_tenant = 'uuid'` antes de cada query
- **NUNCA** hardcodear tenant_id en queries — siempre desde contexto

---

## 👥 ROLES DEL SISTEMA

```
SUPER_ADMIN  → Scope global. Dueño del sistema.
SCHOOL_ADMIN → Scope tenant. Director/administrador.
TEACHER      → Scope tenant. Solo sus grupos asignados.
PARENT       → Scope tenant. Solo sus hijos registrados.
```

---

## 📁 ESTRUCTURA DE CARPETAS ESPERADA

```
educore/
├── CLAUDE.md                    ← Este archivo
├── CLAUDE.local.md              ← Overrides personales (no commitear)
├── .claude/                     ← Configuración del agente
│   ├── settings.json
│   ├── commands/
│   ├── rules/
│   ├── skills/
│   └── agents/
│
├── Makefile
├── docker-compose.yml           ← PostgreSQL 16 + Redis 7 local
├── scripts/
│   ├── auto-commit.sh
│   ├── migrate.sh
│   └── seed.sh
│
├── docs/
│   └── obsidian/                ← 🧠 BÓVEDA DE MEMORIA
│       ├── CONTEXTO_ACTUAL.md
│       ├── CAMBIOS_RECIENTES.md
│       ├── DECISIONES_TECNICAS.md
│       └── MODULOS/
│
├── backend/                     ← Go + Fiber
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── tenants/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── super_admin/
│   │   │   ├── school/
│   │   │   ├── academic/
│   │   │   └── parents/
│   │   └── pkg/
│   │       ├── database/
│   │       ├── redis/
│   │       ├── jwt/
│   │       └── response/
│   ├── migrations/
│   ├── sqlc/
│   └── go.mod
│
└── frontend/                    ← Next.js 14
    ├── app/
    │   ├── (auth)/
    │   ├── super-admin/
    │   └── [tenant]/
    │       ├── admin/
    │       ├── teacher/
    │       └── parent/
    ├── components/
    │   ├── ui/                  ← shadcn/ui (auto-generado)
    │   ├── layout/
    │   └── modules/
    ├── lib/
    └── types/
```

---

## ⚠️ REGLAS CRÍTICAS

1. **NO uses GORM** — usa sqlc + pgx/v5 directo para queries tipadas y rápidas
2. **NO inventes paquetes** — verifica en go.mod / package.json que existan
3. **Commit defensivo** — ejecuta `./scripts/auto-commit.sh` antes de operaciones grandes
4. **RLS siempre** — toda tabla con datos de escuela DEBE tener política RLS
5. **Tipos estrictos** — TypeScript strict mode, sin `any`
6. **Server Components first** — en Next.js, `use client` solo si hay interactividad
7. **Variables de entorno** — usa `.env` nunca hardcodees credenciales
8. **Un módulo a la vez** — termina y prueba antes de pasar al siguiente

---

## 🎨 ESTÁNDARES DE UI/UX

Lee `.claude/skills/ui-components/SKILL.md` antes de crear cualquier componente frontend.

**Principios:**
- Mobile-first (el portal de padres se usa principalmente en celular)
- Accesibilidad WCAG 2.1 AA mínimo
- Dark mode en admin panels, light mode disponible
- Loading states en TODAS las operaciones async
- Error boundaries en cada módulo
- Micro-animaciones con Framer Motion (no excesivas)
- Feedback inmediato en formularios (validación en tiempo real con Zod)

---

## 📊 MÓDULOS MVP (en orden de desarrollo)

| # | Módulo | Estado | Prioridad |
|---|--------|--------|-----------|
| 1 | Infraestructura + Auth + Multi-tenancy | ⬜ Pendiente | 🔴 Crítico |
| 2 | Manager Maestro (Super Admin) | ⬜ Pendiente | 🔴 Crítico |
| 3 | Manager Escuela + Núcleo Académico | ⬜ Pendiente | 🔴 Crítico |
| 4 | Portal de Padres | ⬜ Pendiente | 🟠 Alto |
