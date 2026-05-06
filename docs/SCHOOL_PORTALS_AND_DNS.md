# EduCore — Portales Escolares y DNS
**Actualizado:** 05-05-2026

---

## El problema DNS_PROBE_FINISHED_NXDOMAIN

Cuando EduCore crea una escuela con slug `kinder1`, guarda en la base de datos:
```
tenants.slug = "kinder1"
```

Eso es solo un **dato en la DB**. No crea automáticamente ningún subdominio en DNS.

Al intentar abrir `https://kinder1.onlineu.mx` el browser pregunta a DNS "¿existe kinder1.onlineu.mx?". Si no existe el A record (ni wildcard ni individual), el browser responde `DNS_PROBE_FINISHED_NXDOMAIN`.

**Solución inmediata sin DNS:** Usar las rutas internas del portal.

---

## Acceso sin DNS — rutas internas

Todas estas rutas funcionan desde `https://onlineu.mx/educore` sin necesitar subdominio:

| Portal | URL interna |
|--------|-------------|
| Hub de portales | `/escuela/?slug=kinder1` |
| Login Director | `/login?slug=kinder1&role=school_admin` |
| Login Profesor | `/login?slug=kinder1&role=teacher` |
| Login Padre | `/login?slug=kinder1&role=parent` |
| Login Alumno | `/login?slug=kinder1&role=student` |

El parámetro `?slug=` le dice al frontend qué escuela es sin depender del hostname.

---

## Crear el wildcard DNS (una sola vez)

Una vez configurado `*.onlineu.mx`, TODAS las escuelas funcionan automáticamente.

### Opción A: Cloudflare (recomendado)

1. Dashboard Cloudflare → selecciona zona `onlineu.mx`
2. DNS → Add record:
   ```
   Type:    A
   Name:    *
   Content: {IP del servidor Railway o Hostinger}
   Proxy:   OFF (DNS only, naranja apagada)
   TTL:     Auto
   ```
3. Esperar propagación DNS (5-30 minutos)

Verificar: `nslookup kinder1.onlineu.mx` debe resolver la IP del servidor.

### Opción B: Hostinger

1. hPanel → Hosting → Manage → DNS Zone
2. Add record:
   ```
   Type:    A
   Name:    *
   Points to: {IP del servidor}
   TTL:     3600
   ```

### Opción C: Script automático

```bash
# Con Cloudflare:
CLOUDFLARE_API_TOKEN=tu_token CLOUDFLARE_ZONE_ID=tu_zone node scripts/provision-wildcard-domain.js

# Modo dry-run (solo muestra qué haría):
DRY_RUN=true node scripts/provision-wildcard-domain.js
```

---

## Crear subdominio individual (sin wildcard)

Si solo quieres que `kinder1.onlineu.mx` funcione:

**Cloudflare:**
```
Type: A  |  Name: kinder1  |  Content: IP_servidor  |  Proxy: OFF
```

**Hostinger cPanel:**
1. hPanel → Hosting → Manage → Subdominios
2. Subdominio: `kinder1`, Dominio: `onlineu.mx`, Directorio: `public_html/educore`

---

## Cómo funciona el routing de subdominios

El frontend detecta la escuela en este orden de prioridad:

1. `?slug=` en query string → usado en rutas internas
2. Subdominio del hostname → `kinder1.onlineu.mx` extrae `kinder1`
3. Ninguno → contexto global (login de Super Admin)

Código relevante: `frontend/lib/tenant.ts` → `getActiveTenantSlug()`

---

## Crear usuarios por rol

### Teacher

En **School Admin → Profesores → Crear**:
- Completa el formulario con email real
- El sistema crea el usuario con `role=TEACHER`
- El profesor puede entrar en `/login?slug=TU_SLUG&role=teacher`

### Parent

En **School Admin → Estudiantes → [alumno] → Agregar padre**:
- Ingresa email y datos del padre
- El sistema crea el usuario con `role=PARENT`
- El padre puede entrar en `/login?slug=TU_SLUG&role=parent`

### Student

Requiere pasos adicionales (la migración `006_student_portal_user_id.sql` debe estar aplicada):

1. Aplicar en Hostinger MySQL:
   ```sql
   -- backend/migrations_mysql/006_student_portal_user_id.sql
   ```
2. En School Admin → Estudiantes → [alumno] → Crear cuenta de portal
3. El alumno puede entrar en `/login?slug=TU_SLUG&role=student`

---

## Probar que los portales funcionan

```bash
# Verificar que las rutas internas responden
node scripts/check-school-portals.js

# Verificar comunicaciones (módulo reparado en 008)
SCHOOL_ADMIN_EMAIL=admin@escuela.com SCHOOL_ADMIN_PASSWORD=pass \
  node scripts/check-communications-module.js
```

---

## Super Admin → Escuelas → Detalles → Pestaña Portales

La pestaña "Portales" tiene tres secciones:

1. **Portales por Rol — Acceso Interno**: botones que usan rutas `/escuela/?slug=...` — funcionan siempre sin DNS
2. **Subdominio externo**: links a `https://{slug}.onlineu.mx` — solo funcionan con DNS configurado; incluye advertencia visible
3. **Modo Soporte**: acceso directo con JWT de SUPER_ADMIN a los módulos de la escuela

El botón "Portal interno" en el header de Detalles siempre usa la ruta interna.

