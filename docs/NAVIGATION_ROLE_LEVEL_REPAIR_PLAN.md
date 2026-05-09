# Navigation Role × Level Repair — Plan & Execution

**Fecha:** 2026-05-09
**Branch:** `claude/overnight-platform-foundation`
**Status:** En progreso (post-commit `59a3fc3`)

---

## Causa raíz del 404 en producción

El workflow `.github/workflows/deploy-frontend-hostinger.yml` está configurado así:

```yaml
on:
  push:
    branches:
      - master       # ← SOLO master dispara el deploy
  workflow_dispatch: # ← O disparo manual desde GitHub UI
```

**Implicación:** Los commits en `claude/overnight-platform-foundation` (incluyendo `59a3fc3` que añadió los flat aliases `school-admin/{meals,naps,diapers,mood,...}`) **NO se despliegan automáticamente**.

**Por eso `https://onlineu.mx/educore/school-admin/meals` devuelve 404:** el HTML de esa página NUNCA fue subido a Hostinger porque el workflow no se disparó.

---

## Cómo desplegar sin hacer merge a master

Opción A — **Workflow dispatch (recomendado, sin tocar master):**
1. Ir a https://github.com/ajasdascas/educore/actions/workflows/deploy-frontend-hostinger.yml
2. Click "Run workflow"
3. Seleccionar branch: `claude/overnight-platform-foundation`
4. Click "Run workflow"
5. Esperar ~5 minutos
6. Verificar en `https://onlineu.mx/educore/school-admin/meals/` que ya no es 404

Opción B — **Modificar workflow para escuchar a esta branch:** NO RECOMENDADO. Cambia el comportamiento de CI/CD para todos los commits futuros. Mejor mantener master como única fuente de producción.

Opción C — **Pull Request a master:** cuando los cambios estén estables, abrir PR de `claude/overnight-platform-foundation` → `master`. Cuando se mergee, el deploy se dispara solo.

---

## Verificación post-deploy

Después de disparar el workflow (Opción A o C):

```bash
# 1. Verificar URLs flat (creadas en commit 59a3fc3)
curl -I https://onlineu.mx/educore/school-admin/meals/        # → 200
curl -I https://onlineu.mx/educore/school-admin/naps/         # → 200
curl -I https://onlineu.mx/educore/school-admin/diapers/      # → 200
curl -I https://onlineu.mx/educore/school-admin/mood/         # → 200
curl -I https://onlineu.mx/educore/school-admin/child-status/ # → 200

# 2. Verificar nested teacher kinder
curl -I https://onlineu.mx/educore/teacher/kinder/daily-logs/  # → 200
curl -I https://onlineu.mx/educore/teacher/kinder/meals/       # → 200

# 3. Verificar parent kinder
curl -I https://onlineu.mx/educore/parent/kinder/health-checks/         # → 200
curl -I https://onlineu.mx/educore/parent/kinder/pickup-authorizations/ # → 200
```

---

## Cambios adicionales después del commit `59a3fc3`

### Fase 1 — Restructura del menú School Admin Kinder
- `frontend/lib/modules/navigation.ts`: quitar `meals/naps/diapers/mood` de `SCHOOL_ADMIN_NAV` top-level
- `frontend/app/school-admin/daily-logs/page.tsx`: convertir en página tabbed (Resumen / Alimentación / Siestas / Higiene / Mood)

### Fase 2 — Student Kinder desactivado
- `frontend/app/student/layout.tsx`: si tenant no tiene módulos académicos (grading/assignments/qualitative), mostrar pantalla "Portal de Estudiantes desactivado"

### Fase 3 — School Admin: gestión de padres existentes
- `frontend/app/school-admin/students/page.tsx`: añadir modal "Gestionar padres/tutores" con lista, editar, desvincular
- `backend/internal/modules/school_admin/portal_access.go`: añadir handler `UpdateParentLink` (PUT /students/:id/parents/:linkId)

### Fase 4 — Auditorías
- `scripts/check-no-flat-operational-routes-in-admin-menu.js` (nuevo)
- `scripts/check-parent-child-flow-functional.js` (nuevo)

### Fase 5 — Build, test, commit, redeploy

---

## Datos: cómo crear vinculaciones parent-student de prueba

El backend YA tiene los endpoints. Para crear datos de prueba:

1. Login como SUPER_ADMIN, modo soporte → SCHOOL_ADMIN tenant kinder
2. Ir a `/school-admin/students` → "Crear estudiante"
3. Llenar el formulario incluyendo "Papá/Mamá 1" con email
4. Guardar → crea fila en `students` + crea usuario PARENT + crea fila en `parent_student`
5. Logout
6. Login con email del padre + password generada (revisar logs si email no se envió)
7. Ir a `/parent/children` → debería verse el estudiante vinculado

Si el email no se envía (Resend no configurado), el backend devuelve la `activation_url` en el response del POST de crear estudiante. SchoolAdmin puede copiarla y enviársela al padre manualmente.

---

## Referencias

| Tema | Archivo | Línea |
|---|---|---|
| Tabla parent_student PG | `backend/migrations/008_students_parents_history_imports.sql` | 25 |
| Tabla parent_student MySQL | `backend/migrations_mysql/001_hostinger_core.sql` | — |
| Endpoint GET /parent/children | `backend/internal/modules/parent/handler.go` | — |
| Endpoint POST /school-admin/.../parents | `backend/internal/modules/school_admin/portal_access.go` | — |
| UI parent/children | `frontend/app/parent/children/page.tsx` | 1-368 |
| UI school-admin/students | `frontend/app/school-admin/students/page.tsx` | 1-1245 |
| Navigation source of truth | `frontend/lib/modules/navigation.ts` | 1-end |
