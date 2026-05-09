# EduCore E2E Audit Summary

Generated: 2026-05-09T06:07:48.313Z
Base URL: https://onlineu.mx/educore
API URL: https://educore-production-beef.up.railway.app
Run ID: 20260509060748
Production mutations enabled: false
Super Admin credentials present: false

| Status | Count |
| --- | ---: |
| FAIL | 7 |
| PASS | 11 |
| PASS_READ_ONLY | 7 |
| PASS_REAL | 30 |
| SKIPPED | 13 |
| SKIPPED_NO_CREDENTIALS | 39 |
| SKIPPED_SECURITY_SCOPE | 1 |
| WARN | 22 |

## Bugs

| ID | Severity | Area | Flow | URL | Actual |
| --- | --- | --- | --- | --- | --- |
| E2E-001 | P3 | Public Landing | cargar landing principal | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| E2E-002 | P3 | Auth | ruta protegida sin sesion | https://onlineu.mx/educore/super-admin/users/ | Failed to load resource: the server responded with a status of 401 () / 401 https://educore-production-beef.up.railway.app/api/v1/auth/login / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-003 | P3 | Responsive/UX | landing desktop-1280 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| E2E-004 | P3 | Responsive/UX | login desktop-1280 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-005 | P3 | Responsive/UX | landing tablet-768 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-006 | P3 | Responsive/UX | login tablet-768 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-007 | P3 | Responsive/UX | landing mobile-375 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-008 | P3 | Responsive/UX | login mobile-375 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-009 | P1 | Parent | ruta protegida parent primaria sin sesion | https://onlineu.mx/educore/parent/primary/grades/ | HTTP 404; body length 129 |
| E2E-010 | P1 | Student | kinder ruta protegida sin sesion | https://onlineu.mx/educore/student/kinder/activities/ | HTTP 404; body length 129 |
| E2E-011 | P1 | Student | preescolar ruta protegida sin sesion | https://onlineu.mx/educore/student/preschool/activities/ | HTTP 404; body length 129 |
| E2E-012 | P1 | Student | primaria /student/primary/subjects/ sin sesion | https://onlineu.mx/educore/student/primary/subjects/ | HTTP 404; body length 129 |
| E2E-013 | P1 | Student | primaria /student/primary/assignments/ sin sesion | https://onlineu.mx/educore/student/primary/assignments/ | HTTP 404; body length 129 |
| E2E-014 | P1 | Student | primaria /student/primary/exams/ sin sesion | https://onlineu.mx/educore/student/primary/exams/ | HTTP 404; body length 129 |
| E2E-015 | P1 | Student | primaria /student/primary/grades/ sin sesion | https://onlineu.mx/educore/student/primary/grades/ | HTTP 404; body length 129 |
| E2E-016 | P3 | Student | primaria /student/attendance/ sin sesion | https://onlineu.mx/educore/student/attendance/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-017 | P3 | Student | primaria /student/schedule/ sin sesion | https://onlineu.mx/educore/student/schedule/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-018 | P3 | Student | primaria /student/messages/ sin sesion | https://onlineu.mx/educore/student/messages/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-019 | P3 | Student | primaria /student/notifications/ sin sesion | https://onlineu.mx/educore/student/notifications/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-020 | P3 | Student | primaria /student/profile/ sin sesion | https://onlineu.mx/educore/student/profile/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-021 | P3 | Permisos | Parent permisos sin sesion | https://onlineu.mx/educore/parent/consents/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-022 | P3 | Responsive | landing mobile 375x667 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| E2E-023 | P3 | Responsive | login mobile 375x667 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-024 | P3 | Responsive | landing tablet 768x1024 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-025 | P3 | Responsive | login tablet 768x1024 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-026 | P3 | Responsive | landing desktop 1366x768 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-027 | P3 | Responsive | login desktop 1366x768 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-028 | P3 | Responsive | landing desktop 1920x1080 | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| E2E-029 | P3 | Responsive | login desktop 1920x1080 | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |

## Results

| Area | Flow | Status | URL | Actual |
| --- | --- | --- | --- | --- |
| Public Landing | cargar landing principal | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| Public Landing | copy principal visible | PASS_REAL | https://onlineu.mx/educore/ | EduCore
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
| Public Landing | responsive movil 375px | PASS_REAL | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Auth | abrir pagina login | PASS | https://onlineu.mx/educore/login/ | HTTP 200; 236 caracteres visibles. |
| Auth | login vacio | PASS | https://onlineu.mx/educore/login/ | URL despues de submit vacio: https://onlineu.mx/educore/login/ |
| Auth | login invalido | PASS | https://onlineu.mx/educore/login/ | URL despues de credenciales invalidas: https://onlineu.mx/educore/login/ |
| Auth | forgot password | SKIPPED | https://onlineu.mx/educore/login/ | No se encontro link de recuperacion en login. |
| Auth | ruta protegida sin sesion | WARN | https://onlineu.mx/educore/super-admin/users/ | Failed to load resource: the server responded with a status of 401 () / 401 https://educore-production-beef.up.railway.app/api/v1/auth/login / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Auth | bloqueo ruta protegida sin sesion | PASS_REAL | https://onlineu.mx/educore/login/ | Educore

