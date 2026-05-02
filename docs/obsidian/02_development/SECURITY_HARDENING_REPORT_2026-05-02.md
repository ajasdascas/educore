# Security Hardening Report - 02-05-2026

## Alcance
Revision focalizada para la fase Hostinger MySQL + Cloudflare + SuperAdmin propietarios.

## Hallazgos y fixes
- Alta: `TenantResolver` confiaba en `X-Tenant-ID` antes de JWT. Fix aplicado: solo resuelve tenant publico por subdominio y rutas protegidas usan tenant del JWT.
- Alta: scripts locales contenian DSN Postgres con password. Fix aplicado: `run_migration.go` y `seed.go` exigen `DATABASE_URL`.
- Alta: seeds podian depender de passwords demo. Fix aplicado: seeds de propietarios exigen password por env y minimo 12 caracteres.
- Media: cookie refresh no marcaba `Secure`. Fix aplicado: cookie `Secure` cuando request llega por HTTPS/`X-Forwarded-Proto=https`.
- Media: CORS aceptaba `http://onlineu.mx`. Fix aplicado: solo HTTPS de `onlineu.mx`, `www.onlineu.mx`, Railway y localhost dev.
- Media: MySQL no tiene RLS equivalente a Postgres. Control aplicado: fail-closed en `DB_DRIVER=mysql` hasta portar repos tenant-scoped y pruebas negativas.
- Baja: Cloudflare API no autorizo zone settings. Control aplicado: zona y DNS base creados; settings SSL/WAF/cache quedan documentados para dashboard.

## Validaciones
- `go test ./...` OK.
- `npx tsc --noEmit` OK.
- `NEXT_PUBLIC_DEMO_MODE=false npm run build` OK.
- Schema MySQL importado en MariaDB local.
- Seed propietarios validado en MariaDB local.
- Bundle `frontend/out` sin `mock-token`, password real, `MYSQL_DSN` ni `STRIPE_SECRET_KEY`.

## Pendientes
- Portar repositorios con `pgxpool` y SQL PostgreSQL-specific a SQL portable antes de activar MySQL runtime.
- Ejecutar smoke real en produccion cuando Hostinger DB, Railway env vars y nameservers Cloudflare esten activos.
- Configurar WAF/cache/SSL desde Cloudflare dashboard por falta de permisos API para zone settings.

#security #hardening #cloudflare #hostinger #mysql #super_admin
