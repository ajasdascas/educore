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

---

## [29-04-2026] - SuperAdmin Enterprise Control Plane

### Backend
- Nueva migracion `010_superadmin_enterprise_control_plane.sql` para extender `modules_catalog`, `tenant_modules`, `tenants`, `users`, `subscription_plans` y `audit_logs`.
- Nuevas tablas enterprise: `platform_settings`, `feature_flags`, `feature_flag_scopes`, `subscriptions`, `invoices`, `manual_payments`, `support_tickets`, `support_ticket_events`, `storage_usage_snapshots`, `module_health_events`, `module_usage_snapshots`, `impersonation_sessions`, `backup_jobs`, `system_versions` y `system_deploy_events`.
- Endpoints bajo `/api/v1/super-admin` para dashboard overview, instituciones, modulos, usuarios globales, impersonation, billing, analytics, configuracion, logs, soporte, storage, feature flags, backups, versioning y health.
- Acciones criticas quedan auditadas: module toggle, tenant suspend, reset-data, soft-delete, billing changes, impersonation, backup/restore, deploy/rollback.

### Frontend
- Navegacion SuperAdmin extendida con Modulos, Billing, Analytics, Health Monitor, Auditoria, Soporte, Storage, Feature Flags, Backups y Versioning.
- Nuevo componente compartido `EnterpriseResourcePage` para vistas tabulares enterprise con metricas, busqueda, acciones y toasts.
- Dashboard SuperAdmin consume `/api/v1/super-admin/dashboard/overview`.
- Usuarios globales agregan acciones de reset password, force logout e impersonation.
- Mocks estaticos limpios en `frontend/lib/auth.ts` para que Hostinger static export responda todos los endpoints enterprise sin backend Node.

### Verificacion
- `go test ./...`: OK.
- `npm run build`: OK.
- `git diff --check`: OK.
- Smoke browser local autenticado en dashboard, modulos, usuarios, billing, health y auditoria: OK sin errores de consola.

#super_admin #enterprise #billing #health #audit #frontend #backend

---

## [29-04-2026] - Portal de Padres 100% funcional + logo de escuela

### Backend
- Nueva migracion `011_parent_portal_messages_events.sql`.
- Se agregan tablas `parent_conversations`, `parent_messages`, `school_events` y `student_assignments`.
- `parent_student`, `users` y `notifications` reciben columnas aditivas para compatibilidad con el portal.
- `backend/internal/modules/parent/repository.go` deja placeholders y consulta datos reales de hijos, calificaciones, asistencias, horario, boleta, docentes, tareas, mensajes, calendario y eventos.
- Password update en Parent ahora hashea con bcrypt.

### Frontend
- Nuevas rutas reales: `/parent/children`, `/parent/grades`, `/parent/attendance` y `/parent/messages`.
- Dashboard Parent consume `/api/v1/parent/dashboard` y sus acciones rapidas navegan a rutas funcionales.
- `frontend/lib/auth.ts` agrega mocks persistentes para todo el contrato Parent en Hostinger static export.
- SuperAdmin > Nueva Escuela permite logo institucional opcional con preview; en demo se persiste como data URL.
- School Admin muestra el logo y nombre de la escuela configurada en sidebar/header.

### Verificacion
- `go test ./...`: OK.
- `npm run build`: OK.
- `git diff --check`: OK.
- Browser Use local: Parent Portal carga rutas clave sin 404 y un usuario PARENT no permanece dentro de `/school-admin/*`.

#parent_portal #frontend #backend #branding #security

---

## [29-04-2026] - SuperAdmin Database Admin + Core Production Rule

### Backend
- Nuevo submodulo interno `Database Admin` bajo SuperAdmin con endpoints `/api/v1/super-admin/database/*`.
- Se agrego introspeccion de tablas, columnas, constraints, relaciones, filas paginadas y snapshots para export Excel.
- Operaciones de escritura quedan auditadas; tablas sensibles quedan protegidas; DDL real requiere `EDUCORE_ENABLE_DB_ADMIN_DDL=true`.
- Nueva migracion `012_database_admin_control_panel.sql` para metadata de tablas ocultas y bitacora de operaciones.

