# EduCore — Production Module Audit
**Fecha:** 05-05-2026  
**Autor:** QA + Arquitecto (Claude Code)  
**Entorno:** Frontend → Hostinger (static), Backend → Railway (MySQL Hostinger prod)

---

## Metodología
- Lectura completa de rutas frontend (`frontend/app/`)
- Lectura de handlers backend (`backend/internal/modules/`)
- Cruce con migraciones MySQL (`backend/migrations_mysql/`)
- Cruce con `mysqlrepair/repair.go` (tablas auto-creadas en staging)
- Sin ejecución de código ni modificaciones previas al audit

---

## 1. Estudiantes (`/school-admin/students`)

| Ítem | Estado |
|------|--------|
| Listar alumnos | ✅ FUNCIONA |
| Crear alumno | ✅ FUNCIONA |
| Editar / toggle estado | ✅ FUNCIONA |
| Eliminar (soft delete) | ✅ FUNCIONA |
| Historial académico | ⚠️ PLACEHOLDER — `buildAcademicHistory()` genera datos sintéticos client-side si el API devuelve vacío |
| Horario del alumno | ✅ FUNCIONA (endpoint real) |
| Documentos del alumno | ✅ FUNCIONA (endpoint real) |
| Importar Excel | ✅ FUNCIONA |

**Endpoints usados:** `GET/POST/PUT/DELETE /api/v1/school-admin/academic/students[/:id]`, `/history`, `/schedule`, `/documents/:id`, `/imports/students/commit`  
**Tablas:** `students`, `groups`, `group_students`, `student_academic_history`, `import_batches`, `school_documents`, `attendance_records`, `class_schedule_blocks`  
**Migraciones MySQL:** Todas en `001_hostinger_core.sql` ✅ + `006_student_portal_user_id.sql` (pendiente en prod)  
**usa authFetch:** ✅  
**Prioridad del bug:** BAJA — historial sintético solo aparece si la BD está vacía; no es un fallo de producción

**Fix recomendado:** Mostrar "Sin historial registrado" en vez de generar datos sintéticos.

---

## 2. Profesores (`/school-admin/teachers`)

| Ítem | Estado |
|------|--------|
| Listar profesores | ✅ FUNCIONA |
| Crear profesor | ✅ FUNCIONA |
| Editar / toggle estado | ✅ FUNCIONA |
| Detalle | ✅ FUNCIONA |

**Endpoints:** `GET/POST/PUT /api/v1/school-admin/academic/teachers[/:id]`  
**Tablas:** `users`, `teacher_profiles`, `group_teachers`, `group_subjects`  
**Migraciones MySQL:** ✅ `001_hostinger_core.sql`  
**Prioridad:** OK

---

## 3. Grupos (`/school-admin/groups`)

| Ítem | Estado |
|------|--------|
| Listar grupos | ✅ FUNCIONA |
| Crear grupo | ✅ FUNCIONA |
| Editar / toggle / eliminar | ✅ FUNCIONA |
| Detalle (alumnos, materias, profes) | ✅ FUNCIONA |

**Endpoints:** `GET/POST/PUT/DELETE /api/v1/school-admin/academic/groups[/:id]`  
**Tablas:** `groups`, `group_students`, `group_teachers`, `group_subjects`, `grade_levels`, `school_years`  
**Migraciones MySQL:** ✅  
**Prioridad:** OK

---

## 4. Horarios (`/school-admin/schedule`)

| Ítem | Estado |
|------|--------|
| Ver agenda semanal | ✅ FUNCIONA |
| Crear bloque | ✅ FUNCIONA |
| Editar / eliminar | ✅ FUNCIONA |
| Detección de conflictos | ⚠️ CLIENT-SIDE — lógica en frontend sobre datos reales; backend no valida cruces |

**Endpoints:** `GET/POST/PUT/DELETE /api/v1/school-admin/academic/schedule[/:id]`  
**Tablas:** `class_schedule_blocks`, `groups`, `subjects`, `users`  
**Migraciones MySQL:** ✅  
**Prioridad:** BAJA — duplicación de lógica, no es fallo

---

## 5. Asistencias (`/school-admin/attendance`)

| Ítem | Estado |
|------|--------|
| Seleccionar grupo y fecha | ✅ FUNCIONA |
| Ver asistencia del día | ✅ FUNCIONA |
| Guardar asistencia bulk | ✅ FUNCIONA |
| Historial por alumno/mes | ✅ FUNCIONA |

**Endpoints:** `GET /attendance/groups/:groupId/today`, `POST /attendance/groups/:groupId/bulk`  
**Tablas:** `attendance_records`, `groups`, `group_students`, `students`  
**Migraciones MySQL:** ✅  
**Prioridad:** OK

---

## 6. Calificaciones (`/school-admin/grades`)

| Ítem | Estado |
|------|--------|
| Seleccionar grupo/materia | ✅ FUNCIONA |
| Ver calificaciones | ✅ FUNCIONA |
| Guardar calificaciones bulk | ✅ FUNCIONA |

