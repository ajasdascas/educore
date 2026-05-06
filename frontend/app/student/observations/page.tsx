"use client";

import { useEffect, useState } from "react";
import { MessageSquare, User, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/auth";

interface Observation {
  date: string;
  campo_formativo: string;
  observation_text: string;
  teacher_name: string;
}

export default function ObservationsPage() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/observations")
      .then((res) => {
        if (res?.success) setObservations(res.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Observaciones</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Notas y observaciones de tu maestra sobre tu progreso.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Registro de observaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : observations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No hay observaciones registradas todavía.
              </p>
            </div>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-6 pl-10">
                {observations.map((obs, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[2.375rem] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                    <div className="rounded-lg border bg-card p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium text-sm">{obs.campo_formativo}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {obs.date}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {obs.observation_text}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {obs.teacher_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
