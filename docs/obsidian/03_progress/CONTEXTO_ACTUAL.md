# Contexto Actual — EduCore SaaS
**Fecha:** 28-04-2026

## 🚀 Estado del Proyecto
Estamos en la **Fase 2: Manager Maestro (Super Admin)**. Se ha establecido la base para la gestión comercial del SaaS.

### ✅ Logros Recientes
- **Infraestructura de Planes:** Base de datos y API para planes de suscripción (Básico, Profesional, Enterprise) completadas.
- **Frontend Super Admin:** Dashboard funcional y módulo de "Planes" integrado con el backend real.
- **Módulo de Escuelas (Super Admin):** 
    - Implementación de la vista de detalle de escuela (`/super-admin/schools/[id]`) con gestión de módulos y estados.
    - Filtros avanzados (búsqueda, estado, plan) y paginación real implementados en el listado de escuelas.
    - Validación de plan y slug en la creación de escuelas (Backend).
- **Módulo de Usuarios Globales (Super Admin):** ✅ **COMPLETADO**
    - CRUD completo para administradores de la plataforma con API real.
    - Backend: `/backend/internal/modules/super_admin/users.go` con todos los endpoints.
    - Frontend: `/frontend/app/super-admin/users/page.tsx` + `UserFormModal.tsx`.
    - Funcionalidades: crear, editar, listar, filtrar, paginar, toggle status, soft delete.

### 🛑 Pendientes Críticos (Lo que falta por hacer)
1. **Backend: Middleware de Cuotas:**
    - Hacer cumplir los límites de alumnos/profesores según el plan (diseño pendiente).
2. **Módulo de Escuelas (School Admin):**
    - Iniciar con el dashboard del director de escuela.
3. **Verificación final Super Admin:**
    - Confirmar que todas las secciones del dashboard usan datos reales (no mock).

## 🛠️ Stack y Configuración
- **Backend:** Go (Fiber) + PostgreSQL + Redis (Railway).
- **Frontend:** Next.js 14 (Static Export).
- **Despliegue:** FTP Sync a `onlineu.mx/educore`.

