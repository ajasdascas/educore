# Education Level Modules — EduCore

Each school can operate at one or more education levels. When a school is created, EduCore automatically activates the appropriate modules and submodules for each level, seeds `school_levels` and `school_periods`, and populates `tenant_modules`.

---

## Education Levels Supported

| Code | Display Name | Focus |
|------|-------------|-------|
| `kinder` | Kinder / Estancia / Inicial | Ages 0–6. Daily care logs, meals, naps, mood, health. |
| `preescolar` | Preescolar / Jardín de Niños | Ages 3–6. Qualitative assessments, campos formativos. No formal exams. |
| `primaria` | Primaria | Ages 6–12. Subjects, grades, exams, report cards. |
| `secundaria` | Secundaria | Ages 12–15. Full academic core + advanced comms. |
| `preparatoria` | Preparatoria / Bachillerato | Ages 15–18. Full academic core. |

---

## Module Assignment by Level

### Kinder / Estancia / Inicial
Core: `academic_core`, `users`, `students`, `groups`, `schedules`, `attendance`, `documents`, `communications`, `reports`

Level-specific: `daily_logs`, `meals`, `naps`, `diapers`, `mood`, `health_checks`, `incidents`, `pickup_authorizations`, `milestones`, `photos_evidence`

**No:** formal exams, grades, subjects, assignments

### Preescolar / Jardín de Niños
Core: `academic_core`, `users`, `students`, `groups`, `schedules`, `attendance`, `documents`, `communications`, `reports`

Level-specific: `qualitative_assessments`, `development_areas`, `observations`, `activities`, `behavior_notes`, `preschool_report_cards`

**No:** numerical grades, formal exams

### Primaria
Core: `academic_core`, `users`, `students`, `groups`, `schedules`, `attendance`, `grades`, `grading`, `report_cards`, `documents`, `communications`, `reports`

Level-specific: `subjects`, `assignments`, `exams`, `classroom`, `library`, `extracurriculars`, `school_store`

### Secundaria / Preparatoria
Same as Primaria plus extended communications modules.

---

## Database Tables

### `modules_catalog`
Master list of all available module keys. FK parent for `tenant_modules.module_key`.

### `submodule_catalog`
Granular feature flags within a module. Columns: `module_key`, `submodule_key` (UNIQUE), `allowed_roles` (JSON), `education_level`.

### `level_module_templates`
Defines which modules/submodules are default-enabled per education level. Columns: `education_level_code`, `module_key`, `submodule_key` (nullable), `is_required`, `is_default_enabled`, `allowed_roles`.

### `school_levels`
Per-school record of which education levels are active. Seeded during `CreateSchool`.

### `school_periods`
Academic periods (trimestres/semestres) seeded per level:
- Kinder: 2 semestres (Semestre 1, Semestre 2)
- Preescolar: 3 trimestres (1er Trimestre, 2do Trimestre, 3er Trimestre)
- Primaria: 3 trimestres

---

## Backend API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/super-admin/education-levels` | List all supported levels with metadata |
| `POST` | `/api/v1/super-admin/schools/:id/apply-module-template` | Re-apply level module templates to an existing school |
| `GET` | `/api/v1/teacher/modules` | Enabled modules for the authenticated teacher's school |
| `GET` | `/api/v1/student/modules` | Enabled modules for the authenticated student's school |
| `GET` | `/api/v1/parent/modules` | Enabled modules for the authenticated parent's school |

---

## Frontend Sidebar Filtering

All three role portals (teacher, student, parent) fetch their school's enabled modules on mount and filter sidebar nav items dynamically. Nav items without a `moduleKey` are always shown.

Module key mappings:
- Teacher: `classes→academic_core`, `grades→grading`, `attendance→attendance`, `schedule→schedules`, `messages→communications`
- Student: `grades→grading`, `attendance→attendance`, `assignments→assignments`, `schedule→schedules`, `messages→communications`
- Parent: `grades→grading`, `attendance→attendance`, `messages→communications`, `documents→documents`, `payments→payments`

---

## Migration

File: `backend/migrations_mysql/017_level_module_catalog_expansion.sql`

Adds 23 missing module keys to `modules_catalog`, creates `submodule_catalog` and `level_module_templates` tables, seeds all level templates. Uses `INSERT ... ON DUPLICATE KEY UPDATE` for idempotent re-runs.

---

## Backfill Existing Schools

For schools created before this feature, run:

```bash
node scripts/backfill-school-module-templates.js
```

This script reads existing schools, determines their levels, and activates the appropriate module templates without disrupting already-active modules.
