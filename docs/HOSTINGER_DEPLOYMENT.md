# EduCore — Despliegue en Hostinger (configuración real)

**Última actualización:** 21-07-2026
**Dominio canónico:** https://onlineu.mx/educore/  (NO usar `educore.onlineu.mx`)

---

## Arquitectura de despliegue

```
Navegador ─── https://onlineu.mx/educore/ ──▶ Hostinger (archivos estáticos)
                                                   │  (solo sirve HTML/CSS/JS)
                                                   ▼
                        fetch NEXT_PUBLIC_API_URL ──▶ Backend Go/Fiber (Render)
                                                        │
                                                        ▼
                                                   PostgreSQL (Neon)
```

- **Frontend**: Next.js 14, export estático (`output: "export"`), `basePath:"/educore"`,
  `trailingSlash:true`. Hostinger **solo sirve archivos** — sin Node, sin `npm start`.
- **Backend**: servicio Go/Fiber **separado** (no vive dentro del hosting estático).
- **DB**: solo el backend accede; el navegador nunca toca PostgreSQL.

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
| Destino visible por FTP | `/educore/` *(la raíz FTP ya es `public_html/`; overridable por secret)* |
| Ruta equivalente en File Manager | `/domains/onlineu.mx/public_html/educore/` |
| Trigger | push a `master` con cambios en `frontend/**` (o manual) |
| Concurrency | `educore-frontend-production`, `cancel-in-progress: true` |
| Borrado remoto | **NO** (`mirror` sin `--delete`) |

> El workflow **falla a propósito** si `NEXT_PUBLIC_API_URL` no está o no es HTTPS, y
> si el build contuviera la URL muerta de Railway. Así no se sube un build roto.

### ⚠️ Importante sobre la carpeta `out`
Se sube el **contenido** de `frontend/out/` directamente a `/educore/` por FTP.
Correcto: `/educore/index.html`. Incorrecto: `/educore/out/index.html`.

> hPanel muestra la ruta absoluta bajo `domains/`, pero la cuenta FTP de
> `onlineu.mx` está aislada con `public_html/` como su propia raíz.

El build también crea `out/.htaccess`. Ese archivo es parte obligatoria del
deploy: permite que cada subdominio escolar apuntado al directorio `educore`
sirva correctamente las URLs generadas con `basePath=/educore`.

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
| `HOSTINGER_API_TOKEN` | reintento manual de un subdominio escolar | Para workflow de dominios |
| `HOSTINGER_HOSTING_USERNAME` | usuario del sitio/cuenta de hosting, no el usuario FTP | Para workflow de dominios |

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
`JWT_SECRET`, `EDUCORE_AUTO_SEED_OWNERS=false`, `ALLOW_DEMO_LOGIN=false`.
`EDUCORE_OWNER_ADMIN_EMAILS` y `EDUCORE_OWNER_ADMIN_PASSWORD` se usan solo en
el bootstrap create-once descrito abajo; no deben permanecer activos.
Para crear subdominios al registrar escuelas: `HOSTINGER_API_TOKEN`,
`HOSTINGER_HOSTING_USERNAME`, `HOSTINGER_WEBSITE_DOMAIN=onlineu.mx` y
`HOSTINGER_SUBDOMAIN_DIRECTORY=educore`.
**No** definir `PORT` (lo maneja Render). `REDIS_URL` opcional.

> La conexión Neon usa el rol `neondb_owner`, que **bypassa RLS** (las tablas tienen RLS
> ENABLE sin FORCE) — por eso el backend lee/escribe sin bloqueo.
> CORS permite los orígenes exactos de plataforma y un único slug escolar
> válido bajo `https://{slug}.onlineu.mx` (el origin nunca incluye `/educore`).

### Subdominios escolares

Hostinger no admite wildcard de subdominios en hPanel. El backend usa la API
oficial para crear un subdominio individual por escuela, de forma idempotente,
y lo apunta al directorio compartido `educore`. No se debe configurar un
subdominio manual con otro document root. Ver
[`AUTOMATIC_SCHOOL_SUBDOMAINS.md`](./AUTOMATIC_SCHOOL_SUBDOMAINS.md).

### Bootstrap de una base Postgres nueva
1. Aplicar `scripts/schema_postgres_consolidated.sql` una vez (Neon SQL Editor).
2. Definir temporalmente `EDUCORE_AUTO_SEED_OWNERS=true` y
   `EDUCORE_OWNER_ADMIN_*`; arrancar una vez y verificar la creación.
3. Volver inmediatamente `EDUCORE_AUTO_SEED_OWNERS=false`, retirar
   `EDUCORE_OWNER_ADMIN_PASSWORD` del servicio y reiniciar. El bootstrap nunca
   cambia ni reactiva una cuenta que ya existe.

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
