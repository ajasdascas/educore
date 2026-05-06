# Deploy automatico del frontend a Hostinger

Este workflow despliega el frontend de EduCore a Hostinger usando FTP.

Archivo:

.github/workflows/deploy-frontend-hostinger.yml

Cuando corre:

- En cada push a master que cambie frontend/
- Manualmente desde GitHub Actions con Run workflow

Secrets requeridos en GitHub:

Settings -> Secrets and variables -> Actions -> New repository secret

Crear:

- HOSTINGER_FTP_SERVER
- HOSTINGER_FTP_USERNAME
- HOSTINGER_FTP_PASSWORD
- NEXT_PUBLIC_API_URL
- EDUCORE_DEPLOY_WEBHOOK_URL
- EDUCORE_DEPLOY_WEBHOOK_SECRET

NEXT_PUBLIC_API_URL debe apuntar al backend actual en Railway mientras el backend no se migre a VPS.

Ejemplo:

https://TU-BACKEND.up.railway.app/api/v1

EDUCORE_DEPLOY_WEBHOOK_URL debe apuntar al endpoint interno del backend:

https://TU-BACKEND.up.railway.app/api/v1/internal/deployments/record

EDUCORE_DEPLOY_WEBHOOK_SECRET debe coincidir con la variable del backend:

EDUCORE_DEPLOY_WEBHOOK_SECRET

Destino en Hostinger:

/public_html/educore/

El contenido de frontend/out/ se sube directamente a public_html/educore/.

Correcto:

/public_html/educore/index.html
/public_html/educore/_next/
/public_html/educore/school-admin/
/public_html/educore/super-admin/

Incorrecto:

/public_html/educore/out/index.html

Primer deploy:

1. Ir a GitHub -> Actions.
2. Abrir Deploy Frontend to Hostinger.
3. Click Run workflow.
4. Branch master.
5. Esperar que termine en verde.

Historial de despliegues:

Despues del FTP deploy exitoso, el workflow intenta registrar el deploy en EduCore. Si el webhook falla, el deploy no se rompe; GitHub Actions imprime un warning. El registro queda visible en:

Super Admin -> Respaldos -> Historial de actualizaciones

Ver documentacion completa:

docs/DEPLOYMENT_HISTORY.md

Rollback manual:

1. En Hostinger File Manager, renombrar educore a educore_failed.
2. Renombrar el backup anterior a educore.
3. Limpiar cache en Hostinger si aplica.
