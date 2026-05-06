# Feature Gap Matrix — EduCore Global

Status of features across all role portals and education levels.
Legend: ✅ Implemented | 🔨 Partial | ⬜ Not yet | ❌ N/A for this level/role

---

## By Role Portal

| Feature | Super Admin | School Admin | Teacher | Student | Parent |
|---------|:-----------:|:------------:|:-------:|:-------:|:------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Profile / Account | ✅ | ✅ | ✅ | ✅ | ✅ |
| Security (password) | ✅ | ✅ | ✅ | ⬜ | ⬜ |
| Notifications / Avisos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Messages | ⬜ | ✅ | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| School Management | ✅ | ✅ | ❌ | ❌ | ❌ |
| Teacher Management | ✅ | ✅ | ❌ | ❌ | ❌ |
| Student Management | ✅ | ✅ | 🔨 | ❌ | ❌ |
| Groups / Classes | ❌ | ✅ | ✅ | ❌ | ❌ |
| Grades / Calificaciones | ❌ | ✅ | ✅ | ✅ | ✅ |
| Attendance | ❌ | ✅ | ✅ | ✅ | ✅ |
| Schedule / Horario | ❌ | ✅ | ✅ | ✅ | ❌ |
| Assignments / Tareas | ❌ | 🔨 | ⬜ | ✅ | ✅ |
| Report Cards / Boletas | ✅ | ✅ | ⬜ | ⬜ | ✅ |
| Modules Config | ✅ | ✅ | ❌ | ❌ | ❌ |
| Backups | ✅ | ❌ | ❌ | ❌ | ❌ |
| Billing / Payments | ✅ | ⬜ | ❌ | ❌ | ✅ |
| Documents | ❌ | ✅ | ❌ | ❌ | ✅ |
| Consents / Permisos | ❌ | ❌ | ❌ | ❌ | ✅ |
| Announcements | ❌ | ⬜ | ✅ | ❌ | ❌ |
| Support Mode | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## By Education Level — Module Availability

| Module | Kinder | Preescolar | Primaria | Secundaria | Prepa |
|--------|:------:|:----------:|:--------:|:----------:|:-----:|
| academic_core | ✅ | ✅ | ✅ | ✅ | ✅ |
| attendance | ✅ | ✅ | ✅ | ✅ | ✅ |
| grades / grading | ❌ | ❌ | ✅ | ✅ | ✅ |
| exams | ❌ | ❌ | ✅ | ✅ | ✅ |
| subjects | ❌ | ❌ | ✅ | ✅ | ✅ |
| assignments | ❌ | ❌ | ✅ | ✅ | ✅ |
| report_cards | ❌ | 🔨 | ✅ | ✅ | ✅ |
| daily_logs | ✅ | ❌ | ❌ | ❌ | ❌ |
| meals | ✅ | ❌ | ❌ | ❌ | ❌ |
| naps | ✅ | ❌ | ❌ | ❌ | ❌ |
| diapers | ✅ | ❌ | ❌ | ❌ | ❌ |
| mood | ✅ | ❌ | ❌ | ❌ | ❌ |
| health_checks | ✅ | ❌ | ❌ | ❌ | ❌ |
| pickup_authorizations | ✅ | ✅ | ❌ | ❌ | ❌ |
| milestones | ✅ | ✅ | ❌ | ❌ | ❌ |
| photos_evidence | ✅ | ✅ | ❌ | ❌ | ❌ |
| qualitative_assessments | ❌ | ✅ | ❌ | ❌ | ❌ |
| development_areas | ❌ | ✅ | ❌ | ❌ | ❌ |
| observations | ❌ | ✅ | ❌ | ❌ | ❌ |
| activities | ❌ | ✅ | ❌ | ❌ | ❌ |
| behavior_notes | ❌ | ✅ | ❌ | ❌ | ❌ |
| preschool_report_cards | ❌ | ✅ | ❌ | ❌ | ❌ |
| classroom | ❌ | ❌ | ✅ | ✅ | ✅ |
| library | ❌ | ❌ | ✅ | ✅ | ✅ |
| extracurriculars | ❌ | ❌ | ✅ | ✅ | ✅ |
| school_store | ❌ | ❌ | 🔨 | 🔨 | ❌ |
| communications | ✅ | ✅ | ✅ | ✅ | ✅ |
| documents | ✅ | ✅ | ✅ | ✅ | ✅ |
| payments | ✅ | ✅ | ✅ | ✅ | ✅ |
| reports | ✅ | ✅ | ✅ | ✅ | ✅ |
| schedules | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Known Gaps (prioritized)

1. **Student security (password change)** — endpoint exists on parent but not student portal
2. **Assignments backend for teacher** — GET/POST routes not yet wired in teacher handler
3. **Preschool report cards UI** — qualitative_assessments page not yet built
4. **Kinder parent portal** — daily_logs/meals/naps pages not yet built in parent portal
5. **School store** — `school_store` module key exists in catalog but no UI or routes

---

*Last updated: 2026-05-06*
