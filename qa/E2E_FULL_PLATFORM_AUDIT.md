# Auditoria E2E Total EduCore

Rama aislada: `codex/full-platform-e2e-audit`

Worktree: `C:\Users\gioes\OneDrive\Desktop\Educore-codex-full-platform-e2e-audit`

App auditada: `https://onlineu.mx/educore/`

API auditada: `https://educore-production-beef.up.railway.app`

Ultima corrida: `2026-05-08T15:22:01.374Z`

## 1. Resumen ejecutivo

La auditoria automatizada con Playwright headed ejecuto 14 specs contra produccion sin modificar datos reales.

Resultado de la corrida:

| Estado | Cantidad |
| --- | ---: |
| PASS | 34 |
| WARN | 23 |
| FAIL | 4 |
| SKIPPED | 68 |

Lectura correcta del resultado:

- La landing publica, login, rutas publicas, responsive, navegacion Super Admin read-only y RBAC/API fueron ejercitados con navegador/API real.
- Las credenciales Super Admin se usaron solo como variables de entorno temporales. No se guardaron tokens, passwords ni `storageState` en el repo.
- El login por API funciona y permite cargar pantallas protegidas para QA, pero el login desde UI no llega al dashboard y queda en `/login/`.
- No se crearon escuelas, usuarios, pagos, backups ni cambios de configuracion porque `E2E_ALLOW_PRODUCTION_MUTATIONS=false`.
- Los 68 `SKIPPED` no son pases: quedan pendientes hasta autorizar mutaciones QA `QA-CODEX-*`.
- Se detectaron 4 fallos P1 en la superficie probada: 3 intentos de login UI Super Admin fallidos y 1 endpoint Super Admin Versioning con HTTP 500.
- Se detectaron 23 advertencias P3, principalmente React `#425/#418` en landing y aborts de Cloudflare RUM.

Porcentaje aproximado funcional:

- Superficie no-skipped: 34 PASS / 61 resultados = 55.7% PASS, 37.7% WARN, 6.6% FAIL.
- Plataforma completa: no se puede declarar porcentaje real porque los portales School Admin, Teacher, Parent y Student quedaron `SKIPPED` por mutation gate apagado y falta de usuarios QA creados.

Bloqueadores para una auditoria completa:

- Habilitar `E2E_ALLOW_PRODUCTION_MUTATIONS=true` solo cuando se autorice crear/reusar datos `QA-CODEX-*` en produccion.
- Crear o reutilizar escuelas QA por nivel para convertir los flujos de portales en pruebas reales.
- Browser Use in-app no pudo inicializar su app-server local en esta sesion; Playwright headed si corrio correctamente como fallback de navegador real.

Riesgos de produccion observados:

- P1: el login UI Super Admin no completa, aunque la API acepta la misma credencial temporal. Esto apunta a un problema de cliente/login, CORS, storage o manejo de respuesta.
- P1: `/api/v1/super-admin/version` devuelve HTTP 500 al navegar `/super-admin/version/`.
- P3: React minificado reporta errores `#425/#418` en la landing; suele apuntar a mismatch de hidratacion o contenido HTML/cliente inconsistente.
- P3: Cloudflare RUM aparece como `net::ERR_ABORTED` en varias vistas; no bloqueo la UX probada, pero ensucia telemetria.

## 2. Matriz por rol

