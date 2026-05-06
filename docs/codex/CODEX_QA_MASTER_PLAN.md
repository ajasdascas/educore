# EduCore QA Master Plan

Fecha: 06-05-2026  
Alcance: auditoria independiente de QA para produccion. No sustituye el smoke tecnico de Claude; lo complementa cuando terminen los cambios de portales, login por rol, provisioning, modulos por nivel y migraciones MySQL.

## Objetivo

EduCore debe probarse como SaaS multi-tenant B2B, no como una sola escuela demo. Cada prueba debe confirmar tres cosas:

- El rol correcto ve solo su portal y sus acciones.
- La escuela correcta ve solo sus datos, modulos y usuarios.
- Produccion Hostinger + Railway sigue sirviendo frontend, API y MySQL sin regresiones despues de deploy.

## Estrategia De Pruebas Por Rol

| Rol | Enfoque QA | Riesgo principal | Evidencia esperada |
|---|---|---|---|
| SUPER_ADMIN | Manager Maestro, escuelas, planes, usuarios globales, modulos, soporte | Acceso accidental a datos tenant sin contexto o soporte sin auditoria | Puede administrar plataforma, seleccionar escuela en modo soporte y salir del soporte |
| SCHOOL_ADMIN | Operacion escolar completa | Ver datos de otro tenant o activar modulos no contratados | Gestiona alumnos, profesores, grupos, asistencias, calificaciones, documentos, reportes y pagos segun modulos activos |
| TEACHER | Grupos asignados, asistencia y calificaciones | Ver grupos/alumnos no asignados o rutas administrativas | Solo ve dashboard, clases, asistencia, calificaciones, mensajes y cuenta propia |
| PARENT | Hijos vinculados, documentos, pagos y mensajes | Ver hijos de otra familia o editar informacion academica | Solo consulta datos de sus hijos y acciones familiares permitidas |
| STUDENT | Portal propio, calificaciones y asistencia | Ver datos de otros alumnos o entrar sin `students.user_id` | Solo consulta su perfil academico vinculado a su usuario |

## Estrategia De Pruebas Por Escuela/Tenant

Crear o seleccionar al menos dos escuelas QA:

- Escuela A: nivel `preescolar` o `kinder`, sin pagos si el plan no lo incluye.
- Escuela B: nivel `primaria`, con `payments` activo si el modulo se va a validar.

Casos obligatorios:

| Caso | Pasos | Resultado esperado |
|---|---|---|
| Aislamiento de login | Intentar usar credenciales de Escuela A en `/login?slug=escuela-b&role=teacher` | Login rechazado o sesion queda ligada al tenant real sin exponer datos de B |
| Aislamiento de API | Con token de Escuela A consultar rutas de Escuela B o usar slug ajeno | Backend responde 403/404 o datos de A, nunca datos de B |
| Modo soporte | SUPER_ADMIN entra a Escuela A desde detalles/lab con `X-Support-Tenant-ID` | Ve banner de soporte, opera en tenant seleccionado y puede salir |
| Modulos por tenant | Desactivar/activar modulo desde Super Admin y abrir ruta School Admin | UI oculta o bloquea la ruta; backend mantiene `RequireModule` |
| Provisioning | Crear escuela nueva con slug unico | Se crean admin inicial, niveles, grupos base, roles, modulos core y modulos por nivel |
| Subdominio | Probar `/escuela/?slug=...` y, si DNS wildcard existe, `https://slug.onlineu.mx` | Ambas rutas preservan escuela y role seleccionado |

## Estrategia Por Nivel Escolar

| Nivel | Tipo de evaluacion | Modulos base esperados | Enfoque QA |
|---|---|---|---|
| Bebes / guarderia | Registro diario y cuidado | Objetivo/producto futuro: daily logs, comidas, siestas, panales, salud, incidentes, autorizados, fotos, comunicacion | Validar que no se mezcle con calificaciones numericas; debe comportarse como cuidado diario |
| Preescolar | Cualitativa | `academic_core`, `users`, `students`, `groups`, `schedules`, `attendance`, `documents`, `reports`, `communications` | Observaciones, evidencias, desarrollo socioemocional y boleta cualitativa |
| Kinder | Cualitativa | Igual a preescolar | Areas de desarrollo, observaciones docentes, reportes a padres y asistencia |
| Primaria | Numerica/cualitativa segun configuracion | `academic_core`, `users`, `students`, `groups`, `schedules`, `attendance`, `grades`, `reports`, `communications` | Materias, tareas, examenes, promedios, boletas academicas y reportes |

## Regresion Antes De Cada Deploy

Ejecutar esta bateria antes de fusionar a `master`:

