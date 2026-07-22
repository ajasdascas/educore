# EduCore — Procedimientos de Rollback

**Última actualización:** 21-07-2026

Objetivo: revertir con seguridad sin afectar otros sitios del hosting.

---

## 1. Rollback del código (git)

- Rama de recuperación: `recovery/production-login` (basada en `origin/master`).
- Snapshot original intacto en la rama `zz-local-snapshot` y en `master` (= `origin/master`).
- Si un commit de la rama causa problemas:

```bash
git checkout recovery/production-login
git revert <sha-del-commit>     # revert, NO reset (no reescribe historial)
```

- **Nunca** `push --force` ni `reset --hard` sobre ramas remotas compartidas.

---

## 2. Rollback del frontend en Hostinger

El despliegue **no usa `--delete`**, así que subir una versión anterior sobrescribe
los archivos sin borrar nada extra.

**Antes de cada despliegue** se recomienda respaldo remoto:

1. Por FTP, renombrar/copiar `public_html/educore/` → `public_html/educore-backup-AAAA-MM-DD-HHMM/`.
2. O descargar el contenido actual antes de subir.

**Para revertir:**
1. Reconstruir el build de la versión previa:
   ```bash
   cd frontend && npm ci
   NEXT_PUBLIC_API_URL=https://URL-REAL npm run build
   ```
   (usando el commit anterior: `git checkout <sha> -- frontend` o build desde ese commit).
2. Subir el contenido de `frontend/out/` a `public_html/educore/`.
3. O restaurar la carpeta `educore-backup-...` renombrándola de vuelta.

---

## 3. Rollback del backend (Render)

- Render conserva deploys anteriores: servicio `educore-api` → **"Deploys"** →
  en un deploy previo exitoso → **"Rollback to this deploy"**.
- Si un cambio de variables rompe el arranque (log.Fatal por seed/DB), revertir la
  variable en **Environment** y Render redeploya solo.
- La base (Neon) es independiente del backend: revertir el backend NO borra datos.
- El health check `/api/v1/health` debe volver a 200 JSON tras el rollback.

---

## 4. Rollback de la configuración de despliegue

- El workflow duplicado está archivado en `.github/workflows-disabled/deploy.yml`.
  Para reactivarlo (no recomendado): moverlo de vuelta a `.github/workflows/`.
- `railway.json` fue eliminado; si se necesitara, está en el historial git.

---

## 5. Rollback de subdominios / DNS

- Para detener nuevas provisiones, retirar `HOSTINGER_API_TOKEN` y
  `HOSTINGER_HOSTING_USERNAME` del backend. Las escuelas seguirán disponibles por sus
  rutas internas y los subdominios existentes no se eliminan.
- Cada subdominio es un recurso individual de Hostinger. Eliminarlo es destructivo y
  debe hacerse manualmente después de confirmar el slug y el document root; la
  automatización no borra ni reemplaza recursos existentes.
- El router se despliega como `/educore/.htaccess`. Para revertir solo el router,
  restaurar el build anterior completo de `/educore/`; no sobrescribir el `.htaccess`
  de la raíz de `public_html`.

---

## 6. Señales para hacer rollback

- Login deja de funcionar tras un deploy (revisar `/api/v1/health` y consola del navegador).
- Otras páginas del hosting se vuelven lentas → revisar procesos/pool DB del backend.
- Errores 5xx sostenidos en el backend.
