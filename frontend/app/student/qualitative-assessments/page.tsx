"use client";

import { useEffect, useState } from "react";
import { Star, BookOpen, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

interface QualitativeAssessment {
  campo_formativo: string;
  period: string;
  descriptor: string;
  nivel: "logrado" | "en_proceso" | "iniciando";
  date: string;
}

const nivelConfig: Record<
  QualitativeAssessment["nivel"],
  { label: string; className: string }
> = {
  logrado: {
    label: "Logrado",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  en_proceso: {
    label: "En proceso",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  iniciando: {
    label: "Iniciando",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
};

export default function QualitativeAssessmentsPage() {
  const [assessments, setAssessments] = useState<QualitativeAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/qualitative-assessments")
      .then((res) => {
        if (res?.success) setAssessments(res.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mis Evaluaciones</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Evaluaciones cualitativas de tu desarrollo — sin números, con descripciones.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4" /> Evaluaciones registradas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : assessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <CheckCircle className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Tus evaluaciones cualitativas aparecerán aquí cuando tu maestra las registre.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {assessments.map((a, i) => {
                const config = nivelConfig[a.nivel] ?? nivelConfig.iniciando;
                return (
                  <div
                    key={i}
                    className="rounded-lg border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                        <p className="font-medium text-sm leading-tight">
                          {a.campo_formativo}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ${config.className}`}
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/80 leading-snug">
                      {a.descriptor}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.period} · {a.date}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