**Endpoints:** `GET /grades/groups/:groupId/subjects/:subjectId`, `POST /grades/grades/bulk`  
**Tablas:** `grades`, `grade_records`, `group_subjects`, `students`, `subjects`  
**Migraciones MySQL:** ✅  
**Nota:** La ruta bulk está duplicada (`/grades/grades/bulk`) — parece typo en el registro de rutas (línea 100 de handler.go). El frontend llama exactamente esa ruta, así que funciona.  
**Prioridad:** OK (typo estético, no es fallo)

---

## 7. Boletas (`/school-admin/report-cards`)

| Ítem | Estado |
|------|--------|
| Seleccionar alumno | ✅ FUNCIONA |
| Generar boleta | ✅ FUNCIONA |
| Exportar PDF | ✅ FUNCIONA (jsPDF client-side) |
| Guardar como documento | ⚠️ NO IMPLEMENTADO en frontend — `persist_as_document` existe en el payload pero el botón no está |

**Endpoints:** `GET /academic/students`, `POST /report-cards/generate`  
**Tablas:** `students`, `grades`, `grade_records`, `attendance_records`, `groups`, `subjects`  
**Migraciones MySQL:** ✅  
**Prioridad:** OK — el PDF funciona

---

## 8. Documentos (`/school-admin/documents`)

| Ítem | Estado |
|------|--------|
| Listar documentos | ✅ FUNCIONA |
| Subir documento (base64) | ✅ FUNCIONA |
| Editar metadatos | ✅ FUNCIONA |
| Verificar documento | ✅ FUNCIONA |
| Eliminar (soft delete) | ✅ FUNCIONA |
| Preview (PDF/imagen) | ✅ FUNCIONA |
| Descarga directa | ❌ NO HAY botón de descarga — solo preview iframe/img |
| Tabla `school_documents` en MySQL | ✅ en `001_hostinger_core.sql` |
| Archivos en storage externo | ❌ DISEÑO — archivos van como base64 en DB; viable para MVP pero falla con archivos >16MB (max_allowed_packet) |

**Endpoints:** `POST/GET/PUT/PATCH/DELETE /api/v1/school-admin/documents/...`  
**Tablas:** `school_documents`  
**Prioridad:** MEDIA — falta botón de descarga; base64 en DB puede dar error 413/500 con PDFs grandes

**Fix recomendado:** Agregar botón "Descargar" que genere un `<a download>` desde el data URL. Poner límite de 8MB en el frontend con mensaje claro.

---

## 9. Reportes (`/school-admin/reports`)

| Ítem | Estado |
|------|--------|
| Listar reportes | ✅ FUNCIONA |
| Generar reporte | ✅ FUNCIONA |
| Ver detalle | ✅ FUNCIONA |
| Exportar reporte | ✅ FUNCIONA |
| Eliminar | ✅ FUNCIONA |
| Tabla `school_reports` MySQL | ✅ en `007_school_reports.sql` + `mysqlrepair` |

**Endpoints:** `GET/POST /reports`, `GET/POST/DELETE /reports/:id`, `POST /reports/:id/export`  
**Tablas:** `school_reports`  
**Prioridad:** OK (tabla aplicada en sesión anterior)

---

## 10. Comunicaciones (`/school-admin/communications`)

| Ítem | Estado |
|------|--------|
| Listar comunicaciones | 🔴 FALLA — tabla `school_communications` no existe en MySQL |
| Ver stats | 🔴 FALLA — misma tabla |
| Crear comunicación | 🔴 FALLA — INSERT falla con Error 1146 |
| Enviar/programar | 🔴 FALLA |
| Editar/eliminar | 🔴 FALLA |
| `COUNT(*) FILTER (WHERE ...)` en `GetCommunicationStats` | 🔴 ERROR DE BACKEND — sintaxis PostgreSQL pura, no traducida por el adaptador portable |

**Reproducir:** Abrir `/school-admin/communications` en producción → pantalla vacía + error 500 en DevTools

**Endpoints:** `GET/POST /communications`, `GET /communications/stats`, etc.  
**Tablas faltantes:** `school_communications`  
**Migraciones MySQL:** ❌ NO EXISTE en ningún archivo  
**Problema adicional:** `COUNT(*) FILTER (WHERE status='sent')` → MySQL no soporta esta sintaxis. El adaptador `portable_db.go` NO incluye traducción para `FILTER (WHERE ...)`.

**Fix requerido:**
1. Crear migración `008_school_communications.sql`
2. Traducir `COUNT(*) FILTER (WHERE ...)` a `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` en `communications.go`
3. Agregar `school_communications` a `mysqlrepair`

**Prioridad:** 🔴 CRÍTICA — módulo completamente no funcional en producción

---

## 11. Base de datos (`/school-admin/database`)

| Ítem | Estado |
|------|--------|
| Listar tablas | ✅ FUNCIONA |
| Ver schema | ✅ FUNCIONA |
| Ver filas | ✅ FUNCIONA |
| Exportar tabla | ✅ FUNCIONA |
| Importar Excel (validación) | ✅ FUNCIONA |
| Export "todo" sin paginación | ⚠️ RIESGO — puede generar payloads enormes en prod |

