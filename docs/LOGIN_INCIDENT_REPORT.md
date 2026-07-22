# EduCore — Reporte de Incidente de Login

**Fecha:** 21-07-2026 (America/Mexico_City)
**Autor:** Auditoría asistida por IA (Claude Code) + Giovanni
**Estado:** ✅ **Backend restaurado** en Render + Neon (Postgres). Login funcional a nivel API. Pendiente: desplegar el frontend corregido a Hostinger (merge del PR).
**Severidad:** 🔴 Crítica (login 100% caído en producción)
**Dominio afectado:** https://onlineu.mx/educore/

---

## 1. Resumen ejecutivo

El frontend estático de EduCore **está desplegado y funcionando** en `https://onlineu.mx/educore/`
(login y raíz responden HTTP 200). El login falla porque **el backend ya no existe** en la
dirección que el frontend tiene escrita a fuego (`educore-production-beef.up.railway.app`).

El edge de Railway responde con su página de fallback (`x-railway-fallback: true`,
`"Application not found"`), lo que significa que **el servicio de Railway fue eliminado, su
dominio se desvinculó, o el proyecto ya no está activo**. No es un backend "caído": está
**ausente**. Por eso ninguna corrección de CORS, base de datos o auth cambia nada todavía:
no hay a quién llamar.

---

## 2. Causa raíz comprobada

**El frontend llama a un backend que ya no está desplegado.**

Cadena exacta del fallo (verificada):

1. `frontend/lib/api.ts` tiene la URL del backend **escrita a fuego** (línea 13):
   `https://educore-production-beef.up.railway.app`. Ignora por completo `NEXT_PUBLIC_API_URL`.
2. El navegador, al iniciar sesión, hace `POST /api/v1/auth/login` (precedido de un preflight
   `OPTIONS` por ser cross-origin) contra esa URL.
3. Railway devuelve **HTTP 404** desde su edge, con la cabecera `x-railway-fallback: true` y
   cuerpo `{"status":"error","code":404,"message":"Application not found"}`. **No incluye
   ninguna cabecera `Access-Control-Allow-Origin`.**
4. Como el preflight no trae cabeceras CORS, el navegador **aborta la petición** →
   `fetch()` lanza `TypeError: Failed to fetch`.
5. `apiRequest()` re-lanza la excepción → el `catch` de `login/page.tsx` (línea 147) muestra
   el mensaje genérico: **"Error conectando con el servidor. Intenta de nuevo."**

### Evidencia (curl real, 21-07-2026)

```
$ curl -i https://educore-production-beef.up.railway.app/api/v1/health
HTTP/1.1 404 Not Found
Server: railway-hikari
x-railway-fallback: true
Content-Type: application/json
{"status":"error","code":404,"message":"Application not found"}
```

```
$ curl -i -X OPTIONS .../api/v1/auth/login -H "Origin: https://onlineu.mx" ...
HTTP/1.1 404 Not Found
x-railway-fallback: true      ← sin Access-Control-Allow-Origin
{"status":"error","code":404,"message":"Application not found"}
```

```
$ curl -s -o /dev/null -w "%{http_code}" https://onlineu.mx/educore/login/
200      ← el frontend SÍ está vivo
```

**Conclusión:** frontend OK, backend inexistente. El login no puede funcionar hasta que el
backend Go/Fiber vuelva a estar corriendo en una URL pública alcanzable.

---

## 3. Estado por componente

| Componente | Estado | Evidencia |
|---|---|---|
| Frontend estático (Hostinger) | ✅ Vivo | `onlineu.mx/educore/login/` → HTTP 200, assets en `/educore/_next/...` |
| `basePath: "/educore"` | ✅ Correcto | HTML de prod referencia `/educore/_next/static/...` |
| Backend Go/Fiber (Railway) | ❌ Ausente | Edge Railway `404 Application not found`, `x-railway-fallback: true` |
| `/api/v1/health` | ❌ No responde | Devuelve el 404 del edge, no el JSON del backend |
| CORS del backend | ⚠️ No evaluable | El backend no está vivo. En código es correcto (incluye `https://onlineu.mx`) |
| Base de datos | ⚠️ No evaluable | Sin backend no se puede probar la conexión |
| Repositorio git local | ❌ Ausente | La carpeta migrada **no tiene `.git`** (no hay historial ni ramas) |

---

## 4. Contradicciones documentación ↔ código

