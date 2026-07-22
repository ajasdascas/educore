# Deploy And Rollback Checklist

Fecha: 06-05-2026  
Arquitectura actual: frontend Next.js static export en Hostinger por FTP; backend Go en Railway; base de datos MySQL en Hostinger.

## Antes De Push

| Check | Como revisar | Aceptacion |
|---|---|---|
| Rama correcta | `git branch --show-current` | No hacer push directo a `master` salvo deploy intencional |
| Diff esperado | `git status --short` y `git diff --name-only` | No hay archivos accidentales ni secretos |
| Archivos sensibles | Buscar `MYSQL_DSN`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, passwords reales | Solo placeholders o nombres de variables |
| Frontend | Si se toco frontend: `cd frontend && npm run build` | Build OK y `out/` generado |
| Backend | Si se toco backend: `cd backend && go test ./...` | Tests OK |
| Migraciones | Confirmar si hay SQL nuevo y si es MySQL, Postgres o ambos | Existe plan manual para Hostinger si aplica |
| Scripts QA | Si se tocaron portales/provisioning: correr scripts relacionados | Checks PASS o fallo documentado |

## GitHub Actions

Revisar workflow `Deploy EduCore to Production`:

| Paso | Que revisar | Fallo tipico |
|---|---|---|
| Checkout | Baja repo correcto y branch esperado | Branch equivocado |
| Setup Node | Node 20 y cache npm | Dependencias rotas |
| Install dependencies | `npm ci` dentro de `frontend` | Lockfile inconsistente |
| Build for production | `npm run build` | Error TypeScript/Next |
| Verify FTP access | Login FTP y `cd` a destino | Password/host/ruta incorrecta |
| Deploy to FTP server | `lftp mirror --reverse frontend/out/` | Timeout o archivos faltantes |
| Deploy htaccess | Sube `frontend/htaccess-subdomain-root` a raiz | Subdominios no redirigen |
| Verify uploaded files | Lista destino | Falta `_next`, rutas o index |
| Test website | `curl -I https://onlineu.mx/educore/` | 404/500/cache |

## Railway

| Check | Como validar | Aceptacion |
|---|---|---|
| Health | Abrir `/api/v1/health` del backend productivo | `env=production`, `db_driver=mysql`, `db_mysql_ready=true` |
| Logs | Revisar logs recientes tras deploy | Sin panic, sin 500 repetitivos, sin secretos |
| Variables | Railway dashboard | `MYSQL_DSN`, `JWT_SECRET`, flags Stripe y owner admins como secrets |
| DB driver | Health o logs de arranque | No cambia accidentalmente a driver incorrecto |
| CORS/API URL | Frontend llama al backend esperado | Login y requests autenticados funcionan |

## Migraciones Manuales En Hostinger

Aplicar manualmente en phpMyAdmin solo cuando el cambio lo requiera y con backup previo.

Orden de referencia actual:

1. `backend/migrations_mysql/001_hostinger_core.sql`
2. `backend/migrations_mysql/002_subscription_plans_bridge.sql`
3. `backend/migrations_mysql/003_hostinger_add_missing.sql`
4. `backend/migrations_mysql/004_hostinger_students_missing_cols.sql`
5. `backend/migrations_mysql/005_hostinger_missing_tables_and_cols.sql`
6. `backend/migrations_mysql/006_student_portal_user_id.sql`
7. `backend/migrations_mysql/007_school_reports.sql`
8. `backend/migrations_mysql/008_school_communications.sql`
9. Nuevas migraciones posteriores, solo si Claude las confirma.

Reglas:

- No correr `000_reset_hostinger_core.sql` en produccion salvo rollback/desastre autorizado.
- Antes de importar, exportar backup de la base.
- Verificar tablas/columnas con phpMyAdmin despues de aplicar.
- Si falla una migracion, guardar error exacto y no seguir con la siguiente.

## Como Saber Si El Frontend Quedo Sin CSS

Sintomas:

- Pagina se ve como HTML plano.
- Botones sin estilos.
- Consola muestra 404 para `/_next/static/...`.
- Network muestra chunks JS/CSS antiguos no encontrados.
- `https://onlineu.mx/educore/_next/static/` no sirve assets esperados.

Checks rapidos:

1. Abrir DevTools Network y filtrar por `css` y `_next/static`.
2. Confirmar que rutas empiezan con `/educore/_next/`.
3. Abrir hard refresh con cache desactivado.
4. Probar en incognito.
5. Revisar en Hostinger File Manager que exista `public_html/educore/_next/static/`.

## Como Forzar Re-Sync FTP Si Falta `_next/static`

Opcion recomendada:

1. Ir a GitHub Actions.
2. Abrir `Deploy EduCore to Production`.
3. Ejecutar `Run workflow` en `master` o re-run del job fallido.
4. Confirmar que `Deploy to FTP server` y `Verify uploaded files` quedan verdes.

Opcion manual controlada:

1. Localmente correr build: `cd frontend && npm run build`.
2. Conectar FTP a Hostinger.
3. Subir contenido de `frontend/out/` directamente a `/public_html/educore/` por FTP (equivale a `/domains/onlineu.mx/public_html/educore/` en File Manager).
4. Confirmar que no queda `/educore/out/index.html`; debe ser `/educore/index.html`.
5. Confirmar `_next/static` completo.

## Rollback Manual En Hostinger

Usar si produccion queda rota y no se puede reparar con re-sync.

1. Entrar a Hostinger File Manager.
2. Ir a `/domains/onlineu.mx/public_html/`.
3. Renombrar `educore` a `educore_failed_YYYYMMDD_HHMM`.
4. Renombrar backup anterior estable a `educore`.
5. Confirmar que dentro de `educore` existen `index.html`, `_next/`, `login/`, `super-admin/`, `school-admin/`.
6. Limpiar cache de Hostinger/Cloudflare si aplica.
7. Abrir `https://onlineu.mx/educore/` en incognito.
8. Documentar commit fallido y hora del rollback.

Si tambien hubo migracion de DB:

- No hacer rollback SQL destructivo sin backup y autorizacion.
- Si la migracion fue aditiva, preferir hotfix de codigo.
- Si rompio datos, restaurar backup MySQL en una copia primero y comparar antes de tocar produccion.

## Validar Produccion Despues De Deploy

| Area | Validacion | Aceptacion |
|---|---|---|
| Landing | `https://onlineu.mx/educore/` | 200, CSS y JS cargan |
| Login | `/educore/login/` | Formulario renderiza |
| Super Admin | `/educore/super-admin/dashboard/` tras login | Dashboard carga |
| School Admin | `/educore/school-admin/dashboard/` con usuario QA o soporte | Datos de escuela correcta |
| Teacher | `/educore/teacher/dashboard/` | Grupos/asistencia/calificaciones |
| Parent | `/educore/parent/dashboard/` | Hijos vinculados |
| Student | `/educore/student/dashboard/` | Alumno vinculado |
| API | `/api/v1/health` | MySQL ready |
| RBAC | Role mismatch con script o manual | 403 y sin token |
| Assets | DevTools sin 404 de `_next/static` | No pagina sin CSS |

## Criterio Para Cerrar Deploy

El deploy se considera sano cuando:

- GitHub Actions esta en verde.
- Hostinger sirve frontend con CSS.
- Railway health responde con MySQL listo.
- SUPER_ADMIN puede entrar.
- Un tenant QA puede operar School Admin.
- Teacher, Parent y Student pasan login si existen usuarios QA.
- Role mismatch bloquea correctamente.
- No hay 500 repetitivos en Railway durante el smoke.