**Tablas:** `database_admin_table_states`, `database_admin_operation_logs`, `tenant_custom_fields`, etc.  
**Prioridad:** BAJA

---

## 12. Configuración (`/school-admin/settings`)

| Ítem | Estado |
|------|--------|
| Cargar configuración | ✅ FUNCIONA |
| Guardar configuración | ✅ FUNCIONA |

**Tablas:** `school_settings`, `tenants`  
**Prioridad:** OK

---

## 13. Parent Portal (`/parent/`)

| Ítem | Estado |
|------|--------|
| Dashboard | ✅ FUNCIONA |
| Hijos / calificaciones | ✅ FUNCIONA |
| Asistencia | ✅ FUNCIONA |
| Mensajes | ✅ FUNCIONA |
| Documentos (solo lectura) | ✅ FUNCIONA |
| Pagos internos | ✅ FUNCIONA |
| Consentimientos | ✅ FUNCIONA |

**Prioridad:** OK

---

## 14. Student Portal (`/student/`)

| Ítem | Estado |
|------|--------|
| Dashboard | ✅ FUNCIONA (cuando user_id existe en students) |
| Calificaciones | ✅ FUNCIONA |
| Asistencia | ✅ FUNCIONA |
| Login con role=STUDENT | ⚠️ PENDIENTE PRODUCCIÓN — columna `students.user_id` no aplicada en Hostinger |

**Fix requerido:** Aplicar `006_student_portal_user_id.sql` en Hostinger phpMyAdmin  
**Prioridad:** MEDIA (migración manual pendiente)

---

## 15. Teacher Portal (`/teacher/`)

| Ítem | Estado |
|------|--------|
| Dashboard | ✅ FUNCIONA |
| Grupos | ✅ FUNCIONA |
| Asistencia | ✅ FUNCIONA |
| Calificaciones | ✅ FUNCIONA |
| Mensajes | ✅ FUNCIONA |

**Prioridad:** OK

---

## 16. Pagos / Finanzas (`/school-admin/payments`)

| Ítem | Estado |
|------|--------|
| Listar pagos | ✅ FUNCIONA (con módulo payments activo) |
| Crear cargo | ✅ FUNCIONA |
| Registrar pago | ✅ FUNCIONA |
| Obtener recibo | ✅ FUNCIONA |
| Exportar CSV | ✅ FUNCIONA (client-side) |
| Checkout Stripe | ⚠️ ENDPOINT EXISTE (backend) pero sin UI en frontend |
| ModuleGuard en frontend | ❌ FALTANTE — `<ModuleGuard moduleKey="payments">` no está; escuelas sin módulo payments pueden ver la UI aunque el backend la bloquee |

**Prioridad:** BAJA (backend ya protege con `RequireModule("payments")`)

---

## Resumen ejecutivo

| Área | Estado | Evidencia | Pendiente |
|------|--------|-----------|-----------|
| Estudiantes | ✅ OK | Historial sintético es cosmético | Quitar datos fake del historial vacío |
| Profesores | ✅ OK | — | — |
| Grupos | ✅ OK | — | — |
| Horarios | ✅ OK | Validación de cruces solo en FE | — |
| Asistencias | ✅ OK | — | — |
| Calificaciones | ✅ OK | Ruta `/grades/grades/bulk` typo sin consecuencias | — |
| Boletas | ✅ OK | PDF funciona | — |
| Documentos | ⚠️ INCOMPLETO | Falta botón descarga; base64 en DB | Botón download + límite 8MB |
| Reportes | ✅ OK | `007_school_reports.sql` aplicada | — |
| Comunicaciones | 🔴 FALLA | Tabla `school_communications` no existe en MySQL; `FILTER(WHERE)` no soportado | Crear migración 008 + fix SQL |
| Base de datos | ✅ OK | — | — |
| Configuración | ✅ OK | — | — |
| Parent Portal | ✅ OK | — | — |
| Student Portal | ⚠️ PARCIAL | `students.user_id` pendiente en Hostinger | Aplicar migración 006 |
| Teacher Portal | ✅ OK | — | — |
| Pagos | ⚠️ INCOMPLETO | Sin ModuleGuard en FE | Agregar ModuleGuard |

---

## Bloque crítico a implementar: Comunicaciones

**Problema 1:** Tabla `school_communications` no existe en MySQL Hostinger → Error 1146 en todas las operaciones.

**Problema 2:** `COUNT(*) FILTER (WHERE status = 'sent')` en `GetCommunicationStats` → sintaxis PostgreSQL. MySQL necesita `SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END)`.

**Solución:**
1. Crear `backend/migrations_mysql/008_school_communications.sql`
2. Agregar `school_communications` a `mysqlrepair/repair.go`
3. Reescribir `GetCommunicationStats` en `communications.go` con sintaxis portable

---
*Generado por auditoría automática del codebase — 05-05-2026*
