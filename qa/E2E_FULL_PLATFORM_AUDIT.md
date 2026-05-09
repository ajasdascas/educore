# EduCore Full Platform E2E Audit - QA-CODEX

Generated: 2026-05-09T06:39:01Z
Base URL: https://onlineu.mx/educore
API URL: https://educore-production-beef.up.railway.app
Branch: codex/full-platform-e2e-audit
Mode: produccion real con E2E_ALLOW_PRODUCTION_MUTATIONS=true y datos QA-CODEX-*

## 1. Resumen ejecutivo

- Playwright headed contra produccion: 27/27 specs completaron como runner. Esto NO significa que todo funcione; el reporte contiene FAIL/PARTIAL/SKIPPED reales.
- Funcionamiento limpio aproximado: 40.4% (179/443 resultados PASS/PASS_REAL/PASS_READ_ONLY).
- Cargas o flujos operables con warnings incluidos: 74% ((179 + 149)/443).
- Bloqueadores P0: 0. Riesgos P1 registrados: 66.
- Datos QA conservados para retest: 3 escuelas QA reutilizadas/creadas y 9 objetos QA no destructivos registrados.
- Browser plugin de Codex: intento real fallido por runtime local (`failed to write kernel assets: ruta no encontrada`); fallback usado: Playwright Chromium headed real.
- Pagos reales/tarjetas/emails reales: no ejecutados. Checkout/card session marcado SKIPPED_SECURITY_SCOPE.
- Estado comercial: NO listo para vender sin arreglar P1 de credenciales, horarios, versioning y rutas protegidas.

## Estado por resultado

| Estado | Conteo |
| --- | --- |
| FAIL | 69 |
| PARTIAL | 3 |
| PASS | 43 |
| PASS_READ_ONLY | 10 |
| PASS_REAL | 126 |
| SKIPPED | 18 |
| SKIPPED_NO_CREDENTIALS | 18 |
| SKIPPED_PROVIDER_NOT_CONFIGURED | 3 |
| SKIPPED_SECURITY_SCOPE | 4 |
| WARN | 149 |

## Bugs por severidad

| Severidad | Conteo |
| --- | --- |
| P1 | 66 |
| P2 | 3 |
| P3 | 149 |

## 2. Matriz por rol/area

| Area/Rol | Total | FAIL | PARTIAL | WARN | SKIPPED | PASS |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | 41 | 7 | 0 |  |  | 32 |
| Backups | 2 | 0 | 0 |  |  | 0 |
| Backups/Deploy | 2 | 0 | 0 |  |  | 0 |
| Billing | 3 | 2 | 0 |  | 0 | 0 |
| Billing/Credentials | 57 | 45 | 0 | 0 | 12 | 0 |
| Billing/Payments | 6 | 0 | 3 | 0 | 3 | 0 |
| Cleanup | 1 | 0 | 0 | 0 |  | 0 |
| Credenciales | 2 | 0 | 0 |  | 0 |  |
| Deploy/static export | 5 | 0 | 0 | 0 | 0 | 5 |
| Emails | 1 | 0 | 0 | 0 |  | 0 |
| Kinder | 1 | 0 | 0 | 0 | 0 |  |
| Mensajes | 2 |  | 0 | 0 |  | 0 |
| Module Entitlements | 6 | 0 | 0 | 0 | 3 | 3 |
| Notificaciones | 1 |  | 0 | 0 | 0 | 0 |
| Parent | 2 |  | 0 | 0 | 0 |  |
| Parent Portal | 32 | 0 | 0 | 26 | 5 |  |
| Payments | 1 | 0 | 0 | 0 |  | 0 |
| Permisos | 1 |  | 0 | 0 | 0 | 0 |
| Preescolar | 1 | 0 | 0 | 0 | 0 |  |
| Primaria | 2 |  | 0 | 0 | 0 |  |
| Public Landing | 7 | 0 | 0 |  | 0 | 6 |
| QA Evidence | 1 | 0 | 0 |  | 0 | 0 |
| RBAC | 1 | 0 | 0 | 0 |  | 0 |
| Responsive | 17 | 0 | 0 | 8 |  | 8 |
| Responsive/UX | 13 | 0 | 0 | 6 | 0 | 7 |
| School Admin | 111 | 3 | 0 | 33 | 0 | 75 |
| School Creation | 20 | 0 | 0 | 0 | 0 | 20 |
| Security/RBAC | 12 | 0 | 0 | 0 | 0 | 12 |
| Student | 15 | 6 | 0 | 5 | 0 | 4 |
| Student Portal | 32 | 0 | 0 | 27 | 5 | 0 |
| Super Admin | 15 |  | 0 | 14 | 0 | 0 |
| Teacher Portal | 29 | 0 | 0 | 23 | 5 |  |
| Tenant isolation | 1 | 0 | 0 | 0 |  | 0 |

