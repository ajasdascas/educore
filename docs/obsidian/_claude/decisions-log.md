# Log de Decisiones Arquitectónicas — EduCore

## [28-04-2026] — Desacoplamiento de Planes de Suscripción

### Decisión
Migrar de un sistema de planes "hardcoded" (starter, pro, enterprise) en el schema de la base de datos a un sistema dinámico basado en la tabla `subscription_plans`.

### Razón
El modelo SaaS requiere flexibilidad para cambiar precios, límites de alumnos y módulos incluidos sin necesidad de alterar el código fuente o realizar migraciones de schema constantes.

### Impacto
- **Backend:** Se requiere validar la existencia del `plan_id` al crear un tenant.
- **Frontend:** El formulario de creación de escuelas ahora depende de la precarga de planes desde la API.
- **DB:** Se eliminó el constraint `CHECK` en `tenants.plan` para permitir strings de UUIDs.

## [28-04-2026] — Modularización de Handlers de Super Admin

### Decisión
Separar los handlers de `super_admin` en archivos específicos (`plans.go`, `schools.go`) dentro del mismo paquete.

### Razón
Evitar que `handler.go` se convierta en un archivo masivo difícil de mantener, facilitando la navegación por código según la entidad (Planes vs Escuelas).

#architecture #decision #database #backend
## 29-04-2026 - School Admin se monta sobre router padre

**Decision:** El handler de School Admin debe registrar rutas relativas al router recibido, no crear de nuevo `/api/v1/school-admin`.

**Razon:** `cmd/server/main.go` ya monta el grupo protegido en `/api/v1/school-admin`. Repetir el prefijo dejaba endpoints reales bajo `/api/v1/school-admin/api/v1/school-admin/...`, rompiendo frontend y contratos REST.

**Impacto:** Los endpoints de School Admin quedan accesibles en rutas limpias como `/api/v1/school-admin/academic/teachers`, compatibles con frontend, mocks y documentacion futura.

#backend #api #school_admin

## 29-04-2026 - Estudiantes usa schema academico existente

**Decision:** El backend de School Admin > Estudiantes se adapto al schema actual en lugar de agregar columnas nuevas para contacto del alumno.

**Razon:** La tabla `students` actual contiene datos academicos base (`enrollment_number`, nombre, fecha nacimiento, estado, notas), mientras que tutores viven en `users` + `parent_student`. Agregar columnas duplicadas para email/telefono/direccion hubiera creado deuda y riesgo de inconsistencia.

**Impacto:** Los endpoints de estudiantes ya no consultan columnas inexistentes. El contacto principal se obtiene desde el tutor relacionado; campos extra de demo se mantienen solo en frontend/mock hasta formalizar una migracion de perfil extendido.

#backend #database #school_admin #students

## 29-04-2026 - Grupos usa tabla de asignaciones para profesor titular

**Decision:** El profesor titular de un grupo se gestiona mediante `group_teachers` en lugar de agregar `teacher_id` directo a `groups`.

**Razon:** El schema actual ya modela la relacion grupo-profesor-materia con `group_teachers`, lo cual permite crecer a multiples profesores por grupo sin redisenar la tabla principal.

**Impacto:** El modulo de Grupos puede mostrar y actualizar un titular inicial hoy, manteniendo compatibilidad con futuras asignaciones por materia.

#backend #database #school_admin #groups

## 29-04-2026 - Horarios opera primero como agenda estatica persistente

**Decision:** El submodulo School Admin > Horarios se implemento en frontend con mock persistente en `localStorage` y contrato `authFetch` bajo `/api/v1/school-admin/academic/schedule`, sin agregar tablas nuevas todavia.

**Razon:** Produccion corre como Next.js static export en Hostinger. Para que el modulo sea usable inmediatamente y no bloquear el roadmap, la agenda semanal debe funcionar en modo demo/estatico con crear, editar, pausar y eliminar. El schema formal de horarios debe agregarse despues con migracion explicita y revision de RLS.

**Impacto:** La UX y contratos del modulo quedan definidos. Cuando se formalice backend, se podra conectar el mismo endpoint a tablas reales sin cambiar el flujo de usuario.

#frontend #school_admin #schedule #architecture

## 29-04-2026 - Reportes define UX y contrato antes de motor real

**Decision:** School Admin > Reportes se implemento como modulo funcional en static export con historial persistente, generacion demo, descarga local y contrato `authFetch` bajo `/api/v1/school-admin/reports`.

