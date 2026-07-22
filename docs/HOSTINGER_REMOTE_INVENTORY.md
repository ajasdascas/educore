# EduCore — Inventario del Hosting Remoto (Hostinger)

**Estado:** ✅ Ruta de despliegue **confirmada** por el dueño (hPanel File Manager).
**Última actualización:** 21-07-2026

> No incluir aquí contraseñas, usuarios FTP completos ni tokens.

---

## Ruta de despliegue confirmada

| Dato | Valor |
|---|---|
| **Ruta remota del frontend** | `/domains/onlineu.mx/public_html/educore/` ✅ confirmada |
| Estado inicial de la carpeta | Vacía (el dueño eliminó el contenido al desactivar el proyecto) |
| Dominio servido | `https://onlineu.mx/educore/` |
| Acceso | Cuenta general de **Business Web Hosting** (NO el File Manager del sitio `educore.onlineu.mx`) |

Esta ruta **coincide** con el default del workflow
`deploy-frontend-hostinger.yml` (`HOSTINGER_FTP_TARGET_DIR` por defecto
`/domains/onlineu.mx/public_html/educore/`), por lo que no es obligatorio
definir ese secret; si se define, debe usar exactamente esa ruta.

Como la carpeta estaba **vacía**, el primer despliegue simplemente crea/rellena
su contenido. No se requiere backup previo (no había archivos). El workflow
sube **sin `--delete`**, por lo que no borra nada fuera de `educore/`.

---

## Reglas (siguen vigentes)

- **NO** desplegar en el `public_html/` del sitio `educore.onlineu.mx` ni tocar su `default.php`.
- **NO** subir a la raíz de `onlineu.mx`.
- **NO** usar `mirror --delete` en el primer despliegue de recuperación.
- **NO** modificar otros dominios del hosting.
- Se sube el **contenido** de `frontend/out/` (no la carpeta `out` como subcarpeta):
  resultado esperado `.../educore/index.html`, `.../educore/login/index.html`, `.../educore/_next/`.

---

## Secrets FTP (en GitHub Actions, ya existentes)

El repo ya tiene secrets `HOSTINGER_*` configurados. Nombres esperados por el workflow
(solo nombres, sin valores):

- `HOSTINGER_FTP_SERVER`
- `HOSTINGER_FTP_USERNAME`
- `HOSTINGER_FTP_PASSWORD`
- `HOSTINGER_FTP_TARGET_DIR` (opcional; default correcto ya coincide con la ruta confirmada)

Verificar que sus nombres coincidan exactamente con los que usa el workflow.