| Rol | Modulo | Estado | Fallo | Severidad | Evidencia |
| --- | --- | --- | --- | --- | --- |
| Publico | Landing, links internos, CTA demo, tema, responsive | WARN | React `#425/#418` en consola | P3 | `qa/reports/e2e-summary.md`, screenshots landing |
| Publico/Auth | Login vacio/invalido, ruta protegida sin sesion | WARN | `Failed to fetch` durante flujo invalido/protegido | P3 | `qa/reports/e2e-summary.md`, `auth-login-page.png` |
| Super Admin | Login UI | FAIL | UI queda en `/login/` aunque API login funciona | P1 | `qa/reports/e2e-summary.md` |
| Super Admin | Dashboard, modulos, billing, analytics, health, DB admin, audit, support, storage, feature flags, backups, planes, escuelas, usuarios | WARN | Pantallas cargan con sesion temporal API; RUM abortado en consola | P3 | `qa/screenshots/super-admin-users.png`, `qa/reports/e2e-summary.md` |
| Super Admin | Versioning | FAIL | API `/api/v1/super-admin/version` responde HTTP 500 | P1 | `qa/reports/e2e-summary.md` |
| School Admin | Estudiantes, padres, profesores, grupos, horarios, asistencia, documentos, reportes, comunicacion, configuracion | SKIPPED | Falta escuela QA y/o modo soporte con mutation gate seguro | N/A | `qa/reports/e2e-results.json` |
| Teacher | Dashboard, grupos, asistencia, horario, mensajes, notificaciones, perfiles, modulos por nivel | SKIPPED | Falta profesor QA | N/A | `qa/reports/e2e-results.json` |
| Parent | Hijos, asistencia, avances, documentos, pagos, permisos, mensajes, modulos por nivel | SKIPPED | Falta padre QA vinculado | N/A | `qa/reports/e2e-results.json` |
| Student | Dashboard, classroom, horario, actividades, biblioteca, examenes, boleta, mensajes, perfil | SKIPPED | Falta alumno QA con cuenta | N/A | `qa/reports/e2e-results.json` |
| Anonimo/API | Endpoints protegidos y `X-Support-Tenant-ID` invalido | PASS | N/A | N/A | `qa/reports/e2e-summary.md` |

## 3. Matriz por escuela

| Escuela | Nivel | Modulos correctos | Submodulos correctos | Fallos | Pendientes |
| --- | --- | --- | --- | --- | --- |
| QA-CODEX-Kinder-E2E | KINDER | SKIPPED | SKIPPED | No probado | Crear/reutilizar solo con mutation gate |
| QA-CODEX-Preescolar-E2E | PRESCHOOL/PREESCOLAR | SKIPPED | SKIPPED | No probado | Crear/reutilizar solo con mutation gate |
| QA-CODEX-Primaria-E2E | PRIMARY/PRIMARIA | SKIPPED | SKIPPED | No probado | Crear/reutilizar solo con mutation gate |

## 4. Matriz por flujo

| Flujo | Estado | URL | Resultado esperado | Resultado real |
| --- | --- | --- | --- | --- |
| Landing publica | WARN | `https://onlineu.mx/educore/` | Carga, copy visible, links sin 404, CTA y tema funcionales | Carga y funciona, pero emite React `#425/#418` |
| Login UI Super Admin | FAIL | `https://onlineu.mx/educore/login/` | Login autentica y redirige a dashboard | Se queda en `/login/`; API login con la misma credencial temporal si funciona |
| Login API Super Admin para QA | PASS | `/api/v1/auth/login` | Token valido sin persistir credencial en repo | API devuelve sesion; token se inyecta solo en contexto Playwright |
| Logout Super Admin | PASS | `/super-admin/dashboard/` | Cierra sesion y vuelve a login | Logout clickeado correctamente |
| Links internos publicos | PASS | `/educore/`, `/educore/login/` | No 404/5xx | HTTP 200 |
| Responsive landing/login | WARN | desktop/tablet/mobile | Sin overflow horizontal ni errores graves | Sin overflow, pero landing conserva React warnings |
| Super Admin read-only | WARN/FAIL | `/super-admin/*` | Pantallas cargan sin 5xx | Cargan varias pantallas, pero versioning responde 500 y RUM aborta |
| RBAC API anonimo | PASS | `/api/v1/super-admin/*`, `/school-admin/*`, `/teacher/*`, `/parent/*`, `/student/*` | 401/403 claro, sin `password_hash` | Rechaza requests sin token/token invalido |
| Crear escuelas QA | SKIPPED | `/super-admin/schools` | Crear/reutilizar `QA-CODEX-*` | Mutation gate apagado |
| Portales por rol | SKIPPED | `/school-admin/*`, `/teacher/*`, `/parent/*`, `/student/*` | Operacion completa por rol | Faltan escuelas/usuarios QA |
| Billing/credenciales | SKIPPED | varias | Sin pagos reales, sin hash expuesto | Faltan usuarios QA |
| Backups/deploy history | WARN/SKIPPED | `/super-admin/backups` | Cargar vista; no crear backup sin permiso extra | Vista abre con RUM abortado; crear backup skipped |

