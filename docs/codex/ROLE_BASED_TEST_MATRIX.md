# Role Based Test Matrix

Fecha: 06-05-2026  
Objetivo: validar acceso, acciones y datos por rol en EduCore. Esta matriz debe ejecutarse con al menos dos escuelas QA para confirmar RBAC y aislamiento multi-tenant.

## Resumen De Rutas Por Rol

| Rol | Rutas que puede ver | Rutas que NO puede ver |
|---|---|---|
| SUPER_ADMIN | `/super-admin/*`, `/login`, `/escuela/`, `/school-admin/*` solo en modo soporte con escuela seleccionada | `/teacher/*`, `/parent/*`, `/student/*` como usuario escolar normal |
| SCHOOL_ADMIN | `/school-admin/*`, `/login?slug=...&role=school_admin`, `/escuela/?slug=...` | `/super-admin/*`, `/teacher/*`, `/parent/*`, `/student/*` |
| TEACHER | `/teacher/*`, `/login?slug=...&role=teacher`, `/escuela/?slug=...` | `/super-admin/*`, `/school-admin/*`, `/parent/*`, `/student/*` |
| PARENT | `/parent/*`, `/login?slug=...&role=parent`, `/escuela/?slug=...` | `/super-admin/*`, `/school-admin/*`, `/teacher/*`, `/student/*` |
| STUDENT | `/student/*`, `/login?slug=...&role=student`, `/escuela/?slug=...` | `/super-admin/*`, `/school-admin/*`, `/teacher/*`, `/parent/*` |

## SUPER_ADMIN

| Categoria | Permitido | Bloqueado |
|---|---|---|
| Rutas | `/super-admin/dashboard`, `/super-admin/schools`, `/super-admin/schools/details`, `/super-admin/users`, `/super-admin/modules`, `/super-admin/billing`, `/super-admin/database`, `/super-admin/lab`, `/super-admin/health`, `/super-admin/audit`, `/super-admin/settings` | Portales escolares directos como teacher/parent/student; `/school-admin/*` sin contexto de soporte |
| Acciones | Crear escuelas, editar escuela, activar modulos, gestionar planes, gestionar usuarios globales, revisar auditoria, entrar en modo soporte | Crear datos escolares sin `X-Support-Tenant-ID`, usar portal escolar con role mismatch, crear SUPER_ADMIN desde School Admin |
| Datos consultables | Datos globales de plataforma, metadatos de tenants, modulos, planes, logs, billing SaaS | Datos tenant operativos sin seleccion explicita de escuela o sin auditoria de soporte |
| Datos nunca consultables | Password hashes, `MYSQL_DSN`, `JWT_SECRET`, tokens Stripe, datos de otros tenants mezclados en una respuesta escolar | Cualquier secreto en frontend, logs publicos o documentos |

## SCHOOL_ADMIN

| Categoria | Permitido | Bloqueado |
|---|---|---|
| Rutas | `/school-admin/dashboard`, `/academic`, `/students`, `/teachers`, `/groups`, `/schedule`, `/attendance`, `/grades`, `/report-cards`, `/documents`, `/payments`, `/reports`, `/communications`, `/database`, `/settings`, cuenta propia | `/super-admin/*`, `/teacher/*`, `/parent/*`, `/student/*` |
| Acciones | Administrar usuarios escolares, matricular alumnos, vincular padres, crear profesores, registrar asistencias, capturar calificaciones, generar boletas, documentos, reportes y pagos segun modulos | Gestionar planes globales, ver otras escuelas, cambiar su propio `tenant_id`, crear SUPER_ADMIN, saltar `ModuleGuard`/`RequireModule` |
| Datos consultables | Alumnos, padres, profesores, grupos, materias, asistencia, calificaciones, documentos, pagos y reportes de su tenant | Datos de otras escuelas, secretos, billing global de plataforma, logs globales |
| Datos nunca consultables | Alumnos/padres/profesores de otro tenant, `users` globales, credenciales reales, tokens de otros roles | Respuestas agregadas con mezcla de tenants |