**Razon:** El backend de reportes existe como modulo general, pero requiere alineacion futura con rutas, permisos y tablas reales. Para mantener avance sin romper produccion estatica, primero se fijo la experiencia completa y acciones esperadas por direccion escolar.

**Impacto:** El modulo queda usable en produccion demo y listo para conectar a un motor real de PDF/Excel cuando se formalicen jobs asincronos, almacenamiento de archivos y RLS por tenant.

#frontend #school_admin #reports #architecture

## 29-04-2026 - Navegacion de cuenta y rutas protegidas por rol

**Decision:** Las rutas de cuenta (`profile`, `settings`, `notifications`, `security`) se resuelven por rol desde `ProfileDropdown`, y cada layout principal aplica una guarda RBAC antes de renderizar contenido.

**Razon:** Un usuario `PARENT` estaba entrando a `/school-admin/*` y el dropdown lo llevaba a `/super-admin/*`, lo cual es un bug critico de seguridad y una ruptura clara del modelo RBAC. Convertir automaticamente el usuario a otro rol queda prohibido; si la sesion no coincide, se redirige a su dashboard real.

**Impacto:** `SUPER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER` y `PARENT` quedan aislados a sus areas. La UX de cuenta se comparte con un componente comun, reduciendo duplicacion sin mezclar permisos ni rutas.

#security #frontend #rbac #school_admin

## 29-04-2026 - Comunicaciones opera como modulo demo persistente

**Decision:** School Admin > Comunicaciones queda implementado con estado persistente en `localStorage` y contrato `authFetch` bajo `/api/v1/school-admin/communications`.

**Razon:** Produccion usa static export en Hostinger. Para entregar flujo funcional sin esperar jobs reales de email/SMS, se define primero la experiencia completa: enviar, programar, borrar, duplicar, reenviar y consultar lectura.

**Impacto:** El modulo queda usable en produccion demo y listo para conectar a proveedores reales de comunicacion cuando se formalicen colas, auditoria y tablas multi-tenant.

#frontend #school_admin #communications #architecture
## 29-04-2026 — Estructura academica School Admin

**Decision:** Implementar Ciclos Escolares como entidad propia (`school_years`) y mantener `groups.school_year` como compatibilidad legacy.

**Razon:** La app ya usaba `school_year` textual en grupos y calificaciones. Agregar `school_year_id` permite gestion formal de ciclos actuales/anteriores sin romper datos existentes ni builds estaticos.

**Impacto:** Grupos, horarios y materias pueden operar con ciclos reales. Se evita una migracion destructiva y se mantiene compatibilidad con produccion actual.

#architecture #school_admin #database

## 29-04-2026 — Configuracion School Admin

**Decision:** Guardar configuraciones extendidas de escuela en `tenants.settings` y mantener los campos academicos legacy en `school_settings`.

**Razon:** `school_settings` ya existia con ciclo, periodos, escala y color. Usar `tenants.settings` para secciones flexibles evita migraciones destructivas y permite evolucionar notificaciones/seguridad sin romper produccion.

**Impacto:** School Admin puede editar configuracion real y mantener compatibilidad con el backend y los mocks de exportacion estatica.

#architecture #school_admin #settings #database

## 29-04-2026 - Expediente de alumno con padres e historial formal

**Decision:** Extender `students` con apellidos separados y fecha por partes, mantener `last_name` y `birth_date` como compatibilidad legacy, y agregar `student_academic_history` + `import_batches` para historiales e importaciones.

**Razon:** El flujo escolar necesita registrar datos legales separados sin romper las consultas actuales. La importacion Excel debe dejar trazabilidad de lote y permitir cargar informacion historica de muchas columnas sin depender de un backend Node en Hostinger static export.

**Impacto:** School Admin puede matricular alumnos con padres vinculados, consultar historial por ciclo y hacer importaciones masivas demo hoy; el backend queda preparado para persistencia real transaccional por tenant.

#architecture #school_admin #students #database #imports

## 29-04-2026 - Asistencias y calificaciones usan tablas legacy con UX dedicada

**Decision:** Activar `attendance_records` y `grade_records` como fuente real del backend, manteniendo mocks persistentes en `authFetch` para produccion estatica.

