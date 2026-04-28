# Cambios Recientes — EduCore
**Sesión:** 28-04-2026

## [28-04-2026] — ✅ Módulo de Usuarios Globales COMPLETADO

### 🏗️ Backend (Go)
- **`/backend/internal/modules/super_admin/users.go`:**
    - Implementación completa del CRUD para administradores de la plataforma.
    - Endpoints: `GET /users` (con paginación, búsqueda y filtros), `POST /users`, `PUT /users/:id`, `PATCH /users/:id/toggle`, `DELETE /users/:id`.
    - Validación de email único, hash seguro de contraseñas con bcrypt.
    - Soft delete (desactivación) en lugar de eliminación física.
    - Protección contra auto-eliminación del usuario actual.
- **`/backend/internal/modules/super_admin/handler.go`:**
    - Registrado `h.RegisterUserRoutes(router)` para activar endpoints de usuarios.

### 🎨 Frontend (Next.js)
- **`/frontend/app/super-admin/users/page.tsx`:**
    - Reescrita completamente para usar APIs reales en lugar de datos mock.
    - Funcionalidades: listado con búsqueda/filtros, creación, edición, toggle estado, eliminación suave.
    - UI mejorada con skeletons de carga, estadísticas en tiempo real, toast notifications.
- **`/frontend/app/super-admin/users/UserFormModal.tsx`:** ✨ **NUEVO**
    - Modal responsivo para crear/editar usuarios con validación Zod + React Hook Form.
    - Campos dinámicos: password solo en creación, toggle de visibilidad, validación en tiempo real.
    - Integración completa con APIs del backend.
- **`/frontend/components/ui/form.tsx`:** ✨ **NUEVO**
    - Componentes de formulario compatibles con React Hook Form y shadcn/ui.
    - Soporte completo para validación, estados de error, accesibilidad.

### 🔧 Arquitectura
- **Patrón establecido:** Repository/Service/Handler mantenido consistente con otros módulos.
- **Seguridad:** Validación en backend, hash de contraseñas, protección CSRF automática.
- **UX:** Estados de carga, feedback visual, confirmaciones para acciones destructivas.

**✅ RESULTADO:** Módulo de Usuarios Globales 100% funcional y conectado a APIs reales. Super Admin puede gestionar administradores de la plataforma completamente.

---

## [28-04-2026] — Mejora de Gestión de Escuelas y Detalle de Tenant

### 🏗️ Backend (Go)
- **Listado de Escuelas:**
    - Implementación de filtros dinámicos (`search`, `status`, `plan`) en `ListSchools`.
    - Paginación real con metadatos (`total`, `page`, `per_page`) siguiendo la convención `SuccessWithMeta`.
    - Auditado y corregido el manejo de errores en queries y escaneos de base de datos.
- **Creación de Escuelas:**
    - Añadida validación de existencia de plan y disponibilidad de slug (subdominio).
    - Corregida la inserción de `settings` como JSONB mediante `json.Marshal`.
    - Añadida verificación de errores en inserciones de módulos y niveles de grado.
- **Gestión de Archivos:**
    - Corregida la función `UploadLogo` para asegurar la existencia del directorio de subida.
- **Importaciones:** Añadidos `strconv`, `encoding/json` y `os` para funcionalidades robustas.

### 🎨 Frontend (Next.js)
- **Vista de Detalle de Escuela:**
    - Creada página `/super-admin/schools/[id]`.
    - Integración de pestañas para información general, gestión de módulos (toggle) y listado de usuarios del tenant.
    - Funcionalidad para cambiar el estado de la escuela (Activa, En Prueba, Suspendida).
- **Listado de Escuelas:**
    - Implementación de barra de búsqueda con debounce.
    - Selectores de filtro por estado y plan vinculados al backend.
    - Paginación visual y funcional.
    - Enlaces directos a la vista de detalle.

### 🔧 DevOps
- **Documentación:** Actualizada la bóveda de Obsidian para reflejar el estado actual del MVP.

## [28-04-2026] — Infraestructura de Super Admin (Planes y Escuelas)

### 🏗️ Backend (Go)
- **Base de Datos:**
    - Migración `005_subscription_plans.sql`: Creada tabla maestra de planes.
    - Migración `006_alter_tenants_plan.sql`: Alterada tabla `tenants` para soportar IDs de planes dinámicos.
- **Módulos:**
    - `plans.go`: Endpoints CRUD para gestión de suscripciones.
    - `schools.go`: Endpoints para gestión de estatus (`PATCH /status`) y listado de usuarios por escuela (`GET /users`).
    - `handler.go`: Registro y orquestación de nuevas rutas.

### 🎨 Frontend (Next.js)
- **Módulo Planes:**
    - `app/super-admin/plans/page.tsx`: UI para administración de planes.
    - `PlanFormModal.tsx`: Formulario dinámico para creación/edición de planes.
- **Módulo Escuelas:**
    - Actualizado selector de planes en el modal de creación para cargar datos reales del backend.
- **Componentes UI:**
    - Añadidos `textarea.tsx` y `switch.tsx` al catálogo de shadcn.

### 🔧 DevOps
- **Producción:** Limpieza de caché en Hostinger tras despliegue de corrección de sintaxis en `page.tsx`.

## ⏭️ Próximos Pasos (Pendientes)
- ✅ ~~Iniciar módulo de gestión de usuarios globales~~ **COMPLETADO**
- Implementar middleware de cuotas según plan de suscripción.
- Verificar que todo el dashboard Super Admin usa datos reales (no mock).
- Iniciar Fase 3: Módulo de Escuelas (School Admin).

#super_admin #backend #frontend #changelog
