# EduCore — Auditoría de Handoff de Codex

**Fecha:** 22-07-2026
**Autor:** Claude Code (continuación tras Codex)
**Propósito:** Clasificar los cambios locales que dejó Codex en la rama
`codex/production-readiness-audit` **sin perderlos**, y recomendar cómo integrarlos.

> Nada de esto está desplegado. Producción (Render `master` = `6d139fc`) NO incluye estos
> cambios. El working tree local está sucio pero **respaldado** (ver §Respaldo).

---

## Respaldo (hecho antes de tocar nada)

Fuera del repositorio, en `C:\Users\jagus\OneDrive\Desktop\`:

- `codex-production-readiness-audit-backup.patch` (938 KB) — `git diff --binary HEAD` (cambios trackeados).
- `codex-production-readiness-untracked.txt` — lista de 58 untracked.
- `codex-untracked-files-backup.tar.gz` (71 KB) — **contenido** de los 58 untracked.

Restaurar (si hiciera falta): `git apply codex-...-backup.patch` + descomprimir el tar en la raíz.

---

## Estado del working tree

| Métrica | Valor |
|---|---|
| Rama | `codex/production-readiness-audit` (tip = `6d139fc` = `origin/master`) |
| Archivos modificados | 134 (133 con cambios reales; **1** solo whitespace/CRLF) |
| Archivos borrados | 1 (`backend/migrations/001_up.sql`, duplicado — consistente con la recuperación) |
| Archivos nuevos (untracked) | 58 |
| Líneas | ~6 340 insertadas / ~6 679 eliminadas (contenido real, **no** es CRLF) |
| ¿Compila el backend? | ✅ `go build ./...` → exit 0 (con los untracked incluidos) |
| ¿Está en `origin/master`? | ❌ Todo es **local únicamente** (el tip de la rama ya es master; los cambios están sin commitear) |

---

## Qué construyó Codex (por área)

Trabajo coherente de "production readiness". Áreas:

1. **RBAC y gestión global de usuarios**
   `internal/pkg/rbac/roles.go`, `internal/middleware/account_rbac.go`,
   `super_admin/global_users.go`, frontend `super-admin/users/*` (RolePermissionsModal, ResetPasswordModal, types).
2. **Política de contraseñas + recuperación + rate-limit**
   `internal/pkg/passwordpolicy/`, `auth/recovery.go`, `auth/rate_limit.go`,
   frontend `change-password/page.tsx`, `lib/password-policy.ts`, `super-admin/users/password-policy.ts`.
3. **Module readiness gate (producción)**
   `internal/middleware/module_readiness.go`, `super_admin` gate, migración `020`,
   `scripts/check-production-module-readiness.js`.
4. **Provisión de subdominios de escuela (API de Hostinger)**
   `internal/pkg/schooldomain/hostinger.go`, cambios en `provision-school-domain`.
5. **Pagos manuales + snapshots de boletas** — migraciones `023` (pg) / `015` (mysql).
6. **Identidad de portal de estudiante** — migración `022`, contratos Postgres de student/teacher.
7. **Migraciones nuevas** — Postgres `020`–`024`, MySQL `012`–`016`.
8. **Pruebas** — ~30 archivos `*_test.go` / `*.test.ts` / `*.test.js` (cobertura amplia nueva).
9. **CI** — `.github/workflows/quality-gates.yml`, `migrate-backend-production.yml`.
10. **Docs** — `docs/PRODUCTION_READINESS_AUDIT_2026-07-21.md`.

---

## Secret scan (ubicación/tipo, sin valores)

| Hallazgo | Ubicación | Riesgo |
|---|---|---|
| `.env` reales versionados | **ninguno** | ✅ ok |
| Credenciales de producción (Neon/Render) en código | **ninguna** | ✅ ok |
| `admin123` (contraseña **comprometida y ya rotada**) | `docs/obsidian/_claude/memory.md` | 🟡 limpiar (no es secreto vivo, pero no debe quedar en docs) |
| Connection strings tipo `postgres://…@localhost` | `config.go`, `DEPLOY.md`, `docs/SCHOOL_PROVISIONING.md`, un script | ✅ placeholders de **dev** (localhost/`educore_dev_password`), no secretos |

> `admin123` ya no funciona: fue reemplazada por la contraseña ≥12 del SUPER_ADMIN y el
> seed fue retirado. Aun así se recomienda borrar la cadena `admin123` de `memory.md`.

---

## Clasificación

- **Ya fusionado en master:** nada (todo es local).
- **Cambio válido pendiente:** prácticamente todo (compila, con tests). Es un feature-set real.
- **Generado/temporal:** ninguno detectado (no hay `out/`, `.next/`, ni binarios; están gitignored).
- **Solo whitespace/CRLF:** 1 archivo (despreciable).
- **Peligroso:** ninguno (no borra datos, no toca producción, no trae secretos reales).

---

## Recomendación de integración

El conjunto es grande (≈190 archivos) pero **coherente** (compila). Dos caminos:

### Opción 1 — Preservar primero, revisar después (recomendada como red de seguridad)
Commitear el working tree completo a la rama `codex/production-readiness-audit` en **pocos
commits agrupados por área** (no uno gigante) y **push** → abrir un **PR en borrador** hacia
`master` **sin fusionar**. Beneficio: el trabajo queda en GitHub (más seguro que un patch) y
es revisable con CI. Luego se puede dividir/depurar en la revisión.

### Opción 2 — Dividir por tema desde el principio
Crear ramas temáticas desde `origin/master`, cada una con su alcance + tests:
- `audit/security-rbac-users` (RBAC + gestión global de usuarios)
- `audit/password-policy-recovery` (política + recuperación + rate-limit + change-password)
- `audit/module-readiness-gate`
- `audit/school-domain-provisioning`
- `audit/payments-reportcards`
- `audit/student-portal-identity`
- `docs/production-readiness`

Más limpio para revisar, pero **mayor esfuerzo** y cada rama debe compilar/pasar tests por
separado (las migraciones y paquetes tienen dependencias entre sí).

**En ambos casos:** cada PR pasa pruebas, sin secretos, y **NO se fusiona a master ni se
despliega sin autorización explícita**. `npm audit fix --force` **no** se ejecuta.

---

## Riesgos al integrar (a validar en el PR)

- Migraciones `020`–`024` deben aplicarse a Neon **en orden** y probarse (dry-run) antes de
  cualquier deploy del backend. El workflow `migrate-backend-production.yml` de Codex debe revisarse.
- El backend de producción (Render) se redepliega al mergear a `master`: cambios en middleware
  (module_readiness, account_rbac) podrían **bloquear rutas** si no están bien configurados → probar login/roles.
- `schooldomain/hostinger.go` usa la API de Hostinger (token) — requiere secret y no debe
  ejecutarse sin control (evitar crear cientos de subdominios).

---

## Estado de la tarea de administrador (contexto)

Resuelta antes de esta auditoría: SUPER_ADMIN `gioescudero2007@gmail.com` verificado
(login/dashboard/logout OK), seed retirado de Render, backend sano. Ver
`docs/LOGIN_INCIDENT_REPORT.md`.
