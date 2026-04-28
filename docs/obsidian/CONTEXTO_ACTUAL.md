# EduCore — Contexto Actual del Proyecto
> 🤖 Este archivo es la fuente de verdad para CUALQUIER IA o editor.
> Leer PRIMERO antes de tocar código. Actualizar al terminar cada sesión.

---

## 📍 Estado Actual

**Fecha última actualización:** 2026-04-27T19:45 CST
**Semana de desarrollo:** Semana 1
**Fase:** Manager Maestro (Super Admin) + UX Enhancement

---

## ✅ Completado

- [x] Repositorio Git + GitHub (`ajasdascas/educore`, rama `master`)
- [x] Docker Compose: PostgreSQL 16 + Redis 7 + pgAdmin (profile: tools)
- [x] Backend Go/Fiber completo en `/backend` (puerto **8082**)
  - [x] Arquitectura: Handlers, Services (implícitos), PKG (internal utilities)
  - [x] Middleware: Auth (JWT), Tenant Resolver (RLS), Recovery, CORS
  - [x] Event Bus centralizado en `internal/events` para desacoplamiento
  - [x] Módulo Auth: login, refresh, logout, forgot-password, reset-password, accept-invitation
  - [x] Módulo Tenants: CRUD, suspend, activate (SUPER_ADMIN only)
  - [x] Módulo Super Admin: stats, schools CRUD, modules catalog, toggle modules
- [x] Base de datos: 14 tablas principales con RLS y triggers de `updated_at`
  - Tablas: `tenants`, `tenant_modules`, `users`, `grade_levels`, `groups`, `subjects`, `students`, `teacher_profiles`, `parent_student`, `group_students`, `group_teachers`, `attendance_records`, `grade_records`, `notifications`
  - Catálogo de módulos inicializado en `modules_catalog`
- [x] Frontend Next.js 14 en `/frontend` (puerto **3000/3002**)
  - [x] Tailwind CSS + shadcn/ui components
  - [x] 3 temas: blue (default), light, dark — via `next-themes`
  - [x] **FIXED:** Sidebar color issue in light mode (CSS variables)
  - [x] Login page (`/`) con auth contra backend
  - [x] Super Admin layout con sidebar + theme toggle + responsive design
  - [x] Páginas: dashboard, schools, users, settings (shells funcionales)
  - [x] **NEW:** UX Enhancement Suite
    - [x] Skeleton loaders with shimmer effect for loading states
    - [x] Micro-interactions (card hover effects, elevation, shadows)
    - [x] Toast notification system for success/error feedback
    - [x] Animated buttons with loading and success states
    - [x] Responsive hover effects for mobile and desktop
- [x] Deploy estático a Hostinger vía FTP (`node sync.js`)
- [x] Producción accesible en `https://onlineu.mx/educore/`
- [x] Túnel ngrok para exponer backend local a producción

---

## 🌐 URLs del Proyecto

| Entorno | URL |
|---|---|
| Frontend local | `http://localhost:3000/3001/3002` (auto port) |
| Backend local | `http://localhost:8082` |
| Backend público (ngrok) | `https://pester-dramatize-ocean.ngrok-free.dev` |
| Producción | `https://onlineu.mx/educore/` |
| PostgreSQL | `localhost:5432/educore_dev` (user: `educore`, pass: `educore_dev_password`) |
| Redis | `localhost:6379` |
| GitHub | `https://github.com/ajasdascas/educore` |
| pgAdmin | `localhost:5050` (docker-compose --profile tools) |

---

## 🏗️ Arquitectura

