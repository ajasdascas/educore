// ============================================================
// ARCHIVO: ThemeToggle.tsx
// MÓDULO: UI Components
// QUÉ HACE: Botón para alternar entre 3 modos: Azul (normal),
//           Claro (light) y Oscuro (dark) con iconos animados.
// ============================================================
"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

const themes = [
  { key: "blue", label: "Normal", icon: Monitor, color: "text-blue-400" },
  { key: "light", label: "Claro", icon: Sun, color: "text-amber-400" },
  { key: "dark", label: "Oscuro", icon: Moon, color: "text-indigo-400" },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => { setMounted(true) }, [])

  if (!mounted) {
    return <div className="h-9 w-[140px] rounded-lg bg-secondary animate-pulse" />
  }

  const currentIndex = themes.findIndex(t => t.key === theme)
  const current = themes[currentIndex >= 0 ? currentIndex : 0]

  const cycleTheme = () => {
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex].key)
  }

  return (
    <button
      onClick={cycleTheme}
      className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent text-card-foreground transition-all duration-200 text-sm font-medium"
      aria-label={`Tema actual: ${current.label}. Click para cambiar.`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, rotate: 180, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex items-center gap-2"
        >
          <current.icon className={`h-4 w-4 ${current.color}`} />
          <span>{current.label}</span>
        </motion.div>
      </AnimatePresence>
    </button>
  )
}