## Avance 29-04-2026
- **School Admin > Profesores:** completado con listado, filtros, crear, editar, detalle, activar/pausar, mock demo para produccion estatica y backend alineado al schema real.
- **School Admin > Estudiantes:** completado con listado, filtros, matricula, edicion, detalle, activar/pausar y eliminacion con confirmacion.
- **School Admin > Grupos:** completado con listado, busqueda, crear, editar, detalle, activar/pausar y eliminacion con confirmacion.
- **School Admin > Horarios:** completado con agenda semanal, filtros por grupo/dia/estado, crear, editar, detalle, activar/pausar, eliminacion con confirmacion y deteccion de cruces por grupo.
- **School Admin > Reportes:** completado con metricas, historial, filtros, generar reporte, detalle ejecutivo, descarga demo, reprocesar y eliminacion con confirmacion.
- **Seguridad RBAC frontend:** corregido bug critico donde usuarios `PARENT` podian ver rutas `/school-admin/*`; los layouts ahora redirigen por rol y el dropdown de perfil usa rutas propias por rol.
- **Paginas de cuenta por rol:** `profile`, `settings`, `notifications` y `security` creadas para School Admin, Parent y Teacher con componente compartido.
- **School Admin > Comunicaciones:** completado con metricas, filtros por tipo/estado/prioridad, busqueda, crear/enviar, programar, borrador, detalle, duplicar, reenviar, marcar leido y eliminar con confirmacion.
- **School Admin > Estructura Academica:** completado con ciclos escolares actuales/anteriores, catalogo global de materias, alumnos por grado/generacion, grupos con asignacion multiple de profesores/alumnos/materias y horarios por grupo/profesor/materia.
- **School Admin > Configuracion:** completado con configuracion institucional, academica, notificaciones y seguridad; backend real `GET/PUT /settings` y mock persistente para produccion estatica.
- **Correccion backend critica:** rutas de School Admin ya no duplican `/api/v1/school-admin`.
- **Verificacion:** `go test ./...`, `next build` y pruebas headless de Profesores, Estudiantes, Grupos, Horarios y Reportes OK. Estructura Academica verificada con `go test ./...` y `npm run build`.
- **School Admin > Alumnos/Padres + Historial + Importacion Excel:** completado con nombres separados obligatorios, fecha por dia/mes/ano, multiples padres vinculados, historial academico filtrable por ciclo y mapeo visual de columnas Excel.
- **School Admin > Asistencias:** completado con registro diario por grupo, estados presente/ausente/retardo/justificado, notas y resumen inmediato.
- **School Admin > Calificaciones:** completado con captura por grupo/materia, evaluaciones masivas, promedio y estado de aprobacion.
- **Consolidacion modular Core + niveles:** completada ruta incremental sin migrar a `/src/modules`; se extendio `tenant_modules`, se agrego endpoint de modulos activos para School Admin, registry frontend y guards locales por modulo.
- **Nucleo academico base:** los 4 modulos base quedan como prioridad verificada: Auth/Tenant/RBAC, Users, Academic Core y Evaluacion/Calificaciones.
- **SuperAdmin Enterprise Control Plane:** backend/API contracts, migracion `010`, UI enterprise, mocks estaticos, impersonation auditado, health monitor, usage scoring, billing interno, feature flags, backups y versioning completados en local.
- **Verificacion SuperAdmin Enterprise:** `go test ./...`, `npm run build`, `git diff --check` y smoke browser local autenticado en dashboard, modulos, usuarios, billing, health y auditoria OK.
- **Portal de Padres:** completado con dashboard conectado a `authFetch`, rutas reales de hijos, calificaciones, asistencia y mensajes; backend reemplaza placeholders con consultas reales y migracion `011` para mensajes/eventos/tareas.
- **Branding de escuelas:** SuperAdmin pide logo opcional al crear escuela; en demo se persiste como data URL y School Admin muestra logo/nombre de la escuela configurada.
- **Verificacion Portal de Padres:** `go test ./...`, `npm run build`, `git diff --check` y smoke Browser Use local OK; `PARENT` redirige fuera de `/school-admin/*`.
- **Siguiente submodulo:** confirmar deploy productivo y despues avanzar a reportes/analytics o extensiones por nivel educativo.
- **Doctrina Core actualizada:** EduCore queda limitado a 4 modulos tenant-facing hasta que esten production-ready: Auth/Tenant/RBAC, Users, Academic Core y Grading System. Billing y Database Admin existen solo como submodulos internos del SuperAdmin Control Plane.
- **SuperAdmin > Database Admin:** agregado panel de control seguro para listar tablas, ver schema/relaciones, inspeccionar filas paginadas, exportar tabla o base completa a Excel e importar Excel en modo preview/validacion. Backend expone contratos `/api/v1/super-admin/database/*` con tablas protegidas, auditoria y DDL apagado por defecto.
- **SuperAdmin > Billing & Cobranza:** ampliado con estado financiero por institucion, invoices, generar invoice, marcar pagado, recordatorios, reporte mensual y descarga Excel.
- **Documentacion production upgrade:** nueva especificacion `docs/obsidian/01_architecture/CORE_MODULES_PRODUCTION_UPGRADE.md` con schema, services, endpoints, Excel import/export, validacion y estructura UI.
- **Virtual Sub-Database Environment:** al crear escuela se provisiona tenant con admin demo `admin@educore.mx / admin123`, roles base, ciclo actual, grados, materias y grupo inicial. School Admin ahora tiene `/school-admin/database` para explorar y gestionar solo datos de su tenant, con campos/tablas virtuales seguras, export Excel e import preview.
- **Cierre Padres y Profesores:** Teacher Portal completado con dashboard, grupos, asistencia, calificaciones y mensajes. Parent Portal ampliado con documentos, pagos internos/manuales y consentimientos parentales. Backend agrega `/api/v1/teacher/*` y extiende `/api/v1/parent/*` con datos tenant-scoped y auditoria.
- **Siguiente foco recomendado:** smoke productivo de Teacher/Parent y despues endurecer cuotas por plan y reportes/analytics, sin abrir modulos tenant-facing nuevos fuera de los 4 Core.

#module #architecture #super_admin #school_admin