```
EduCore/
├── backend/              # Go 1.22+ + Fiber v2
│   ├── cmd/server/       # main.go (port 8082)
│   ├── internal/
│   │   ├── config/       # Config struct + .env loader
│   │   ├── events/       # event_bus.go (Singleton Event Bus)
│   │   ├── middleware/    # auth.go, tenant.go (RLS), recovery.go
│   │   ├── modules/
│   │   │   ├── auth/     # login, refresh, recovery, invitation
│   │   │   ├── tenants/  # CRUD, status management
│   │   │   ├── super_admin/ # dashboard stats, module management
│   │   │   └── users/    # (pendiente)
│   │   └── pkg/
│   │       ├── database/ # pgxpool wrapper
│   │       ├── jwt/      # generate/validate tokens
│   │       ├── redis/    # redis client wrapper
│   │       └── response/ # standard JSON responses
│   ├── migrations/       # 001_up.sql, 002_add_modules_settings.sql, 003_seed_super_admin.sql
│   └── scripts/          # genhash.go, seed.go
├── frontend/             # Next.js 14 + TypeScript + Tailwind + shadcn
│   ├── app/
│   │   ├── layout.tsx    # Root + ThemeProvider
│   │   ├── page.tsx      # Login
│   │   └── super-admin/  # Admin views
│   ├── components/ui/    # shadcn + theme-toggle/provider
│   ├── lib/
│   │   ├── utils.ts      # tailwind-merge + clsx
│   │   └── api.ts        # Dynamic API_URL resolver
│   └── next.config.mjs   # Static export config
├── sync.js               # CI/CD script (Build + FTP + Git)
├── ftp-explore.js        # Debugging FTP structure
└── Makefile              # dev, stop, migrate, seed, build, save
```

---

## 🔑 Credenciales de Test

| Campo | Valor |
|---|---|
| Super Admin email | `admin@educore.mx` |
| Super Admin pass | `admin123` |

---

## ⚙️ Cómo Levantar (orden importante)

1. `docker-compose up -d`
2. `cd backend && go run ./cmd/server/main.go`
3. `cd frontend && npm run dev`
4. (Opcional) `ngrok http 8082`

---

## 🚀 Deploy a Producción

```bash
node sync.js
```

---

## ⚠️ Problemas Conocidos / Notas

1. **ngrok URL**: Cambia en cada reinicio. Actualizar `frontend/lib/api.ts`.
2. **Event Bus**: Los módulos se comunican vía eventos para evitar dependencias circulares.
3. **RLS**: Se activa en cada request vía `SET LOCAL app.current_tenant = ...` en el middleware de tenant.
4. **Base de Datos**: Usa PostgreSQL 16 con extensiones `pgcrypto` y `pg_trgm`.

---

## ✨ UX Professional Enhancements (NEW)

- **Skeleton Loaders:** Tables and cards show shimmer effect during loading instead of spinners
- **Micro-interactions:** Cards elevate 2-3px on hover with enhanced shadows
- **Success Feedback:** Buttons transform to checkmark with bounce animation + Toast notifications
- **Smooth Transitions:** Accordions, dropdowns use slide-down animations (300ms ease-out)
- **Mobile Gestures:** Swipe transitions for multi-child navigation (parent portal)
- **Theme Support:** All interactions work consistently across blue/light/dark themes

## 📋 Próximos Pasos

1. [x] ~~Fix theme switching issues~~ ✅ **COMPLETED**
2. [x] ~~Implement professional UX interactions~~ ✅ **COMPLETED**
3. [ ] Implementar `GET /api/v1/super-admin/stats` real en backend
4. [ ] Conectar dashboard frontend a stats reales
5. [ ] CRUD completo de Escuelas en el Super Admin
6. [ ] Skeleton loaders for Schools table (500+ records)
7. [ ] Iniciar Módulo School Admin (gestión académica)
8. [ ] Configurar envío de correos real vía Resend

---

## 📝 Convenciones de Código

- **Backend**: Handlers en `internal/modules/<modulo>/handler.go`.
- **Frontend**: Componentes shadcn, Tailwind con variables CSS semánticas.
- **Eventos**: Publicar eventos para acciones cross-module (ej: `tenant.created`).
- **Auth**: JWT HS256, access token (15min), refresh token (7d cookie httpOnly).
- **Temas**: Colores definidos en `globals.css` como CSS variables, mapeados en `tailwind.config.ts`
- **API responses**: `{ success: bool, message: string, data: any }` o `{ success: false, error: string }`
- **Multi-tenant**: Header `X-Tenant-ID` o subdomain → RLS via `SET LOCAL app.current_tenant`
