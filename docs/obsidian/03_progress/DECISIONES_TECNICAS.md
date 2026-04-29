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
