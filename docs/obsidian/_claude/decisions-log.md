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
