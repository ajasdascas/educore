# SKILL: UI Components EduCore
# Lee esto ANTES de crear cualquier componente frontend

## STACK DE UI (en orden de prioridad)

### 1. shadcn/ui — Base de componentes
Instala con: `npx shadcn@latest add [componente]`
- Buttons, Inputs, Dialogs, Tables, Forms, Cards, Badges, Dropdowns
- **NUNCA** modificar directamente en `components/ui/` — extiende via props
- Usa variantes: `variant="destructive"` para acciones peligrosas

### 2. Magic UI — Animaciones y efectos premium
Web: https://magicui.design/
- Copy-paste directo, no instalación npm
- Úsalo en: landing sections, cards con hover effects, notificaciones
- Componentes clave: `AnimatedGradientText`, `ShimmerButton`, `MagicCard`

### 3. Framer Motion — Animaciones declarativas
```bash
npm install framer-motion
```
**Patrones de uso:**
```tsx
// Page transitions
import { motion } from 'framer-motion'

// Fade in al montar
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// Stagger para listas
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 }
  }
}
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }

<motion.ul variants={container} initial="hidden" animate="show">
  {students.map(s => (
    <motion.li key={s.id} variants={item}>
      <StudentCard student={s} />
    </motion.li>
  ))}
</motion.ul>
```

### 4. Tremor — Dashboards y charts
```bash
npm install @tremor/react
```
- `BarChart`, `DonutChart`, `AreaChart` para métricas
- `Card`, `Metric`, `ProgressBar` para KPIs
- Úsalo en: Super Admin Dashboard, reportes de asistencia

---

## SISTEMA DE DISEÑO EDUCORE

### Paleta de colores (variables CSS)
```css
/* globals.css */
:root {
  --brand-primary: #4F46E5;     /* Indigo — color principal */
  --brand-secondary: #10B981;   /* Emerald — éxito, presente */
  --brand-danger: #EF4444;      /* Red — error, ausente */
  --brand-warning: #F59E0B;     /* Amber — tardanza, alerta */
  --brand-neutral: #6B7280;     /* Gray — inactivo */
  
  /* Fondos por rol */
  --bg-super-admin: #0F172A;    /* Dark slate */
  --bg-school: #F8FAFC;         /* Casi blanco */
  --bg-parent: #FFFFFF;         /* Blanco puro — mobile */
}
```

### Tipografía
```css
/* Títulos: Geist (incluida en Next.js 14) */
/* Cuerpo: Inter */
/* Datos/tablas: JetBrains Mono para números */
```

### Componentes con diseño prescrito

#### Attendance Grid (pase de lista)
- Fondo verde (#DCFCE7) → presente
- Fondo rojo (#FEE2E2) → ausente
- Fondo amarillo (#FEF3C7) → tardanza
- Animación al cambiar estado: scale(1.05) → scale(1) en 150ms

#### Report Card (boleta)
- Diseño formal, colores institucionales
- Logo de la escuela arriba a la izquierda
- Tabla de calificaciones con color por rango:
  - ≥ 9.0 → verde
  - 7.0-8.9 → azul
  - 6.0-6.9 → amarillo
  - < 6.0 → rojo

#### Dashboard Padre (mobile-first)
- Bottom navigation bar (no sidebar)
- Cards grandes con foto del hijo
- Donut chart pequeño de asistencia (Tremor)
- Pull-to-refresh pattern

---

## PATRONES DE COMPONENTES

### Loading State
```tsx
// SIEMPRE incluir skeleton mientras carga
function StudentTable() {
  const { data, isLoading } = useStudents()
  
  if (isLoading) return <StudentTableSkeleton />
  return <Table data={data} />
}

function StudentTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}
```

### Error State
```tsx
// SIEMPRE manejar errores visualmente
function StudentsPage() {
  const { data, error } = useStudents()
  
  if (error) return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Error al cargar estudiantes. <Button variant="link" onClick={retry}>Reintentar</Button>
      </AlertDescription>
    </Alert>
  )
  
  return <StudentTable data={data} />
}
```

### Empty State
```tsx
function EmptyStudents() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <UserX className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">Sin estudiantes registrados</h3>
      <p className="text-muted-foreground mt-1">Comienza agregando el primer estudiante</p>
      <Button className="mt-4" asChild>
        <Link href="students/new">Agregar estudiante</Link>
      </Button>
    </div>
  )
}
```

---

## ACCESIBILIDAD OBLIGATORIA

- Todos los `<img>` deben tener `alt`
- Todos los `<button>` deben tener texto o `aria-label`
- Los formularios deben tener `<label>` asociado a cada input
- El contraste de texto debe ser mínimo 4.5:1 (WCAG AA)
- Los modales deben atrapar el foco y cerrarse con Escape
- shadcn/ui ya maneja esto en sus primitives — no romperlo
