# SKILL: Animations — EduCore Motion System
# Fuente: Investigación 2025/2026 de producción real
# Usado por: Framer Motion (principal), AutoAnimate, Lottie, CSS nativo

---

## 🎯 FILOSOFÍA DE ANIMACIONES EN EDUCORE

Las animaciones comunican estado, no decoran.
- ✅ Feedback de acción (botón presionado, dato guardado)
- ✅ Orientación espacial (tab cambiada, modal abierta)
- ✅ Transiciones de datos (tabla recargada, nuevo item)
- ❌ Animaciones decorativas sin propósito funcional
- ❌ Más de 300ms en interacciones frecuentes

---

## 📦 LIBRERÍAS Y CUÁNDO USAR CADA UNA

| Librería | Uso correcto | Instalar |
|----------|-------------|---------|
| **Framer Motion** | Página transitions, modales, listas, gestures | `npm i framer-motion` |
| **AutoAnimate** | Listas que cambian (agregar/quitar/reordenar) | `npm i @formkit/auto-animate` |
| **Lottie React** | Iconos animados, estados vacíos, loaders de marca | `npm i lottie-react` |
| **CSS Transitions** | Hover states, colores, opacidad simple | nativo |

**NO instalar:** GSAP (overkill para este proyecto), React Spring (duplica Framer Motion).

---

## 🏗️ SISTEMA DE DURACIONES (Design Tokens)

```css
/* globals.css — SIEMPRE usar estas variables */
:root {
  --duration-instant:  100ms;  /* Hover color, focus ring */
  --duration-fast:     150ms;  /* Botón press, badge aparecer */
  --duration-normal:   250ms;  /* Modal open, dropdown */
  --duration-slow:     350ms;  /* Page transition, sidebar */
  --duration-crawl:    500ms;  /* Solo para onboarding/empty states */
  
  --ease-smooth:  cubic-bezier(0.4, 0, 0.2, 1);   /* Material standard */
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); /* Ligero overshoot */
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);      /* Entradas */
  --ease-in:      cubic-bezier(0.4, 0, 1, 1);      /* Salidas */
}
```

---

## ⚛️ FRAMER MOTION — PATRONES PARA EDUCORE

### 1. Page Transition (entre secciones del dashboard)
```tsx
// components/layout/page-transition.tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
```

### 2. Staggered List (tabla de alumnos, lista de grupos)
```tsx
// PATRÓN: Stagger de 50ms entre items — sweet spot visual
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } }
}

// Uso:
<motion.ul variants={listVariants} initial="hidden" animate="visible">
  {students.map(student => (
    <motion.li key={student.id} variants={itemVariants}>
      <StudentRow student={student} />
    </motion.li>
  ))}
</motion.ul>
```

### 3. Modal / Dialog (alta de alumno, confirmaciones)
```tsx
const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
}
const modalVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1,    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 350 }
  },
  exit:    { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } }
}

// Nota: shadcn/ui Dialog ya tiene AnimatePresence integrado
// Solo necesitas personalizar si usas un dialog custom
```

### 4. Attendance Status Button (el más usado en el sistema)
```tsx
// CRÍTICO: Feedback visual inmediato al tomar asistencia
function AttendanceButton({ status, onSelect }: AttendanceButtonProps) {
  const colors = {
    present: 'bg-emerald-100 border-emerald-500 text-emerald-700',
    absent:  'bg-red-100    border-red-500    text-red-700',
    late:    'bg-amber-100  border-amber-500  text-amber-700',
    excused: 'bg-blue-100   border-blue-500   text-blue-700',
  }

  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn('px-3 py-1.5 rounded-lg border-2 font-medium text-sm', colors[status])}
      onClick={() => onSelect(status)}
    >
      {status === 'present' ? '✓' : status === 'absent' ? '✗' : status === 'late' ? '⏰' : '📋'}
    </motion.button>
  )
}
```

### 5. Success / Error Feedback (guardar asistencia bulk)
```tsx
// Aparece 1 segundo y desaparece
function SaveFeedback({ type }: { type: 'success' | 'error' }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          'fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2',
          type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}
      >
        {type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        {type === 'success' ? 'Asistencia guardada' : 'Error al guardar'}
      </motion.div>
    </AnimatePresence>
  )
}
```

### 6. Number Counter (métricas en dashboard)
```tsx
// Para animar números como "128 alumnos → 134 alumnos"
import { useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect } from 'react'

function AnimatedCounter({ value }: { value: number }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, Math.round)

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.8, ease: 'easeOut' })
    return controls.stop
  }, [value])

  return <motion.span>{rounded}</motion.span>
}
```

---

## 🔄 AUTOMATE — Para listas que cambian dinámicamente

```tsx
// PERFECTO para: lista de notificaciones, filtros en tabla, tags
import { useAutoAnimate } from '@formkit/auto-animate/react'

function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [listRef] = useAutoAnimate()

  return (
    <ul ref={listRef} className="space-y-2">
      {notifications.map(n => (
        <li key={n.id}>
          <NotificationCard notification={n} />
        </li>
      ))}
    </ul>
  )
}
// AutoAnimate anima automáticamente add/remove/reorder sin config extra
```

---

## 🎬 LOTTIE — Animaciones de marca (estados especiales)

```tsx
import Lottie from 'lottie-react'
// Descarga animaciones gratuitas de: https://lottiefiles.com/
// Buscar: "empty state", "success checkmark", "loading spinner", "school"

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-16">
      <Lottie
        animationData={emptyBoxAnimation}  // JSON descargado de LottieFiles
        className="w-40 h-40"
        loop={false}  // reproducir una vez al montar
      />
      <p className="text-muted-foreground mt-4">{message}</p>
    </div>
  )
}

// ANIMACIONES RECOMENDADAS PARA EDUCORE:
// - Empty students list: "empty classroom"
// - Success save: "checkmark success" (verde, ~1.5s, loop:false)
// - Loading attendance: "pencil writing"
// - Error state: "sad face" o "warning triangle"
// - Grade published: "confetti celebration"
```

---

## ♿ RESPETO AL USUARIO — prefers-reduced-motion

```tsx
// OBLIGATORIO: Respetar usuarios con sensibilidad al movimiento
import { useReducedMotion } from 'framer-motion'

function AnimatedCard({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.25 }}
    >
      {children}
    </motion.div>
  )
}

// En CSS también:
// @media (prefers-reduced-motion: reduce) {
//   * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
// }
```

---

## 📋 CHECKLIST ANTES DE AÑADIR UNA ANIMACIÓN

- [ ] ¿Comunica algo (estado, transición, feedback)?
- [ ] ¿Duración ≤ 300ms para interacciones frecuentes?
- [ ] ¿Tiene alternativa para prefers-reduced-motion?
- [ ] ¿No bloquea interacción (pointer-events durante la animación)?
- [ ] ¿Se ve bien en móvil (60fps en Snapdragon 660+)?