### Frontend
- Nueva ruta `/super-admin/database` con listado de tablas, schema, relaciones, preview de filas, export de tabla, export full DB e import Excel en preview.
- `frontend/lib/auth.ts` agrega mocks estaticos para que Hostinger static export pueda probar Database Admin sin backend Node.
- Navegacion SuperAdmin incluye `Database Admin`.
- `/super-admin/billing` queda ampliado con MRR, cobrado, pendiente, suscripciones, invoices, generar invoice, marcar pagado, recordatorios y export Excel.

### Arquitectura
- Se formaliza que EduCore solo abre 4 modulos tenant-facing hasta que esten production-ready: Auth/Tenant/RBAC, Users, Academic Core y Grading System.
- Billing y Database Admin se clasifican como submodulos internos de SuperAdmin Control Plane, no como modulos nuevos para escuelas.

#super_admin #database #security #frontend #backend #architecture
# [29-04-2026] Responsive fix SuperAdmin Database Admin
- Corregido overflow horizontal global en `SuperAdminLayout`.
- Adaptada `/super-admin/database` para desktop, tablet y mobile sin tener que recorrer toda la pagina horizontalmente.
- Las tablas de schema y datos conservan scroll interno dentro de la card cuando el contenido es ancho.
- Verificacion: `npm run build` y `git diff --check` OK.
# 29-04-2026 - Virtual Sub-Database Environment por escuela

- Provisionamiento de escuelas reforzado: SuperAdmin ahora crea el tenant con admin demo `admin@educore.mx / admin123`, roles base, ciclo escolar actual, grados, materias base y grupo inicial.
- Login backend actualizado para resolver `admin@educore.mx` por rol/tenant y evitar colision entre SuperAdmin global y School Admin de tenant.
- Agregado backend `/api/v1/school-admin/database/*` con explorador tenant-scoped: tablas permitidas, schema, relaciones, filas paginadas, DML auditado, export e import validation.
- Agregada migracion `013_tenant_virtual_database_environment.sql` con roles tenant, campos virtuales, tablas virtuales, filas custom y audit logs del explorador.
- Agregado frontend `/school-admin/database` estilo table editor responsive, sin scroll horizontal global, con export Excel, preview de import, edicion de filas y campos/tablas virtuales.
- Mocks estaticos Hostinger actualizados para School Admin Database Explorer y provisionamiento demo de escuelas.

#module #school_admin #security #backend #frontend #database

---

# 29-04-2026 - Cierre Padres y Profesores

- Agregado backend Teacher bajo `/api/v1/teacher/*` con dashboard, clases, alumnos por grupo, asistencia, calificaciones y mensajes, filtrado por `tenant_id` y `teacher_id`.
- Agregada migracion `014_parent_teacher_portal_completion.sql` con documentos escolares, pagos internos/manuales por alumno, consentimientos parentales y auditoria padre-profesor.
- Parent Portal ampliado con `/parent/documents`, `/parent/payments` y `/parent/consents`.
- Teacher Portal deja de estar en construccion: nuevas rutas `/teacher/classes`, `/teacher/attendance`, `/teacher/grades` y `/teacher/messages`.
- `frontend/lib/auth.ts` agrega mocks persistentes para Teacher y para documentos/pagos/consentimientos de Parent en Hostinger static export.
- Verificacion local: `go test ./...`, `npm run build` y smoke estatico de rutas nuevas OK.

#parent_portal #teacher_portal #frontend #backend #security #ux

---

# 29-04-2026 - Hardening deploy Hostinger

- Corregido `.github/workflows/deploy.yml` despues de un fallo real en GitHub Actions por el paso `Test FTP connection`.
- El deploy ahora usa `lftp` con `passive-mode`, `prefer-epsv false`, `dns:order inet`, retries y timeouts mas robustos.
- La verificacion FTP ya no depende de `ls` en raiz; valida acceso directo al path `/domains/onlineu.mx/public_html/educore/`.
- Despliegue y post-check tambien quedan con reintentos y verificacion posterior de archivos.
- Resultado: GitHub Actions `25138255245` en verde y despliegue a Hostinger completado.

#deploy #hostinger #github_actions #ci_cd
