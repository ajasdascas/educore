# Subdominios automáticos de escuelas en Hostinger

**Actualizado:** 21-07-2026

EduCore crea un subdominio individual por escuela. No depende de un wildcard de
hosting: Hostinger indica que hPanel no admite subdominios wildcard, aunque la
zona DNS sí permita registros `*`.

Fuentes oficiales:

- [Crear y eliminar subdominios en Hostinger](https://support.hostinger.com/en/articles/1583405-how-to-create-and-delete-subdomains-in-hostinger)
- [Hostinger API](https://developers.hostinger.com/)
- [Especificación OpenAPI de Hostinger](https://github.com/hostinger/api/blob/main/openapi.json)

## Flujo de producción

Al crear una escuela con slug `kinder-prueba`:

1. El backend valida el slug y confirma la escuela, su administrador, roles y módulos en la base de datos.
2. Después del `COMMIT`, llama a la API oficial de Hostinger.
3. Consulta los subdominios existentes con:
   `GET /api/hosting/v1/accounts/{username}/websites/onlineu.mx/subdomains`.
4. Si falta, crea `kinder-prueba` con:

   ```json
   {
     "subdomain": "kinder-prueba",
     "directory": "educore",
     "is_using_public_directory": false
   }
   ```

5. Si ya existe y apunta a `.../public_html/educore`, lo conserva. Si apunta a
   otro directorio, falla de forma segura y no modifica ni borra ese recurso.
6. Persiste en `tenants.settings`:
   `domain_provisioning_status` (`created`, `existing`, `pending` o
   `not_configured`) y `domain_ready`.

Un error externo no revierte la escuela ya confirmada en la base de datos. El
Super Admin muestra el estado y permite reintentar desde Detalles.

## Variables requeridas en el backend de Render

Configurar como secretos del servicio, nunca como `NEXT_PUBLIC_*`:

```dotenv
HOSTINGER_API_TOKEN=...
HOSTINGER_HOSTING_USERNAME=...
HOSTINGER_WEBSITE_DOMAIN=onlineu.mx
HOSTINGER_SUBDOMAIN_DIRECTORY=educore
```

`HOSTINGER_HOSTING_USERNAME` es el usuario de la cuenta/sitio de hosting que
acepta el endpoint de Hostinger. No debe deducirse a partir de un usuario FTP.
Primero debe confirmarse con la cuenta de hPanel o con una consulta autenticada
a la API. No se documentan valores secretos reales en el repositorio.

Para el workflow manual `.github/workflows/provision-domains.yml`, crear además
los secrets de GitHub `HOSTINGER_API_TOKEN`, `HOSTINGER_HOSTING_USERNAME` y
`NEXT_PUBLIC_API_URL`.

## Enrutamiento del export estático

Next.js se exporta con `basePath=/educore`. El build ejecuta
`frontend/scripts/prepare-static-hosting.cjs`, que copia
`frontend/htaccess-subdomain-app-root` como `frontend/out/.htaccess`.

Cada subdominio apunta al directorio compartido:

```text
/home/{hosting_username}/domains/onlineu.mx/public_html/educore
```

El router mantiene el hostname escolar y resuelve internamente el prefijo del
`basePath`:

```text
https://kinder-prueba.onlineu.mx/
  -> https://kinder-prueba.onlineu.mx/educore/escuela/

https://kinder-prueba.onlineu.mx/educore/login/?role=teacher
  -> archivo /public_html/educore/login/index.html
```

El frontend obtiene el tenant del hostname. `?slug=` se conserva únicamente
como respaldo para rutas internas de `onlineu.mx/educore`.

## Reintento y verificación

Desde la interfaz: Super Admin -> Escuelas -> Detalles -> Portales ->
**Reintentar configuración**.

Desde GitHub Actions: ejecutar `EduCore — School Domain Provisioner` con la
acción `provision`.

Desde una terminal autorizada:

```bash
node scripts/provision-school-domain.js --slug=kinder-prueba
node scripts/check-school-domain.js kinder-prueba --verbose
```

El primer comando modifica Hostinger; el segundo es solo lectura. Una respuesta
exitosa de creación confirma que Hostinger aceptó la configuración, no que DNS
y SSL ya propagaron. El verificador en vivo confirma DNS, HTTPS, el export
estático y la escuela en la API.

## Seguridad y recuperación

- El token Hostinger solo existe en el backend/secret store y viaja como Bearer hacia la API oficial.
- Nunca se imprime, persiste en la base de datos ni incluye en el frontend.
- Solo se aceptan slugs DNS válidos y no reservados.
- CORS acepta orígenes exactos conocidos y un único label escolar válido bajo `onlineu.mx`.
- La automatización no elimina subdominios ni sobrescribe un document root distinto.
- Para detener nuevas provisiones, retirar las variables Hostinger del backend. Eliminar un subdominio existente es una acción destructiva manual fuera de este flujo.