## TEACHER

| Categoria | Permitido | Bloqueado |
|---|---|---|
| Rutas | `/teacher/dashboard`, `/teacher/classes`, `/teacher/attendance`, `/teacher/grades`, `/teacher/messages`, cuenta propia | `/super-admin/*`, `/school-admin/*`, `/parent/*`, `/student/*` |
| Acciones | Consultar grupos asignados, registrar asistencia, capturar calificaciones, enviar/leer mensajes permitidos | Crear escuelas, crear usuarios, ver billing, modificar pagos, ver database explorer, editar configuracion institucional |
| Datos consultables | Grupos asignados, alumnos de esos grupos, asistencia/calificaciones de sus clases, mensajes relacionados | Alumnos fuera de sus grupos, datos financieros, datos de otros profesores si no hay asignacion |
| Datos nunca consultables | Datos de otro tenant, datos globales, documentos sensibles no compartidos, pagos familiares completos si no aplica | Password hashes o tokens |

## PARENT

| Categoria | Permitido | Bloqueado |
|---|---|---|
| Rutas | `/parent/dashboard`, `/parent/children`, `/parent/grades`, `/parent/attendance`, `/parent/messages`, `/parent/documents`, `/parent/payments`, `/parent/consents`, cuenta propia | `/super-admin/*`, `/school-admin/*`, `/teacher/*`, `/student/*` |
| Acciones | Consultar datos de hijos vinculados, revisar documentos, pagos, consentimientos y mensajes familiares | Editar calificaciones/asistencias, crear usuarios, ver datos de otros alumnos, administrar modulos |
| Datos consultables | Hijos vinculados por `parent_student`, calificaciones, asistencia, documentos autorizados, pagos propios, mensajes | Otros alumnos, otros padres, profesores fuera de comunicacion permitida, configuracion escolar interna |
| Datos nunca consultables | Expedientes de alumnos no vinculados, documentos privados de otro alumno, pagos de otra familia, tenant ajeno | Datos administrativos globales |

## STUDENT

| Categoria | Permitido | Bloqueado |
|---|---|---|
| Rutas | `/student/dashboard`, `/student/grades`, `/student/attendance`, `/student/schedule`, `/student/notifications`, `/student/settings` | `/super-admin/*`, `/school-admin/*`, `/teacher/*`, `/parent/*` |
| Acciones | Consultar su perfil academico, calificaciones, asistencia, horario y notificaciones | Editar calificaciones/asistencia, ver otros alumnos, crear mensajes administrativos, ver pagos completos si no esta disenado para alumno |
| Datos consultables | Registro `students` vinculado a `users.id` via `students.user_id`, sus `grade_records`, sus `attendance_records`, su grupo/horario | Datos de hermanos sin vinculo, companeros, profesores, padres u otros tenants |
| Datos nunca consultables | Cualquier estudiante distinto, pagos administrativos, documentos privados no destinados al alumno, datos globales | Tokens, secretos o logs internos |

## Pruebas De Bloqueo Obligatorias

| Prueba | Resultado esperado |
|---|---|
| SCHOOL_ADMIN abre `/super-admin/dashboard` | Redireccion o 403 |
| TEACHER abre `/school-admin/students` | Redireccion o 403 |
| PARENT abre `/teacher/grades` | Redireccion o 403 |
| STUDENT abre `/parent/children` | Redireccion o 403 |
| SUPER_ADMIN abre `/school-admin/students` sin soporte | Pantalla de seleccion/contexto o bloqueo |
| Credencial SCHOOL_ADMIN en `/login?slug=x&role=teacher` | 403 `ROLE_MISMATCH`, sin guardar token |
| Token de Escuela A en rutas de Escuela B | No expone datos de B |

## Evidencia Minima Por Ejecucion

- Captura o log de login correcto por cada rol.
- Captura o log de al menos un 403 por rol incorrecto.
- Captura de modo soporte con banner visible.
- Registro de la escuela/slug usada.
- Confirmacion de que ningun token queda guardado tras role mismatch.
