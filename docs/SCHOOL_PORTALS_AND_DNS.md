# Portales escolares, DNS y acceso por rol

**Actualizado:** 21-07-2026

## URLs de una escuela

Para una escuela con slug `kinder-prueba`, el acceso público es:

| Portal | URL |
|---|---|
| Selector de rol | `https://kinder-prueba.onlineu.mx/educore/escuela/` |
| Administración | `https://kinder-prueba.onlineu.mx/educore/login/?role=school_admin` |
| Profesores | `https://kinder-prueba.onlineu.mx/educore/login/?role=teacher` |
| Padres | `https://kinder-prueba.onlineu.mx/educore/login/?role=parent` |
| Alumnos | `https://kinder-prueba.onlineu.mx/educore/login/?role=student` |

Mientras DNS o SSL propagan, existe un respaldo en el dominio principal:

```text
https://onlineu.mx/educore/escuela/?slug=kinder-prueba
```

## Qué se crea automáticamente

Guardar `tenants.slug` por sí solo no crea DNS. EduCore también llama a la API
oficial de Hostinger para crear el subdominio individual y asignarle el
directorio compartido `educore`. Hostinger no admite un subdominio wildcard en
hPanel, por lo que no debe asumirse que `*.onlineu.mx` basta.

El estado visible distingue:

- `created`: Hostinger aceptó una nueva configuración.
- `existing`: ya existía y se verificó el document root correcto.
- `pending`: Hostinger no completó la solicitud; se puede reintentar.
- `not_configured`: faltan secretos del backend.

`domain_ready=true` confirma la configuración de hosting, pero la validación
final de DNS/SSL se hace con el verificador en vivo.

## Cómo se determina la escuela

En un subdominio, el hostname es autoritativo. Por ejemplo,
`kinder-prueba.onlineu.mx` solo puede resolver el tenant `kinder-prueba`; un
parámetro `?slug=otra-escuela` no lo sustituye.

En el dominio principal, `?slug=` funciona como respaldo. Los slugs deben tener
2 a 63 caracteres, usar minúsculas/números/guiones, no contener guiones dobles
y no utilizar etiquetas reservadas como `api`, `admin`, `www` o `mail`.

Antes de mostrar los portales o aceptar el formulario de acceso, el frontend
consulta `/api/v1/public/schools/resolve`. Una escuela inexistente o suspendida
no obtiene un portal funcional.

## Validación de roles

Elegir una tarjeta no concede permisos. El login envía el tenant y el rol
solicitado; el backend contrasta las credenciales, el tenant, el rol efectivo y
el estado del usuario. Después, cada endpoint vuelve a autorizar desde la base
de datos y usa el `tenant_id` autenticado.

| Selección | Rol requerido |
|---|---|
| Administración | `SCHOOL_ADMIN` |
| Profesores | `TEACHER` |
| Padres | `PARENT` |
| Alumnos | `STUDENT` y vínculo `students.user_id` |

Un `SUPER_ADMIN` opera una escuela mediante Modo Soporte; no adquiere un rol
escolar por cambiar la URL.

## Verificación operativa

```bash
NEXT_PUBLIC_API_URL=https://TU-BACKEND \
  node scripts/check-school-domain.js kinder-prueba --verbose
```

La comprobación solo termina correctamente si:

1. El hostname resuelve en DNS.
2. HTTPS conserva el hostname escolar y llega a `/educore/escuela/`.
3. La respuesta contiene el export estático de EduCore.
4. La API confirma el mismo slug y una escuela activa.

## Diagnóstico

| Síntoma | Acción |
|---|---|
| `DNS_PROBE_FINISHED_NXDOMAIN` | Revisar `domain_provisioning_status`; reintentar Hostinger y esperar propagación. |
| Hostinger devuelve `not_configured` | Configurar `HOSTINGER_API_TOKEN` y `HOSTINGER_HOSTING_USERNAME` en Render. |
| El subdominio ya apunta a otra carpeta | Revisar manualmente; la automatización no sobrescribe por seguridad. |
| HTML carga pero faltan JS/CSS | Confirmar que el despliegue contiene `/educore/.htaccess` y `/educore/_next/`. |
| Login indica escuela no disponible | Verificar slug, estado del tenant y `/public/schools/resolve`. |
| El usuario recibe 403 | Revisar escuela, rol, estado y permisos efectivos del usuario. |

Detalles de provisión y rollback:
[AUTOMATIC_SCHOOL_SUBDOMAINS.md](./AUTOMATIC_SCHOOL_SUBDOMAINS.md).
