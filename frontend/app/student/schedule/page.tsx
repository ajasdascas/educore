"use client";

import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentSchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mi Horario</h2>
        <p className="text-sm text-muted-foreground mt-1">Horario semanal de clases</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Horario semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            El horario de clases estará disponible próximamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
