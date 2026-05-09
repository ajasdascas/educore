# EduCore Full Real Platform Audit

Generated: 2026-05-09T06:07:48.313Z
Base URL: https://onlineu.mx/educore
API URL: https://educore-production-beef.up.railway.app

Ultima ejecucion real en navegador:

- Comando: `npx playwright test qa/e2e --headed --reporter=html`
- Navegador: Chromium headed contra produccion.
- Resultado runner: 26/26 specs ejecutaron sin fallar.
- Mutaciones en produccion: desactivadas (`E2E_ALLOW_PRODUCTION_MUTATIONS=false`).
- Credenciales E2E disponibles: no; los flujos autenticados profundos quedan `SKIPPED_NO_CREDENTIALS`.
- Browser plugin de Codex: bloqueado por runtime local (`failed to write kernel assets`); se uso Playwright headed como navegador real de respaldo.

## 1. Resumen ejecutivo

- Listo para vender: **NO**.
- P0 encontrados: 0.
- P1 encontrados: 7.
- Rutas frontend inventariadas: 81.
- Modulos detectados por inventario: 88.
- Endpoints backend detectados: 298.
- Rutas 404/static missing detectadas: 7.
- Alcance: QA funcional autorizada y control de acceso seguro; no pentesting ofensivo.

| Estado | Conteo |
| --- | ---: |
| FAIL_404 | 7 |
| PARTIAL | 22 |
| PASS_READ_ONLY | 7 |
| PASS_REAL | 41 |
| SKIPPED_NO_CREDENTIALS | 52 |
| SKIPPED_SECURITY_SCOPE | 1 |

## 2. Tabla por area

| Area | Estado | Evidencia | Fallas | Pendiente | Severidad |
| --- | --- | --- | ---: | ---: | --- |
| Landing | PARTIAL/SKIPPED | https://onlineu.mx/educore/ | 0 | 8 | P2 |
| Auth | PARTIAL/SKIPPED | https://onlineu.mx/educore/login/ | 0 | 9 | P2 |
| Super Admin | PARTIAL/SKIPPED | https://onlineu.mx/educore/login/ | 0 | 24 | P2 |
| Planes | PARTIAL/SKIPPED | /super-admin/plans/ | 0 | 1 | P2 |
| Escuelas | PARTIAL/SKIPPED | /super-admin/schools/ | 0 | 1 | P2 |
| School Admin | PARTIAL/SKIPPED |  | 0 | 1 | P2 |
| Teacher | PASS_REAL | https://educore-production-beef.up.railway.app/api/v1/teacher/dashboard | 0 | 0 |  |
| Parent | FAIL | https://educore-production-beef.up.railway.app/api/v1/parent/dashboard | 1 | 2 | P1 |
| Student | FAIL | https://educore-production-beef.up.railway.app/api/v1/student/dashboard | 6 | 8 | P1 |
| Kinder | FAIL |  | 1 | 2 | P1 |
| Preescolar | FAIL |  | 1 | 2 | P1 |
| Primaria | FAIL |  | 5 | 8 | P1 |
| Billing | PARTIAL/SKIPPED | /super-admin/billing/ | 0 | 14 | P2 |
| Payments | SKIPPED_NO_COVERAGE |  | 0 | 0 |  |
| Credenciales | PARTIAL/SKIPPED |  | 0 | 3 | P2 |
| Emails | SKIPPED_NO_COVERAGE |  | 0 | 0 |  |
| Backups | PARTIAL/SKIPPED | /super-admin/backups/ | 0 | 4 | P2 |
| Mensajes | PARTIAL/SKIPPED |  | 0 | 2 | P2 |
| Notificaciones | PASS_REAL | https://onlineu.mx/educore/parent/notifications/ | 0 | 0 |  |
| Permisos | PARTIAL/SKIPPED | https://onlineu.mx/educore/parent/consents/ | 0 | 1 | P2 |
| RBAC | PARTIAL/SKIPPED | https://educore-production-beef.up.railway.app/api/v1/super-admin/schools | 0 | 1 | P2 |
| Tenant isolation | PARTIAL/SKIPPED |  | 0 | 1 | P2 |
| Responsive | PARTIAL/SKIPPED | https://onlineu.mx/educore/ | 0 | 15 | P2 |
| Deploy/static export | PARTIAL/SKIPPED |  | 0 | 2 | P2 |

## 3. Matriz modulo/submodulo

Ver `MODULE_ROLE_LEVEL_MATRIX.csv` para la matriz completa.

## 4. Bugs