**Razon:** Las tablas ya existian desde la migracion inicial y solo faltaba una experiencia School Admin dedicada. Reusar el schema reduce riesgo y permite que el mismo contrato funcione tanto en demo Hostinger como en API real.

**Impacto:** La direccion escolar ya puede tomar asistencia y capturar calificaciones por grupo/materia. El nucleo academico queda listo para extender reportes, boletas y portal de padres sin redisenar rutas.

#architecture #school_admin #attendance #grades

## 29-04-2026 - SuperAdmin Enterprise se implementa como control plane auditado

**Decision:** Implementar el SuperAdmin Enterprise Control Plane como capa incremental sobre Go Fiber + PostgreSQL + Next.js static export, con migracion aditiva `010` y mocks estaticos para Hostinger.

**Razon:** EduCore necesita control SaaS central sin romper el flujo productivo actual. Billing, health monitor, usage scoring, feature flags, backups y versioning deben existir como contratos y UI antes de conectar ejecucion real de infraestructura.

**Impacto:** El SuperAdmin ahora tiene contratos para instituciones, modulos, usuarios globales, impersonation auditado, billing interno, analytics, logs, soporte, storage, backups y versioning. Las acciones sensibles quedan auditadas y las destructivas requieren confirmacion o jobs protegidos.

#architecture #super_admin #security #audit #billing

## 29-04-2026 - Parent Portal usa contratos reales y mocks estaticos

**Decision:** Completar Portal de Padres con backend real sobre el Core academico y mocks persistentes para Hostinger static export.

**Razon:** El MVP necesita que padres consulten hijos, calificaciones, asistencias y mensajes sin rutas 404. Duplicar datos por portal aumentaria riesgo de inconsistencias; usar las tablas core conserva una fuente de verdad.

**Impacto:** `PARENT` tiene rutas propias funcionales bajo `/parent/*`, con verificacion padre-hijo en backend y demo estable en produccion estatica. Mensajeria/eventos/tareas quedan modelados con migracion aditiva.

#architecture #parent_portal #security #frontend #backend

## 29-04-2026 - Logo de escuela como parte del tenant

**Decision:** El logo institucional se captura desde SuperAdmin al crear escuela y se guarda como `logo_url` del tenant/mocks.

**Razon:** `tenants.logo_url` ya existe y es el punto natural para branding institucional. Mantenerlo ahi evita tablas paralelas y permite reutilizarlo en School Admin, detalles de escuela y futuras paginas publicas.

**Impacto:** El panel School Admin puede mostrar logo/nombre de escuela configurada. En modo demo, el archivo se convierte a data URL para no depender de upload real en Hostinger static export.

#architecture #branding #super_admin #school_admin

## 29-04-2026 - Database Admin es submodulo interno, no modulo tenant-facing

**Decision:** Implementar Database Admin dentro del SuperAdmin Control Plane y mantener la regla de 4 modulos Core tenant-facing: Auth/Tenant/RBAC, Users, Academic Core y Grading System.

**Razon:** La plataforma necesita control total de datos, export/import Excel y cobranza para competir con SaaS escolares reales, pero abrir mas modulos funcionales antes de cerrar el Core dispersaria el roadmap y aumentaria riesgo de regresiones.

**Impacto:** SuperAdmin gana inspeccion de tablas, schema, relaciones, filas paginadas, export full DB e import preview. Las operaciones estructurales DDL quedan apagadas por defecto y requieren `EDUCORE_ENABLE_DB_ADMIN_DDL=true`; acciones sensibles quedan auditadas.

#architecture #super_admin #database #security #billing
# 29-04-2026 - Columnas/tablas tenant como virtual schema

## Decision
Las personalizaciones de base de datos que ve el School Admin se implementan como campos virtuales (`custom_fields` JSONB + `tenant_custom_fields`) y tablas virtuales (`tenant_custom_tables` + `tenant_custom_rows`), no como `ALTER TABLE` fisico por escuela.

## Razon
EduCore usa una base PostgreSQL compartida multi-tenant. Permitir DDL por tenant romperia migraciones, performance, RLS y mantenibilidad a escala. La capa virtual da la experiencia de "base propia" sin comprometer el schema global.

## Impacto
- School Admin puede crear campos y tablas propias de forma segura.
- SuperAdmin conserva el control estructural real.
- Los exports/imports pueden incluir datos virtuales junto a los core.

#architecture #security #database #school_admin

---

