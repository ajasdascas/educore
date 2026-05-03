# MySQL Portability Matrix

Fecha: 02-05-2026

## Estado general

El backend ya puede arrancar y operar localmente con `DB_DRIVER=mysql` sobre MariaDB usando la capa portable `internal/pkg/database`.

Decision operativa: **no activar MySQL en produccion todavia**. El port paso smoke local y `go test`, pero faltan pasos de infraestructura fuera del repo:

- confirmar conectividad Railway -> Hostinger MySQL con IP allowlist o alternativa aprobada;
- configurar `MYSQL_DSN` solo como secreto;
- rotar cualquier password que haya sido expuesto durante pruebas manuales;
- ejecutar smoke real contra la DB Hostinger ya importada.

El guard de produccion se mantiene: si `APP_ENV=production` y `DB_DRIVER=mysql`, el backend exige `EDUCORE_ALLOW_MYSQL_RUNTIME=true`.

## Matriz por modulo

| Modulo | Estado MySQL local | Evidencia |
|---|---|---|
| auth | Listo local | Login real de owner, School Admin, Parent y Teacher sobre MariaDB. Seed owner multi-driver OK. |
| tenants | Listo local | Creacion de escuela desde Super Admin provisiono tenant, admin, roles, ciclo, grado, materias, grupo y modulos. |
| super_admin | Listo local | Smoke OK en stats, schools, modules catalog, plans, database tables, enterprise dashboard, modules, billing, settings, logs, support, feature flags, backups, version, health, storage y analytics. |
| school_admin | Listo local | Smoke OK en dashboard, modulos activos, ciclos, grupos, materias, alumnos, pagos y database explorer tenant-scoped. |
| teacher | Listo local | Smoke OK en login Teacher, dashboard, classes, messages y 403 contra Super Admin. |
| parent | Listo local | Smoke OK en login Parent, dashboard, children, payments, documents y 403 contra Super Admin/School Admin. |
| payments | Listo local | Smoke OK en crear cargo, registrar pago cash, generar/leer recibo y ver historial Parent/School Admin. |
| reports | Listo local | Smoke OK en attendance report y academic summary. Traduccion MySQL para `to_char(date_trunc(...), 'YYYY-MM')`. |
| communications | Listo local | Smoke OK en notifications. Repositorio usa ramas MySQL para JSON recipients/conversations. |
| database_admin | Listo local lectura/export basico | Super Admin y School Admin listan tablas/schema con `information_schema` MySQL. Operaciones destructivas siguen protegidas. |

## Diferencias portadas

- `pgxpool` se reemplazo en runtime por `database/sql` portable.
- Placeholders `$1..$n` se traducen a `?` con rebinding de argumentos repetidos.
- `RETURNING` en inserts simples se resuelve con UUID generado desde Go y row sintetica.
- `ON CONFLICT` se traduce a `ON DUPLICATE KEY UPDATE` para MySQL.
- Casts PostgreSQL `::jsonb`, `::uuid`, `::text`, `::inet`, etc. se limpian para MySQL.
- `ILIKE` se traduce a `LIKE`.
- `date_trunc`, `TO_CHAR`, `INTERVAL`, `make_date`, `gen_random_uuid()` y `jsonb_build_object` tienen equivalentes MySQL.
- `ANY(pq.Array(...))` fue reemplazado por condiciones `IN` portables.
- `LEFT JOIN LATERAL` fue reemplazado por subqueries escalares.
- Identificadores reservados (`key`, `schema`) se escapan en ramas MySQL.

## Validacion local ejecutada

- Import limpio de `backend/migrations_mysql/001_hostinger_core.sql` en MariaDB local.
- Seed de owners con `backend/scripts/seed_owner_admins.go` y password temporal local.
- Backend local con `DB_DRIVER=mysql`.
- Smoke API completo con Super Admin, School Admin, Parent, Teacher, pagos, reportes, comunicaciones y RBAC negativo.
- `DB_DRIVER=mysql go test ./...` OK.
- `DB_DRIVER=postgres go test ./...` OK.
- `git diff --check` OK con warnings CRLF solamente.

## Regla de corte para produccion

No activar `DB_DRIVER=mysql` en Railway hasta que:

1. Hostinger Remote MySQL permita la IP real de salida de Railway o Giovanni apruebe explicitamente una alternativa temporal.
2. `MYSQL_DSN` este configurado solo como secreto en Railway.
3. La contrasena MySQL expuesta durante pruebas manuales haya sido rotada.
4. Se ejecute smoke productivo contra Hostinger MySQL.
5. Se mantenga `ALLOW_DEMO_LOGIN=false` y `NEXT_PUBLIC_DEMO_MODE=false`.

#database #mysql #architecture #security #backend
