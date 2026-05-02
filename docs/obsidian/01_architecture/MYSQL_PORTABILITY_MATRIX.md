# MySQL Portability Matrix

Fecha: 02-05-2026

## Estado general
`DB_DRIVER=mysql` debe seguir bloqueado. El schema puente ya importa en MariaDB, pero el runtime principal todavia usa `pgxpool` y SQL PostgreSQL-specific en modulos tenant-scoped.

## Matriz por modulo

| Modulo | Estado | Motivo |
|---|---|---|
| auth | Bloqueado | Usa `pgxpool`, `$1`, `INTERVAL` y updates Postgres para login, invitaciones y reset. |
| tenants | Bloqueado | Provisioning usa transacciones pgx, `RETURNING`, casts y funciones Postgres. |
| super_admin | Bloqueado | Escuelas, planes, usuarios, billing, enterprise y database admin dependen de pgx/Postgres. |
| school_admin | Bloqueado | Es el modulo con mas deuda: LATERAL, casts, JSONB, intervals, placeholders y queries complejas. |
| teacher | Bloqueado | Dashboard, asistencia y calificaciones usan pgx/Postgres. |
| parent | Bloqueado | Portal, pagos y documentos usan LATERAL, `TO_CHAR`, intervals y placeholders Postgres. |
| communications | Parcial | Ya esta mas cerca de `database/sql`, pero conserva placeholders y SQL Postgres. |
| reports | Parcial | Repositorio aislado, pero usa placeholders y funciones Postgres. |
| payments | Parcial | Modelo MySQL existe; endpoints actuales siguen pasando por repos School Admin/Parent. |
| database_admin | Bloqueado | Herramientas de introspeccion son Postgres-specific por diseno actual. |

## Resultado del audit script
Archivos con mas patrones PostgreSQL-specific:

- `backend/internal/modules/school_admin/repository.go`: 204 hallazgos.
- `backend/internal/modules/parent/repository.go`: 138 hallazgos.
- `backend/internal/modules/super_admin/enterprise.go`: 66 hallazgos.
- `backend/internal/modules/school_admin/database_explorer.go`: 56 hallazgos.
- `backend/internal/modules/teacher/repository.go`: 50 hallazgos.
- `backend/internal/modules/communications/repository.go`: 40 hallazgos.
- `backend/internal/modules/reports/repository.go`: 28 hallazgos.

## Regla de corte
No activar `DB_DRIVER=mysql` hasta que:

1. Cada modulo bloquee acceso sin `tenant_id` derivado del JWT/contexto.
2. `go test ./...` pase con Postgres.
3. `go test ./...` pase con MariaDB local.
4. Browser smoke pase con SuperAdmin, School Admin, Teacher y Parent.
5. Database Admin tenga adaptador separado o quede deshabilitado en MySQL.

#database #mysql #architecture #security #backend
