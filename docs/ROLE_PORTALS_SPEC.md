# Role Portals Specification — EduCore

Defines the routes, components, and module requirements for each user-facing portal.

---

## Portal Overview

| Portal | Role | Base Path | Auth | Module Filtering |
|--------|------|-----------|------|-----------------|
| Super Admin | `SUPER_ADMIN` | `/super-admin` | JWT | None (global access) |
| School Admin | `SCHOOL_ADMIN` | `/school-admin` | JWT | Via `useEnabledModules()` hook |
| Teacher | `TEACHER` | `/teacher` | JWT | Fetches `/api/v1/teacher/modules` |
| Student | `STUDENT` | `/student` | JWT | Fetches `/api/v1/student/modules` |
| Parent | `PARENT` | `/parent` | JWT | Fetches `/api/v1/parent/modules` |

---

## Teacher Portal (`/teacher`)

### Always-visible nav items (no module gate)
- `/teacher/dashboard` — Dashboard
- `/teacher/notifications` — Avisos (Megaphone icon)
- `/teacher/profile` — Mi Perfil
- `/teacher/security` — Seguridad
- `/teacher/settings` — Configuración

### Module-gated nav items
| Nav Label | Path | Required Module Key |
|-----------|------|-------------------|
| Mis Grupos | `/teacher/classes` | `academic_core` |
| Calificaciones | `/teacher/grades` | `grading` |
| Asistencia | `/teacher/attendance` | `attendance` |
| Mi Horario | `/teacher/schedule` | `schedules` |
| Mensajes | `/teacher/messages` | `communications` |

### Backend endpoints
- `GET /api/v1/teacher/modules` — returns enabled module keys for the school
- `GET /api/v1/teacher/dashboard`
- `GET /api/v1/teacher/classes`, `GET /api/v1/teacher/classes/:id/students`
- `GET /api/v1/teacher/grades`, `POST /api/v1/teacher/grades`
- `GET /api/v1/teacher/attendance`, `POST /api/v1/teacher/attendance`
- `GET /api/v1/teacher/schedule`
- `GET /api/v1/teacher/notifications`, `PUT /api/v1/teacher/notifications/:id/read`
- `GET /api/v1/teacher/announcements`, `POST /api/v1/teacher/announcements`
- `GET /api/v1/teacher/messages`, `POST /api/v1/teacher/messages`

---

## Student Portal (`/student`)

### Always-visible nav items
- `/student/dashboard` — Dashboard
- `/student/profile` — Mi Perfil
- `/student/notifications` — Notificaciones
- `/student/settings` — Configuración

### Module-gated nav items
| Nav Label | Path | Required Module Key |
|-----------|------|-------------------|
| Calificaciones | `/student/grades` | `grading` |
| Asistencia | `/student/attendance` | `attendance` |
| Tareas | `/student/assignments` | `assignments` |
| Horario | `/student/schedule` | `schedules` |
| Mensajes | `/student/messages` | `communications` |

### Backend endpoints
- `GET /api/v1/student/modules`
- `GET /api/v1/student/dashboard`
- `GET /api/v1/student/profile`
- `GET /api/v1/student/grades`
- `GET /api/v1/student/attendance`
- `GET /api/v1/student/assignments`
- `GET /api/v1/student/schedule`
- `GET /api/v1/student/notifications`, `PUT /api/v1/student/notifications/:id/read`
- `GET /api/v1/student/messages`

---

## Parent Portal (`/parent`)

### Always-visible nav items
- `/parent/dashboard` — Dashboard
- `/parent/children` — Mis Hijos
- `/parent/consents` — Permisos
- `/parent/notifications` — Notificaciones
- `/parent/profile` — Mi Perfil
- `/parent/settings` — Configuración

### Module-gated nav items
| Nav Label | Path | Required Module Key |
|-----------|------|-------------------|
| Calificaciones | `/parent/grades` | `grading` |
| Asistencia | `/parent/attendance` | `attendance` |
| Mensajes | `/parent/messages` | `communications` |
| Documentos | `/parent/documents` | `documents` |
| Pagos | `/parent/payments` | `payments` |

### Backend endpoints
- `GET /api/v1/parent/modules`
- `GET /api/v1/parent/dashboard`
- `GET /api/v1/parent/children`
- `GET /api/v1/parent/children/:childId` + sub-routes (grades, attendance, schedule, report-card, teachers, assignments)
- `GET /api/v1/parent/notifications`, `PUT /api/v1/parent/notifications/:id/read`
- `GET /api/v1/parent/messages`, `POST /api/v1/parent/messages`
- `GET /api/v1/parent/documents`
- `GET /api/v1/parent/payments`
- `GET /api/v1/parent/consents`, `PATCH /api/v1/parent/consents/:id`
- `GET /api/v1/parent/profile`, `PUT /api/v1/parent/profile`
- `PUT /api/v1/parent/password`

---

## Support Mode

Super Admins can enter any portal in support mode by navigating:
`Super Admin → Schools → [School] → Portals → "Ver como [Role]"`

This appends query params `?supportTenantId=...&supportSlug=...&supportName=...&supportRole=...`.
Each layout detects these params, calls `setSupportContext()`, and strips the params from the URL via `router.replace(pathname)`.

The `SupportModeBanner` component renders a dismissible banner when support mode is active.

---

## RoleGuard

Each portal wraps content in `<RoleGuard allowedRoles={[...]}>`. This component redirects unauthorized users to `/login` and shows a loading state during auth resolution. Super Admins bypass role checks when in support mode.

---

*Last updated: 2026-05-06*
