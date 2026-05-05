"use client";

import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/providers/AuthProvider";

export default function StudentSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configuración</h2>
        <p className="text-sm text-muted-foreground mt-1">Ajustes de tu cuenta</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" /> Mi cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Correo</p>
            <p className="text-sm font-medium">{user?.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Rol</p>
            <p className="text-sm font-medium">Estudiante</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
