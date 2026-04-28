"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, Save, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StudentTableSkeleton } from "@/components/ui/skeleton"

export function DemoInteractions() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)

  const handleSaveAction = async () => {
    setIsLoading(true)
    setShowSuccess(false)

    // Simular llamada al backend
    setTimeout(() => {
      setIsLoading(false)
      setShowSuccess(true)

      // Toast de éxito
      toast({
        title: "¡Asistencia guardada!",
        description: "Los datos se guardaron correctamente.",
        variant: "success",
      })

      // Resetear el estado del botón después de la animación
      setTimeout(() => {
        setShowSuccess(false)
      }, 2000)
    }, 1500)
  }

  const toggleSkeleton = () => {
    setShowSkeleton(!showSkeleton)
    if (!showSkeleton) {
      // Simular carga de datos
      setTimeout(() => {
        setShowSkeleton(false)
      }, 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Demo de botón con feedback */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-lg">Demo: Feedback de Acción</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Presiona el botón para ver el feedback de acción exitosa con Toast
          </p>
          <Button
            onClick={handleSaveAction}
            disabled={isLoading}
            className={`transition-all duration-300 ${
              showSuccess ? "button-success bg-green-600 hover:bg-green-700" : ""
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : showSuccess ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                ¡Guardado!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Asistencia
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Demo de Skeleton Loader */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="text-lg">Demo: Skeleton Loader</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Presiona el botón para ver el skeleton loader con efecto shimmer
          </p>
          <Button onClick={toggleSkeleton} variant="outline">
            {showSkeleton ? "Ocultar Skeleton" : "Mostrar Skeleton"}
          </Button>

          {showSkeleton ? (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-4">Lista de Alumnos (Cargando...)</h3>
              <StudentTableSkeleton />
            </div>
          ) : (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-4">Lista de Alumnos</h3>
              <div className="grid grid-cols-4 gap-4 p-4 border-b font-medium">
                <span>Alumno</span>
                <span>Grado</span>
                <span>Estado</span>
                <span>Acciones</span>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 p-4 border-b hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm">Alumno {i + 1}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{3 + i}° Grado</span>
                  <span className="text-sm">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Activo
                    </span>
                  </span>
                  <span className="text-sm">
                    <button className="text-primary hover:underline">Ver detalle</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}