| Area | Validacion manual/automatica | Criterio de salida |
|---|---|---|
| Git | Revisar diff y confirmar que no hay secretos ni cambios fuera de alcance | Solo cambios esperados |
| Frontend build | `cd frontend && npm run build` cuando el cambio toque frontend | Build genera `frontend/out/` sin errores |
| Backend build/tests | `cd backend && go test ./...` cuando el cambio toque Go | Tests pasan |
| Routing roles | `node scripts/check-auth-routing.js` y `node scripts/check-school-routing.js` | Todos los checks PASS |
| Portales | `node scripts/check-school-portals.js` | Rutas internas responden |
| Role mismatch | `node scripts/check-role-portal-login.js` con credenciales reales QA | Credenciales de rol incorrecto devuelven 403 |
| Student | `node scripts/check-student-api.js` con `STUDENT_EMAIL`/`STUDENT_PASSWORD` si hay alumno real | Dashboard, grades y attendance responden |
| Comunicaciones | `node scripts/check-communications-module.js` si el modulo esta activo | Lista, stats, create y delete funcionan |
| Boletas PDF | `node scripts/check-report-cards-export.js` | PDF se genera y descarga |
| Staging integral | `scripts/staging-smoke-authenticated.ps1` con variables QA | Flujo escuela, usuarios, asistencia, pagos y RBAC pasa |

## Pruebas Criticas Post-Deploy

Despues de cada deploy a produccion:

1. Abrir `https://onlineu.mx/educore/` y confirmar que carga con CSS.
2. Abrir `/educore/login/` y confirmar formulario.
3. Login SUPER_ADMIN y abrir `/super-admin/dashboard`.
4. Abrir `/super-admin/schools` y detalle de una escuela.
5. Entrar a modo soporte a una escuela QA.
6. Validar `/school-admin/dashboard`, `/students`, `/teachers`, `/attendance`, `/grades`, `/report-cards`, `/documents`, `/reports`.
7. Login TEACHER, PARENT y STUDENT con usuarios QA reales.
8. Probar un role mismatch: credenciales SCHOOL_ADMIN en portal teacher deben fallar.
9. Revisar `https://<railway-backend>/api/v1/health` o URL productiva configurada.
10. Confirmar que `db_driver=mysql` y `db_mysql_ready=true`.

## Checklist Produccion Hostinger + Railway

| Plataforma | Revisar | Aceptacion |
|---|---|---|
| GitHub Actions | Job `Deploy EduCore to Production` en verde | Build, FTP verify, FTP deploy y postcheck completados |
| Hostinger FTP | `public_html/educore/index.html`, `_next/`, rutas estaticas y `.htaccess` raiz | No falta `_next/static`; rutas directas no dan 404 |
| Hostinger MySQL | Migraciones manuales aplicadas y backup reciente | Tablas/columnas requeridas existen antes de smoke |
| Railway | Variables `APP_ENV`, `DB_DRIVER`, `MYSQL_DSN`, `JWT_SECRET` y flags Stripe seguros | Health OK y logs sin panic/500 repetitivos |
| Cloudflare/DNS | Wildcard si se usa subdominio por escuela | `slug.onlineu.mx` resuelve o se usa fallback `/escuela/?slug=` |
| Cache | HTML no cacheado de forma agresiva y assets hasheados disponibles | No hay pagina sin CSS por assets borrados |

## Criterios De Aceptacion Por Modulo

| Modulo | Aceptacion minima |
|---|---|
| Auth + RBAC | Login por rol, mismatch bloqueado, logout limpia sesion, rutas protegidas redirigen por rol |
| Tenants/Escuelas | Alta provisiona admin, nivel, grupos base, roles, modulos y slug sin colision |
| Usuarios | Crear/editar SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, PARENT y STUDENT sin duplicar email indebido |
| Academic Core | Grados, grupos, materias y horarios son tenant-scoped y consistentes |
| Students | Matricula, vinculacion con padres y, para STUDENT, `students.user_id` correcto |
| Attendance | Registro bulk por grupo/fecha y consulta historica por alumno |
| Grading | Captura por grupo/materia, promedios correctos y boleta consume datos reales |
| Report Cards | PDF descargable con alumno, periodo, asistencia y calificaciones correctas |
| Documents | Subida/preview/verificacion/soft delete; archivos grandes muestran error claro |
| Communications | Lista, stats, crear, enviar/programar y eliminar sin 500 |
| Reports | Generacion, historial, detalle y export funcionan con datos tenant |
| Payments | Solo activo por modulo; cargos, pagos, recibos y vista Parent funcionan |
| Support Mode | SUPER_ADMIN requiere escuela seleccionada, muestra banner y no cambia su JWT |
