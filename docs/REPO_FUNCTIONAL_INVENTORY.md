# EduCore — Repo Functional Inventory
**Generated:** 2026-05-05  
**Source of truth:** Handler files + frontend page glob  
**DB driver:** MySQL (Hostinger production) / PostgreSQL (Railway staging)

---

## 1. Backend API Endpoints

All routes are prefixed `/api/v1`.

### 1.1 Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check — returns env, tenant, db driver, redis status |
| GET | `/public/school-info?slug=` | Returns school name + logo (used by landing pages) |
| GET | `/public/schools/resolve?slug=` or `?host=` | Full school resolution: modules, levels, portal URLs |
| POST | `/webhooks/*` | Stripe/payment webhook (signature-verified) |
| POST | `/internal/deployments/record` | CI/CD deployment recorder (shared-secret header) |

### 1.2 Auth module (`/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login with role enforcement; supports `requested_role` portal lock |
| POST | `/auth/refresh` | Refresh access token from httpOnly cookie |
| POST | `/auth/logout` | Clear refresh token cookie |
| POST | `/auth/forgot-password` | Request password reset token (no email send yet — TODO) |
| POST | `/auth/reset-password` | Apply reset token + new password |
| POST | `/auth/accept-invitation` | Accept invite token, set password, activate account |
| POST | `/auth/change-password` | Change own password (requires valid JWT) |

### 1.3 Super Admin module (`/super-admin`) — SUPER_ADMIN role

#### Core school management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/super-admin/stats` | Global platform KPIs (tenants, students, MRR stub) |
| GET | `/super-admin/schools` | List schools with pagination/filter |
| POST | `/super-admin/schools` | Provision new school (full transaction: tenant + admin + modules + academic seed) |
| GET | `/super-admin/schools/:id` | Get school detail + user counts |
| PATCH | `/super-admin/schools/:id/status` | Update school status |
| GET | `/super-admin/schools/:id/users` | List users in school |
| GET | `/super-admin/schools/:id/modules` | List module states for school |
| POST | `/super-admin/schools/:id/modules/toggle` | Toggle module for school (legacy) |
| GET | `/super-admin/modules-catalog` | Full modules catalog |
| POST | `/super-admin/upload` | Upload school logo |

#### Plans
| Method | Path | Description |
|--------|------|-------------|
| GET | `/super-admin/plans` | List subscription plans |
| POST | `/super-admin/plans` | Create plan |
| GET | `/super-admin/plans/:id` | Get plan |
| PUT | `/super-admin/plans/:id` | Update plan |
| DELETE | `/super-admin/plans/:id` | Soft-deactivate plan |
| PATCH | `/super-admin/plans/:id/toggle` | Toggle plan active state |

#### Global users (SUPER_ADMIN management)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/super-admin/users` | List SUPER_ADMIN users |
| POST | `/super-admin/users` | Create SUPER_ADMIN user |
| GET | `/super-admin/users/:id` | Get SUPER_ADMIN user |
| PUT | `/super-admin/users/:id` | Update SUPER_ADMIN user |
| PATCH | `/super-admin/users/:id/toggle` | Toggle active status |
| DELETE | `/super-admin/users/:id` | Soft-delete SUPER_ADMIN user |
| GET | `/super-admin/users/:id/activity` | Audit log for user |

#### Enterprise — dashboard, modules, users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/super-admin/dashboard/overview` | Enterprise KPIs + churn risk + module health |
| PUT | `/super-admin/dashboard/overview` | Save platform setting (generic) |
| GET | `/super-admin/modules` | List enterprise modules catalog |
| PUT | `/super-admin/modules` | Upsert module in catalog |
| PATCH | `/super-admin/modules/:key/global` | Toggle global module enable |
| PATCH | `/super-admin/schools/:id/modules/:key` | Toggle module per school (v2) |
| GET | `/super-admin/modules/usage` | Module usage stats |
| POST | `/super-admin/schools/:id/clone-config` | Clone modules config to another school |
| POST | `/super-admin/schools/:id/reset-data` | Register reset request (confirmation required) |
| DELETE | `/super-admin/schools/:id` | Soft-delete school (confirmation required) |
| GET | `/super-admin/global-users` | List all users across tenants |
| POST | `/super-admin/global-users` | Create scoped user (any role/tenant) |
| PUT | `/super-admin/global-users/:id` | Update scoped user |
| PATCH | `/super-admin/global-users/:id/status` | Toggle user status |
| POST | `/super-admin/global-users/:id/reset-password` | Reset + return temp password |
| POST | `/super-admin/global-users/:id/force-logout` | Kill all sessions |

