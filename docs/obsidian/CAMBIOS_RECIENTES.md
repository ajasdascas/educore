# EduCore — Cambios Recientes

## 2026-04-27 (FASE 1 COMPLETADA: Infraestructura, Auth y Multi-tenancy)
- ✅ **Tenant Engine**: Middleware completo de inyección `tenant_id` para RLS PostgreSQL
- ✅ **RBAC System**: Sistema jerárquico de roles con guardias de acceso (SUPER_ADMIN > SCHOOL_ADMIN > TEACHER > PARENT)
- ✅ **Session Management**: Control completo de sesiones con refresh tokens, device tracking y expiración
- ✅ **Email & Invite Service**: Sistema de invitaciones automatizado con templates y cola de emails
- ✅ **Audit Logging**: Registro completo de acciones críticas filtradas por tenant
- ✅ **Database Infrastructure**: Migraciones para 4 nuevas tablas con RLS y índices optimizados

### Archivos Creados
- `backend/internal/middleware/tenant.go` — Middleware de resolución de tenant con RLS
- `backend/internal/middleware/rbac.go` — Sistema de roles jerárquico
- `backend/internal/modules/sessions/` — Gestión completa de sesiones de usuario
- `backend/internal/modules/email/` — Sistema de emails con cola y templates
- `backend/internal/modules/audit/` — Logging de auditoría por tenant
- `backend/migrations/004_infrastructure_tables.sql` — Tablas de infraestructura
- `backend/internal/middleware/auth.go` — Actualizado para compatibilidad RBAC

## 2026-04-27 (Refactorización Responsive Total)
- ✅ **Entorno activado**: PostgreSQL, Backend Go/Fiber (puerto 8082) y Frontend Next.js (puerto 3000) funcionando correctamente
- ✅ **Layout Responsive**: Refactorizado `frontend/app/super-admin/layout.tsx` con sidebar colapsible para móviles
  - Menú hamburguesa funcional con overlay para pantallas pequeñas
  - Breakpoints lg: para mostrar/ocultar sidebar automáticamente
  - Header adaptativo con espaciado responsive
- ✅ **Página Schools**: Creado contenido completo responsive en `frontend/app/super-admin/schools/page.tsx`
  - Grid de estadísticas adaptable (1/2/4 columnas según pantalla)
  - Cards responsivas para móviles con información jerárquica
  - Búsqueda y filtrado funcional
- ✅ **Dashboard mejorado**: Expandido `frontend/app/super-admin/dashboard/page.tsx` con más estadísticas
  - Grids adaptativos para diferentes pantallas
  - Actividad reciente y resumen de planes
- ✅ **Página Users responsive**: Actualizado `frontend/app/super-admin/users/page.tsx`
  - Tabla desktop + vista cards para móviles
  - Información reorganizada para pantallas pequeñas
- ✅ **Configuración optimizada**: Ajustado `frontend/app/super-admin/settings/page.tsx` con grids responsive

### Archivos Modificados
- `frontend/app/super-admin/layout.tsx` — Layout responsive con sidebar colapsible
- `frontend/app/super-admin/schools/page.tsx` — Página completa responsive desde cero
- `frontend/app/super-admin/dashboard/page.tsx` — Expandido y mejorado responsive
- `frontend/app/super-admin/users/page.tsx` — Vista dual desktop/mobile
- `frontend/app/super-admin/settings/page.tsx` — Grids responsive
- `docs/obsidian/CAMBIOS_RECIENTES.md` — Este log

## 2026-04-27 (Sesión Nocturna - Antigravity)
- ✅ **Análisis profundo del proyecto**: Revisión de todos los archivos de backend, frontend y base de datos.
- ✅ **Sincronización de Memoria**: Actualización de `CLAUDE.md` y `CONTEXTO_ACTUAL.md` para reflejar la realidad del código.
- ✅ **Nuevos componentes identificados**: Event Bus singleton en Go, middleware de Recovery, scripts de seeding y hashing.
- ✅ **Base de Datos**: Verificación de las 14 tablas con RLS y el catálogo de módulos.
- ✅ **Infraestructura**: Verificación del flujo FTP y ngrok para desarrollo híbrido local/nube.

### Archivos Modificados
- `docs/obsidian/CONTEXTO_ACTUAL.md` — Actualizado con arquitectura y DB real.
- `CLAUDE.md` — Refinado para incluir Event Bus y estado de módulos.
- `docs/obsidian/CAMBIOS_RECIENTES.md` — Este log.
