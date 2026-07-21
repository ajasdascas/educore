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

## 3. Rollback del backend (Railway)

- Railway conserva deployments anteriores: **Deployments → seleccionar uno anterior → Redeploy/Rollback**.
- Si un cambio de variables rompe el arranque (log.Fatal), revertir la variable y redeployar.
- El health check `/api/v1/health` debe volver a 200 JSON tras el rollback.

---

## 4. Rollback de la configuración de despliegue

- El workflow duplicado está archivado en `.github/workflows-disabled/deploy.yml`.
  Para reactivarlo (no recomendado): moverlo de vuelta a `.github/workflows/`.
- `railway.json` fue eliminado; si se necesitara, está en el historial git.

---

## 5. Rollback de subdominios / DNS

- El wildcard `*.onlineu.mx` es un cambio de DNS. Para revertir: eliminar el registro
  A wildcard en el panel DNS de Hostinger. **No** afecta a `onlineu.mx` ni a `/educore/`.
- El `.htaccess` router va en la raíz de `public_html`. Respaldar el `.htaccess` existente
  antes de reemplazarlo; para revertir, restaurar el respaldo.

---

## 6. Señales para hacer rollback

- Login deja de funcionar tras un deploy (revisar `/api/v1/health` y consola del navegador).
- Otras páginas del hosting se vuelven lentas → revisar procesos/pool DB del backend.
- Errores 5xx sostenidos en el backend.