#### Enterprise — impersonation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/super-admin/impersonation/start` | Start impersonation session |
| POST | `/super-admin/impersonation/stop` | End impersonation session |
| GET | `/super-admin/impersonation/audit` | Impersonation audit log |

#### Enterprise — billing
| Method | Path | Description |
|--------|------|-------------|
| GET | `/super-admin/billing/plans` | List billing plans |
| POST | `/super-admin/billing/plans` | Create billing plan |
| PUT | `/super-admin/billing/plans/:id` | Update billing plan |
| GET | `/super-admin/billing/subscriptions` | List subscriptions |
| POST | `/super-admin/billing/subscriptions` | Create subscription |
| PATCH | `/super-admin/billing/subscriptions/:id` | Update subscription |
| GET | `/super-admin/billing/invoices` | List invoices |
| POST | `/super-admin/billing/invoices/generate` | Generate invoice |
| POST | `/super-admin/billing/invoices/:id/mark-paid` | Mark invoice paid |
| POST | `/super-admin/billing/payments/manual` | Record manual payment |
| POST | `/super-admin/billing/reminders` | Queue billing reminders |
| GET | `/super-admin/billing/reports/monthly` | Monthly billing report |

#### Enterprise — analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/super-admin/analytics/kpis` | KPI snapshot (alias of overview) |
| GET | `/super-admin/analytics/growth` | Tenant growth by month |
| GET | `/super-admin/analytics/churn-risk` | Churn risk scoring |
| GET | `/super-admin/analytics/module-usage` | Module adoption stats |

#### Enterprise — system settings
| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/super-admin/system/settings` | Platform settings CRUD |
| GET/PUT | `/super-admin/system/security` | Security settings |
| GET | `/super-admin/system/security/sessions` | Active sessions for current SA |
| POST | `/super-admin/system/security/sessions/revoke-others` | Revoke other sessions |
| GET | `/super-admin/system/notifications` | System notifications from audit log |
| PUT | `/super-admin/system/notifications/mark-all-read` | Mark notifications read |
| GET/PUT | `/super-admin/system/email` | Email settings |
| GET/PUT | `/super-admin/system/api` | API settings |
| GET/PUT | `/super-admin/system/integrations` | Integration settings |

#### Enterprise — logs, support, storage, feature flags, backups, version, health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/super-admin/logs/audit` | Audit logs |
| GET | `/super-admin/logs/errors` | Error logs (module health events) |
| GET | `/super-admin/logs/activity` | Activity logs (alias of audit) |
| GET | `/super-admin/support/tickets` | Support tickets |
| POST | `/super-admin/support/tickets` | Create ticket |
| PUT | `/super-admin/support/tickets/:id` | Update ticket |
| GET | `/super-admin/storage/usage` | Storage usage per tenant |
| PATCH | `/super-admin/storage/institutions/:id/limit` | Update storage limit |
| POST | `/super-admin/storage/archive` | Queue archive job (confirmation required) |
| GET | `/super-admin/feature-flags` | List feature flags |
| POST | `/super-admin/feature-flags` | Create/upsert feature flag |
| PUT | `/super-admin/feature-flags/:key` | Upsert feature flag |
| DELETE | `/super-admin/feature-flags/:key` | Soft-delete feature flag |
| PATCH | `/super-admin/feature-flags/:key/scope` | Set flag scope (tenant/level/plan) |
| GET | `/super-admin/backups` | List backup jobs |
| POST | `/super-admin/backups` | Create backup job (async pg_dump) |
| POST | `/super-admin/backups/:id/restore` | Request restore (confirmation required) |
| GET | `/super-admin/version` | Version history |
| POST | `/super-admin/version/deploy` | Register deploy event |
| POST | `/super-admin/version/rollback` | Register rollback event |
| GET | `/super-admin/health/modules` | Module health events |
| GET | `/super-admin/health/system` | System health status |
| POST | `/super-admin/health/events` | Create module health event |
| GET | `/super-admin/deployments` | Deployment history list |
| GET | `/super-admin/deployments/:id` | Single deployment detail |

