# EduCore — Runbook de Producción

**Última actualización:** 21-07-2026
**Dominio canónico:** https://onlineu.mx/educore/

Guía operativa breve. Para detalle de deploy ver [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md);
para revertir ver [ROLLBACK.md](ROLLBACK.md).

---

## Reactivar EduCore (checklist)

1. **Backend vivo**: desplegar el backend (Railway u otro). Verificar:
   ```bash
   curl -i https://URL-BACKEND/api/v1/health   # -> 200 JSON {"success":true,...}
   ```
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
- **Backend**: pausar/parar el servicio en Railway (no consume si está detenido).
  Detener el backend deja el frontend visible pero el login mostrará "servicio no disponible".
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

- GitHub → Settings → Secrets and variables → Actions
- Railway → servicio backend → Variables
- Hostinger → hPanel (FTP, DB, DNS, phpMyAdmin)
