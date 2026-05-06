# EduCore — Provisioning Automático de Escuelas
**Actualizado:** 05-05-2026

---

## Qué es el provisioning

Cuando el Super Admin crea una escuela nueva (POST `/api/v1/super-admin/schools`), el backend ejecuta un bloque de provisioning en una sola transacción que deja la escuela lista para operar sin configuración manual.

Todo sucede en `backend/internal/modules/super_admin/handler.go` → `CreateSchool`.

---

## Pasos del provisioning (en orden)

| Paso | Qué hace | Tabla afectada |
|------|----------|----------------|
| 1 | Crea el tenant (la escuela) | `tenants` |
| 2 | Crea el usuario director (SCHOOL_ADMIN) con contraseña temporal | `users` |
| 3 | Siembra los roles disponibles para ese tenant | `tenant_roles` |
| 4 | Activa los módulos core (presentes en todas las escuelas) | `tenant_modules` vía `modules_catalog` |
| 5 | Activa módulos específicos del nivel educativo | `tenant_modules` |
| 6 | Crea el ciclo escolar activo (ej. 2025-2026) | `school_years` |
| 7 | Guarda los ajustes de la escuela (nombre, nivel, moneda, zona horaria) | `school_settings` |
| 8 | Siembra los grados escolares del nivel | `grade_levels` |
| 9 | Siembra materias por defecto para el nivel | `subjects` |
| 10 | Crea el primer grupo genérico (ej. "Grupo A") | `groups` |
| 11 | Activa módulos de portal (rutas del sidebar) | `portal_school_admin` en `tenant_modules` |

Si cualquier paso falla, la transacción hace rollback completo. No quedan datos huérfanos.

---

## Niveles educativos soportados

| Nivel (`education_level`) | Aliases aceptados |
|---|---|
| `babies` | `daycare`, `guardería`, `nursery` |
| `preescolar` | `preschool`, `prek` |
| `kinder` | `kindergarten`, `kinder` |
| `primaria` | `primary`, `elementary` |

Los aliases se normalizan a la forma canónica antes de buscar en `modulesByEducationLevel`.

---

## Módulos que se activan por nivel

### Core (siempre activos — todos los niveles)
```
academic_core, users, students, teachers, groups, attendance, 
communications, documents, schedule, finance
```

### Bebés / Guardería (`babies`)
```
daily_logs, meals, naps, diapers, mood, health_checks, 
incidents, pickup_authorizations, milestones, photos_evidence
```

### Preescolar (`preescolar`) / Kinder (`kinder`)
```
qualitative_assessments, development_areas, observations, 
activities, behavior_notes, preschool_report_cards
```

### Primaria (`primaria`)
```
grades, grading, report_cards, subjects, assignments, exams
```

La lista completa está en `backend/internal/modules/super_admin/handler.go` → `modulesByEducationLevel` y en `frontend/lib/modules/registry.ts` → `MODULES_BY_LEVEL`.

---

## Crear usuarios con acceso a portal

Después del provisioning, el director puede crear acceso de portal para profesores, padres y alumnos desde el panel de School Admin.

### Teacher portal

**UI:** School Admin → Profesores → [Detalle del profesor] → "Crear acceso portal profesor"

**API:**
```
POST /api/v1/school-admin/academic/teachers/:id/portal-access
Authorization: Bearer <school_admin_token>
```

**Qué hace:**
1. Verifica que el profesor exista en el tenant actual.
2. Si ya tiene `user_id` vinculado, devuelve las credenciales existentes.
3. Si no, crea un `users` record con `role=TEACHER` y contraseña temporal `EduXXXXXXXXXX`.
4. Actualiza `teachers.user_id` para vincular el registro.
5. Devuelve `{ email, password, message }`.

### Student portal

**UI:** School Admin → Estudiantes → [Detalle] → "Acceso estudiante"

**API:**
```
POST /api/v1/school-admin/academic/students/:id/portal-access
Authorization: Bearer <school_admin_token>
```

**Qué hace:**
1. Crea usuario con `role=STUDENT` y contraseña temporal.
2. Actualiza `students.user_id` con el nuevo usuario.

**Requisito:** La migración `006_student_portal_user_id.sql` debe estar aplicada en Hostinger:
```sql
-- Verificar si ya está aplicada:
DESCRIBE students;
-- Debe aparecer la columna user_id

-- Si no está, aplicar manualmente:
-- backend/migrations_mysql/006_student_portal_user_id.sql
```

### Parent portal

**UI:** School Admin → Estudiantes → [Detalle] → "Acceso padre"

**API:**
```
POST /api/v1/school-admin/academic/students/:id/parent-portal-access
Authorization: Bearer <school_admin_token>
```

**Qué hace:**
1. Busca el contacto primario del alumno en `parent_contacts`.
2. Crea usuario con `role=PARENT` usando el email del contacto.
3. Devuelve las credenciales temporales.

---

## Formato de credenciales temporales

Las contraseñas generadas siguen el patrón:
```
Edu + 10 caracteres hexadecimales aleatorios
Ej: EduA3f9b21c04
```

Se muestran **una sola vez** en la respuesta del endpoint. El director debe copiarlas y enviarlas al usuario.

No hay flujo de "olvidé mi contraseña" aún — el director puede regenerar credenciales llamando el endpoint nuevamente.

---

## Migraciones necesarias en Hostinger

Aplica en orden. Cada migración es idempotente (`IF NOT EXISTS`).

| Archivo | Qué agrega | Estado sugerido |
|---------|-----------|---------|
| `006_student_portal_user_id.sql` | Columna `students.user_id` | Aplicar si no existe |
| `009_school_levels_modules_portals.sql` | 7 tablas nuevas + backfill portales | Aplicar si no existe |

Verificar aplicación:
```sql
-- 006: columna user_id en students
DESCRIBE students;

-- 009: tabla school_levels
SHOW TABLES LIKE 'school_levels';
```

---

## Probar el provisioning con QA script

```bash
node scripts/check-school-provisioning.js
```

El script valida sin conexión de red:
- Que `handler.go` tenga todos los pasos de provisioning
- Que todos los niveles y sus módulos estén definidos
- Que `portal_access.go` tenga los tres handlers
- Que la migración 006 exista
- Que `registry.ts` tenga todos los niveles y módulos

---

## Variables de entorno requeridas

```env
# Ninguna adicional para provisioning básico
# El provisioning usa las mismas credenciales de DB que el resto del backend
DATABASE_URL=mysql://user:pass@host/educore
JWT_SECRET=...
```
