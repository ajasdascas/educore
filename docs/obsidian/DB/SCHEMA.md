# Esquema de Base de Datos — EduCore

## Tablas Principales (14)

| Tabla | RLS | Descripción |
|---|---|---|
| `tenants` | ❌ | Registro global de escuelas/clientes. |
| `tenant_modules` | ❌ | Módulos activos por cada tenant. |
| `users` | ✅ | Usuarios (SuperAdmin, SchoolAdmin, Teacher, Parent). |
| `grade_levels` | ✅ | Niveles académicos (Primaria, Secundaria, etc). |
| `groups` | ✅ | Grupos (1° A, 2° B, etc). |
| `subjects` | ✅ | Materias/Asignaturas. |
| `students` | ✅ | Expediente de alumnos. |
| `teacher_profiles`| ✅ | Información extra de profesores (1:1 con users). |
| `parent_student` | ✅ | Relación entre padres e hijos. |
| `group_students` | ✅ | Inscripción de alumnos en grupos. |
| `group_teachers` | ✅ | Asignación de profesores a grupos y materias. |
| `attendance_records`| ✅ | Registro diario de asistencia. |
| `grade_records` | ✅ | Calificaciones por periodo. |
| `notifications` | ✅ | Notificaciones del sistema para usuarios. |

## Tablas de Configuración (Super Admin)

- `modules_catalog`: Catálogo maestro de módulos disponibles y sus precios.
- `school_settings`: Configuración específica por escuela (colores, periodos, escala de notas).

## Extensiones Utilizadas
- `pgcrypto`: Para hashing y generación de UUIDs.
- `pg_trgm`: Para búsquedas por similitud de texto (nombres de alumnos).

## Mecanismo de Multi-Tenancy (RLS)
El aislamiento de datos se logra mediante políticas de **Row Level Security**.
Cada request ejecuta:
```sql
SET LOCAL app.current_tenant = 'UUID-DEL-TENANT';
```
Las políticas de las tablas filtran automáticamente:
```sql
CREATE POLICY tenant_iso ON table_name 
USING (tenant_id = current_setting('app.current_tenant', true)::UUID);
```