---

## Por qué kinder1.onlineu.mx puede quedar en blanco (Hostinger shared hosting)

### El problema raíz

El build de Next.js usa `basePath: "/educore"`. Eso significa que la app **solo puede servirse desde `https://onlineu.mx/educore/`**, nunca desde la raíz de un subdominio.

Cuando alguien visita `https://kinder1.onlineu.mx`:

1. El DNS resuelve correctamente (wildcard `*.onlineu.mx` existe).
2. Hostinger recibe la petición HTTP para `kinder1.onlineu.mx/`.
3. Intenta servir el archivo `index.html` del hosting compartido desde `public_html/`.
4. Ese `index.html` no existe o es el index vacío del hosting, **no la app de Next.js**.
5. El browser muestra pantalla en blanco o el error del hosting.

El archivo JS/CSS de la app está alojado en `public_html/educore/` pero el subdominio apunta al `public_html/` raíz. Hostinger shared hosting no permite configurar per-subdomain document root distinto del raíz (a diferencia de un VPS con nginx).

### Por qué el portal interno es la ruta estable

| Característica | Portal interno (`/escuela/?slug=`) | Subdominio (`kinder1.onlineu.mx`) |
|---|---|---|
| Funciona en Hostinger shared | ✅ Siempre | ❌ Pantalla en blanco |
| Requiere DNS wildcard | No | Sí |
| Funciona offline/local | ✅ | No |
| basePath `/educore` compatible | ✅ Native | ❌ Conflicto |
| URL enviable a directores/padres | ✅ Legible | ❌ Rompe en Hostinger |

### Cuándo el subdominio funcionará correctamente

Cuando EduCore se migre a un **VPS propio** (DigitalOcean, Linode, Railway Pro) donde nginx pueda configurarse así:

```nginx
server {
  server_name *.onlineu.mx;
  root /var/www/educore/public_html/educore;   # ← mismo directorio que el build
  # ...
}
```

Hasta entonces, **el subdominio es "experimental"** — útil para testing, no para producción ni para enviar a usuarios.

### Cómo identificar la escuela para los usuarios

Envía siempre la URL interna. Ejemplo para el director de Kinder 1:

```
https://onlineu.mx/educore/escuela/?slug=kinder1
```

Desde ahí pueden elegir su rol y hacer login. Esa URL:
- No requiere DNS especial
- Funciona desde cualquier browser/dispositivo
- Muestra el nombre real de la escuela (via API `/public/schools/resolve`)

---

## Resumen de estado actual de DNS

| Componente | Estado |
|------------|--------|
| Wildcard `*.onlineu.mx` DNS | Depende de tu configuración — verifica con `nslookup test.onlineu.mx` |
| Rutas internas `/escuela/?slug=...` | ✅ Siempre funciona (es la ruta principal) |
| Botón "Portal interno" en Super Admin | ✅ Usa ruta interna Next.js |
| Links de "Subdominio experimental" | ⚠️ Pantalla en blanco en Hostinger shared — solo para testing |

---

## Validación de rol en el login del portal (desde 05-05-2026)

**El portal escolar NO es impersonation.** Seleccionar un rol en `/escuela/` no cambia el rol real del usuario — solo declara con qué perfil intenta ingresar. El backend valida que el rol del usuario coincida.

### Cómo funciona

1. El usuario elige su rol en `/escuela/?slug=kinder1` → va a `/login?slug=kinder1&role=teacher`
2. El frontend envía al backend: `{ email, password, tenant_slug: "kinder1", requested_role: "teacher" }`
3. El backend autentica las credenciales y verifica que `user.role == "TEACHER"`
4. Si no coincide → devuelve `403` con `code: "ROLE_MISMATCH"` y mensaje claro
5. El frontend muestra el error y **NO guarda el token ni redirige**

### Errores por rol incorrecto

| Situación | Error mostrado |
|-----------|---------------|
| admin intenta entrar como profesor | "Este correo no pertenece a un profesor de esta escuela." |
| admin/profesor intenta entrar como padre | "Este correo no pertenece a un padre/tutor de esta escuela." |
| admin/profesor intenta entrar como alumno | "Este correo no pertenece a un estudiante de esta escuela." |
| SUPER_ADMIN usa portal escolar | "SUPER_ADMIN debe usar el Manager Maestro o Modo Soporte." |

### SUPER_ADMIN

SUPER_ADMIN no puede usar los portales de escuela directamente. Debe:
- Usar el **Manager Maestro** (`/super-admin/dashboard`) para administración global
- Usar el **Modo Soporte** desde Super Admin → Escuelas → Detalles para operar como school admin

### Probar role mismatch

```bash
# Admin intentando entrar como profesor (debe fallar)
SCHOOL_ADMIN_EMAIL=admin@kinder1.com SCHOOL_ADMIN_PASSWORD=pass \
  SCHOOL_SLUG=kinder1 node scripts/check-role-portal-login.js

# Con todas las credenciales
SCHOOL_ADMIN_EMAIL=admin@kinder1.com SCHOOL_ADMIN_PASSWORD=pass \
  TEACHER_EMAIL=prof@kinder1.com TEACHER_PASSWORD=pass \
  PARENT_EMAIL=padre@gmail.com PARENT_PASSWORD=pass \
  SCHOOL_SLUG=kinder1 node scripts/check-role-portal-login.js
```
