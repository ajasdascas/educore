# EduCore — Despliegue en Hostinger (configuración real)

**Última actualización:** 21-07-2026
**Dominio canónico:** https://onlineu.mx/educore/  (NO usar `educore.onlineu.mx`)

---

## Arquitectura de despliegue

```
Navegador ─── https://onlineu.mx/educore/ ──▶ Hostinger (archivos estáticos)
                                                   │  (solo sirve HTML/CSS/JS)
                                                   ▼
                        fetch NEXT_PUBLIC_API_URL ──▶ Backend Go/Fiber (Railway u otro)
                                                        │
                                                        ▼
                                                   MySQL/MariaDB de Hostinger
```

- **Frontend**: Next.js 14, export estático (`output: "export"`), `basePath:"/educore"`,
  `trailingSlash:true`. Hostinger **solo sirve archivos** — sin Node, sin `npm start`.
- **Backend**: servicio Go/Fiber **separado** (no vive dentro del hosting estático).
- **DB**: solo el backend accede; el navegador nunca toca MySQL.

---

## Frontend — configuración del workflow (GitHub Actions)

Flujo único: [`.github/workflows/deploy-frontend-hostinger.yml`](../.github/workflows/deploy-frontend-hostinger.yml)

| Parámetro | Valor |
|---|---|
| Working directory | `frontend` |
| Node | 20 |
| Install | `npm ci` |
| Build | `npm run build` (con `NEXT_PUBLIC_API_URL` horneada) |
| Output local | `frontend/out` |
| Destino remoto | `/domains/onlineu.mx/public_html/educore/` *(confirmar por FTP; overridable por secret)* |
| Trigger | push a `master` con cambios en `frontend/**` (o manual) |
| Concurrency | `educore-frontend-production`, `cancel-in-progress: true` |
| Borrado remoto | **NO** (`mirror` sin `--delete`) |

> El workflow **falla a propósito** si `NEXT_PUBLIC_API_URL` no está o no es HTTPS, y
> si el build contuviera la URL muerta de Railway. Así no se sube un build roto.

### ⚠️ Importante sobre la carpeta `out`
Se sube el **contenido** de `frontend/out/` directamente a `public_html/educore/`.
Correcto: `public_html/educore/index.html`. Incorrecto: `public_html/educore/out/index.html`.

---

## Secrets de GitHub que debes configurar

(Settings → Secrets and variables → Actions → New repository secret). **Solo nombres:**

| Secret | Para qué | Obligatorio |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública del backend (https://...) | Sí |
| `HOSTINGER_FTP_SERVER` | host FTP (p. ej. `ftp.onlineu.mx`) | Sí |
| `HOSTINGER_FTP_USERNAME` | usuario FTP | Sí |
| `HOSTINGER_FTP_PASSWORD` | contraseña FTP | Sí |
| `HOSTINGER_FTP_TARGET_DIR` | ruta remota si difiere del default | Opcional |
| `EDUCORE_DEPLOY_WEBHOOK_URL` | historial de deploys (opcional) | No |
| `EDUCORE_DEPLOY_WEBHOOK_SECRET` | secreto del webhook | No |
| `HOSTINGER_API_TOKEN` | provisión wildcard DNS (FASE subdominios) | Solo para wildcard |
| `SERVER_IP` | IP del hosting para el wildcard A record | Solo para wildcard |

---

## Backend — PRODUCCIÓN ACTUAL: Render + Neon (Postgres)

**Backend en vivo:** `https://educore-api-1va5.onrender.com` (Render, Docker, plan Free).
**Base de datos:** PostgreSQL en **Neon** (us-east-2, plan Free, durable).

| Parámetro (Render) | Valor |
|---|---|
| Runtime | Docker (Dockerfile **raíz** `./Dockerfile`, Go 1.26) |
| Branch desplegada | `master` (auto-deploy al hacer merge del PR) |
| Puerto | **`PORT` que provee Render** (no fijo) |
| Health Check Path | `/api/v1/health` → 200 JSON |
| Instancia | Free (⚠️ duerme tras ~15 min → primer request ~50s; mitigado con warmup en el login) |

### Variables del backend en Render (solo nombres; valores como secrets del servicio)
`APP_ENV=production`, `DB_DRIVER=postgres`, `DATABASE_URL` (Neon, `?sslmode=require`),
`JWT_SECRET`, `EDUCORE_AUTO_SEED_OWNERS=true`, `EDUCORE_OWNER_ADMIN_EMAILS`,
`EDUCORE_OWNER_ADMIN_PASSWORD` (≥12 en producción), `ALLOW_DEMO_LOGIN=false`.
**No** definir `PORT` (lo maneja Render). `REDIS_URL` opcional.

> La conexión Neon usa el rol `neondb_owner`, que **bypassa RLS** (las tablas tienen RLS
> ENABLE sin FORCE) — por eso el backend lee/escribe sin bloqueo.
> CORS permite `https://onlineu.mx` (origin sin ruta — nunca `https://onlineu.mx/educore`).

### Bootstrap de una base Postgres nueva
1. Aplicar `scripts/schema_postgres_consolidated.sql` una vez (Neon SQL Editor).
2. `EDUCORE_AUTO_SEED_OWNERS=true` + `EDUCORE_OWNER_ADMIN_*` → el admin se crea al arrancar.

> ⛔ **NO usar Railway ni MySQL de Hostinger como producción.** El servicio de Railway
> quedó fuera (trial expirado) y las migraciones `migrations_mysql/` son un puente histórico
> **no activo**. No definir `DB_DRIVER=mysql`, `MYSQL_DSN` ni `EDUCORE_ALLOW_MYSQL_RUNTIME`.
> `railway.toml` / Dockerfiles se conservan solo como alternativa histórica.

---

## Qué NO hacer

- No desplegar el frontend en `public_html/` de `educore.onlineu.mx` ni tocar su `default.php`.
- No subir a la raíz de `onlineu.mx`.
- No usar `mirror --delete` hasta confirmar la ruta remota y tener backup.
- No poner secretos en variables `NEXT_PUBLIC_*` (esas se hornean en el HTML público).
- No dejar el backend dentro del hosting estático ni ejecutar Node permanente en Hostinger.
