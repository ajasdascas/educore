# Workflows archivados (inactivos)

GitHub Actions **solo ejecuta** archivos dentro de `.github/workflows/`.
Los workflows en esta carpeta están **desactivados a propósito** y no se
ejecutan. Se conservan por referencia y para poder reactivarlos si hiciera falta.

## `deploy.yml`
Workflow antiguo de despliegue del frontend. Se archivó porque **duplicaba** el
build/despliegue con `deploy-frontend-hostinger.yml` en cada push a `master`
(dos builds, rutas remotas distintas, uno con `--delete`). También subía un
`.htaccess` a la raíz del dominio y traía credenciales FTP de fallback en texto.

**Flujo oficial vigente:** `.github/workflows/deploy-frontend-hostinger.yml`
(único flujo automático del frontend, con `concurrency`, sin `--delete`, y
secrets centralizados).

Para reactivar (no recomendado sin revisar): mover el archivo de vuelta a
`.github/workflows/`.
