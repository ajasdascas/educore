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

---

## [29-04-2026] - School Admin: Alumnos, Padres, Historial e Importacion Excel

### Backend
- Nueva migracion `008_students_parents_history_imports.sql` para apellidos separados, fecha por partes, metadata de padres, historial academico e import batches.
- Nuevos contratos para padres/tutores, historial academico y commit de importacion masiva.
- Endpoints agregados:
  - `GET /api/v1/school-admin/academic/students/:id/history`
  - `POST /api/v1/school-admin/academic/imports/students/commit`
- Importacion backend transaccional para alumnos, padres vinculados e historial academico.

### Frontend
- `school-admin/students` ahora captura `Nombre(s)`, `Apellido paterno`, `Apellido materno` y nacimiento como `Dia`, `Mes`, `Ano`.
- Registro de multiples padres/tutores en el mismo flujo, con contacto principal obligatorio.
- Detalle de alumno con pestañas de resumen, padres e historial academico filtrable por ciclo escolar.
- Importador Excel con selector de hoja, filtro de columnas, automapeo, mapeo visual y preview antes de importar.

### Verificacion
- `go test ./...`: OK.
- `npm run build`: OK.

#school_admin #students #parents #imports #backend #frontend

---

## [29-04-2026] - School Admin: Asistencias y Calificaciones

### Backend
- `GetTodayAttendance` y `BulkUpdateAttendance` implementados sobre `attendance_records`.
- `GetGroupGrades` y `BulkUpdateGrades` implementados sobre `grade_records`.
- Los endpoints existentes dejan de responder objetos vacios para flujos clave del nucleo academico.

### Frontend
- Nueva ruta `/school-admin/attendance` para tomar asistencia por grupo y fecha.
- Nueva ruta `/school-admin/grades` para capturar calificaciones por grupo y materia.
- Navegacion lateral y acciones rapidas del dashboard actualizadas a rutas reales.
- Mocks persistentes en `localStorage` para que produccion estatica funcione sin errores.

### Verificacion
- `go test ./...`: OK.
- `npm run build`: OK.

#school_admin #attendance #grades #backend #frontend

---

## [29-04-2026] - Consolidacion Modular Core + Extensiones por Nivel

### Backend
- Nueva migracion `009_modular_core_activation.sql` para extender `tenant_modules` con `enabled`, `level`, `is_required`, `source`, `created_at` y `updated_at`.
- `modules_catalog` queda alineado con modulos Core: usuarios, alumnos, grupos, horarios, asistencias, calificaciones, reportes y comunicaciones.
- SuperAdmin activa modulos core y modulos por nivel al crear escuelas sin crear una tabla paralela.
- Nuevo endpoint `GET /api/v1/school-admin/modules/enabled` para que School Admin consulte su contrato modular activo.

### Frontend
- Nuevo registry modular en `frontend/lib/modules`.
- Nuevo `ModuleGuard` y `ModuleBoundary` para aislar pantallas del School Admin.
- Navegacion School Admin filtra pantallas segun modulos activos del tenant.
- Pantallas core protegidas localmente: estructura academica, estudiantes, profesores, grupos, horarios, asistencias, calificaciones, reportes y comunicaciones.

### Verificacion
- `go test ./...`: OK.
- `npm run build`: OK.

#architecture #modules #school_admin #super_admin #backend #frontend
