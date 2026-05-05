"use client";

import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notificaciones</h2>
        <p className="text-sm text-muted-foreground mt-1">Avisos de tu institución</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" /> Sin notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No tienes notificaciones nuevas.</p>
        </CardContent>
      </Card>
    </div>
  );
}
