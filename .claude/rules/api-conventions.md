# Regla: Convenciones de API EduCore

## ESTRUCTURA DE URLs

```
# Super Admin (global)
GET    /api/v1/super-admin/stats
GET    /api/v1/super-admin/schools
POST   /api/v1/super-admin/schools
GET    /api/v1/super-admin/schools/:id
PATCH  /api/v1/super-admin/schools/:id
POST   /api/v1/super-admin/schools/:id/suspend
POST   /api/v1/super-admin/schools/:id/modules/:key/toggle

# Auth (público)
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/accept-invitation

# School Admin (requiere SCHOOL_ADMIN o TEACHER)
GET    /api/v1/school/profile
PATCH  /api/v1/school/profile
GET    /api/v1/school/teachers
POST   /api/v1/school/teachers
GET    /api/v1/school/students
POST   /api/v1/school/students
GET    /api/v1/school/groups
POST   /api/v1/school/groups

# Academic
GET    /api/v1/academic/attendance/:groupId
POST   /api/v1/academic/attendance/bulk
GET    /api/v1/academic/grades/:groupId/:subjectId
POST   /api/v1/academic/grades/bulk

# Parent
GET    /api/v1/parent/dashboard
GET    /api/v1/parent/notifications
PATCH  /api/v1/parent/notifications/:id/read
```

## FORMATO DE RESPUESTA ESTÁNDAR

```json
// ✅ Éxito
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 150
  }
}

// ✅ Error
{
  "success": false,
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "La escuela no existe o fue suspendida",
    "details": {}
  }
}
```

## PAGINACIÓN

```
GET /api/v1/school/students?page=1&per_page=20&search=juan&status=active
```

Siempre retornar `meta.total` para que el frontend calcule páginas.

## AUTENTICACIÓN

Todos los endpoints (excepto `/auth/*`) requieren:
```
Authorization: Bearer <access_token>
```

El `refresh_token` va en httpOnly cookie `refresh_token`.

## CÓDIGOS DE ERROR ESTÁNDAR

```
AUTH_INVALID_CREDENTIALS   → 401
AUTH_TOKEN_EXPIRED         → 401
AUTH_INSUFFICIENT_ROLE     → 403
TENANT_NOT_FOUND           → 404
TENANT_SUSPENDED           → 403
RESOURCE_NOT_FOUND         → 404
VALIDATION_ERROR           → 422
CONFLICT                   → 409
INTERNAL_ERROR             → 500
```
