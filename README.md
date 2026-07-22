# EduCore

SaaS B2B de administración escolar multi-tenant (SuperAdmin → SchoolAdmin → Teacher → Parent → Student).

- **Producción:** https://onlineu.mx/educore/
- **Backend API:** https://educore-api-1va5.onrender.com

## Arquitectura de producción (real)

| Capa | Tecnología | Dónde | Notas |
|---|---|---|---|
| Frontend | Next.js 14 (export estático, `basePath:/educore`) | Hostinger `/domains/onlineu.mx/public_html/educore/` | Solo archivos estáticos; deploy vía GitHub Actions |
| Backend | Go + Fiber | **Render** (Docker, plan Free) | `PORT` lo da Render; health `/api/v1/health`; duerme tras ~15 min (cold start mitigado con warmup) |
| Base de datos | PostgreSQL | **Neon** (us-east-2, Free) | Solo el backend accede; `DB_DRIVER=postgres` |

> ⛔ **No activo:** Railway (trial expirado) y MySQL de Hostinger (puente histórico). No usar como producción.

## Flujo de despliegue

```
cambio → rama → PR → (revisión + CI) → merge a master
   frontend: GitHub Actions (deploy-frontend-hostinger.yml) → build → FTP → Hostinger
   backend : push a master → Render auto-deploy (Docker)
```

El frontend se despliega **solo** con `.github/workflows/deploy-frontend-hostinger.yml`
(concurrency, sin `--delete`). El backend lo redepliega Render al mergear a master.

## Desarrollo local

```bash
# Backend (Go) — escucha :8082 en dev
cd backend && go run ./cmd/server

# Frontend (Next.js) — :3000
cd frontend && npm ci && npm run dev
```

Variables: copia `.env.example` → `.env` (gitignored). En dev el frontend usa
`NEXT_PUBLIC_API_URL` o cae a `http://localhost:8082`.

## Pruebas

```bash
cd backend && go build ./cmd/server && go vet ./... && go test ./...
cd frontend && npm ci && npm run build
```

## Documentación

- `docs/LOGIN_INCIDENT_REPORT.md` — incidente de login y resolución
- `docs/HOSTINGER_DEPLOYMENT.md` — config exacta de frontend (Actions) y backend (Render/Neon)
- `docs/PRODUCTION_RUNBOOK.md` — reactivar/detener/monitorear
- `docs/ROLLBACK.md` — procedimientos de rollback
- `docs/HOSTINGER_REMOTE_INVENTORY.md` — ruta remota confirmada
- `docs/SCHOOL_PORTALS_AND_DNS.md` — portales por escuela y subdominios wildcard

## Subdominios por escuela

Cada escuela puede tener `https://slug.onlineu.mx` que **redirige** (htaccess wildcard) a
`https://onlineu.mx/educore/escuela/?slug=slug` — sin duplicar la app. Requiere DNS wildcard
`*.onlineu.mx` (paso manual autorizado). El slug se valida/normaliza al crear la escuela
(`backend/internal/pkg/slug`).