Plataforma de administracion escolar

Iniciar sesion

Bienvenido de vuelta

Correo electronico
Contrasena
Iniciar sesion

Olvidaste tu contrasena?

Eres nuevo? Contacta a tu institucion para activar tu cuenta.

Volver al inicio |
| Auth | login super admin | SKIPPED | https://onlineu.mx/educore/login/ | Faltan E2E_SUPERADMIN_EMAIL y/o E2E_SUPERADMIN_PASSWORD. |
| Auth | login super admin via API | SKIPPED | https://educore-production-beef.up.railway.app/api/v1/auth/login | Faltan E2E_SUPERADMIN_EMAIL y/o E2E_SUPERADMIN_PASSWORD. |
| Super Admin | navegar dashboard | SKIPPED_NO_CREDENTIALS | /super-admin/dashboard/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar modulos | SKIPPED_NO_CREDENTIALS | /super-admin/modules/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar billing | SKIPPED_NO_CREDENTIALS | /super-admin/billing/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar analytics | SKIPPED_NO_CREDENTIALS | /super-admin/analytics/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar health monitor | SKIPPED_NO_CREDENTIALS | /super-admin/health/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar database admin | SKIPPED_NO_CREDENTIALS | /super-admin/database/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar auditoria | SKIPPED_NO_CREDENTIALS | /super-admin/audit/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar soporte | SKIPPED_NO_CREDENTIALS | /super-admin/support/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar storage | SKIPPED_NO_CREDENTIALS | /super-admin/storage/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar feature flags | SKIPPED_NO_CREDENTIALS | /super-admin/feature-flags/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar backups | SKIPPED_NO_CREDENTIALS | /super-admin/backups/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar versioning | SKIPPED_NO_CREDENTIALS | /super-admin/version/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar planes | SKIPPED_NO_CREDENTIALS | /super-admin/plans/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar escuelas | SKIPPED_NO_CREDENTIALS | /super-admin/schools/ | Faltan credenciales Super Admin E2E. |
| Super Admin | navegar usuarios globales | SKIPPED_NO_CREDENTIALS | /super-admin/users/ | Faltan credenciales Super Admin E2E. |
| Auth | login super admin via API | SKIPPED | https://educore-production-beef.up.railway.app/api/v1/auth/login | Faltan E2E_SUPERADMIN_EMAIL y/o E2E_SUPERADMIN_PASSWORD. |
| Auth | login super admin via API | SKIPPED | https://educore-production-beef.up.railway.app/api/v1/auth/login | Faltan E2E_SUPERADMIN_EMAIL y/o E2E_SUPERADMIN_PASSWORD. |
| Auth | login super admin via API | SKIPPED | https://educore-production-beef.up.railway.app/api/v1/auth/login | Faltan E2E_SUPERADMIN_EMAIL y/o E2E_SUPERADMIN_PASSWORD. |
| Auth | login super admin via API | SKIPPED | https://educore-production-beef.up.railway.app/api/v1/auth/login | Faltan E2E_SUPERADMIN_EMAIL y/o E2E_SUPERADMIN_PASSWORD. |
| Auth | login super admin via API | SKIPPED | https://educore-production-beef.up.railway.app/api/v1/auth/login | Faltan E2E_SUPERADMIN_EMAIL y/o E2E_SUPERADMIN_PASSWORD. |
| Billing/Credentials | credenciales desde Super Admin | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | credenciales desde School Admin | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | reset password temporal | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | usuario inactivo no entra | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | password_hash nunca visible | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | invitaciones con provider not configured si falta Resend | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | conceptos de cobro | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | adeudos y estado de cuenta | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | recibos | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | pagos sin pasarela real | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | becas/descuentos/recargos | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Billing/Credentials | vista padre/alumno de facturacion | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes. |
| Backups/Deploy | Super Admin backups | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales para revisar historial y estados sin crear backups. |
| Backups/Deploy | crear/editar/eliminar backup | SKIPPED_NO_CREDENTIALS |  | Operacion mutante bloqueada sin credenciales y mutation gate. |
| Module Entitlements | Kinder: modulos activos/bloqueados | SKIPPED_NO_CREDENTIALS |  | Requiere escuela QA Kinder y rol autenticado. Esperado a validar: Reporte diario, alimentacion, siesta, higiene/panal, estado de animo, incidentes, entrada/salida, autorizados, pagos, credenciales, comunicacion. |
| Module Entitlements | Preescolar: modulos activos/bloqueados | SKIPPED_NO_CREDENTIALS |  | Requiere escuela QA Preescolar y rol autenticado. Esperado a validar: Campos formativos, evaluacion cualitativa, observaciones, evidencias, actividades, materiales, asistencia, comunicacion, pagos, credenciales. |
| Module Entitlements | Primaria: modulos activos/bloqueados | SKIPPED_NO_CREDENTIALS |  | Requiere escuela QA Primaria y rol autenticado. Esperado a validar: Materias, horarios, tareas, classroom, examenes, calificaciones, boletas, biblioteca, asistencia, estado de cuenta, pagos, credenciales, documentos, comunicacion. |
| Security/RBAC | API protegida /api/v1/super-admin/schools | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/super-admin/schools | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/super-admin/users | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/super-admin/users | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/school-admin/dashboard | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/teacher/dashboard | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/teacher/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/parent/dashboard | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/parent/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/student/dashboard | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/student/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | X-Support-Tenant-ID sin Super Admin | PASS |  | HTTP 401 |
| Responsive/UX | landing desktop-1280 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| Responsive/UX | landing desktop-1280 overflow | PASS_REAL | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive/UX | login desktop-1280 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | login desktop-1280 overflow | PASS_REAL | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive/UX | landing tablet-768 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | landing tablet-768 overflow | PASS_REAL | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive/UX | login tablet-768 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | login tablet-768 overflow | PASS_REAL | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive/UX | landing mobile-375 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | landing mobile-375 overflow | PASS_REAL | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive/UX | login mobile-375 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive/UX | login mobile-375 overflow | PASS_REAL | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive/UX | muestreo basico de elementos visibles | PASS | https://onlineu.mx/educore/login/ | 22 elementos visibles muestreados. |
| Parent | primaria portal completo | SKIPPED |  | No hay escuela/alumno/padre QA-CODEX-NIGHTLY-PRIMARIA en checkpoint. |
| Parent | ruta protegida parent primaria sin sesion | FAIL | https://onlineu.mx/educore/parent/primary/grades/ | HTTP 404; body length 129 |
| Parent | primaria no captura datos academicos | PASS_READ_ONLY | https://onlineu.mx/educore/parent/primary/grades/ | Sin credencial QA activa se valido solo ruta protegida y se deja el flujo profundo pendiente. |
| Student | kinder portal limitado | SKIPPED |  | No hay alumno QA-CODEX-NIGHTLY-KINDER con cuenta de portal. |
| Student | kinder ruta protegida sin sesion | FAIL | https://onlineu.mx/educore/student/kinder/activities/ | HTTP 404; body length 129 |
| Student | kinder no debe mostrar calificaciones/tareas/examenes por defecto | PASS_READ_ONLY | https://onlineu.mx/educore/student/kinder/activities/ | Sin credencial QA activa se deja la verificacion autenticada como pendiente, sin marcar PASS falso. |
| Student | preescolar portal limitado | SKIPPED |  | No hay alumno QA-CODEX-NIGHTLY-PREESCOLAR con cuenta de portal. |
| Student | preescolar ruta protegida sin sesion | FAIL | https://onlineu.mx/educore/student/preschool/activities/ | HTTP 404; body length 129 |
| Student | preescolar solo actividades/recursos/evidencias/perfil | PASS_READ_ONLY | https://onlineu.mx/educore/student/preschool/activities/ | Validacion autenticada queda pendiente hasta tener cuenta QA; no se intento evadir autenticacion. |
| Student | primaria portal completo | SKIPPED |  | No hay alumno QA-CODEX-NIGHTLY-PRIMARIA con cuenta de portal. |
| Student | primaria /student/dashboard/ sin sesion | PASS | https://onlineu.mx/educore/student/dashboard/ | HTTP 200; 236 caracteres visibles. |
| Student | primaria /student/primary/subjects/ sin sesion | FAIL | https://onlineu.mx/educore/student/primary/subjects/ | HTTP 404; body length 129 |
| Student | primaria /student/primary/assignments/ sin sesion | FAIL | https://onlineu.mx/educore/student/primary/assignments/ | HTTP 404; body length 129 |
| Student | primaria /student/primary/exams/ sin sesion | FAIL | https://onlineu.mx/educore/student/primary/exams/ | HTTP 404; body length 129 |
| Student | primaria /student/primary/grades/ sin sesion | FAIL | https://onlineu.mx/educore/student/primary/grades/ | HTTP 404; body length 129 |
| Student | primaria /student/attendance/ sin sesion | WARN | https://onlineu.mx/educore/student/attendance/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Student | primaria /student/schedule/ sin sesion | WARN | https://onlineu.mx/educore/student/schedule/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Student | primaria /student/messages/ sin sesion | WARN | https://onlineu.mx/educore/student/messages/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Student | primaria /student/notifications/ sin sesion | WARN | https://onlineu.mx/educore/student/notifications/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Student | primaria /student/profile/ sin sesion | WARN | https://onlineu.mx/educore/student/profile/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Student | primaria no entra a parent/teacher/admin | PASS_READ_ONLY |  | Se cubrio acceso anonimo seguro; wrong-role autenticado queda pendiente con cuenta QA. |
| Backups | crear/editar/descargar/eliminar backup QA | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales Super Admin E2E. |
| Billing | facturacion escolar completa | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales Super Admin E2E y objetos QA. |
| Credenciales | crear accesos QA profesor/padre/alumno | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales Super Admin E2E y objetos QA. |
| Mensajes | comunicaciones multirol QA | SKIPPED_NO_CREDENTIALS |  | Faltan credenciales Super Admin E2E y usuarios QA vinculados. |
| Notificaciones | Parent notificaciones sin sesion | PASS | https://onlineu.mx/educore/parent/notifications/ | HTTP 200; 236 caracteres visibles. |
| Permisos | Parent permisos sin sesion | WARN | https://onlineu.mx/educore/parent/consents/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Mensajes | no cross-tenant ni mensajes a otra escuela | SKIPPED_NO_CREDENTIALS |  | No se intento enviar mensajes entre tenants sin cuentas QA suficientes. |
| Security/RBAC | API protegida /api/v1/super-admin/schools | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/super-admin/schools | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/school-admin/dashboard | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/teacher/dashboard | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/teacher/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/parent/dashboard | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/parent/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| Security/RBAC | API protegida /api/v1/student/dashboard | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/student/dashboard | sin token=[redacted]; token [redacted]; password_hash=false |
| RBAC | IDOR ofensivo con mutacion de IDs | SKIPPED_SECURITY_SCOPE |  | No se prueban payloads, fuzzing, enumeracion agresiva ni explotacion. Solo se documenta como pendiente seguro con objetos QA conocidos. |
| Tenant isolation | cross-tenant solo con objetos QA | SKIPPED_NO_CREDENTIALS |  | No hay dos sesiones QA completas en esta corrida; no se hizo probing ofensivo. |
| Responsive | landing mobile 375x667 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |
| Responsive | landing overflow mobile 375x667 | PASS_REAL | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive | login mobile 375x667 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive | login overflow mobile 375x667 | PASS_REAL | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive | landing tablet 768x1024 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive | landing overflow tablet 768x1024 | PASS_REAL | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive | login tablet 768x1024 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive | login overflow tablet 768x1024 | PASS_REAL | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive | landing desktop 1366x768 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive | landing overflow desktop 1366x768 | PASS_REAL | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive | login desktop 1366x768 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive | login overflow desktop 1366x768 | PASS_REAL | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive | landing desktop 1920x1080 | WARN | https://onlineu.mx/educore/ | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive | landing overflow desktop 1920x1080 | PASS_REAL | https://onlineu.mx/educore/ | Sin overflow horizontal relevante. |
| Responsive | login desktop 1920x1080 | WARN | https://onlineu.mx/educore/login/ | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| Responsive | login overflow desktop 1920x1080 | PASS_REAL | https://onlineu.mx/educore/login/ | Sin overflow horizontal relevante. |
| Responsive | roles autenticados responsive | SKIPPED_NO_CREDENTIALS |  | La matriz autenticada queda pendiente hasta contar con sesiones QA por rol. |
| Deploy/static export | landing production basePath | PASS_REAL | https://onlineu.mx/educore/ | HTTP 200; basePathAssets=true; bytes=78192 |
| Deploy/static export | deep route refresh /login/ | PASS_READ_ONLY | https://onlineu.mx/educore/login/ | HTTP 200 |
| Deploy/static export | deep route refresh /escuela/ | PASS_READ_ONLY | https://onlineu.mx/educore/escuela/ | HTTP 200 |
| Deploy/static export | deep route refresh /super-admin/dashboard/ | PASS_READ_ONLY | https://onlineu.mx/educore/super-admin/dashboard/ | HTTP 200 |
| Deploy/static export | API health no localhost | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/health | HTTP 200; localhost=false |
| Cleanup | eliminar/archivar objetos QA | SKIPPED |  | E2E_CLEANUP_QA_OBJECTS no es true; no se ejecuta cleanup destructivo/archivado. |