| ID | Severidad | Rol | Nivel | URL | Pasos | Esperado | Real | Evidencia | Recomendacion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E2E-009 | P1 |  |  | https://onlineu.mx/educore/parent/primary/grades/ | ruta protegida parent primaria sin sesion | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Calificaciones/i | HTTP 404; body length 129 |  |  |
| E2E-010 | P1 |  |  | https://onlineu.mx/educore/student/kinder/activities/ | kinder ruta protegida sin sesion | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Actividades/i | HTTP 404; body length 129 |  |  |
| E2E-011 | P1 |  |  | https://onlineu.mx/educore/student/preschool/activities/ | preescolar ruta protegida sin sesion | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Actividades/i | HTTP 404; body length 129 |  |  |
| E2E-012 | P1 |  |  | https://onlineu.mx/educore/student/primary/subjects/ | primaria /student/primary/subjects/ sin sesion | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Dashboard/Perfil/Calificaciones/i | HTTP 404; body length 129 |  |  |
| E2E-013 | P1 |  |  | https://onlineu.mx/educore/student/primary/assignments/ | primaria /student/primary/assignments/ sin sesion | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Dashboard/Perfil/Calificaciones/i | HTTP 404; body length 129 |  |  |
| E2E-014 | P1 |  |  | https://onlineu.mx/educore/student/primary/exams/ | primaria /student/primary/exams/ sin sesion | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Dashboard/Perfil/Calificaciones/i | HTTP 404; body length 129 |  |  |
| E2E-015 | P1 |  |  | https://onlineu.mx/educore/student/primary/grades/ | primaria /student/primary/grades/ sin sesion | Texto visible compatible con /login/iniciar/Educore/No autorizado/Unauthorized/Dashboard/Perfil/Calificaciones/i | HTTP 404; body length 129 |  |  |
| E2E-001 | P3 |  |  | https://onlineu.mx/educore/ | cargar landing principal | Sin errores graves de consola o red durante la carga. | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |  |  |
| E2E-002 | P3 |  |  | https://onlineu.mx/educore/super-admin/users/ | ruta protegida sin sesion | Sin errores graves de consola o red durante la carga. | Failed to load resource: the server responded with a status of 401 () / 401 https://educore-production-beef.up.railway.app/api/v1/auth/login / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-003 | P3 |  |  | https://onlineu.mx/educore/ | landing desktop-1280 | Sin errores graves de consola o red durante la carga. | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |  |  |
| E2E-004 | P3 |  |  | https://onlineu.mx/educore/login/ | login desktop-1280 | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-005 | P3 |  |  | https://onlineu.mx/educore/ | landing tablet-768 | Sin errores graves de consola o red durante la carga. | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-006 | P3 |  |  | https://onlineu.mx/educore/login/ | login tablet-768 | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-007 | P3 |  |  | https://onlineu.mx/educore/ | landing mobile-375 | Sin errores graves de consola o red durante la carga. | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-008 | P3 |  |  | https://onlineu.mx/educore/login/ | login mobile-375 | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-016 | P3 |  |  | https://onlineu.mx/educore/student/attendance/ | primaria /student/attendance/ sin sesion | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-017 | P3 |  |  | https://onlineu.mx/educore/student/schedule/ | primaria /student/schedule/ sin sesion | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-018 | P3 |  |  | https://onlineu.mx/educore/student/messages/ | primaria /student/messages/ sin sesion | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-019 | P3 |  |  | https://onlineu.mx/educore/student/notifications/ | primaria /student/notifications/ sin sesion | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-020 | P3 |  |  | https://onlineu.mx/educore/student/profile/ | primaria /student/profile/ sin sesion | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-021 | P3 |  |  | https://onlineu.mx/educore/parent/consents/ | Parent permisos sin sesion | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-022 | P3 |  |  | https://onlineu.mx/educore/ | landing mobile 375x667 | Sin errores graves de consola o red durante la carga. | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. |  |  |
| E2E-023 | P3 |  |  | https://onlineu.mx/educore/login/ | login mobile 375x667 | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-024 | P3 |  |  | https://onlineu.mx/educore/ | landing tablet 768x1024 | Sin errores graves de consola o red durante la carga. | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-025 | P3 |  |  | https://onlineu.mx/educore/login/ | login tablet 768x1024 | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-026 | P3 |  |  | https://onlineu.mx/educore/ | landing desktop 1366x768 | Sin errores graves de consola o red durante la carga. | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-027 | P3 |  |  | https://onlineu.mx/educore/login/ | login desktop 1366x768 | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-028 | P3 |  |  | https://onlineu.mx/educore/ | landing desktop 1920x1080 | Sin errores graves de consola o red durante la carga. | Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings. / https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |
| E2E-029 | P3 |  |  | https://onlineu.mx/educore/login/ | login desktop 1920x1080 | Sin errores graves de consola o red durante la carga. | https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED |  |  |

## 5. Rutas 404

Ver `ROUTE_404_REPORT.csv`.

## 6. Roles/modulos mal ubicados

Ver `MODULE_ROLE_LEVEL_MATRIX.csv`; cualquier `PARTIAL_WRONG_ROLE` queda listado ahi.

## 7. Botones sin accion

Los botones muertos se reportan como `FAIL_BUTTON_DEAD` en `BUGS.csv` y en la matriz.

## 8. Funcionalidad de adorno

Los estados `PASS_EMPTY_STATE`, `PASS_EMPTY_STATE_ACCEPTABLE` y `PARTIAL_EMPTY_STATE_ONLY` indican pantallas sin logica real probada.

## 9. Seguridad

Ver `RBAC_IDOR_REPORT.csv`. Las pruebas se limitaron a navegacion normal y APIs propias; cualquier ruta ofensiva se marca `SKIPPED_SECURITY_SCOPE`.

## 10. Datos QA

- No hay objetos QA registrados como creados/eliminados en `PROGRESS.json`.

## 11. Recomendaciones finales

- Arreglar primero cualquier P0/P1 antes de vender.
- Convertir los `SKIPPED_NO_CREDENTIALS` en pruebas reales con credenciales QA locales.
- Mantener storage state, traces, screenshots y videos fuera de Git.
- Ejecutar cleanup antes de cerrar una corrida con mutaciones QA.
