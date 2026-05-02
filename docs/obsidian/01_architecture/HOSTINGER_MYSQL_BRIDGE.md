# Hostinger MySQL Bridge

Fecha: 02-05-2026

## Decision
EduCore mantiene Go/Fiber como API unica. Hostinger/phpMyAdmin se usa solo como administracion de una base MySQL/MariaDB temporal. El frontend estatico nunca se conecta directo a MySQL.

## Estado implementado
- Schema puente: `backend/migrations_mysql/001_hostinger_core.sql`.
- Seed seguro para propietarios SuperAdmin: `go run backend/scripts/seed_owner_admins.go`.
- Catalogo de niveles con activos actuales (`preescolar`, `kinder`, `primaria`) y futuros conservados pero deshabilitados (`secundaria`, `prepa`, `universidad`).
- Catalogo de modulos vendibles con metadata `global_enabled`, `visible`, `supported_now`, `educational_level`, `plan_required` y `dependencies`.
- Variables:
  - `DB_DRIVER=postgres|mysql`
  - `MYSQL_DSN`
  - `ALLOW_DEMO_LOGIN=false`
  - `NEXT_PUBLIC_DEMO_MODE=false`
- Los mocks quedan permitidos solo en desarrollo o cuando `NEXT_PUBLIC_DEMO_MODE=true`.

## Bloqueo tecnico
El runtime productivo no debe activarse con `DB_DRIVER=mysql` todavia. Los modulos actuales siguen dependiendo de `pgxpool` y muchas queries usan sintaxis PostgreSQL (`$1`, `::jsonb`, `date_trunc`, `INTERVAL`, `RETURNING`, arrays). El servidor valida conexion MySQL, pero falla cerrado si se intenta arrancar en modo MySQL antes de portar repositorios.

## Matriz de port pendiente
- `auth`: login/reset/invitations usan `pgxpool`, `$1` e intervalos Postgres.
- `tenants`: provisioning usa transacciones pgx, `RETURNING`, `gen_random_uuid()` e intervalos Postgres.
- `super_admin`: escuelas, planes, database admin y enterprise control plane usan pgx/Postgres.
- `school_admin`: modulo mas grande; usa queries con LATERAL, casts, JSONB, intervals y funciones Postgres.
- `teacher`: dashboard/asistencia/calificaciones usan pgx/Postgres.
- `parent`: portal hijos/documentos/pagos usa LATERAL, casts, intervals y `TO_CHAR`.
- `reports` y `communications`: ya usan `database/sql`, pero sus queries siguen teniendo placeholders/sintaxis Postgres.

Cada modulo debe migrarse a repositorios `database/sql` portables y tests negativos tenant-scoped antes del corte.

## Checklist Hostinger
1. Crear DB MySQL en hPanel.
2. Crear usuario con contrasena fuerte.
3. Habilitar Remote MySQL solo para la IP de salida del backend Railway.
4. Importar `backend/migrations_mysql/001_hostinger_core.sql` desde phpMyAdmin.
5. Ejecutar seed de propietarios:

```bash
cd backend
MYSQL_DSN='user:password@tcp(host:3306)/db?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci' \
DB_DRIVER='mysql' \
EDUCORE_OWNER_ADMIN_EMAILS='gioescudero2007@gmail.com,jagustin_ramosp@hotmail.com' \
EDUCORE_OWNER_ADMIN_PASSWORD='set-this-as-a-secret' \
go run ./scripts/seed_owner_admins.go
```

6. Portar repositorios tenant-scoped a `database/sql` portable antes de activar `DB_DRIVER=mysql`.

## Seguridad
- No usar Remote MySQL con `%`.
- No exponer `MYSQL_DSN` en frontend.
- No documentar contrasenas reales de propietarios en git; usar variables secretas.
- En MySQL no hay RLS PostgreSQL; cada query tenant-scoped debe filtrar por `tenant_id` derivado del JWT.

#database #hostinger #mysql #security #architecture