## 3. Matriz por escuela

| Escuela | Nivel | Modulos correctos | Submodulos correctos | Fallos | Pendientes |
| --- | --- | --- | --- | --- | --- |
| QA-CODEX-Kinder-E2E | kinder | Si | Ver e2e-results.json | 16 | 2 |
| QA-CODEX-Preescolar-E2E | preescolar | Si | Ver e2e-results.json | 16 | 2 |
| QA-CODEX-Primaria-E2E | primaria | Si | Ver e2e-results.json | 17 | 2 |

## 4. Matriz por flujo clave

| Flujo | Estado | URL | Esperado | Real |
| --- | --- | --- | --- | --- |
| ruta protegida sin sesion | WARN | https://onlineu.mx/educore/super-admin/users/ | Sin errores graves de consola o red durante la carga. | API Request Error: TypeError: Failed to fetch at a (https://onlineu.mx/educore/_next/static/chunks/app/login/page-20dfe846afaa250f.js:1:10100) at D (https://onlineu.mx/educore/_next/static/chunks/app/login/page-20dfe846afaa250f.js:1:2079) at Object.a_ (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:72147) at aR (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:72301) at https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139240 at sF (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139339) at sM (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139753) at https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:145896 at o4 (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:93336) at iV (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:122701) / https://educore-production-beef.up.railway.app/api/v1/auth/login: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |
| bloqueo ruta protegida sin sesion | PASS_REAL | https://onlineu.mx/educore/login/ | Texto visible: /login/iniciar/no autorizado/unauthorized/Educore/i | Educore Plataforma de administracion escolar Iniciar sesion Bienvenido de vuelta Correo electronico Contrasena Iniciar sesion Olvidaste tu contrasena? Eres nuevo? Contacta a tu institucion para activar tu cuenta. Volver al inicio |
| abrir login super admin | PASS | https://onlineu.mx/educore/login/ | La pagina carga y muestra contenido. | HTTP 200; 236 caracteres visibles. |
| login super admin | FAIL | https://onlineu.mx/educore/login/ | Super Admin entra a un dashboard protegido. | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| abrir login super admin | PASS | https://onlineu.mx/educore/login/ | La pagina carga y muestra contenido. | HTTP 200; 236 caracteres visibles. |
| login super admin | FAIL | https://onlineu.mx/educore/login/ | Super Admin entra a un dashboard protegido. | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| navegar versioning | FAIL | https://onlineu.mx/educore/super-admin/version/ | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 500 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 500 https://educore-production-beef.up.railway.app/api/v1/super-admin/version |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| QA-CODEX-Kinder-E2E: modulos activos por nivel | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/modules/enabled | Modulos esperados: academic_core, users, students, groups, schedules, attendance, documents, reports, communications | Activos=students, auth, grading, grades, groups, academic_core, users, activities, attendance, preschool_report_cards, development_areas, communications, documents, qualitative_assessments, schedules, behavior_notes, observations, reports; faltantes=ninguno |
| QA-CODEX-Preescolar-E2E: modulos activos por nivel | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/modules/enabled | Modulos esperados: academic_core, users, students, groups, schedules, attendance, documents, reports, communications | Activos=students, auth, grading, grades, groups, academic_core, users, activities, attendance, preschool_report_cards, development_areas, communications, documents, qualitative_assessments, schedules, behavior_notes, observations, reports; faltantes=ninguno |
| QA-CODEX-Primaria-E2E: modulos activos por nivel | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/modules/enabled | Modulos esperados: academic_core, users, students, groups, schedules, attendance, grades, documents, reports, communications | Activos=students, auth, grading, grades, groups, academic_core, users, attendance, report_cards, communications, documents, exams, schedules, subjects, reports, assignments; faltantes=ninguno |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| abrir login super admin | PASS | https://onlineu.mx/educore/login/ | La pagina carga y muestra contenido. | HTTP 200; 236 caracteres visibles. |
| login super admin | FAIL | https://onlineu.mx/educore/login/ | Super Admin entra a un dashboard protegido. | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| ruta protegida parent primaria sin sesion | FAIL | https://onlineu.mx/educore/parent/primary/grades/ | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Calificaciones/i | HTTP 404; body length 129 |
| kinder ruta protegida sin sesion | FAIL | https://onlineu.mx/educore/student/kinder/activities/ | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Actividades/i | HTTP 404; body length 129 |
| preescolar ruta protegida sin sesion | FAIL | https://onlineu.mx/educore/student/preschool/activities/ | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Actividades/i | HTTP 404; body length 129 |
| abrir login super admin | PASS | https://onlineu.mx/educore/login/ | La pagina carga y muestra contenido. | HTTP 200; 236 caracteres visibles. |
| login super admin | FAIL | https://onlineu.mx/educore/login/ | Super Admin entra a un dashboard protegido. | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| abrir login super admin | PASS | https://onlineu.mx/educore/login/ | La pagina carga y muestra contenido. | HTTP 200; 236 caracteres visibles. |
| login super admin | FAIL | https://onlineu.mx/educore/login/ | Super Admin entra a un dashboard protegido. | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| abrir login super admin | PASS | https://onlineu.mx/educore/login/ | La pagina carga y muestra contenido. | HTTP 200; 236 caracteres visibles. |
| login super admin | FAIL | https://onlineu.mx/educore/login/ | Super Admin entra a un dashboard protegido. | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| abrir login super admin | PASS | https://onlineu.mx/educore/login/ | La pagina carga y muestra contenido. | HTTP 200; 236 caracteres visibles. |
| login super admin | FAIL | https://onlineu.mx/educore/login/ | Super Admin entra a un dashboard protegido. | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| login super admin via API | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/auth/login | API autentica Super Admin con credenciales E2E sin exponer token. | API login exitoso; credencial temporal no persistida en repo. |
| QA-CODEX-Kinder-E2E: crear horario | FAIL | https://educore-production-beef.up.railway.app/api/v1/school-admin/academic/schedule | Crear bloque de horario QA. | HTTP 400: {"error":"failed to validate schedule conflicts: Error 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near '::time AND cs.end_time \u003e ?::time\n\t\t\t AND cs.group_id = NULLIF(?, '')\n\t\t\tUNIO...' at line 7","success":false} |
| QA-CODEX-Kinder-E2E: registrar asistencia | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/attendance/groups/dc89100c-f1f6-4fca-b41f-e17c16f20beb/bulk | Registrar asistencia QA sin tocar alumnos reales. | Asistencia guardada. |
| QA-CODEX-Kinder-E2E: crear documento | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/documents | Crear documento QA sin exponer archivos reales. | document_id=3418551a-4b71-11f1-b064-809f9b2d0fc2 |
| QA-CODEX-Kinder-E2E: crear comunicado borrador | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/communications | Crear comunicacion QA sin correo/SMS real. | communication_id=79a4ce84-e418-4a87-87e8-3847ffa8ca53 |
| QA-CODEX-Kinder-E2E: generar reporte | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/reports/generate | Generar reporte QA con datos del tenant QA. | report_id=40d9d322-b1b7-439a-bdd8-7278f9cd5edb |
| QA-CODEX-Kinder-E2E: crear cargo simulado | PARTIAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/payments/charges | Crear cargo QA o devolver modulo bloqueado claramente por plan. | HTTP 403: {"error":"Module not enabled for this tenant","success":false} |
| QA-CODEX-Kinder-E2E: login profesor real | SKIPPED_NO_CREDENTIALS | https://educore-production-beef.up.railway.app/api/v1/auth/login | Flujo auditado con credenciales/permisos seguros disponibles. | No hay credencial temporal en memoria para rol TEACHER. |
| QA-CODEX-Kinder-E2E: login padre real | SKIPPED_NO_CREDENTIALS | https://educore-production-beef.up.railway.app/api/v1/auth/login | Flujo auditado con credenciales/permisos seguros disponibles. | No hay credencial temporal en memoria para rol PARENT. |
| QA-CODEX-Kinder-E2E: login alumno real | SKIPPED_NO_CREDENTIALS | https://educore-production-beef.up.railway.app/api/v1/auth/login | Flujo auditado con credenciales/permisos seguros disponibles. | No hay credencial temporal en memoria para rol STUDENT. |
| QA-CODEX-Preescolar-E2E: crear horario | FAIL | https://educore-production-beef.up.railway.app/api/v1/school-admin/academic/schedule | Crear bloque de horario QA. | HTTP 400: {"error":"failed to validate schedule conflicts: Error 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near '::time AND cs.end_time \u003e ?::time\n\t\t\t AND cs.group_id = NULLIF(?, '')\n\t\t\tUNIO...' at line 7","success":false} |
| QA-CODEX-Preescolar-E2E: registrar asistencia | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/attendance/groups/0f9eb588-bbb6-4ae0-9516-bb817c7c48d7/bulk | Registrar asistencia QA sin tocar alumnos reales. | Asistencia guardada. |
| QA-CODEX-Preescolar-E2E: crear documento | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/documents | Crear documento QA sin exponer archivos reales. | document_id=3734a674-4b71-11f1-b064-809f9b2d0fc2 |
| QA-CODEX-Preescolar-E2E: crear comunicado borrador | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/communications | Crear comunicacion QA sin correo/SMS real. | communication_id=1487fdf5-9d3e-4a61-9e6b-35597ec72299 |
| QA-CODEX-Preescolar-E2E: generar reporte | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/reports/generate | Generar reporte QA con datos del tenant QA. | report_id=ee00441f-749d-41ba-b76b-f29268ab33b2 |
| QA-CODEX-Preescolar-E2E: crear cargo simulado | PARTIAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/payments/charges | Crear cargo QA o devolver modulo bloqueado claramente por plan. | HTTP 403: {"error":"Module not enabled for this tenant","success":false} |
| QA-CODEX-Preescolar-E2E: login profesor real | SKIPPED_NO_CREDENTIALS | https://educore-production-beef.up.railway.app/api/v1/auth/login | Flujo auditado con credenciales/permisos seguros disponibles. | No hay credencial temporal en memoria para rol TEACHER. |
| QA-CODEX-Preescolar-E2E: login padre real | SKIPPED_NO_CREDENTIALS | https://educore-production-beef.up.railway.app/api/v1/auth/login | Flujo auditado con credenciales/permisos seguros disponibles. | No hay credencial temporal en memoria para rol PARENT. |
| QA-CODEX-Preescolar-E2E: login alumno real | SKIPPED_NO_CREDENTIALS | https://educore-production-beef.up.railway.app/api/v1/auth/login | Flujo auditado con credenciales/permisos seguros disponibles. | No hay credencial temporal en memoria para rol STUDENT. |
| QA-CODEX-Primaria-E2E: crear horario | FAIL | https://educore-production-beef.up.railway.app/api/v1/school-admin/academic/schedule | Crear bloque de horario QA. | HTTP 400: {"error":"failed to validate schedule conflicts: Error 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near '::time AND cs.end_time \u003e ?::time\n\t\t\t AND cs.group_id = NULLIF(?, '')\n\t\t\tUNIO...' at line 7","success":false} |
| QA-CODEX-Primaria-E2E: registrar asistencia | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/attendance/groups/fbfad424-9dd3-4d3c-9c0e-511da9c9d2d0/bulk | Registrar asistencia QA sin tocar alumnos reales. | Asistencia guardada. |
| QA-CODEX-Primaria-E2E: crear documento | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/documents | Crear documento QA sin exponer archivos reales. | document_id=397e8105-4b71-11f1-b064-809f9b2d0fc2 |
| QA-CODEX-Primaria-E2E: crear comunicado borrador | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/communications | Crear comunicacion QA sin correo/SMS real. | communication_id=f27d146f-23ac-4957-bce1-ef40382bc11b |
| QA-CODEX-Primaria-E2E: generar reporte | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/reports/generate | Generar reporte QA con datos del tenant QA. | report_id=1c46e695-021c-47a4-aded-fe28495f177b |
| QA-CODEX-Primaria-E2E: crear calificacion | FAIL | https://educore-production-beef.up.railway.app/api/v1/school-admin/grades/grades/bulk | Registrar calificacion QA en Primaria. | HTTP 400: {"error":"student 4313407e-f862-4895-80a9-1ef1961bb1d4 is not enrolled in subject d8847f49-0f5f-4e0a-84b0-a4b63ee62532","success":false} |
| QA-CODEX-Primaria-E2E: generar boleta | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/report-cards/generate | Generar boleta QA sin persistir documento permanente. | Boleta calculada. |
| QA-CODEX-Primaria-E2E: crear cargo simulado | PARTIAL | https://educore-production-beef.up.railway.app/api/v1/school-admin/payments/charges | Crear cargo QA o devolver modulo bloqueado claramente por plan. | HTTP 403: {"error":"Module not enabled for this tenant","success":false} |
| QA-CODEX-Primaria-E2E: login profesor real | SKIPPED_NO_CREDENTIALS | https://educore-production-beef.up.railway.app/api/v1/auth/login | Flujo auditado con credenciales/permisos seguros disponibles. | No hay credencial temporal en memoria para rol TEACHER. |
| QA-CODEX-Primaria-E2E: login padre real | SKIPPED_NO_CREDENTIALS | https://educore-production-beef.up.railway.app/api/v1/auth/login | Flujo auditado con credenciales/permisos seguros disponibles. | No hay credencial temporal en memoria para rol PARENT. |
| QA-CODEX-Primaria-E2E: login alumno real | SKIPPED_NO_CREDENTIALS | https://educore-production-beef.up.railway.app/api/v1/auth/login | Flujo auditado con credenciales/permisos seguros disponibles. | No hay credencial temporal en memoria para rol STUDENT. |