1. **API URL:** `.env.example` documenta `NEXT_PUBLIC_API_URL`, pero `frontend/lib/api.ts`
   lo ignora y usa una URL Railway a fuego. La variable no tiene efecto en el build actual.
2. **Motor de DB:** `CLAUDE.md`/`code-style.md` asumen PostgreSQL + RLS, pero existe
   `backend/migrations_mysql/` (MySQL de Hostinger) y `main.go` bloquea MySQL en producción
   salvo `EDUCORE_ALLOW_MYSQL_RUNTIME=true`. El motor real de producción está **sin confirmar**.
3. **Dominio:** el prompt anterior pedía migrar a `educore.onlineu.mx`; la corrección vigente
   ordena **conservar `onlineu.mx/educore/`**. El código ya está alineado con `/educore`.
4. **Deploys:** hay 3 mecanismos que se pisan (ver §5).

---

## 5. Deploys duplicados / en conflicto

| Mecanismo | Dispara | Ruta remota | Notas de riesgo |
|---|---|---|---|
| `.github/workflows/deploy.yml` | push a `master` (todo) + manual | `/domains/onlineu.mx/public_html/educore/` | FTP **plano**; **no** pasa `NEXT_PUBLIC_API_URL`; sube `.htaccess` a la raíz del dominio |
| `.github/workflows/deploy-frontend-hostinger.yml` | push a `master` (si cambia `frontend/**`) + manual | `/educore/` (raíz FTP = `public_html/`) | FTPS/SFTP; `mirror` **sin `--delete`**; **sí** pasa `NEXT_PUBLIC_API_URL` |
| `sync.js` (manual, `node sync.js`) | manual | `/domains/onlineu.mx/public_html/educore` | Hace `git commit` + `git push` → **puede disparar ambos workflows** (efecto cascada) |

Problemas:
- Dos workflows compilan y despliegan el frontend **en el mismo push**, a **rutas distintas**
  (`/public_html/educore/` vs `/domains/onlineu.mx/public_html/educore/`) y con **flags distintos**
  (uno con `--delete`, otro sin). El resultado final depende de cuál termine último.
- Uno compila **sin** `NEXT_PUBLIC_API_URL` y otro **con** él → builds inconsistentes.
  (Da igual hoy porque el código ignora la variable, pero rompe cuando se corrija.)
- `railway.json` (`dockerfilePath: backend/Dockerfile`) y `railway.toml`
  (`dockerfilePath: Dockerfile`) **se contradicen** en la ruta del Dockerfile del backend.

---

## 6. Riesgos de seguridad detectados (preliminar)

- URL de backend y **usuario FTP a fuego** en `deploy.yml` (fallback `ftp.onlineu.mx` / usuario).
  Deben moverse a GitHub Secrets.
- `deploy-frontend-hostinger.yml` usa `mirror ... --delete` → si la ruta remota estuviera mal,
  **borra archivos**. Nunca ejecutar sin confirmar el directorio exacto.
- `.env.example` trae contraseñas placeholder (`cambiar_en_produccion`) y correos owner-admin.
  Confirmar que ningún `.env` real esté versionado.
- La contraseña visible en la captura de login del usuario debe **rotarse** (fue expuesta).

---

## 7. Variables de entorno del backend (por nombre, sin valores)

| Variable | Usada en | Obligatoria en prod | Riesgo si falta/mal |
|---|---|---|---|
| `APP_ENV` | config.go | Sí | Activa guardas de producción |
| `PORT` | config.go (`app.Listen`) | La provee Railway | Si no escucha el PORT dado → health falla |
| `DB_DRIVER` | main.go | Sí | `mysql` en prod exige el flag de runtime |
| `DATABASE_URL` | config.go (Postgres) | Según motor | Sin ella no conecta Postgres |
| `MYSQL_DSN` | config.go (MySQL) | Según motor | Debe traer `parseTime=true&charset=utf8mb4` |
| `EDUCORE_ALLOW_MYSQL_RUNTIME` | main.go | Sí, si MySQL | Sin `true` → `log.Fatal` al arrancar |
| `JWT_SECRET` | config.go | Sí | Débil/ausente → tokens inseguros |
| `REDIS_URL` | config.go | No | Opcional; degrada sin caché |
| `EDUCORE_OWNER_ADMIN_EMAILS` | ownerseed | Sí (para super admin) | Sin seed no hay super admin |
| `EDUCORE_OWNER_ADMIN_PASSWORD` | ownerseed | Sí (para super admin) | Sin ella no se crea/actualiza el owner |
| `EDUCORE_DEPLOY_WEBHOOK_SECRET` | main.go (internal) | No | Solo historial de deploys |

