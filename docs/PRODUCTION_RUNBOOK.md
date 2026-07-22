# EduCore — Runbook de Producción

**Última actualización:** 21-07-2026
**Dominio canónico:** https://onlineu.mx/educore/

Guía operativa breve. Para detalle de deploy ver [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md);
para revertir ver [ROLLBACK.md](ROLLBACK.md).

---

## Arquitectura de producción (actual)

- **Frontend**: estático en Hostinger → `https://onlineu.mx/educore/` (deploy vía GitHub Actions).
- **Backend**: Go/Fiber en **Render** → `https://educore-api-1va5.onrender.com` (Docker, Free).
- **DB**: PostgreSQL en **Neon** (us-east-2, Free).

## Reactivar EduCore (checklist)

1. **Backend vivo** (Render): verificar
   ```bash
   curl -i https://educore-api-1va5.onrender.com/api/v1/health   # -> 200 JSON {"success":true,...}
   ```
   Si duerme (Free), el primer request tarda ~50s. Si no responde, revisar el servicio en Render.
2. **Secret**: en GitHub, `NEXT_PUBLIC_API_URL` = `https://URL-BACKEND`.
3. **Frontend**: push a `master` tocando `frontend/**`, o ejecutar el workflow manual
   `Deploy Frontend to Hostinger`. Esto compila y sube estáticos a `public_html/educore/`.
4. **Verificar**:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" https://onlineu.mx/educore/login/   # 200
   ```
   y probar login real en el navegador.

## Detener EduCore SIN afectar otros sitios

- **Frontend**: es estático; para "apagarlo" basta con retirar/renombrar `public_html/educore/`
  o poner una página de mantenimiento ahí. **No** toca otros dominios.
- **Backend**: suspender el servicio `educore-api` en Render (Settings → Suspend).
  Detener el backend deja el frontend visible pero el login mostrará "no se pudo conectar".
- **NO** borres archivos fuera de `public_html/educore/`. **NO** pares servicios de otros sitios.

## Verificar consumo de recursos

- El frontend estático **no** debe generar proceso Node ni CPU permanente en Hostinger.
  Si ves procesos Node de EduCore en el hosting, algo está mal (no debería haber `npm start`).
- Backend (Railway): revisar métricas de CPU/RAM y **reinicios**. Reinicios en bucle =
  fallo de arranque (DB/JWT/guard MySQL) → revisar logs.
- **MySQL**: vigilar número de conexiones. El pool debe estar limitado (no agotar Hostinger).
- No hay dos workflows desplegando (el duplicado está archivado).
- `sync.js` ya no hace commits/push (no genera cascada de deploys).

## Diagnóstico rápido de login

| Síntoma | Causa probable | Acción |
|---|---|---|
| "No se pudo conectar con el servidor" | backend caído/ausente o CORS | `curl .../api/v1/health`; revisar Railway |
| "El servidor tardó demasiado" | backend lento/congelado | logs Railway, DB |
| "Correo o contraseña incorrectos" | credenciales | normal (401 controlado) |
| Página carga pero assets rotos | basePath/ruta remota mal | verificar `/educore/_next/` y ruta FTP |

## Contactos de configuración (dónde viven los secretos)

- GitHub → Settings → Secrets and variables → Actions (`NEXT_PUBLIC_API_URL`, `HOSTINGER_FTP_*`)
- Render → servicio `educore-api` → Environment (`DATABASE_URL`, `JWT_SECRET`, `EDUCORE_OWNER_ADMIN_*`)
- Neon → proyecto `educore` → Connection string / SQL Editor
- Hostinger → hPanel (FTP, DNS para subdominios)
