"use client";

import { useEffect, useState } from "react";
import { Image, Camera, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/auth";

interface Evidence {
  date: string;
  campo_formativo: string;
  description: string;
  image_url?: string;
}

export default function EvidencePage() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/evidence")
      .then((res) => {
        if (res?.success) setEvidence(res.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Evidencias</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fotos y trabajos que documentan tu aprendizaje.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4" /> Mis trabajos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : evidence.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <FolderOpen className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Las evidencias de tu trabajo aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {evidence.map((ev, i) => (
                <div
                  key={i}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  {ev.image_url ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted">
                      <img
                        src={ev.image_url}
                        alt={ev.description}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full flex items-center justify-center bg-muted">
                      <Image className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {ev.campo_formativo}
                    </p>
                    <p className="text-sm leading-snug">{ev.description}</p>
                    <p className="text-xs text-muted-foreground">{ev.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
