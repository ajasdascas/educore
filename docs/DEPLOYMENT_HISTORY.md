# EduCore Deployment History

Fecha: 06-05-2026

## Que Hace

El historial de despliegues registra cada deploy reportado por GitHub Actions y lo muestra en Super Admin -> Respaldos, en una seccion separada llamada "Historial de actualizaciones".

Cada registro guarda:

- titulo del commit
- descripcion breve del commit o fallback automatico
- servicio desplegado
- estado
- commit y rama
- actor de GitHub
- workflow, run id y URL del workflow
- fecha/hora del despliegue

## Diferencia Entre Backup Y Deployment History

| Concepto | Que representa | Donde aparece |
|---|---|---|
| Backup | Respaldo o job de restore de datos | Super Admin -> Respaldos -> Respaldos de datos |
| Deployment history | Registro de actualizaciones de codigo/infra reportadas por CI/CD | Super Admin -> Respaldos -> Historial de actualizaciones |

El historial de despliegues no restaura datos y no reemplaza los backups. Solo responde: "que se desplego, cuando, desde que commit y por quien".

## Base De Datos

Aplicar manualmente en Hostinger MySQL:

```sql
SOURCE backend/migrations_mysql/010_deployment_history.sql;
```

Tabla creada:

```text
deployment_history
```

La migracion es idempotente con `CREATE TABLE IF NOT EXISTS`.

## Endpoint Interno

GitHub Actions registra deploys con:

```http
POST /api/v1/internal/deployments/record
X-EduCore-Deploy-Secret: <secret>
Content-Type: application/json
```

Este endpoint no usa JWT porque lo llama GitHub Actions. La proteccion es el header `X-EduCore-Deploy-Secret`, validado contra la variable backend `EDUCORE_DEPLOY_WEBHOOK_SECRET`.

Si el header falta o no coincide:

- HTTP 401
- no se guarda ningun registro

## Secrets Requeridos En GitHub

Agregar en GitHub -> Settings -> Secrets and variables -> Actions:

| Secret | Uso |
|---|---|
| `EDUCORE_DEPLOY_WEBHOOK_URL` | URL completa del webhook, por ejemplo `https://api.example.com/api/v1/internal/deployments/record` |
| `EDUCORE_DEPLOY_WEBHOOK_SECRET` | Secreto compartido enviado en `X-EduCore-Deploy-Secret` |

El workflow no debe imprimir el secreto. Si el webhook falla, el deploy no se rompe; GitHub Actions solo imprime un warning.

## Variable Requerida En Backend

Configurar en Railway o VPS:

```env
EDUCORE_DEPLOY_WEBHOOK_SECRET=valor-largo-y-aleatorio
```

Debe coincidir exactamente con el secret de GitHub `EDUCORE_DEPLOY_WEBHOOK_SECRET`.

## Como Probar El Webhook

Prueba negativa:

```bash
curl -i -X POST "$EDUCORE_DEPLOY_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-EduCore-Deploy-Secret: wrong" \
  -d '{"service":"frontend","status":"success","title":"test"}'
```

Resultado esperado: HTTP 401.

Prueba positiva:

```bash
curl -i -X POST "$EDUCORE_DEPLOY_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-EduCore-Deploy-Secret: $EDUCORE_DEPLOY_WEBHOOK_SECRET" \
  -d '{
    "environment":"production",
    "service":"frontend",
    "provider":"github_actions",
    "status":"success",
    "title":"Deploy test",
    "description":"Registro manual de prueba",
    "commit_sha":"manual-test",
    "commit_short_sha":"manual",
    "branch":"master",
    "actor":"manual",
    "repository":"ajasdascas/educore",
    "workflow_name":"Manual smoke",
    "run_id":"manual-test",
    "run_number":"0",
    "run_attempt":"1",
    "run_url":"https://github.com/ajasdascas/educore/actions"
  }'
```

Resultado esperado: HTTP 200 y registro visible en Super Admin -> Respaldos.

## Script QA

Ejecutar:

```bash
node scripts/check-deployment-history.js
```

Con variables live:

```bash
API_BASE_URL=https://TU-BACKEND.up.railway.app \
EDUCORE_DEPLOY_WEBHOOK_SECRET=... \
SUPER_ADMIN_EMAIL=... \
SUPER_ADMIN_PASSWORD=... \
node scripts/check-deployment-history.js
```

El script valida estructura estatica y, si existen las variables, prueba webhook incorrecto/correcto, login SUPER_ADMIN y lectura del historial.

## Cambiar URL Al Migrar De Railway A VPS

Cuando el backend pase de Railway a VPS:

1. Mantener la misma variable backend `EDUCORE_DEPLOY_WEBHOOK_SECRET` en el VPS.
2. Actualizar GitHub secret `EDUCORE_DEPLOY_WEBHOOK_URL` a:
   ```text
   https://api.onlineu.mx/api/v1/internal/deployments/record
   ```
3. Ejecutar `node scripts/check-deployment-history.js` con `API_BASE_URL` apuntando al VPS.
4. Correr un deploy manual de frontend y confirmar que aparece en Super Admin -> Respaldos.

## Rollback

El historial no ejecuta rollback. Sirve como evidencia para decidir que commit o workflow revertir.

Rollback frontend Hostinger:

1. Identificar el deploy fallido en "Historial de actualizaciones".
2. Abrir "Ver workflow" para confirmar commit y artefacto.
3. Revertir el commit o restaurar backup de `public_html/educore`.
4. Re-ejecutar el deploy estable.
5. Confirmar que el nuevo deploy queda registrado.

Rollback backend Railway/VPS:

1. Identificar commit y workflow asociado.
2. Usar rollback del proveedor o redeploy del commit estable.
3. Validar `/api/v1/health`.
4. Registrar manualmente una nota operativa si el deploy no paso por GitHub Actions.