## 5. Bugs principales

La tabla muestra los primeros 60 bugs estructurados. El set completo esta en `qa/reports/e2e-results.json` y `qa/reports/e2e-summary.md`.

| ID | Severidad | Rol | Escuela | Pasos/flujo | Esperado | Real | Screenshot/trace | Recomendacion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E2E-001 | P3 |  |  | cargar landing principal | Sin errores graves de consola o red durante la carga. | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |  |  |
| E2E-002 | P3 |  |  | ruta protegida sin sesion | Sin errores graves de consola o red durante la carga. | API Request Error: TypeError: Failed to fetch at a (https://onlineu.mx/educore/_next/static/chunks/app/login/page-20dfe846afaa250f.js:1:10100) at D (https://onlineu.mx/educore/_next/static/chunks/app/login/page-20dfe846afaa250f.js:1:2079) at Object.a_ (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:72147) at aR (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:72301) at https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139240 at sF (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139339) at sM (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:139753) at https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:145896 at o4 (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:93336) at iV (https://onlineu.mx/educore/_next/static/chunks/fd9d1056-1550ff390953c04a.js:1:122701) / https://educore-production-beef.up.railway.app/api/v1/auth/login: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-003 | P1 | SUPER_ADMIN |  | login super admin | Super Admin entra a un dashboard protegido. | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |  |  |
| E2E-004 | P1 | SUPER_ADMIN |  | login super admin | Super Admin entra a un dashboard protegido. | No se detecto dashboard. URL=https://onlineu.mx/educore/login/ |  |  |
| E2E-005 | P3 |  |  | navegar dashboard | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-006 | P3 |  |  | navegar modulos | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-007 | P3 |  |  | navegar billing | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-008 | P3 |  |  | navegar analytics | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-009 | P3 |  |  | navegar health monitor | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-010 | P3 |  |  | navegar database admin | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-011 | P3 |  |  | navegar auditoria | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-012 | P3 |  |  | navegar soporte | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-013 | P3 |  |  | navegar storage | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-014 | P3 |  |  | navegar feature flags | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-015 | P3 |  |  | navegar backups | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-016 | P1 |  |  | navegar versioning | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 500 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 500 https://educore-production-beef.up.railway.app/api/v1/super-admin/version |  |  |
| E2E-017 | P3 |  |  | navegar planes | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-018 | P3 |  |  | navegar escuelas | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-019 | P3 |  |  | navegar usuarios globales | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-020 | P3 |  |  | QA-CODEX-Kinder-E2E: dashboard school admin | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=5k1np / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=5k1np / 404 https://onlineu.mx/educore/school-admin/preschool-report-cards/index.txt?_rsc=5k1np / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=5k1np / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=5k1np |  |  |
| E2E-021 | P3 |  |  | QA-CODEX-Kinder-E2E: estructura | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=jpo5w / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=jpo5w / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=jpo5w / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=jpo5w |  |  |
| E2E-022 | P3 |  |  | QA-CODEX-Kinder-E2E: estudiantes | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=1mu8m / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=1mu8m / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=1mu8m / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=1mu8m |  |  |
| E2E-023 | P3 |  |  | QA-CODEX-Kinder-E2E: profesores | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=1fk3u / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=1fk3u / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=1fk3u / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=1fk3u |  |  |
| E2E-024 | P3 |  |  | QA-CODEX-Kinder-E2E: grupos | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=1dw2w / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=1dw2w / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=1dw2w / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=1dw2w |  |  |
| E2E-025 | P3 |  |  | QA-CODEX-Kinder-E2E: horarios | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=1fo6f / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=1fo6f / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=1fo6f / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=1fo6f |  |  |
| E2E-026 | P3 |  |  | QA-CODEX-Kinder-E2E: asistencia | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=t1aq0 / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=t1aq0 / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=t1aq0 / 404 https://onlineu.mx/educore/school-admin/preschool-report-cards/index.txt?_rsc=t1aq0 |  |  |
| E2E-027 | P3 |  |  | QA-CODEX-Kinder-E2E: documentos | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=8l61g / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=8l61g / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=8l61g / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=8l61g |  |  |
| E2E-028 | P3 |  |  | QA-CODEX-Kinder-E2E: reportes | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=a4zcr / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=a4zcr / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=a4zcr / 404 https://onlineu.mx/educore/school-admin/preschool-report-cards/index.txt?_rsc=a4zcr |  |  |
| E2E-029 | P3 |  |  | QA-CODEX-Kinder-E2E: comunicaciones | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=pvf1i / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=pvf1i / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=pvf1i / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=pvf1i |  |  |
| E2E-030 | P3 |  |  | QA-CODEX-Kinder-E2E: configuracion | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=btr33 / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=btr33 / 404 https://onlineu.mx/educore/school-admin/preschool-report-cards/index.txt?_rsc=btr33 / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=btr33 |  |  |
| E2E-031 | P1 |  | QA-CODEX-Kinder-E2E | QA-CODEX-Kinder-E2E: credencial profesor | Crear o confirmar credencial QA de profesor sin enviar correo. | HTTP 404: {"error":"Profesor no encontrado","success":false} |  |  |
| E2E-032 | P1 |  | QA-CODEX-Kinder-E2E | QA-CODEX-Kinder-E2E: credencial student | Crear o confirmar credencial QA student sin enviar correo. | HTTP 400: {"error":"El estudiante no tiene correo. Agrega uno antes de crear el acceso al portal.","success":false} |  |  |
| E2E-033 | P1 |  | QA-CODEX-Kinder-E2E | QA-CODEX-Kinder-E2E: credencial parent | Crear o confirmar credencial QA parent sin enviar correo. | HTTP 404: {"error":"No se encontrÃ³ un padre/tutor con correo para este estudiante. Registra el contacto primario primero.","success":false} |  |  |
| E2E-034 | P3 |  |  | QA-CODEX-Preescolar-E2E: dashboard school admin | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=5k1np / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=5k1np / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=5k1np / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=5k1np |  |  |
| E2E-035 | P3 |  |  | QA-CODEX-Preescolar-E2E: estructura | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=jpo5w / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=jpo5w / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=jpo5w / 404 https://onlineu.mx/educore/school-admin/preschool-report-cards/index.txt?_rsc=jpo5w |  |  |
| E2E-036 | P3 |  |  | QA-CODEX-Preescolar-E2E: estudiantes | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=1mu8m / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=1mu8m / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=1mu8m / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=1mu8m |  |  |
| E2E-037 | P3 |  |  | QA-CODEX-Preescolar-E2E: profesores | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=1fk3u / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=1fk3u / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=1fk3u / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=1fk3u |  |  |
| E2E-038 | P3 |  |  | QA-CODEX-Preescolar-E2E: grupos | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=1dw2w / 404 https://onlineu.mx/educore/school-admin/preschool-report-cards/index.txt?_rsc=1dw2w / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=1dw2w / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=1dw2w |  |  |
| E2E-039 | P3 |  |  | QA-CODEX-Preescolar-E2E: horarios | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=1fo6f / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=1fo6f / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=1fo6f / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=1fo6f |  |  |
| E2E-040 | P3 |  |  | QA-CODEX-Preescolar-E2E: asistencia | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=t1aq0 / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=t1aq0 / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=t1aq0 / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=t1aq0 |  |  |
| E2E-041 | P3 |  |  | QA-CODEX-Preescolar-E2E: documentos | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=8l61g / 404 https://onlineu.mx/educore/school-admin/preschool-report-cards/index.txt?_rsc=8l61g / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=8l61g / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=8l61g |  |  |
| E2E-042 | P3 |  |  | QA-CODEX-Preescolar-E2E: reportes | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=a4zcr / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=a4zcr / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=a4zcr / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=a4zcr |  |  |
| E2E-043 | P3 |  |  | QA-CODEX-Preescolar-E2E: comunicaciones | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=pvf1i / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=pvf1i / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=pvf1i / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=pvf1i |  |  |
| E2E-044 | P3 |  |  | QA-CODEX-Preescolar-E2E: configuracion | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / Failed to load resource: the server responded with a status of 404 () / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / 404 https://onlineu.mx/educore/school-admin/qualitative/index.txt?_rsc=btr33 / 404 https://onlineu.mx/educore/school-admin/development/index.txt?_rsc=btr33 / 404 https://onlineu.mx/educore/school-admin/observations/index.txt?_rsc=btr33 / 404 https://onlineu.mx/educore/school-admin/activities/index.txt?_rsc=btr33 |  |  |
| E2E-045 | P1 |  | QA-CODEX-Preescolar-E2E | QA-CODEX-Preescolar-E2E: credencial profesor | Crear o confirmar credencial QA de profesor sin enviar correo. | HTTP 404: {"error":"Profesor no encontrado","success":false} |  |  |
| E2E-046 | P1 |  | QA-CODEX-Preescolar-E2E | QA-CODEX-Preescolar-E2E: credencial student | Crear o confirmar credencial QA student sin enviar correo. | HTTP 400: {"error":"El estudiante no tiene correo. Agrega uno antes de crear el acceso al portal.","success":false} |  |  |
| E2E-047 | P1 |  | QA-CODEX-Preescolar-E2E | QA-CODEX-Preescolar-E2E: credencial parent | Crear o confirmar credencial QA parent sin enviar correo. | HTTP 404: {"error":"No se encontrÃ³ un padre/tutor con correo para este estudiante. Registra el contacto primario primero.","success":false} |  |  |
| E2E-048 | P3 |  |  | QA-CODEX-Primaria-E2E: dashboard school admin | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-049 | P3 |  |  | QA-CODEX-Primaria-E2E: estructura | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-050 | P3 |  |  | QA-CODEX-Primaria-E2E: estudiantes | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-051 | P3 |  |  | QA-CODEX-Primaria-E2E: profesores | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-052 | P3 |  |  | QA-CODEX-Primaria-E2E: grupos | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-053 | P3 |  |  | QA-CODEX-Primaria-E2E: horarios | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-054 | P3 |  |  | QA-CODEX-Primaria-E2E: asistencia | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-055 | P3 |  |  | QA-CODEX-Primaria-E2E: documentos | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-056 | P3 |  |  | QA-CODEX-Primaria-E2E: reportes | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-057 | P3 |  |  | QA-CODEX-Primaria-E2E: comunicaciones | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-058 | P3 |  |  | QA-CODEX-Primaria-E2E: configuracion | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-059 | P1 |  | QA-CODEX-Primaria-E2E | QA-CODEX-Primaria-E2E: credencial profesor | Crear o confirmar credencial QA de profesor sin enviar correo. | HTTP 404: {"error":"Profesor no encontrado","success":false} |  |  |
| E2E-060 | P1 |  | QA-CODEX-Primaria-E2E | QA-CODEX-Primaria-E2E: credencial student | Crear o confirmar credencial QA student sin enviar correo. | HTTP 400: {"error":"El estudiante no tiene correo. Agrega uno antes de crear el acceso al portal.","success":false} |  |  |

## 6. Hallazgos destacados

- Super Admin versioning devuelve 500 en `/api/v1/super-admin/version`.
- Login UI de Super Admin no salio de `/login/` en varias pruebas; el login API si funciono y permitio continuar la auditoria.
- Credenciales de profesor, padre y alumno fallan en las tres escuelas QA: profesor no encontrado, alumno sin correo para portal, padre/tutor primario no encontrado.
- Horarios fallan por SQL PostgreSQL en MySQL/MariaDB: `::time`/`NULLIF` dentro de validacion de conflictos.
- Primaria no permite calificacion porque el alumno QA no queda inscrito en la materia esperada.
- Payments en plan basic responde 403 `Module not enabled for this tenant`; cargo/pago simulado queda PARTIAL, no se intento pasarela real.
- Landing y portales cargan, pero hay warnings recurrentes de hydration React y aborts de Cloudflare RUM.
- Varias rutas protegidas anonimas devuelven pagina 200/404 estatica en vez de un redirect/401 claro.

## 7. Mejoras recomendadas

- Producto: completar pantallas por nivel y decidir si Basic incluye payments/payments_basic.
- UX: mostrar errores visibles cuando una ruta protegida no tiene sesion; reducir hydration warnings.
- Seguridad defensiva: unificar respuestas 401/403 para rutas protegidas y evitar paginas 200 confusas sin sesion.
- Performance: revisar React hydration en landing y requests RSC 404 para submodulos inexistentes.
- Base de datos: portar SQL restante a MySQL/MariaDB, especialmente horarios y consultas con casts PostgreSQL.
- QA: agregar endpoints o fixtures QA para reset temporal de passwords de teacher/parent/student sin guardar secretos.
- DevOps: mantener `playwright/.auth`, traces, videos y screenshots fuera de Git; el .gitignore ya lo cubre.

## 8. Checklist

- Login: PARTIAL, API Super Admin OK; UI login Super Admin falla en dashboard detection.
- Creacion/reuso escuela: PASS_REAL para Kinder, Preescolar y Primaria QA-CODEX.
- Modulos por nivel: PASS_REAL en endpoints de modulos; submodulos visuales tienen warnings/404 RSC.
- Credenciales: FAIL para portales teacher/parent/student por errores API.
- Facturacion: PARTIAL, modulo payments bloqueado por plan; no pago real.
- Backups: lectura OK; crear/descargar/eliminar backup SKIPPED sin bandera dedicada.
- Portales: navegacion con soporte Super Admin cubierta; login real de roles SKIPPED por falta de credencial temporal generada.
- RBAC/API sin token: PASS_REAL en endpoints API basicos; rutas frontend protegidas necesitan respuestas mas claras.
- Responsive: PASS/WARN; screenshots generados para desktop/tablet/mobile.

## 9. Archivos generados

| Archivo | Contenido |
| --- | --- |
| qa/e2e/24_mutating_module_functionality.spec.ts Nuevo spec mutante QA-CODEX | Row |

## 10. Comandos ejecutados

- `npm run build` - PASS
- `cd backend && go build -buildvcs=false ./...` - PASS
- `cd frontend && NEXT_PUBLIC_DEMO_MODE=false npm run build` - PASS
- `npx playwright test qa/e2e --headed --reporter=html` - PASS runner, con FAIL/PARTIAL internos documentados

## 11. Datos QA conservados

- QA-CODEX-Kinder-E2E / qa-codex-kinder-e2e / tenant 6b2e9f2d-e8d5-44bd-9d71-a5100695054f
- QA-CODEX-Preescolar-E2E / qa-codex-preescolar-e2e / tenant 7e395a88-0944-4590-884f-22cc1abc72d1
- QA-CODEX-Primaria-E2E / qa-codex-primaria-e2e / tenant f82e3d5e-df65-44d1-bacc-084cea626c8a

No se ejecuto cleanup destructivo. Los datos QA quedan para retest.
