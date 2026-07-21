# EduCore — Inventario del Hosting Remoto (Hostinger)

**Estado:** ⏳ PENDIENTE de credenciales FTP/SFTP. Este documento es una plantilla
de **solo lectura**; se rellena cuando haya acceso FTP seguro. **No** incluir aquí
contraseñas, nombres completos de usuario FTP ni tokens.

**Última actualización:** 21-07-2026

---

## Por qué está pendiente

El agente no dispone de credenciales FTP/SFTP de Hostinger y **no deben pegarse en el
chat ni versionarse**. El inventario debe hacerse de una de estas dos formas:

- **Opción A (recomendada):** Giovanni abre hPanel → *Administrador de archivos* /
  *Accede a todos los archivos de Business Web Hosting* y comparte la **estructura de
  carpetas** (sin datos sensibles), o
- **Opción B:** Se guardan las credenciales FTP como GitHub Secrets y se usa el paso
  `Diagnose FTP connectivity` del workflow, o un `lftp` local con las variables de
  entorno, para listar **sin modificar**.

---

## Comprobaciones de solo lectura (rellenar)

### 1. Raíz FTP real y estructura
```
# lftp (solo listar, NO subir/borrar):
#   open -u "USUARIO,PASS" ftp://ftp.onlineu.mx
#   pwd
#   cls -1
#   cd /domains/onlineu.mx/public_html ; cls -1
#   cd /domains/onlineu.mx/public_html/educore ; cls -1
```

| Dato | Valor encontrado |
|---|---|
| Raíz FTP (`pwd` inicial) | _por confirmar_ |
| ¿Existe `/domains/onlineu.mx/public_html/`? | _por confirmar_ |
| ¿Existe `/public_html/educore/`? | _por confirmar_ |
| Ruta real de `educore` | _por confirmar_ |
| ¿La carpeta `educore` fue eliminada? | _por confirmar_ |
| Nº de archivos en `educore` | _por confirmar_ |
| Tamaño aprox. | _por confirmar_ |
| Fecha última modificación | _por confirmar_ |
| ¿Existe `.htaccess` en la raíz de `public_html`? | _por confirmar_ |

### 2. Otros sitios (no tocar)
| Dominio | Ruta | Nota |
|---|---|---|
| `educore.onlineu.mx` | `public_html/` + `default.php` | **NO** desplegar aquí el frontend canónico |
| _otros_ | _por confirmar_ | No modificar |

---

## Reglas al hacer el inventario

- Solo listar (`pwd`, `cls`, `ls`). **Nada** de `rm`, `mirror --delete`, `put` todavía.
- No modificar `default.php` de `educore.onlineu.mx`.
- No tocar la raíz de `onlineu.mx` ni otros dominios.
- Si `public_html/educore` existe, respaldar antes de subir (ver [ROLLBACK.md](ROLLBACK.md)).
- Si NO existe, crear solo `public_html/educore` (vacía) como destino.

---

## Backup antes de desplegar

```
# renombrar/copiar la carpeta actual como respaldo con fecha:
#   public_html/educore  ->  public_html/educore-backup-AAAA-MM-DD-HHMM
```
Guardar también el checksum del ZIP local del build (`sha256sum out.zip`).
