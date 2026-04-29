"use client"

import { useToast } from "@/components/ui/use-toast"
import { X } from "lucide-react"

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const visibleToasts = toasts.filter((toast) => toast.open !== false)

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {visibleToasts.map(({ id, title, description, variant, open, onOpenChange, ...props }) => (
        <div
          key={id}
          className={`
            group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all mb-2
            ${variant === "destructive"
              ? "border-red-500 bg-red-500 text-white"
              : "border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            }
          `}
          {...props}
        >
          <div className="grid gap-1 flex-1">
            {title && (
              <div className="text-sm font-semibold">{title}</div>
            )}
            {description && (
              <div className="text-sm opacity-90">{description}</div>
            )}
          </div>
          <button
            onClick={() => dismiss(id)}
            className="absolute right-2 top-2 opacity-70 hover:opacity-100"
            aria-label="Cerrar notificacion"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
