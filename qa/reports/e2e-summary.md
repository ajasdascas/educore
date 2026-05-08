# EduCore E2E Audit Summary

Generated: 2026-05-08T15:22:01.374Z
Base URL: https://onlineu.mx/educore
API URL: https://educore-production-beef.up.railway.app
Run ID: 20260508152201
Production mutations enabled: false
Super Admin credentials present: true

| Status | Count |
| --- | ---: |
| PASS | 34 |
| WARN | 23 |
| FAIL | 4 |
| SKIPPED | 68 |

## Bugs

| ID | Severity | Area | Flow | URL | Actual |
| --- | --- | --- | --- | --- | --- |
| E2E-001 | P3 | Public Landing | cargar landing principal | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| E2E-002 | P3 | Auth | ruta protegida sin sesion | https://onlineu.mx/educore/super-admin/users/ | API Request Error: TypeError: Failed to fetch
    at a (https://onlineu.mx/educore/_next/static/chunks/app/login/page-20dfe846afaa250f.js:1:10100)
    at D (https://onlineu.mx/educore/_next/static/chunks/app/login/page-20dfe846afaa250f.js:1:2079)
    at Object.a_ (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:72147)
    at aR (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:72301)
    at https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139240
    at sF (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139339)
    at sM (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139753)
    at https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:145896
    at o4 (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:93336)
    at iV (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:122701) / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://educore-production-beef.up.railway.app/api/v1/auth/login: net::ERR_ABORTED |
| E2E-003 | P1 | Auth | login super admin | https://onlineu.mx/educore/login/ | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| E2E-004 | P1 | Auth | login super admin | https://onlineu.mx/educore/login/ | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| E2E-005 | P3 | Super Admin | navegar dashboard | https://onlineu.mx/educore/super-admin/dashboard/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-006 | P3 | Super Admin | navegar modulos | https://onlineu.mx/educore/super-admin/modules/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-007 | P3 | Super Admin | navegar billing | https://onlineu.mx/educore/super-admin/billing/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-008 | P3 | Super Admin | navegar analytics | https://onlineu.mx/educore/super-admin/analytics/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-009 | P3 | Super Admin | navegar health monitor | https://onlineu.mx/educore/super-admin/health/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-010 | P3 | Super Admin | navegar database admin | https://onlineu.mx/educore/super-admin/database/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-011 | P3 | Super Admin | navegar auditoria | https://onlineu.mx/educore/super-admin/audit/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-012 | P3 | Super Admin | navegar soporte | https://onlineu.mx/educore/super-admin/support/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-013 | P3 | Super Admin | navegar storage | https://onlineu.mx/educore/super-admin/storage/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-014 | P3 | Super Admin | navegar feature flags | https://onlineu.mx/educore/super-admin/feature-flags/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-015 | P3 | Super Admin | navegar backups | https://onlineu.mx/educore/super-admin/backups/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-016 | P1 | Super Admin | navegar versioning | https://onlineu.mx/educore/super-admin/version/ | Failed to load resource: the server responded with a status of 500 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 500 https://educore-production-beef.up.railway.app/api/v1/super-admin/version |
| E2E-017 | P3 | Super Admin | navegar planes | https://onlineu.mx/educore/super-admin/plans/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-018 | P3 | Super Admin | navegar escuelas | https://onlineu.mx/educore/super-admin/schools/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-019 | P3 | Super Admin | navegar usuarios globales | https://onlineu.mx/educore/super-admin/users/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-020 | P1 | Auth | login super admin | https://onlineu.mx/educore/login/ | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| E2E-021 | P3 | Backups/Deploy | abrir backups | https://onlineu.mx/educore/super-admin/backups/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-022 | P3 | Responsive/UX | landing desktop-1280 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| E2E-023 | P3 | Responsive/UX | login desktop-1280 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-024 | P3 | Responsive/UX | landing tablet-768 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-025 | P3 | Responsive/UX | login tablet-768 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-026 | P3 | Responsive/UX | landing mobile-375 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-027 | P3 | Responsive/UX | login mobile-375 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |

## Results

| Area | Flow | Status | URL | Actual |
| --- | --- | --- | --- | --- |
| Public Landing | cargar landing principal | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| Public Landing | copy principal visible | PASS | https://onlineu.mx/educore/ | EduCore
Soluciones
Beneficios
Testimonios
Blog
Contacto
Normal
Iniciar sesión
Solicitar demo
PLATAFORMA DE GESTIÓN ESCOLAR INTEGRAL
Administra tu institución con inteligencia

EduCore centraliza la gestión académica, administrativa y financ |
| Public Landing | link interno /educore/ | PASS | https://onlineu.mx/educore/ | HTTP 200 |
| Public Landing | link interno /educore/login/ | PASS | https://onlineu.mx/educore/login/ | HTTP 200 |
| Public Landing | selector de tema | PASS | https://onlineu.mx/educore/ | Control de tema accionado. |
| Public Landing | CTA solicitar demo | PASS | https://onlineu.mx/educore/ | CTA accionado sin excepcion Playwright. |
| Public Landing | responsive movil 375px | PASS | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Auth | abrir pagina login | PASS | https://onlineu.mx/educore/login/ | HTTP 200; 236 caracteres visibles. |
| Auth | login vacio | PASS | https://onlineu.mx/educore/login/ | URL despues de submit vacio: https://onlineu.mx/educore/login/ |
| Auth | login invalido | PASS | https://onlineu.mx/educore/login/ | URL despues de credenciales invalidas: https://onlineu.mx/educore/login/ |
| Auth | forgot password | SKIPPED | https://onlineu.mx/educore/login/ | No se encontro link de recuperacion en login. |
| Auth | ruta protegida sin sesion | WARN | https://onlineu.mx/educore/super-admin/users/ | API Request Error: TypeError: Failed to fetch
    at a (https://onlineu.mx/educore/_next/static/chunks/app/login/page-20dfe846afaa250f.js:1:10100)
    at D (https://onlineu.mx/educore/_next/static/chunks/app/login/page-20dfe846afaa250f.js:1:2079)
    at Object.a_ (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:72147)
    at aR (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:72301)
    at https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139240
    at sF (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139339)
    at sM (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139753)
    at https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:145896
    at o4 (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:93336)
    at iV (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:122701) / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://educore-production-beef.up.railway.app/api/v1/auth/login: net::ERR_ABORTED |
| Auth | bloqueo ruta protegida sin sesion | PASS | https://onlineu.mx/educore/login/ | Educore

Plataforma de administracion escolar

Iniciar sesion

Bienvenido de vuelta

Correo electronico
Contrasena
Iniciar sesion

Olvidaste tu contrasena?

Eres nuevo? Contacta a tu institucion para activar tu cuenta.

Volver al inicio |
| Auth | abrir login super admin | PASS | https://onlineu.mx/educore/login/ | HTTP 200; 236 caracteres visibles. |
| Auth | login super admin | FAIL | https://onlineu.mx/educore/login/ | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| Auth | login super admin via API | PASS | https://educore-production-beef.up.railway.app/api/v1/auth/login | API login exitoso; credencial temporal no persistida en repo. |
| Auth | sesion Super Admin inyectada desde API para QA | PASS | https://onlineu.mx/educore/super-admin/dashboard/ | Dashboard protegido cargado con sesion temporal de Playwright. |
| Auth | logout super admin | PASS | https://onlineu.mx/educore/super-admin/dashboard/ | Logout clickeado. |
| Auth | abrir login super admin | PASS | https://onlineu.mx/educore/login/ | HTTP 200; 236 caracteres visibles. |
| Auth | login super admin | FAIL | https://onlineu.mx/educore/login/ | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| Auth | login super admin via API | PASS | https://educore-production-beef.up.railway.app/api/v1/auth/login | API login exitoso; credencial temporal no persistida en repo. |
| Auth | sesion Super Admin inyectada desde API para QA | PASS | https://onlineu.mx/educore/super-admin/dashboard/ | Dashboard protegido cargado con sesion temporal de Playwright. |
| Super Admin | navegar dashboard | WARN | https://onlineu.mx/educore/super-admin/dashboard/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar modulos | WARN | https://onlineu.mx/educore/super-admin/modules/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar billing | WARN | https://onlineu.mx/educore/super-admin/billing/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar analytics | WARN | https://onlineu.mx/educore/super-admin/analytics/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar health monitor | WARN | https://onlineu.mx/educore/super-admin/health/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar database admin | WARN | https://onlineu.mx/educore/super-admin/database/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar auditoria | WARN | https://onlineu.mx/educore/super-admin/audit/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar soporte | WARN | https://onlineu.mx/educore/super-admin/support/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar storage | WARN | https://onlineu.mx/educore/super-admin/storage/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar feature flags | WARN | https://onlineu.mx/educore/super-admin/feature-flags/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar backups | WARN | https://onlineu.mx/educore/super-admin/backups/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar versioning | FAIL | https://onlineu.mx/educore/super-admin/version/ | Failed to load resource: the server responded with a status of 500 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 500 https://educore-production-beef.up.railway.app/api/v1/super-admin/version |
| Super Admin | navegar planes | WARN | https://onlineu.mx/educore/super-admin/plans/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar escuelas | WARN | https://onlineu.mx/educore/super-admin/schools/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Super Admin | navegar usuarios globales | WARN | https://onlineu.mx/educore/super-admin/users/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| School Creation | crear/reutilizar escuelas QA por nivel | SKIPPED |  | E2E_ALLOW_PRODUCTION_MUTATIONS no es true; no se crean ni editan datos en produccion. |
| School Admin | dashboard school admin | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | estructura | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | estudiantes crear/editar QA | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | padres/tutores y vinculacion | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | credenciales alumno/padre | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | profesores | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | grupos y asignaciones | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | horarios | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | asistencia | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | calificaciones/boletas si aplica | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | documentos/reportes | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | comunicaciones | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| School Admin | configuracion | SKIPPED |  | Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales. |
| Teacher Portal | login profesor QA | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | dashboard profesor | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | mis grupos | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | asistencia | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | horario | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | mensajes/notificaciones | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | perfil/configuracion | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | Kinder: reporte diario, alimentacion, siesta, higiene, incidentes | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | Preescolar: observaciones, evaluacion cualitativa, evidencias | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | Primaria: materias, tareas, calificaciones, examenes, materiales | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Teacher Portal | RBAC: profesor no entra a Super Admin ni ve otro tenant | SKIPPED |  | Falta usuario profesor QA creado por flujo mutante seguro. |
| Parent Portal | login padre QA | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | mis hijos y selector de hijo | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | asistencia | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | calificaciones/avances | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | documentos | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | pagos y estado de cuenta sin pagos reales | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | permisos | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | mensajes/notificaciones | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | Kinder: daily log, meals, naps, diapers, mood, incidents | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | Preescolar: campos formativos, observaciones, evidencias | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | Primaria: tareas, boleta, calificaciones, estado de cuenta | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Parent Portal | RBAC: padre solo ve hijos vinculados | SKIPPED |  | Falta usuario padre QA vinculado a alumno QA. |
| Student Portal | login alumno QA | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | dashboard alumno | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | classroom | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | horario | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | actividades | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | biblioteca | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | examenes | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | boleta/calificaciones | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | encuestas | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | estado de cuenta si aplica | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | mi institucion | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | centro de mensajes/noticias | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | perfil/documentos personalizados | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Student Portal | RBAC: alumno solo ve sus datos | SKIPPED |  | Falta cuenta de alumno QA creada por flujo mutante seguro. |
| Billing/Credentials | credenciales desde Super Admin | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | credenciales desde School Admin | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | reset password temporal | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | usuario inactivo no entra | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | password_hash nunca visible | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | invitaciones con provider not configured si falta Resend | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | conceptos de cobro | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | adeudos y estado de cuenta | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | recibos | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | pagos sin pasarela real | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | becas/descuentos/recargos | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Billing/Credentials | vista padre/alumno de facturacion | SKIPPED |  | Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales. |
| Auth | abrir login super admin | PASS | https://onlineu.mx/educore/login/ | HTTP 200; 236 caracteres visibles. |
| Auth | login super admin | FAIL | https://onlineu.mx/educore/login/ | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| Auth | login super admin via API | PASS | https://educore-production-beef.up.railway.app/api/v1/auth/login | API login exitoso; credencial temporal no persistida en repo. |
| Auth | sesion Super Admin inyectada desde API para QA | PASS | https://onlineu.mx/educore/super-admin/dashboard/ | Dashboard protegido cargado con sesion temporal de Playwright. |
| Backups/Deploy | abrir backups | WARN | https://onlineu.mx/educore/super-admin/backups/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Backups/Deploy | crear backup | SKIPPED |  | No se crean backups en produccion desde auditoria automatica sin aprobacion explicita adicional. |
| Module Entitlements | Kinder: modulos activos/bloqueados | SKIPPED |  | Requiere escuela QA Kinder y rol autenticado. Esperado a validar: Reporte diario, alimentacion, siesta, higiene/panal, estado de animo, incidentes, entrada/salida, autorizados, pagos, credenciales, comunicacion. |
| Module Entitlements | Preescolar: modulos activos/bloqueados | SKIPPED |  | Requiere escuela QA Preescolar y rol autenticado. Esperado a validar: Campos formativos, evaluacion cualitativa, observaciones, evidencias, actividades, materiales, asistencia, comunicacion, pagos, credenciales. |
| Module Entitlements | Primaria: modulos activos/bloqueados | SKIPPED |  | Requiere escuela QA Primaria y rol autenticado. Esperado a validar: Materias, horarios, tareas, classroom, examenes, calificaciones, boletas, biblioteca, asistencia, estado de cuenta, pagos, credenciales, documentos, comunicacion. |
| Security/RBAC | API protegida /api/v1/super-admin/schools | PASS | https://educore-production-beef.up.railway.app/api/v1/super-admin/schools | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/super-admin/users | PASS | https://educore-production-beef.up.railway.app/api/v1/super-admin/users | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/school-admin/dashboard | PASS | https://educore-production-beef.up.railway.app/api/v1/school-admin/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/teacher/dashboard | PASS | https://educore-production-beef.up.railway.app/api/v1/teacher/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/parent/dashboard | PASS | https://educore-production-beef.up.railway.app/api/v1/parent/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/student/dashboard | PASS | https://educore-production-beef.up.railway.app/api/v1/student/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | X-Support-Tenant-ID sin Super Admin | PASS |  | HTTP 401 |
| Responsive/UX | landing desktop-1280 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| Responsive/UX | landing desktop-1280 overflow | PASS | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive/UX | login desktop-1280 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | login desktop-1280 overflow | PASS | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive/UX | landing tablet-768 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | landing tablet-768 overflow | PASS | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive/UX | login tablet-768 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | login tablet-768 overflow | PASS | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive/UX | landing mobile-375 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | landing mobile-375 overflow | PASS | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive/UX | login mobile-375 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | login mobile-375 overflow | PASS | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive/UX | muestreo basico de elementos visibles | PASS | https://onlineu.mx/educore/login/ | 22 elementos visibles muestreados. |