## 5. Bugs

| ID | Severidad | Rol | Escuela | Pasos | Esperado | Real | Screenshot/trace | Recomendacion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| E2E-001 | P1 | Super Admin | N/A | Abrir login y enviar credenciales Super Admin temporales | Redireccion a dashboard | UI queda en `/login/`; API login si funciona | `qa/screenshots/auth-login-page.png`, `qa/reports/e2e-summary.md` | Revisar cliente de login: payload, CORS, manejo de `success/data/token`, localStorage y redirect post-login |
| E2E-002 | P1 | Super Admin | N/A | Navegar a `/super-admin/version/` con sesion QA | Pantalla versioning sin errores 5xx | `GET /api/v1/super-admin/version` devuelve HTTP 500 | `qa/reports/e2e-summary.md` | Revisar handler/version service y compatibilidad con MySQL/produccion |
| E2E-003 | P3 | Publico | N/A | Abrir landing | Sin errores de consola | React minificado `#425/#418` | `qa/screenshots/public-landing-desktop.png` | Revisar hidratacion de la landing en build productivo |
| E2E-004 | P3 | Publico/Auth | N/A | Abrir ruta protegida sin sesion y login invalido | Redireccion limpia al login sin ruido de consola | `TypeError: Failed to fetch` y request abortado a auth login | `qa/screenshots/auth-login-page.png` | Manejar errores de red/login invalido sin lanzar error global |
| E2E-005 | P3 | Super Admin/Publico | N/A | Navegar vistas con Cloudflare RUM activo | Telemetria silenciosa | `https://onlineu.mx/cdn-cgi/rum?: net::ERR_ABORTED` repetido | `qa/reports/e2e-summary.md` | Confirmar si Cloudflare RUM abortado es esperado; si no, ajustar configuracion |

## 6. Mejoras sugeridas

Producto:

- Agregar datos seed QA o un tenant QA persistente para probar portales completos sin tocar escuelas reales.
- Agregar identificadores `data-testid` en botones criticos: login, logout, nuevo usuario, acciones de tres puntos, crear escuela, support mode.
- Separar claramente acciones destructivas de acciones read-only en Super Admin para que el E2E pueda auditar mas superficie sin riesgo.

UX:

- Corregir los warnings de hidratacion de la landing.
- Hacer estable el flujo de login UI y mostrar error claro si falla.
- Hacer visible/estable el flujo de recuperacion de contrasena en login si debe existir.
- Mantener empty states claros en portales cuando no existan datos.

Seguridad:

- Mantener el patron de 401/403 para APIs sin token.
- En futuras corridas autenticadas, validar cross-tenant con IDs reales QA.
- Evitar que errores de login/red aparezcan como excepciones globales en consola.

Performance:

- Agregar Lighthouse/Web Vitals como segunda etapa.
- Medir tiempos de carga por ruta autenticada cuando existan credenciales QA.

Base de datos:

- No tocar migraciones desde esta rama.
- No crear datos no marcados `QA-CODEX-*`.
- Investigar el 500 de versioning antes de habilitar pruebas mutantes.

QA:

- Convertir los `SKIPPED` en pruebas reales cuando se habilite el gate de mutaciones QA.
- Publicar HTML report como artifact de CI si se agrega workflow QA.
- Mantener traces/videos pesados fuera de Git y subirlos solo como artifacts.

DevOps:

- Mantener `playwright/.auth/` fuera del repo.
- Mantener `qa/traces/test-results/`, `qa/reports/playwright-html/` y `playwright-report/` ignorados.

## 7. Checklist