# 29-04-2026 - Padres y Profesores se cierran sobre Core existente

## Decision
El cierre de Padres y Profesores no crea modulos tenant-facing nuevos; Teacher Portal y Parent Portal consumen los 4 Core existentes mas comunicaciones, reportes y billing interno/manual donde aplique.

## Razon
Evita duplicar Academic Core y Grading System. Los docentes operan sobre grupos, asistencia y calificaciones existentes; los padres ven documentos, pagos y consentimientos filtrados por `parent_student`.

## Impacto
- Teacher tiene API propia `/api/v1/teacher/*` como fachada segura tenant-scoped.
- Parent extiende `/api/v1/parent/*` con documentos, pagos, consentimientos y resumen.
- La regla de 4 Core sigue vigente.

#architecture #teacher_portal #parent_portal #core_modules
# 30-04-2026 - Boletas, documentos y DB escolar siguen dentro de Core

## Decision
El cierre de School Admin no crea modulos tenant-facing nuevos. Documentos, boletas, asistencia, horarios y expedientes quedan como capacidades internas sobre Academic Core, Grading System y Users, manteniendo la doctrina de 4 Core.

## Razon
La prioridad es terminar flujos operativos reales sin fragmentar el producto. Documentos y boletas son extensiones del expediente academico, no modulos independientes.

## Impacto
- School Admin gana `/documents` y `/report-cards` como vistas operativas.
- Backend mantiene endpoints tenant-scoped bajo `/api/v1/school-admin/*`.
- Las acciones criticas se auditan y las operaciones destructivas usan soft delete cuando aplica.
- La UX responsive evita scroll horizontal global y nombres largos de escuela ya no se enciman.

#architecture #school_admin #academic_core #grading #security #frontend

---

# 30-04-2026 - Expedientes escolares fisicos/digitales en School Admin

## Decision
Los documentos de estudiantes se manejan como parte del expediente academico del School Admin con estado `physical_only`, `digital_only` o `both`, mas verificacion administrativa.

## Razon
Muchas escuelas conservan archivo fisico y digital al mismo tiempo. Modelarlo como estado del documento evita duplicar registros y permite que control escolar sepa si falta escaneo, validacion o resguardo fisico.

## Impacto
- `/school-admin/documents` puede registrar documentos fisicos, subir archivo digital, reemplazarlo, previsualizarlo, marcarlo verificado y eliminarlo con soft delete.
- El detalle de estudiante muestra documentos como seccion propia del expediente.
- Backend y mocks conservan metadata tenant-scoped sin crear un modulo nuevo fuera del Core.

#architecture #school_admin #documents #academic_core #security
# 30-04-2026 - School Admin header no debe renderizar nombre largo en header

## Decision
El header de School Admin mostrara solo `Panel Escuela`; el nombre completo de la escuela queda en el sidebar con truncado seguro y tooltip/title.

## Razon
En produccion el nombre `Instituto Tecnologico Don Bosco` podia superponerse con `Panel Escuela` y con controles de usuario en pantallas medianas. Repetir el nombre largo en header no aportaba valor operativo y si rompia la UX.

## Impacto
- Menos riesgo de overlap con instituciones de nombre largo.
- Header mas estable en desktop/tablet/mobile.
- Branding institucional sigue visible en sidebar y puede crecer despues con tooltip o selector de campus.

#decision #frontend #ux #school_admin

---

# 30-04-2026 - Catalogo modular canonico para monetizacion

## Decision
El catalogo SaaS queda normalizado en 4 Core reales (`auth`, `users`, `academic_core`, `grading`) y extensiones vendibles (`attendance`, `documents`, `report_cards`, `payments`, `qr_access`, etc.) sin crear nuevas pantallas tenant-facing antes de estabilizar los Core.

## Razon
Giovanni necesita planes y paquetes vendibles, pero la doctrina actual prohibe abrir modulos tenant-facing nuevos hasta que los Core esten production-ready. La solucion segura es clasificar y gatear capacidades existentes, preparando monetizacion sin expandir el producto visual todavia.

## Impacto
- SuperAdmin puede vender por plan/add-on con keys canonicas.
- School Admin sigue funcionando porque las extensiones existentes quedan habilitadas por defecto en demo/planes actuales.
- QR, credentials, workshops y payments quedan modelados para monetizacion, no como features nuevas incompletas.

#decision #architecture #billing #modules #saas

---
