"use client";

import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ParentDocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground">Documentos compartidos por la escuela.</p>
      </div>
      <Card className="border-amber-300 bg-amber-50/70 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-700" />
            Descargas temporalmente no disponibles
          </CardTitle>
          <CardDescription>
            La escuela aún no tiene configurado el almacenamiento privado requerido para publicar expedientes de forma segura.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No se muestran enlaces ni archivos embebidos hasta contar con URLs firmadas y control de acceso por alumno.
        </CardContent>
      </Card>
    </div>
  );
}
