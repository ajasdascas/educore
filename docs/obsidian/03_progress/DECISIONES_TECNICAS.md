# Decisiones Tecnicas - EduCore

## [29-04-2026] Arquitectura modular incremental

- Decision: mantener Next.js App Router + backend Go actual y agregar una capa modular incremental.
- Razon: migrar ahora a `/src/modules` o monorepo completo pondria en riesgo rutas ya funcionales de produccion.
- Impacto: los modulos se consolidan mediante registry frontend, guards locales, `tenant_modules` y contratos API sin romper el deploy actual en Hostinger.
- Regla: los modulos Core son compartidos; los modulos por nivel educativo extienden Core y no duplican logica funcional.

#architecture #modules #school_admin #super_admin
