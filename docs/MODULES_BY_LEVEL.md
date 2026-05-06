# EduCore — Módulos por Nivel Educativo
**Actualizado:** 05-05-2026

---

## Introducción

EduCore activa automáticamente un conjunto de módulos según el nivel educativo de la escuela. Los módulos controlan qué secciones aparecen en el sidebar del School Admin y qué endpoints están disponibles.

El nivel se define al crear la escuela y se guarda en `school_settings.education_level`.

---

## Módulos Core (todos los niveles)

Siempre activos independientemente del nivel:

| Módulo | Descripción |
|--------|-------------|
| `academic_core` | Núcleo académico base |
| `users` | Gestión de usuarios y perfiles |
| `students` | Registro de alumnos |
| `teachers` | Registro de profesores |
| `groups` | Gestión de grupos/salones |
| `attendance` | Registro de asistencias |
| `communications` | Mensajes y avisos a padres |
| `documents` | Gestión de documentos |
| `schedule` | Horarios |
| `finance` | Pagos y colegiaturas |

---

## Nivel: Bebés / Guardería (`babies`)

Para centros de desarrollo infantil y guarderías (0–3 años).

### Módulos activados (además de core)

| Módulo (`key`) | Sidebar label | Descripción |
|---|---|---|
| `daily_logs` | Registro diario | Actividades, humor y notas del día |
| `meals` | Comidas | Registro de alimentación y biberones |
| `naps` | Siestas | Registro de siestas y tiempos de descanso |
| `diapers` | Pañales | Control de cambios de pañal |
| `mood` | Humor | Estado emocional del bebé durante el día |
| `health_checks` | Salud | Temperatura, síntomas, revisiones médicas |
| `incidents` | Incidentes | Caídas, accidentes, eventos especiales |
| `pickup_authorizations` | Autorizaciones de recogida | Personas autorizadas a recoger al bebé |
| `milestones` | Hitos de desarrollo | Primeros pasos, primeras palabras, etc. |
| `photos_evidence` | Fotos y evidencias | Registro fotográfico del desarrollo |

### Lo que NO aplica en este nivel
- Calificaciones numéricas
- Boletas de calificaciones
- Materias académicas
- Tareas / Exámenes

---

## Nivel: Preescolar (`preescolar`) y Kinder (`kinder`)

Para educación preescolar (3–6 años). Ambos niveles comparten los mismos módulos.

### Módulos activados (además de core)

| Módulo (`key`) | Sidebar label | Descripción |
|---|---|---|
| `qualitative_assessments` | Evaluaciones cualitativas | Evaluación por competencias sin número |
| `development_areas` | Áreas de desarrollo | Cognitivo, motor, socioemocional, lenguaje |
| `observations` | Observaciones | Notas del maestro sobre el alumno |
| `activities` | Actividades | Registro de actividades del salón |
| `behavior_notes` | Notas de conducta | Registro de conducta y adaptación |
| `preschool_report_cards` | Boletas preescolar | Boletas descriptivas sin calificación numérica |

### Diferencias con primaria
- Las evaluaciones son **cualitativas** (Logrado / En proceso / No logrado), no numéricas
- Las boletas describen el desarrollo, no ponen números
- No hay materias formales ni exámenes escritos

---

## Nivel: Primaria (`primaria`)

Para educación primaria (6–12 años).

### Módulos activados (además de core)

| Módulo (`key`) | Sidebar label | Descripción |
|---|---|---|
| `grades` | Calificaciones | Registro de calificaciones por periodo |
| `grading` | Sistema de evaluación | Configuración de escalas y criterios |
| `report_cards` | Boletas | Boletas numéricas por periodo/año |
| `subjects` | Materias | Catálogo de materias del ciclo |
| `assignments` | Tareas | Asignación y entrega de tareas |
| `exams` | Exámenes | Programación y captura de exámenes |

---

## Cómo el sidebar filtra los módulos

El sidebar de School Admin usa el hook `useEnabledModules()` que obtiene los módulos activos del tenant:

```typescript
// frontend/app/school-admin/layout.tsx
const { isModuleEnabled } = useEnabledModules();

const filteredNavItems = navItems.filter(
  (item) => !item.moduleKey || isModuleEnabled(item.moduleKey)
);
```

Si un módulo no está activo en `tenant_modules`, la entrada del sidebar no aparece. No hay manera de navegar a esa sección por UI.

---

## Dónde está definida la lista completa

### Backend (fuente de verdad al provisionar)
```
backend/internal/modules/super_admin/handler.go
→ modulesByEducationLevel (map[string][]string)
```

### Frontend (sync manual con backend)
```
frontend/lib/modules/registry.ts
→ MODULES_BY_LEVEL (Record<EducationLevel, ModuleKey[]>)
```

### Sidebar entries
```
frontend/app/school-admin/layout.tsx
→ navItems (array con moduleKey por entrada)
```

Los tres deben estar sincronizados. Si se agrega un módulo nuevo al backend, hay que:
1. Añadirlo a `modulesByEducationLevel` en `handler.go`
2. Añadirlo a `MODULES_BY_LEVEL` en `registry.ts`
3. Añadir la entrada correspondiente en `navItems` en `layout.tsx`

---

## Verificar que todo esté sincronizado

```bash
node scripts/check-school-modules-by-level.js
```

El script valida los tres archivos mencionados arriba y reporta qué falta en cada uno.

---

## Agregar un módulo nuevo

1. **Decide el nivel** — ¿aplica a todos o solo algunos?

2. **Backend:** Agrega el key a `modulesByEducationLevel` en `handler.go`:
   ```go
   "primaria": []string{
       // ... módulos existentes ...
       "mi_modulo_nuevo",
   },
   ```

3. **Frontend registry:** Agrega a `MODULES_BY_LEVEL` en `registry.ts`:
   ```typescript
   primaria: [
     // ... módulos existentes ...
     "mi_modulo_nuevo",
   ],
   ```
   Y al tipo `ModuleKey`:
   ```typescript
   export type ModuleKey =
     | "attendance"
     // ...
     | "mi_modulo_nuevo";
   ```

4. **Sidebar:** Agrega entrada en `navItems` en `layout.tsx`:
   ```tsx
   {
     href: "/school-admin/mi-modulo",
     label: "Mi Módulo",
     icon: MiIcono,
     moduleKey: "mi_modulo_nuevo" as ModuleKey,
   },
   ```

5. **Migración:** Si el módulo necesita tablas propias, crea una nueva migración en `backend/migrations_mysql/`.

6. **Escuelas existentes:** Para activar el módulo en escuelas ya creadas, haz un UPDATE en `tenant_modules` o crea una migración de backfill.
