# EduCore — Decisiones Técnicas
> 🤖 Registro de decisiones de arquitectura y diseño. El agente IA debe leer esto
> ANTES de proponer cambios y NO debe cuestionar estas decisiones sin aprobación del lead.

---

## DT-001: pgx/v5 en lugar de GORM
- **Fecha:** 2026-04-27
- **Decisión:** Usar `jackc/pgx/v5` directo + `sqlc` para queries tipadas
- **Razón:** Performance, control explícito de SQL, compatibilidad nativa con RLS
- **Alternativa descartada:** GORM (demasiada magia, difícil de optimizar con RLS)

## DT-002: Multi-tenancy vía PostgreSQL RLS
- **Fecha:** 2026-04-27
- **Decisión:** Row Level Security con `SET app.current_tenant = 'uuid'` por conexión
- **Razón:** Aislamiento a nivel de base de datos, imposible fugar datos entre tenants por error de código
- **Alternativa descartada:** Filtro manual `WHERE tenant_id = ?` (propenso a errores humanos)

## DT-003: shadcn/ui como base de componentes
- **Fecha:** 2026-04-27
- **Decisión:** shadcn/ui (copy-paste) + Tailwind CSS + Framer Motion
- **Razón:** Componentes accesibles, personalizables, sin vendor lock-in
- **Alternativa descartada:** MUI, Ant Design (bundles grandes, difícil personalizar)

## DT-004: Arquitectura Clean Architecture en Go
- **Fecha:** 2026-04-27
- **Decisión:** `handler → service → repository → DB` estricto por módulo
- **Razón:** Testabilidad (mocks en service), separación de HTTP y lógica de negocio
- **Regla:** Nunca saltar capas. Handler NO habla con repository directo.

## DT-005: JWT httpOnly con refresh token
- **Fecha:** 2026-04-27
- **Decisión:** Access token (15min) en header, refresh token (7d) en httpOnly cookie
- **Razón:** Seguridad contra XSS (el refresh token nunca es accesible desde JS)