> El backend puede morir en el arranque (`log.Fatal`) por: fallo de DB, `EnsureStagingSchema`,
> `SeedFromEnv`, MySQL sin flag, o `JWT_SECRET` ausente. Cualquiera de estos deja el servicio
> reiniciándose en bucle → health falla → login falla. **A confirmar con logs de Railway.**

---

## 8. Hipótesis ordenadas por probabilidad

1. **(95%) El servicio de Railway fue eliminado o su dominio se desvinculó.** El edge responde
   "Application not found". → Requiere que Giovanni entre a Railway y confirme el estado.
2. **(remanente) Incluso reactivando Railway, el frontend seguirá roto** porque tiene la URL a
   fuego e ignora `NEXT_PUBLIC_API_URL`. Hay que corregir `frontend/lib/api.ts` y rehornear el build.
3. **(a validar) Si el backend se reactiva pero usa MySQL de Hostinger**, puede morir en arranque
   por el guard `EDUCORE_ALLOW_MYSQL_RUNTIME` o por DSN incorrecto.

---

## 9. Plan de recuperación (resumen)

1. Giovanni confirma en Railway el estado real del servicio backend y decide: **redeploy en
   Railway** (recupera disponibilidad rápido) o **reubicar** (VPS/otro). Objetivo: una URL
   pública viva que responda `GET /api/v1/health` con JSON.
2. Corregir `frontend/lib/api.ts` → leer `NEXT_PUBLIC_API_URL` (obligatoria en prod), sin URL a
   fuego, con timeout (`AbortController`) y mensajes de error diferenciados.
3. Rehornear el build del frontend con la URL correcta y desplegar por **un solo** flujo.
4. Consolidar deploys: un workflow para frontend, otro para backend; archivar el resto.
5. Confirmar motor y esquema de DB antes de tocar datos (backup + dry-run).
6. Pruebas de aceptación (health, CORS, login válido, 401, dashboard, refresh, logout, roles).

## 10. Plan de rollback

- El frontend actual ya sirve; **no se toca producción** hasta tener backend vivo + build probado.
- Cualquier cambio se hace primero local, se verifica, y se despliega por FTP a
  `/educore/` (la raíz de la cuenta FTP ya es `public_html/`) **sin `--delete`**.
- Se conserva inventario del directorio remoto antes de subir.

---

## 11. Archivos que probablemente se modificarán

- `frontend/lib/api.ts` (URL por env + manejo de errores + timeout)
- `frontend/app/login/page.tsx` (mensajes de error diferenciados)
- `.github/workflows/*` (consolidar a un solo flujo de frontend)
- `railway.json` / `railway.toml` (resolver conflicto de Dockerfile)
- `.env.example` / docs (reflejar realidad)

---

## 12. Lo que se necesita de Giovanni (accesos/decisiones)

1. **Railway:** entrar y confirmar si el servicio backend existe. Copiar (sin exponer secretos)
   el estado del último deployment y la URL pública actual, si la hay.
2. **Decidir** dónde vivirá el backend (redeploy Railway vs. reubicar).
3. **git:** decidir si inicializamos git local aquí (`git init`) o si se traerá el repo real con
   historial. Sin git no hay rama `recovery/production-login` ni rollback por commits.
4. **Hostinger/phpMyAdmin:** confirmar motor de DB (MySQL/MariaDB o Postgres) y que exista el
   usuario owner-admin (`gioescudero2007@gmail.com`).
5. **Rotar** la contraseña de administrador que se vio en la captura.

---

## 13. Actualización — reproducción en navegador y fix local

### 13.1 Reproducción desde el navegador real (origen `https://onlineu.mx`)

Ejecutado en la consola del navegador, sin tocar el formulario ni credenciales reales:

```js
fetch("https://educore-production-beef.up.railway.app/api/v1/auth/login", {
  method: "POST", headers: {"Content-Type":"application/json"},
  body: JSON.stringify({email:"diagnostic@test.invalid", password:"x"}),
  credentials: "include",
})
```

Resultado:

```json
{ "origin": "https://onlineu.mx",
  "reached": false,
  "errorName": "TypeError",
  "errorMessage": "Failed to fetch" }
```

