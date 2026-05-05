# Automatic School Subdomains — EduCore
## Estado verificado: 2026-05-05

---

## Resumen ejecutivo

| Componente | Estado | Qué falta |
|-----------|--------|-----------|
| Backend API (school-info) | ✅ Funciona | — |
| Frontend portal `/escuela/` | ✅ Funciona | — |
| Login con hostname-detection | ✅ Funciona | — |
| .htaccess routing (código) | ✅ Listo + deploy automático | — |
| Rol STUDENT backend | ✅ Implementado | — |
| Portal de estudiante frontend | ✅ Implementado | — |
| DNS wildcard `*.onlineu.mx` | ⚠️ Requiere configuración | `HOSTINGER_API_TOKEN` o `CLOUDFLARE_API_TOKEN` |
| cPanel wildcard subdomain | ⚠️ Un paso manual o API | `CPANEL_HOST/USER/TOKEN` |

---

## Cómo funciona el sistema

```
Usuario visita: kinder1.onlineu.mx
      ↓
[DNS Wildcard]  *.onlineu.mx  →  mismo IP que onlineu.mx
      ↓
[Apache .htaccess]  public_html/.htaccess
   RewriteRule según path:
   /                → https://onlineu.mx/educore/escuela/?slug=kinder1
   /login?role=X    → https://onlineu.mx/educore/login?slug=kinder1&role=X
   /otra-ruta       → https://onlineu.mx/educore/otra-ruta
      ↓
[Next.js App]  lee ?slug= o detecta hostname
   Portal selector / Login page / Dashboard
      ↓
[Backend JWT]  tenant_id en el token garantiza aislamiento de datos
```

---

## Setup único (hacer UNA vez, aplica a TODAS las escuelas futuras)

### Paso 1 — DNS Wildcard (automatizable con script)

El script detecta automáticamente qué proveedor usar según las variables de entorno:

```bash
# Opción A — Cloudflare (recomendado, más fiable)
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ZONE_ID=yyy \
node scripts/provision-wildcard-domain.js

# Opción B — Hostinger DNS API
HOSTINGER_API_TOKEN=xxx \
node scripts/provision-wildcard-domain.js

# Opción C — Solo cPanel (sin token DNS)
CPANEL_HOST=server.hostinger.com CPANEL_USER=u550473909 CPANEL_TOKEN=xxx \
node scripts/provision-wildcard-domain.js

# Opción D — Dry run para ver el plan sin cambios
DRY_RUN=true CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ZONE_ID=yyy \
node scripts/provision-wildcard-domain.js
```

O hacerlo manualmente en el panel DNS:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A    | *    | [IP del servidor] | 3600 |

**¿Cómo obtengo la IP?** → hPanel → Hosting → Administrar → IP Address del servidor

### Paso 2 — cPanel Wildcard Subdomain (automatizable o manual)

**Intento automático con CPANEL_TOKEN:**
```bash
CPANEL_HOST=server.hostinger.com CPANEL_USER=u550473909 CPANEL_TOKEN=xxx \
node scripts/provision-wildcard-domain.js
```

**Si el API falla (limitación de plan Hostinger shared):**
1. hPanel → Hosting → Administrar → cPanel
2. Domains → Subdomains
3. Crear:
   - Subdomain: `*`
   - Domain: `onlineu.mx`
   - Document Root: `public_html/`
4. Guardar

> ⚠️ **Hostinger shared hosting** puede no permitir wildcards vía cPanel API.
> Si el script reporta error de permisos, el único paso manual es el de cPanel.
> **Se hace UNA sola vez y aplica a todas las escuelas futuras.**

### Paso 3 — .htaccess (automático via GitHub Actions)

El archivo `frontend/htaccess-subdomain-root` se despliega automáticamente como
`public_html/.htaccess` en cada push a `master`. No necesitas hacer nada.

---

## Paths manejados por el .htaccess

| URL del subdominio | Redirige a |
|-------------------|-----------|
| `kinder1.onlineu.mx` | `onlineu.mx/educore/escuela/?slug=kinder1` |
| `kinder1.onlineu.mx/login?role=school_admin` | `onlineu.mx/educore/login?slug=kinder1&role=school_admin` |
| `kinder1.onlineu.mx/login?role=teacher` | `onlineu.mx/educore/login?slug=kinder1&role=teacher` |
| `kinder1.onlineu.mx/login?role=parent` | `onlineu.mx/educore/login?slug=kinder1&role=parent` |
| `kinder1.onlineu.mx/login?role=student` | `onlineu.mx/educore/login?slug=kinder1&role=student` |
| `kinder1.onlineu.mx/school-admin/dashboard` | `onlineu.mx/educore/school-admin/dashboard` |
| `kinder1.onlineu.mx/cualquier-otra-ruta` | `onlineu.mx/educore/cualquier-otra-ruta` |

---

## Por cada nueva escuela (cero configuración adicional)

Cuando creas una nueva escuela en el Super Admin con slug `nueva-escuela`:

1. ✅ El wildcard DNS ya funciona — `nueva-escuela.onlineu.mx` resuelve automáticamente
2. ✅ El .htaccess ya redirige — sin cambios
3. ✅ El backend ya tiene el tenant — slug registrado en DB
4. Verificar (opcional):
   ```bash
   node scripts/check-school-domain.js nueva-escuela
   ```

