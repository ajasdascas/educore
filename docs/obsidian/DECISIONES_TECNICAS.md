# EduCore — Decisiones Técnicas

## Arquitectura General
- **Backend**: Go + Fiber v2 (API REST, monolito modular)
- **Frontend**: Next.js 14 (App Router, static export para Hostinger)
- **DB**: PostgreSQL 16 con Row Level Security (RLS) para multi-tenancy
- **Cache**: Redis 7 (opcional, graceful degradation)
- **UI**: Tailwind CSS + shadcn/ui v4 (@base-ui/react) + Framer Motion
- **Auth**: JWT HS256 (access 15min + refresh 7d httpOnly cookie)

## Multi-Tenancy
- Modelo: **shared database, shared schema** con RLS
- Resolución: Header `X-Tenant-ID` → subdomain fallback → JWT override
- Cada query se filtra con `SET LOCAL app.current_tenant = $1`
- SUPER_ADMIN no tiene tenant_id (acceso global)

## Deploy
- **Frontend estático** en Hostinger vía FTP (basePath="/educore", output="export")
- **Backend temporal** en localhost expuesto via ngrok (testing only)
- **Plan futuro**: migrar backend a Railway/Render + DB a Neon/Supabase

## Temas UI
- 3 temas: blue (corporate default), light, dark
- Implementados con CSS variables en `globals.css`
- Mapeados en `tailwind.config.ts` como colores semánticos
- Toggle via `next-themes` (attribute="class")

## API URL Config
- `frontend/lib/api.ts` detecta entorno automáticamente:
  - `localhost` → `http://localhost:8082`
  - Cualquier otro host → ngrok URL (actualizar manualmente al reiniciar ngrok)

## FTP Structure (Hostinger)
- Dominio principal: `/domains/onlineu.mx/public_html/` → `https://onlineu.mx/`
- EduCore: `/domains/onlineu.mx/public_html/educore/` → `https://onlineu.mx/educore/`
- NO usar `/domains/educore/` (es directorio de subdominio, no subcarpeta)