#### Database admin (super admin)
Routes registered via `RegisterDatabaseAdminRoutes` — not fully enumerated here, available under `/super-admin/database/`.

### 1.4 Tenants module (`/tenants`) — SUPER_ADMIN role

Routes registered by `tenants.Handler.RegisterRoutes` — legacy tenant CRUD (separate from super-admin module). Exact routes not expanded here (handler file not read).

### 1.5 School Admin module (`/school-admin`) — SCHOOL_ADMIN or SUPER_ADMIN

#### Dashboard & settings
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school-admin/dashboard` | School dashboard |
| GET | `/school-admin/stats` | School stats |
| GET | `/school-admin/settings` | School settings |
| PUT | `/school-admin/settings` | Update school settings |
| GET | `/school-admin/modules/enabled` | List enabled modules for tenant |
| GET | `/school-admin/notifications` | Notifications for school admin user |

#### Academic — school years
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school-admin/academic/school-years` | List school years |
| POST | `/school-admin/academic/school-years` | Create school year |
| PUT | `/school-admin/academic/school-years/:id` | Update school year |

#### Academic — students
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school-admin/academic/students` | List students (paginated, filterable) |
| POST | `/school-admin/academic/students` | Create student |
| GET | `/school-admin/academic/students/:id` | Get student detail |
| PUT | `/school-admin/academic/students/:id` | Update student |
| DELETE | `/school-admin/academic/students/:id` | Delete student |
| GET | `/school-admin/academic/students/:id/history` | Academic history |
| POST | `/school-admin/academic/imports/students/commit` | Bulk import students |
| POST | `/school-admin/academic/students/:id/portal-access` | Create student portal user |
| POST | `/school-admin/academic/students/:id/parent-portal-access` | Create parent portal user |

#### Academic — teachers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school-admin/academic/teachers` | List teachers |
| POST | `/school-admin/academic/teachers` | Create teacher |
| GET | `/school-admin/academic/teachers/:id` | Get teacher |
| PUT | `/school-admin/academic/teachers/:id` | Update teacher |
| POST | `/school-admin/academic/teachers/:id/portal-access` | Create teacher portal user |

#### Academic — groups, subjects, schedule
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/school-admin/academic/groups` | List / create groups |
| GET/PUT/DELETE | `/school-admin/academic/groups/:id` | Get / update / delete group |
| GET/POST | `/school-admin/academic/subjects` | List / create subjects |
| PUT/DELETE | `/school-admin/academic/subjects/:id` | Update / delete subject |
| GET | `/school-admin/academic/schedule` | Get schedule (filter by group_id) |
| GET | `/school-admin/academic/students/:id/schedule` | Get student schedule |
| POST | `/school-admin/academic/schedule` | Create schedule block |
| GET/PUT/DELETE | `/school-admin/academic/schedule/:id` | Get / update / delete block |

#### Attendance
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school-admin/attendance/groups/:groupId/today` | Today's attendance for group |
| POST | `/school-admin/attendance/groups/:groupId/bulk` | Bulk update attendance |
| GET | `/school-admin/attendance/students/:studentId/history` | Student attendance history |
| GET | `/school-admin/attendance/reports/monthly` | Monthly attendance report |

