# Hostinger MySQL + Cloudflare Free Production Runbook

Fecha: 02-05-2026

## Estado actual
- Cloudflare zone `onlineu.mx` creada en plan Free.
- Estado Cloudflare: `pending` hasta cambiar nameservers en el registrador/Hostinger.
- Nameservers asignados:
  - `aleena.ns.cloudflare.com`
  - `rene.ns.cloudflare.com`
- Nameservers actuales detectados por DNS publico:
  - `ns1.dns-parking.com`
  - `ns2.dns-parking.com`
- Registros web `onlineu.mx`, `www.onlineu.mx` y `blog.onlineu.mx` quedaron proxied.
- Registros de correo, DKIM, DMARC, SPF, autoconfig, autodiscover y FTP quedaron DNS-only.

## Pendiente en Hostinger
1. Entrar a hPanel.
2. Abrir dominio `onlineu.mx`.
3. Cambiar nameservers a:
   - `aleena.ns.cloudflare.com`
   - `rene.ns.cloudflare.com`
4. Esperar propagacion.
5. En Cloudflare dashboard validar que la zona pase de `pending` a `active`.

## Pendiente en Cloudflare Dashboard
El token/API disponible no autorizo cambios de zone settings (`9109` / `10000`). Configurar manualmente:

1. SSL/TLS:
   - Mode: `Full (strict)` si Hostinger y Railway presentan certificado valido.
   - No usar `Flexible`.
   - Minimum TLS: `1.2`.
2. Edge Certificates:
   - Universal SSL: enabled.
   - Always Use HTTPS: enabled.
   - Automatic HTTPS Rewrites: enabled.
3. Security / WAF:
   - Free Managed Ruleset: enabled.
   - Custom Rule 1: challenge/block requests agresivos contra `/api/v1/auth/login`.
   - Custom Rule 2: block obvious scanners contra `/wp-admin`, `/.env`, `/phpmyadmin` en el dominio publico.
4. Cache:
   - Cache assets estaticos: `/_next/static/*`, `*.js`, `*.css`, `*.png`, `*.jpg`, `*.webp`, `*.svg`.
   - Bypass cache: `/api/*`, cualquier request con `Authorization`, cookies de sesion o rutas autenticadas.

## Hostinger MySQL
1. Crear base MySQL/MariaDB dedicada.
2. Crear usuario dedicado, no root.
3. Rotar cualquier contrasena que haya sido compartida en chat antes de conectar una app real.
4. Si se usa DB compartida de Hostinger, habilitar Remote MySQL solo para IP fija del backend. No usar `%` salvo prueba temporal documentada.
5. Si phpMyAdmin quedo con import parcial, importar primero `backend/migrations_mysql/000_reset_hostinger_core.sql`.
6. Importar `backend/migrations_mysql/001_hostinger_core.sql` desde phpMyAdmin.
7. Ejecutar seed de propietarios:

```bash
cd backend
MYSQL_DSN='user:password@tcp(host:3306)/database?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci' \
DB_DRIVER='mysql' \
EDUCORE_OWNER_ADMIN_EMAILS='gioescudero2007@gmail.com,jagustin_ramosp@hotmail.com' \
EDUCORE_OWNER_ADMIN_PASSWORD='set-this-as-a-secret' \
go run ./scripts/seed_owner_admins.go
```

## Railway
1. Activar Static Outbound IP en el servicio backend.
2. Copiar la IPv4 asignada y allowlist en Hostinger Remote MySQL.
3. Configurar variables:
   - `DB_DRIVER=postgres` hasta terminar el port completo.
   - `MYSQL_DSN=...` para pruebas de conectividad y seed.
   - `ALLOW_DEMO_LOGIN=false`.
   - `EDUCORE_OWNER_ADMIN_EMAILS=gioescudero2007@gmail.com,jagustin_ramosp@hotmail.com`.
   - `EDUCORE_OWNER_ADMIN_PASSWORD` como secret temporal, nunca en git.
4. Cambiar a `DB_DRIVER=mysql` solo cuando todos los repos tenant-scoped esten portados y pasen smoke real.

## Riesgo controlado
MySQL queda preparado como puente, pero la API aun falla cerrado si se intenta arrancar en MySQL antes de portar los repositorios que dependen de `pgxpool` y SQL especifico de PostgreSQL.

## Error #1901 en Hostinger/phpMyAdmin
Si Hostinger muestra que `COALESCE(tenant_id, '__global__')` no puede usarse en una columna `GENERATED ALWAYS`, estas usando un SQL viejo. La version corregida usa:

- columna normal `global_tenant_key VARCHAR(80) NOT NULL DEFAULT '__global__'`;
- triggers `BEFORE INSERT` y `BEFORE UPDATE`;
- fallback en scripts de seed.

Para reparar:

1. Importar `backend/migrations_mysql/000_reset_hostinger_core.sql`.
2. Importar `backend/migrations_mysql/001_hostinger_core.sql`.
3. Verificar que existan triggers `trg_users_global_key_bi` y `trg_users_global_key_bu`.

## Opcion C: VPS completo
Decision recomendada para evitar Railway Static Outbound IP:

- Crear Hostinger VPS Ubuntu LTS.
- Apuntar `api.onlineu.mx` al VPS.
- Instalar Nginx, MariaDB, backend Go y systemd.
- Usar `deploy/vps/educore-api.service`, `deploy/vps/api.onlineu.mx.conf` y `deploy/vps/api.env.production.example`.
- Seguir `docs/obsidian/02_development/VPS_BACKEND_DEPLOY.md`.

#deployment #cloudflare #hostinger #mysql #security