Confirma la cadena del fallo: el navegador **no alcanza** el backend (edge de Railway sin
CORS) → `TypeError: Failed to fetch` → mensaje genérico en el login. Es exactamente la ruta
de error `network` del nuevo `apiRequest()`.

### 13.2 Fix de frontend aplicado (local, sin desplegar)

- `frontend/lib/api.ts`: se eliminó la URL de Railway a fuego. Ahora la base del API sale de
  `NEXT_PUBLIC_API_URL` (obligatoria en prod, fallback `http://localhost:8082` solo en dev),
  con normalización de slash final, validación de HTTPS en prod, `AbortController` (timeout
  15 s) y `credentials:"include"`. Se añadió la clase `ApiError` con tipos
  `network | timeout | unavailable | invalid_response | misconfigured` y mensajes amigables.
- `frontend/app/login/page.tsx`: el `catch` ahora usa el mensaje diferenciado de `ApiError`;
  un 401 del backend se muestra como "Correo o contraseña incorrectos." en vez de texto crudo.

### 13.3 Verificación del build (local)

```
npm ci            → OK (241 paquetes)
NEXT_PUBLIC_API_URL="https://api-test.onlineu.mx" npm run build → OK (export en out/)
grep "educore-production-beef" out/  → 0 coincidencias   (URL muerta eliminada)
grep "api-test.onlineu.mx"     out/  → presente           (URL de env horneada)
out/  → 6.2 MB, con index.html, login/, escuela/, super-admin/dashboard/
```

### 13.4 Pendiente para cerrar el incidente (requiere al dueño)

1. **Reactivar el backend** en una URL pública viva (`GET /api/v1/health` → JSON).
2. Guardar esa URL como **GitHub Secret `NEXT_PUBLIC_API_URL`** (p. ej. la URL nueva de Railway
   o, a futuro, `https://api.onlineu.mx`).
3. Rehornear el frontend con esa variable y desplegar por **un solo** flujo a
   `/educore/` por FTP.
4. Pruebas de aceptación (health, preflight CORS, login válido, 401 JSON, dashboard, refresh, logout).

> Nota cross-site: el `refresh_token` usa cookie `SameSite=Lax`. Si el backend queda en otro
> dominio que el frontend, esa cookie **no viaja cross-site**; habrá que pasar a
> `SameSite=None; Secure` (y probarlo) o mover el refresh a `Authorization: Bearer`.
> El login por sí solo funciona sin la cookie (el access_token viene en el JSON). Se aborda
> después de restaurar disponibilidad.

---

## 14. Resolución (21-07-2026)

El servicio de Railway estaba **apagado por trial expirado** (no eliminado), con su Postgres
también offline. En vez de pagar Railway, se **migró el backend a hosting gratuito**:

- **Backend → Render** (Docker, Dockerfile raíz Go 1.26, plan Free):
  `https://educore-api-1va5.onrender.com`. Health `200` JSON, `db_driver=postgres`, `env=production`.
- **DB → Neon** (PostgreSQL, us-east-2, Free, durable). Esquema aplicado una vez con
  `scripts/schema_postgres_consolidated.sql` (generado desde `backend/migrations/*.sql`).
- **Owner admin** sembrado al arrancar vía `EDUCORE_AUTO_SEED_OWNERS=true` +
  `EDUCORE_OWNER_ADMIN_EMAILS/PASSWORD` (≥12). La contraseña expuesta en captura quedó rotada.
- Verificado por curl: health 200, preflight CORS con `access-control-allow-origin: https://onlineu.mx`,
  y `POST /auth/login` con password incorrecta → `401 {"error":"Invalid credentials","success":false}`.
- Frontend: `NEXT_PUBLIC_API_URL=https://educore-api-1va5.onrender.com` (GitHub Secret) +
  warmup del backend al abrir el login (mitiga el cold start del plan Free de Render).

**Pendiente:** merge del PR `recovery/production-login` → master, que dispara el deploy
automático del frontend a `/educore/` vía GitHub Actions (la raíz FTP ya es `public_html/`; equivale a
`/domains/onlineu.mx/public_html/educore/` en File Manager).

> La cookie `refresh_token` es cross-site (frontend `onlineu.mx` ↔ backend `onrender.com`)
> con `SameSite=Lax` → no viaja. El login funciona (access_token en el body); el refresh
> por cookie queda como mejora posterior (pasar a `SameSite=None; Secure` o Bearer).
