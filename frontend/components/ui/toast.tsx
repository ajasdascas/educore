"use client"

import * as React from "react"
import { Cross2Icon } from "@radix-ui/react-icons"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Tipos de toast
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        success: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
        warning: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

// Hook para manejar toasts
interface Toast {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "destructive" | "warning"
  action?: React.ReactNode
}

interface ToastState {
  toasts: Toast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

type Action =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "UPDATE_TOAST"; id: string; toast: Partial<Toast> }
  | { type: "DISMISS_TOAST"; id: string }
  | { type: "REMOVE_TOAST"; id: string }

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

const toastState: ToastState = {
  toasts: [],
}

const listeners: Array<(state: ToastState) => void> = []

let memoryState: ToastState = { ...toastState }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function reducer(state: ToastState, action: Action): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, 5),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { id } = action

      if (id) {
        addToRemoveQueue(id)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === id || id === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.id === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }
  }
}

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      id: toastId,
    })
  }, 1000)

  toastTimeouts.set(toastId, timeout)
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast: (props: Omit<Toast, "id">) => {
      const id = genId()

      const update = (props: Omit<Toast, "id">) =>
        dispatch({
          type: "UPDATE_TOAST",
          id,
          toast: { ...props },
        })
      const dismiss = () => dispatch({ type: "DISMISS_TOAST", id })

      dispatch({
        type: "ADD_TOAST",
        toast: {
          ...props,
          id,
          open: true,
          onOpenChange: (open: boolean) => {
            if (!open) dismiss()
          },
        },
      })

      return {
        id: id,
        dismiss,
        update,
      }
    },
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", id: toastId }),
  }
}

// Componente Toast
const ToastProvider = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastProvider.displayName = "ToastProvider"

const Toast = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = "Toast"

const ToastAction = React.forwardRef<
  React.ElementRef<"button">,
  React.ComponentPropsWithoutRef<"button">
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = "ToastAction"

const ToastClose = React.forwardRef<
  React.ElementRef<"button">,
  React.ComponentPropsWithoutRef<"button">
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <Cross2Icon className="h-4 w-4" />
  </button>
))
ToastClose.displayName = "ToastClose"

const ToastTitle = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
))
ToastTitle.displayName = "ToastTitle"

const ToastDescription = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = "ToastDescription"

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

// Funciones de utilidad para diferentes tipos de toast
const showSuccess = (title: string, description?: string) => {
  return useToast().toast({
    title,
    description,
    variant: "success",
  })
}

const showError = (title: string, description?: string) => {
  return useToast().toast({
    title,
    description,
    variant: "destructive",
  })
}

const showWarning = (title: string, description?: string) => {
  return useToast().toast({
    title,
    description,
    variant: "warning",
  })
}

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  Toast,
  ToastAction,
  ToastClose,
  ToastTitle,
  ToastDescription,
  useToast,
  showSuccess,
  showError,
  showWarning,
}