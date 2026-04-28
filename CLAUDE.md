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
2. Ejecuta: `make save` o `./scripts/auto-commit.sh "[descripción del cambio]"`

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
- Patrón: **Clean Architecture** pragmática
- Comunicación: **Event Bus** singleton para desacoplamiento entre módulos
- Capas: `handler → service → repository → DB` (Service/Repo opcionales si la lógica es simple)
- Multi-tenancy: **Row Level Security PostgreSQL** + `TenantMiddleware`
- **REGLA**: Nunca importar un handler desde otro módulo. Usar `events.Publish`.

### Frontend (Next.js)
- **Server Components** por defecto, `use client` solo cuando sea necesario
- **React Hook Form + Zod** para todos los formularios
- **TanStack Query** para data fetching y cache del cliente
- **Zustand** para estado global ligero
- Layouts separados por rol: SuperAdmin, SchoolAdmin, Teacher, Parent

### Multi-Tenancy
- Tenant se resuelve del subdominio o header `X-Tenant-ID`
- PostgreSQL RLS: `SET LOCAL app.current_tenant = 'uuid'` antes de cada query
- **NUNCA** hardcodear tenant_id en queries — siempre desde contexto

---

## 📁 ESTRUCTURA DE CARPETAS

```
educore/
├── backend/
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── events/       ← Bus de eventos
│   │   ├── middleware/
│   │   ├── modules/      ← Módulos independientes
│   │   └── pkg/          ← Utilidades compartidas
│   ├── migrations/
│   └── scripts/
├── frontend/
│   ├── app/              ← App Router
│   ├── components/
│   │   ├── ui/           ← shadcn/ui
│   │   └── modules/      ← Lógica por módulo
│   ├── lib/
│   └── types/
└── docs/obsidian/        ← 🧠 BÓVEDA DE MEMORIA
```

---

## ⚠️ REGLAS CRÍTICAS

1. **NO uses GORM** — usa sqlc o queries nativas con pgx/v5
2. **Commit defensivo** — usa `make save` antes de cambios grandes
3. **RLS siempre** — toda tabla con datos de escuela DEBE tener política RLS
4. **Tipos estrictos** — TypeScript strict mode, sin `any`
5. **Server Components first** — en Next.js, `use client` solo si hay interactividad
6. **Variables de entorno** — usa `.env` nunca hardcodees credenciales

---

## 🎨 ESTÁNDARES DE UI/UX

Lee `.claude/skills/ui-components/SKILL.md` antes de crear componentes.

**Principios:**
- Mobile-first (portal de padres)
- Accesibilidad WCAG 2.1 AA
- Dark mode por defecto en admin panels
- Feedback inmediato en formularios (Zod)

---

## 📊 MÓDULOS MVP (en orden de desarrollo)

| # | Módulo | Estado | Prioridad |
|---|--------|--------|-----------|
| 1 | Infraestructura + Auth + Multi-tenancy | ✅ Completado | 🔴 Crítico |
| 2 | Manager Maestro (Super Admin) | 🔨 En progreso | 🔴 Crítico |
| 3 | Manager Escuela + Núcleo Académico | ⬜ Pendiente | 🔴 Crítico |
| 4 | Portal de Padres | ⬜ Pendiente | 🟠 Alto |

