"use client";

import { HardDrive, ShieldAlert } from "lucide-react";
import { ModuleGuard } from "@/components/providers/ModuleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SchoolAdminDocumentsPage() {
  return (
    <ModuleGuard moduleKey="documents" moduleName="Documentos">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">Almacenamiento documental escolar.</p>
        </div>

        <Card className="border-amber-300 bg-amber-50/70 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-700" />
              Carga digital no disponible
            </CardTitle>
            <CardDescription>
              Esta instalación todavía no tiene un proveedor externo de almacenamiento seguro configurado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              EduCore no guardará archivos como texto base64 dentro de la base de datos ni aceptará enlaces enviados por el navegador.
              Crear, reemplazar, verificar o publicar documentos permanece bloqueado para evitar pérdida o exposición de expedientes.
            </p>
            <p className="flex items-center gap-2 font-medium">
              <HardDrive className="h-4 w-4" />
              Para habilitar este módulo se requiere almacenamiento de objetos privado, URLs firmadas, antivirus y política de retención.
            </p>
          </CardContent>
        </Card>
      </div>
    </ModuleGuard>
  );
}
