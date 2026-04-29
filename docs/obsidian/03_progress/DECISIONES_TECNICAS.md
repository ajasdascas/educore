# Decisiones Tecnicas - EduCore

## [29-04-2026] Arquitectura modular incremental

- Decision: mantener Next.js App Router + backend Go actual y agregar una capa modular incremental.
- Razon: migrar ahora a `/src/modules` o monorepo completo pondria en riesgo rutas ya funcionales de produccion.
- Impacto: los modulos se consolidan mediante registry frontend, guards locales, `tenant_modules` y contratos API sin romper el deploy actual en Hostinger.
- Regla: los modulos Core son compartidos; los modulos por nivel educativo extienden Core y no duplican logica funcional.

#architecture #modules #school_admin #super_admin

## [29-04-2026] SuperAdmin como control plane SaaS incremental

- Decision: construir el SuperAdmin Enterprise Control Plane encima del repo actual, sin migrar todavia a monorepo ni a `/src/modules`.
- Razon: el deploy productivo actual es Next.js static export hacia Hostinger y backend Go; una reestructura grande ahora aumentaria el riesgo de regresiones.
- Impacto: SuperAdmin gana visibilidad y control sobre instituciones, modulos, usuarios, billing, analytics, health, logs, soporte, storage, feature flags, backups y versioning mediante contratos API y pantallas desacopladas.
- Regla: acciones destructivas se modelan como soft delete o jobs auditados con `confirmation_text`; ejecucion real de backups, restore, deploy o rollback requiere flags/variables explicitas.

#architecture #super_admin #security #audit

## [29-04-2026] Portal de Padres se conecta al Core academico

- Decision: implementar el Portal de Padres sobre las tablas core existentes (`students`, `parent_student`, `attendance_records`, `grade_records`) y agregar solo tablas faltantes para mensajes, eventos y tareas.
- Razon: evita duplicar modulos por rol y permite que padres vean la misma fuente de verdad que School Admin usa para asistencias y calificaciones.
- Impacto: los endpoints Parent quedan listos para datos reales con verificacion de acceso padre-hijo y los mocks de Hostinger mantienen experiencia funcional cuando el backend no responde.
- Regla: toda consulta de hijo debe conservar `VerifyParentAccess`; un padre nunca debe poder ver alumnos no vinculados.

#architecture #parent_portal #security #backend

## [29-04-2026] Branding institucional se guarda en el tenant

- Decision: mantener el logo de escuela en `tenants.logo_url` y usar `logo_url` en mocks estaticos, sin crear una entidad paralela de branding.
- Razon: la tabla `tenants` ya representa la institucion y tiene `logo_url`; reutilizarlo reduce riesgo y hace que SuperAdmin y School Admin lean el mismo dato.
- Impacto: al crear una escuela desde SuperAdmin se puede capturar logo opcional y el panel de la escuela puede mostrar ese branding sin migraciones destructivas.
- Regla: si no hay logo, la UI debe usar fallback textual/initial sin romper layout.

#architecture #super_admin #school_admin #branding