**No necesitas crear DNS manual por cada escuela. Nunca.**

---

## Roles de login disponibles

| Rol URL (`?role=`) | Rol backend | Dashboard |
|-------------------|-------------|-----------|
| `school_admin` | `SCHOOL_ADMIN` | `/school-admin/dashboard` |
| `teacher` | `TEACHER` | `/teacher/dashboard` |
| `parent` | `PARENT` | `/parent/dashboard` |
| `student` | `STUDENT` | `/student/dashboard` |
| (ninguno) | `SUPER_ADMIN` | `/super-admin/dashboard` |

### Estado del rol STUDENT:
- ✅ Backend: módulo `student` con endpoints `/api/v1/student/dashboard|profile|grades|attendance`
- ✅ Frontend: layout, dashboard, grades, attendance, schedule, notifications, settings
- ✅ RoleGuard: `allowedRoles={["STUDENT"]}`
- ✅ getDashboardPath: devuelve `/student/dashboard`
- ✅ Login: redirige a `/student/dashboard` post-login
- ✅ Portal escuela: tarjeta de Estudiante en selector
- ✅ .htaccess: reenvía `?role=student` correctamente

**Para crear un alumno con acceso al portal:**
El alumno necesita un registro en `users` con `role = 'STUDENT'` y un registro
correspondiente en `students` con `user_id` apuntando a ese usuario.
Esto se hace desde School Admin → Estudiantes (asignar credenciales de acceso).

---

## Scripts de mantenimiento

| Script | Uso | Ejemplo |
|--------|-----|---------|
| `provision-wildcard-domain.js` | Setup inicial DNS + cPanel | `CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ZONE_ID=yyy node ...` |
| `provision-school-domain.js` | Verificar que escuela existe en DB + DNS | `node ... --slug=kinder1` |
| `check-school-domain.js` | Health check completo (DNS + HTTP + API) | `node ... kinder1 --verbose` |
| `check-auth-routing.js` | Verificar login routing para todos los roles | `node ...` |
| `check-school-routing.js` | Verificar routing completo de subdominios | `node ... --live --slug=kinder1` |

---

## Secrets requeridos

| Secret | Dónde configurar | Para qué |
|--------|-----------------|---------|
| `CLOUDFLARE_API_TOKEN` | GitHub Secrets + local `.env` | DNS wildcard via Cloudflare (recomendado) |
| `CLOUDFLARE_ZONE_ID` | GitHub Secrets + local `.env` | ID de zona Cloudflare para onlineu.mx |
| `HOSTINGER_API_TOKEN` | GitHub Secrets + local `.env` | DNS wildcard via Hostinger API |
| `CPANEL_HOST` | Local `.env` | Hostname del servidor cPanel |
| `CPANEL_USER` | Local `.env` | Usuario cPanel |
| `CPANEL_TOKEN` | Local `.env` | API token cPanel |
| `SERVER_IP` | Local `.env` | IP del servidor (auto-detectada si no se pone) |
| `FTP_PASSWORD` | GitHub Secrets (ya existe) | Deploy FTP a Hostinger |

---

## Detección de slug en la app

El archivo `frontend/lib/tenant.ts` centraliza la lógica:

```typescript
import { getTenantFromHost, getActiveTenantSlug } from "@/lib/tenant";

// Desde hostname:
getTenantFromHost("kinder1.onlineu.mx")  // → "kinder1"
getTenantFromHost("onlineu.mx")          // → null  (plataforma principal)
getTenantFromHost("www.onlineu.mx")      // → null  (excluido)

// Desde URL actual (hostname + ?slug= fallback):
const slug = getActiveTenantSlug(searchParams);
```

La página de login usa esta prioridad:
1. `?slug=` en la URL (viene del redirect del .htaccess)
2. `window.location.hostname` via `getTenantFromHost()` (si app sirve directo en subdomain)
3. `null` → login de plataforma principal

---

## Aislamiento multi-tenant (seguridad)

- El JWT contiene `tenant_id` fijo al momento del login
- El backend usa `tenant_id` del JWT para TODAS las queries
- RLS en PostgreSQL como segunda capa de seguridad
- Si un usuario de `kinder1` accede a `kinder2.onlineu.mx`, puede ver el portal de `kinder2`,
  pero cuando hace login con sus credenciales, el backend retorna datos de `kinder1` (su tenant real)
- El backend rechaza el `X-Tenant-ID` header por seguridad — solo confía en JWT

---

## Troubleshooting

| Síntoma | Causa | Solución |
|---------|-------|---------|
| `kinder1.onlineu.mx` no resuelve | DNS wildcard no configurado | Correr `provision-wildcard-domain.js` o paso manual |
| Resuelve pero da 404 | cPanel wildcard subdomain no creado | Paso 2 del setup (manual en hPanel) |
| Resuelve pero no redirige al portal | .htaccess no subido | Verificar deploy.yml o subir manualmente vía FTP |
| Portal muestra "Tu Institución" | Slug no existe en BD | Crear escuela en Super Admin con ese slug |
| Login va al Manager Maestro | Usuario sin `?slug` en URL | Verificar que .htaccess inyecta `?slug=` |
| STUDENT recibe 403 | Usuario no tiene `role='STUDENT'` en BD | Asignar rol desde School Admin |
| STUDENT no ve datos | Falta registro en tabla `students` | Crear perfil en School Admin → Estudiantes |
