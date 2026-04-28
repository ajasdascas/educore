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