| Item | Estado |
| --- | --- |
| Landing | WARN |
| Login UI | FAIL |
| Login API QA | PASS |
| Super Admin read-only | WARN/FAIL |
| Creacion escuela | SKIPPED |
| Modulos por nivel | SKIPPED |
| Credenciales | SKIPPED |
| Facturacion | SKIPPED |
| Backups | WARN/SKIPPED |
| Teacher portal | SKIPPED |
| Parent portal | SKIPPED |
| Student portal | SKIPPED |
| RBAC anonimo/API | PASS |
| Responsive | WARN |

## 8. Archivos generados

Tests:

- `qa/e2e/00_public_landing.spec.ts`
- `qa/e2e/01_auth_roles.spec.ts`
- `qa/e2e/02_super_admin_schools.spec.ts`
- `qa/e2e/03_school_creation_by_level.spec.ts`
- `qa/e2e/04_school_admin_core.spec.ts`
- `qa/e2e/05_teacher_portal.spec.ts`
- `qa/e2e/06_parent_portal.spec.ts`
- `qa/e2e/07_student_portal.spec.ts`
- `qa/e2e/08_billing_credentials.spec.ts`
- `qa/e2e/09_backups_deploy_history.spec.ts`
- `qa/e2e/10_module_entitlements.spec.ts`
- `qa/e2e/11_security_rbac_tenant.spec.ts`
- `qa/e2e/12_responsive_accessibility.spec.ts`
- `qa/e2e/helpers/audit.ts`

Reportes:

- `qa/E2E_FULL_PLATFORM_AUDIT.md`
- `qa/reports/e2e-results.json`
- `qa/reports/e2e-summary.md`
- `qa/reports/playwright-results.json`

Screenshots:

- `qa/screenshots/public-landing-desktop.png`
- `qa/screenshots/public-landing-mobile.png`
- `qa/screenshots/auth-login-page.png`
- `qa/screenshots/super-admin-users.png`
- `qa/screenshots/responsive-landing-desktop-1280.png`
- `qa/screenshots/responsive-landing-tablet-768.png`
- `qa/screenshots/responsive-landing-mobile-375.png`

Traces/videos:

- Locales en `qa/traces/test-results/`, ignorados por Git para evitar peso y datos temporales.
- HTML report local en `playwright-report/`, ignorado por Git.
- HTML report configurado en `qa/reports/playwright-html/`, ignorado por Git.

## 9. Comandos ejecutados

```powershell
git status --short --branch
git branch --show-current
git log --oneline -10
npm install -D @playwright/test
npx playwright install chromium
npm ci # dentro de frontend para build local
npm run build
go build -buildvcs=false ./... # dentro de backend
$env:NEXT_PUBLIC_DEMO_MODE='false'; npm run build # dentro de frontend
$env:E2E_BASE_URL='https://onlineu.mx/educore'; $env:E2E_API_URL='https://educore-production-beef.up.railway.app'; $env:E2E_SUPERADMIN_EMAIL='[local-only]'; $env:E2E_SUPERADMIN_PASSWORD='[local-only]'; $env:E2E_QA_PASSWORD='[local-only]'; $env:E2E_ALLOW_PRODUCTION_MUTATIONS='false'; npx playwright test qa/e2e --headed --reporter=html
```

## 10. Como ejecutar auditoria completa autenticada con mutaciones QA

Solo ejecutar esto cuando se autorice crear/reusar datos QA en produccion:

```powershell
$env:E2E_BASE_URL="https://onlineu.mx/educore"
$env:E2E_API_URL="https://educore-production-beef.up.railway.app"
$env:E2E_SUPERADMIN_EMAIL="[local-only]"
$env:E2E_SUPERADMIN_PASSWORD="[local-only]"
$env:E2E_QA_PASSWORD="[local-only]"
$env:E2E_ALLOW_PRODUCTION_MUTATIONS="true"
npx playwright test qa/e2e --headed --reporter=html
```

No guardar esas variables ni `playwright/.auth/` en el repositorio.
