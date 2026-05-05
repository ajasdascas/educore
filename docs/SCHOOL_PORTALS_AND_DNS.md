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

## Resumen de estado actual de DNS

| Componente | Estado |
|------------|--------|
| Wildcard `*.onlineu.mx` | Depende de tu configuración DNS — verifica con `nslookup test.onlineu.mx` |
| Rutas internas `/escuela/?slug=...` | ✅ Siempre funciona |
| Botón "Portal interno" en Super Admin | ✅ Usa ruta interna |
| Links de "Subdominio externo" | Requiere DNS wildcard activo |