#### Grades
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school-admin/grades/groups/:groupId/subjects/:subjectId` | Group grades by subject |
| POST | `/school-admin/grades/grades/bulk` | Bulk update grades (note: path has double /grades) |
| GET | `/school-admin/grades/students/:studentId/report-card` | Student report card |
| GET | `/school-admin/grades/groups/:groupId/final-grades` | Group final grades |

#### Documents & report cards
| Method | Path | Description |
|--------|------|-------------|
| POST | `/school-admin/documents` | Create student document |
| GET | `/school-admin/documents/:studentId` | Get student documents |
| PUT | `/school-admin/documents/:documentId` | Update document |
| PATCH | `/school-admin/documents/:documentId/verify` | Verify document |
| DELETE | `/school-admin/documents/:documentId` | Delete document |
| POST | `/school-admin/report-cards/generate` | Generate report card |

#### Payments (module-gated: `payments`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school-admin/payments` | List payments (filterable) |
| POST | `/school-admin/payments/charges` | Create student charge |
| POST | `/school-admin/payments/:id/record-payment` | Record manual payment |
| POST | `/school-admin/payments/:id/card-checkout-session` | Create Stripe checkout session |
| GET | `/school-admin/payments/:id/receipt` | Get payment receipt |

#### Communications, reports, database explorer
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/school-admin/communications` | List / create communications |
| GET | `/school-admin/communications/stats` | Communication stats |
| POST | `/school-admin/communications/send` | Send communication |
| GET/PATCH/DELETE | `/school-admin/communications/:id` | Get / update / delete communication |
| GET/POST | `/school-admin/reports` | List / generate reports |
| GET | `/school-admin/reports/:id` | Get report |
| POST | `/school-admin/reports/:id/export` | Export report |
| DELETE | `/school-admin/reports/:id` | Delete report |
| GET/POST/... | `/school-admin/database/*` | Database explorer (SCHOOL_ADMIN scope) |

### 1.6 Teacher module (`/teacher`) — TEACHER role

| Method | Path | Description |
|--------|------|-------------|
| GET | `/teacher/dashboard` | Teacher dashboard |
| GET | `/teacher/classes` | List teacher's classes/groups |
| GET | `/teacher/classes/:id/students` | Students in a class |
| GET | `/teacher/attendance?group_id=&date=` | Get attendance for group+date |
| POST | `/teacher/attendance` | Save attendance |
| GET | `/teacher/grades?group_id=&subject_id=&period=` | Get grades |
| POST | `/teacher/grades` | Save grades |
| GET | `/teacher/messages?page=&per_page=` | Get messages |
| POST | `/teacher/messages` | Send message |
| GET | `/teacher/schedule` | Teacher schedule |
| GET | `/teacher/notifications` | Teacher notifications |

### 1.7 Parent module (`/parent`) — PARENT role

| Method | Path | Description |
|--------|------|-------------|
| GET | `/parent/dashboard` | Parent dashboard |
| GET | `/parent/children` | List parent's children |
| GET | `/parent/children/:childId` | Child detail |
| GET | `/parent/children/:childId/grades` | Child grades (`?period=&subject=`) |
| GET | `/parent/children/:childId/attendance` | Child attendance (`?start_date=&end_date=`) |
| GET | `/parent/children/:childId/schedule` | Child schedule |
| GET | `/parent/children/:childId/report-card` | Child report card (`?period=`) |
| GET | `/parent/children/:childId/teachers` | Child's teachers |
| GET | `/parent/children/:childId/assignments` | Child assignments (`?status=&subject=`) |
| GET | `/parent/notifications` | Notifications (paginated, `?unread_only=`) |
| PUT | `/parent/notifications/:id/read` | Mark notification read |
| POST | `/parent/messages` | Send message |
| GET | `/parent/messages` | Get messages (`?conversation_id=&page=&per_page=`) |
| GET | `/parent/documents` | Parent documents |
| GET | `/parent/payments` | Payments / fee status |
| GET | `/parent/consents` | Consents list |
| PATCH | `/parent/consents/:id` | Update consent |
| GET | `/parent/reports/summary` | Report summary |
| GET | `/parent/calendar` | Calendar (`?month=&year=`) |
| GET | `/parent/events` | Events (`?start_date=&end_date=&type=`) |
| GET | `/parent/profile` | Parent profile |
| PUT | `/parent/profile` | Update profile |
| PUT | `/parent/password` | Change password |

### 1.8 Student module (`/student`) — STUDENT role

| Method | Path | Description |
|--------|------|-------------|
| GET | `/student/dashboard` | Student dashboard |
| GET | `/student/profile` | Student profile |
| GET | `/student/grades` | Student grades (last 50) |
| GET | `/student/attendance` | Attendance summary |
| GET | `/student/messages` | Messages |
| GET | `/student/assignments` | Assignments |
| GET | `/student/schedule` | Schedule |
| GET | `/student/notifications` | Notifications |

### 1.9 Reports module (`/reports`) — SCHOOL_ADMIN or TEACHER

| Method | Path | Description |
|--------|------|-------------|
| POST | `/reports/generate` | Generate report |
| GET | `/reports/` | List reports |
| GET | `/reports/attendance` | Attendance report (`?start_date=&end_date=`) |
| GET | `/reports/grades` | Grades report |
| GET | `/reports/financial` | Financial report |
| GET | `/reports/academic-summary` | Academic summary |
| GET | `/reports/templates` | Report templates |
| POST | `/reports/templates` | Create template |
| GET | `/reports/analytics` | Analytics (`?type=&start_date=&end_date=`) |
| GET | `/reports/dashboard/metrics` | Dashboard metrics |
| GET | `/reports/:id` | Get report |
| DELETE | `/reports/:id` | Delete report |
| POST | `/reports/:id/export` | Export report |
| POST | `/reports/:id/schedule` | Schedule recurring report |

Note: `RegisterQuickRoutes` is defined but **not called from main.go** — quick report endpoints are unreachable.

### 1.10 Communications module (`/communications`) — all authenticated users

Handler exists; exact routes not enumerated (file not read in detail).

### 1.11 Academic module (`/academic`)

Declared in main.go but the group is unused (`_ = academicGroup`). **No routes registered.** This is a known stub.

---

## 2. Frontend Pages by Portal

**Status legend:**
- `real-api` — page uses `authFetch` / `useQuery` calling a confirmed backend endpoint
- `needs-wiring` — page exists and likely calls an API, but endpoint or integration unclear
- `empty` — page exists but appears to be a stub or static layout

### 2.1 Super Admin Portal (`/app/super-admin/`)

| File path | Status | Notes |
|-----------|--------|-------|
| `super-admin/page.tsx` | real-api | Redirects to dashboard |
| `super-admin/layout.tsx` | real-api | Layout shell |
| `super-admin/dashboard/page.tsx` | real-api | Calls `/super-admin/stats` |
| `super-admin/schools/page.tsx` | real-api | Calls `/super-admin/schools` |
| `super-admin/schools/details/page.tsx` | real-api | Calls `/super-admin/schools/:id` |
| `super-admin/plans/page.tsx` | real-api | Calls `/super-admin/plans` |
| `super-admin/plans/PlanFormModal.tsx` | real-api | CRUD plan modal |
| `super-admin/users/page.tsx` | real-api | Calls `/super-admin/users` |
| `super-admin/users/UserFormModal.tsx` | real-api | User creation modal |
| `super-admin/modules/page.tsx` | real-api | Calls `/super-admin/modules` |
| `super-admin/analytics/page.tsx` | real-api | Calls `/super-admin/analytics/kpis` |
| `super-admin/billing/page.tsx` | real-api | Calls billing endpoints |
| `super-admin/audit/page.tsx` | real-api | Calls `/super-admin/logs/audit` |
| `super-admin/notifications/page.tsx` | real-api | Calls `/super-admin/system/notifications` |
| `super-admin/settings/page.tsx` | real-api | Calls `/super-admin/system/settings` |
| `super-admin/security/page.tsx` | real-api | Calls `/super-admin/system/security` |
| `super-admin/support/page.tsx` | real-api | Calls `/super-admin/support/tickets` |
| `super-admin/storage/page.tsx` | real-api | Calls `/super-admin/storage/usage` |
| `super-admin/feature-flags/page.tsx` | real-api | Calls `/super-admin/feature-flags` |
| `super-admin/backups/page.tsx` | real-api | Calls `/super-admin/backups` |
| `super-admin/health/page.tsx` | real-api | Calls `/super-admin/health/*` |
| `super-admin/version/page.tsx` | real-api | Calls `/super-admin/version` |
| `super-admin/database/page.tsx` | real-api | Database admin explorer |
| `super-admin/profile/page.tsx` | needs-wiring | No dedicated profile endpoint confirmed |
| `super-admin/lab/page.tsx` | empty | Experimental / dev page |

### 2.2 School Admin Portal (`/app/school-admin/`)

| File path | Status | Notes |
|-----------|--------|-------|
| `school-admin/layout.tsx` | real-api | Layout shell |
| `school-admin/dashboard/page.tsx` | real-api | Calls `/school-admin/dashboard` |
| `school-admin/students/page.tsx` | real-api | Calls `/school-admin/academic/students` |
| `school-admin/teachers/page.tsx` | real-api | Calls `/school-admin/academic/teachers` |
| `school-admin/groups/page.tsx` | real-api | Calls `/school-admin/academic/groups` |
| `school-admin/academic/page.tsx` | real-api | School year / academic setup |
| `school-admin/attendance/page.tsx` | real-api | Calls `/school-admin/attendance/*` |
| `school-admin/grades/page.tsx` | real-api | Calls `/school-admin/grades/*` |
| `school-admin/schedule/page.tsx` | real-api | Calls `/school-admin/academic/schedule` |
| `school-admin/report-cards/page.tsx` | real-api | Calls `/school-admin/report-cards/generate` + PDF export |
| `school-admin/reports/page.tsx` | real-api | Calls `/school-admin/reports` |
| `school-admin/documents/page.tsx` | real-api | Calls `/school-admin/documents/*` |
| `school-admin/payments/page.tsx` | real-api | Calls `/school-admin/payments` (module-gated) |
| `school-admin/communications/page.tsx` | real-api | Calls `/school-admin/communications` |
| `school-admin/settings/page.tsx` | real-api | Calls `/school-admin/settings` |
| `school-admin/notifications/page.tsx` | needs-wiring | Calls `/school-admin/notifications` — endpoint exists |
| `school-admin/profile/page.tsx` | needs-wiring | No dedicated school-admin profile endpoint |
| `school-admin/security/page.tsx` | needs-wiring | Calls auth `/change-password` presumably |
| `school-admin/database/page.tsx` | real-api | Database explorer (SCHOOL_ADMIN scope) |

### 2.3 Teacher Portal (`/app/teacher/`)

| File path | Status | Notes |
|-----------|--------|-------|
| `teacher/layout.tsx` | real-api | Layout shell |
| `teacher/dashboard/page.tsx` | real-api | Calls `/teacher/dashboard` |
| `teacher/classes/page.tsx` | real-api | Calls `/teacher/classes` |
| `teacher/attendance/page.tsx` | real-api | Calls `/teacher/attendance` |
| `teacher/grades/page.tsx` | real-api | Calls `/teacher/grades` |
| `teacher/schedule/page.tsx` | real-api | Calls `/teacher/schedule` |
| `teacher/messages/page.tsx` | real-api | Calls `/teacher/messages` |
| `teacher/notifications/page.tsx` | real-api | Calls `/teacher/notifications` |
| `teacher/profile/page.tsx` | needs-wiring | No teacher profile endpoint in backend |
| `teacher/settings/page.tsx` | needs-wiring | No teacher settings endpoint |
| `teacher/security/page.tsx` | needs-wiring | Presumably uses `/auth/change-password` |

### 2.4 Parent Portal (`/app/parent/`)

| File path | Status | Notes |
|-----------|--------|-------|
| `parent/layout.tsx` | real-api | Layout shell |
| `parent/dashboard/page.tsx` | real-api | Calls `/parent/dashboard` |
| `parent/children/page.tsx` | real-api | Calls `/parent/children` + `/parent/children/:id` |
| `parent/grades/page.tsx` | real-api | Calls `/parent/children/:childId/grades` |
| `parent/attendance/page.tsx` | real-api | Calls `/parent/children/:childId/attendance` |
| `parent/messages/page.tsx` | real-api | Calls `/parent/messages` |
| `parent/notifications/page.tsx` | real-api | Calls `/parent/notifications` |
| `parent/documents/page.tsx` | real-api | Calls `/parent/documents` |
| `parent/payments/page.tsx` | real-api | Calls `/parent/payments` |
| `parent/consents/page.tsx` | real-api | Calls `/parent/consents` |
| `parent/profile/page.tsx` | real-api | Calls `/parent/profile` |
| `parent/settings/page.tsx` | needs-wiring | No settings endpoint for parent |
| `parent/security/page.tsx` | needs-wiring | Presumably uses `/parent/password` |

### 2.5 Student Portal (`/app/student/`)

| File path | Status | Notes |
|-----------|--------|-------|
| `student/layout.tsx` | real-api | Layout shell |
| `student/dashboard/page.tsx` | real-api | Calls `/student/dashboard` |
| `student/grades/page.tsx` | real-api | Calls `/student/grades` |
| `student/attendance/page.tsx` | real-api | Calls `/student/attendance` |
| `student/assignments/page.tsx` | real-api | Calls `/student/assignments` |
| `student/schedule/page.tsx` | real-api | Calls `/student/schedule` |
| `student/messages/page.tsx` | real-api | Calls `/student/messages` |
| `student/notifications/page.tsx` | real-api | Calls `/student/notifications` |
| `student/profile/page.tsx` | real-api | Calls `/student/profile` |
| `student/settings/page.tsx` | needs-wiring | No settings endpoint in student module |

### 2.6 School Portal / Role Selector (`/app/school-portal/`)

| File path | Status | Notes |
|-----------|--------|-------|
| `school-portal/layout.tsx` | real-api | Portal layout with school resolution |
| `school-portal/page.tsx` | real-api | School landing / role selector |
| `school-portal/school-admin/page.tsx` | real-api | School admin login portal |
| `school-portal/teachers/page.tsx` | real-api | Teacher login portal |
| `school-portal/parents/page.tsx` | real-api | Parent login portal |
| `school-portal/students/page.tsx` | real-api | Student login portal |

### 2.7 Other / Public

| File path | Status | Notes |
|-----------|--------|-------|
| `app/page.tsx` | real-api | Root page (redirect logic) |
| `app/layout.tsx` | real-api | Global layout |
| `app/login/page.tsx` | real-api | Super admin login |
| `app/reset-password/page.tsx` | real-api | Calls `/auth/reset-password` |
| `app/escuela/page.tsx` | real-api | Public school info page |
| `app/school/dashboard/page.tsx` | needs-wiring | Unclear which role this serves |

---

## 3. Missing or Mismatched Endpoints

### Frontend calls that have no backend endpoint

| Frontend page | API call | Backend status |
|---------------|----------|----------------|
| `teacher/profile/page.tsx` | Some `/teacher/profile` endpoint | **MISSING** — no route in teacher handler |
| `teacher/settings/page.tsx` | Some `/teacher/settings` endpoint | **MISSING** |
| `student/settings/page.tsx` | Some `/student/settings` endpoint | **MISSING** |
| `parent/settings/page.tsx` | Some `/parent/settings` endpoint | **MISSING** |
| `school-admin/profile/page.tsx` | Some `/school-admin/profile` endpoint | **MISSING** |
| `super-admin/profile/page.tsx` | Profile update for SA user | No dedicated endpoint; `/super-admin/users/:id` exists but requires SA to know own ID |
| `school/dashboard/page.tsx` | Unclear target | **AMBIGUOUS** — may be dead route |

### Backend endpoints not yet called from any frontend page

| Endpoint | Notes |
|----------|-------|
| `POST /auth/accept-invitation` | Invitation flow exists in backend; no frontend `/accept-invitation` page found |
| `POST /parent/messages` + `GET /parent/messages` | Backend exists; parent messages page calls it but wiring not confirmed |
| `GET /reports/quick/*` | `RegisterQuickRoutes` defined but never called in `main.go` — unreachable |
| `POST /reports/:id/schedule` | Defined in handler; no frontend for scheduling reports |
| `GET/POST /communications/*` (standalone module) | Global communications module registered; not confirmed called by any specific portal page |

### Known backend bugs / path issues

- `POST /school-admin/grades/grades/bulk` — double `/grades/grades/` in path. Route registered as `grades.Post("/grades/bulk", ...)` inside the `api.Group("/grades")` group, resulting in `/school-admin/grades/grades/bulk`. Frontend must match exactly.

---

## 4. MySQL Migrations (`backend/migrations_mysql/`)

| File | Description |
|------|-------------|
| `000_reset_hostinger_core.sql` | Full schema reset / base creation |
| `001_hostinger_core.sql` | Core tables: tenants, users, roles, modules |
| `002_subscription_plans_bridge.sql` | Subscription plans table |
| `003_hostinger_add_missing.sql` | Missing columns patch |
| `004_hostinger_students_missing_cols.sql` | Students table missing columns |
| `005_hostinger_missing_tables_and_cols.sql` | Additional tables and columns |
| `006_student_portal_user_id.sql` | Add `user_id` to students for portal auth |
| `007_school_reports.sql` | `school_reports` table for report cards |
| `008_school_communications.sql` | `school_communications` table |
| `009_school_levels_modules_portals.sql` | Level provisioning, portal modules, tenant settings |
| `010_deployment_history.sql` | `deployment_history` table for CI/CD tracking |
| `011_backfill_school_provisioning.sql` | Backfill existing tenants with new provisioning fields |
| `011b_repair_school_provisioning_backfill.sql` | Fix for 011 backfill errors |

**Note:** Migrations are run manually or via CI — there is no automatic migration runner in `main.go`. The `mysqlrepair.EnsureStagingSchema` call handles staging-only schema repairs, not migrations.

---

## 5. Known Issues / Gaps

### Critical
1. **`/academic` group is a stub** — `api.Group("/academic", ...)` is created in `main.go` then immediately discarded (`_ = academicGroup`). No academic endpoints at `/api/v1/academic/*`. Any frontend that calls this prefix will get 404.
2. **`RegisterQuickRoutes` never called** — `reports.Handler.RegisterQuickRoutes` method exists but is never invoked in `main.go`. The quick-report endpoints (`/reports/quick/*`) are unreachable.
3. **Double-path bug** — `POST /school-admin/grades/grades/bulk` has a double segment due to router grouping.

### High
4. **No profile endpoints for teacher/student/parent** — Frontend pages exist for profile management at these roles but no backend routes. Must use auth `/change-password` and manually patch user table elsewhere.
5. **Forgot-password email not implemented** — Backend generates and stores the token but `TODO: Send email via Resend` is still a comment. Password reset flow is incomplete end-to-end.
6. **`GetSchoolUsers` route registered (`/super-admin/schools/:id/users`) but handler reads directly from DB** — works but bypasses any future access control layer.

### Medium
7. **`/communications` standalone module** — Registered for all authenticated users but no clear frontend page routes to it; individual portal modules have their own messaging endpoints (`/teacher/messages`, `/parent/messages`, etc.).
8. **Backup execution** — `executeBackupJob` runs `pg_dump` in a goroutine. On MySQL (Hostinger production) this would fail silently since `pg_dump` is not available. Backup feature is effectively disabled on production.
9. **Impersonation sessions table** — Used in enterprise handler but no migration file confirms it exists in MySQL. May be missing in production.
10. **`super-admin/profile/page.tsx`** — No dedicated profile-update endpoint for the currently logged-in super admin. The user can be updated via `/super-admin/users/:id` but requires knowing own user ID on the frontend.

### Low
11. **`app/school/dashboard/page.tsx`** — Ambiguous route. Unclear which role or portal it belongs to; possibly a leftover.
12. **`super-admin/lab/page.tsx`** — Empty/experimental page; should be removed before production.
13. **No `Accept-Invitation` frontend page** — Backend endpoint exists; users invited via admin must navigate to a non-existent page.
