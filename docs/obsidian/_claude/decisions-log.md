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
