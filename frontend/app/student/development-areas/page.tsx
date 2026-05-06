"use client";

import { useEffect, useState } from "react";
import { BookOpen, Calculator, Globe, Heart, Palette, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

interface DevelopmentAreaProgress {
  campo_formativo: string;
  nivel_general: string;
  observacion?: string;
}

const staticCampos = [
  {
    nombre: "Lenguaje y Comunicación",
    descripcion: "Expresión oral, comprensión lectora y escritura inicial",
    icon: BookOpen,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    nombre: "Pensamiento Matemático",
    descripcion: "Número, forma, espacio y medida",
    icon: Calculator,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    nombre: "Exploración y Conocimiento del Mundo",
    descripcion: "Ciencias naturales y sociales",
    icon: Globe,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    nombre: "Desarrollo Personal y Social",
    descripcion: "Autoregulación, convivencia, identidad",
    icon: Heart,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    nombre: "Expresión y Apreciación Artística",
    descripcion: "Arte, música, expresión corporal",
    icon: Palette,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    nombre: "Desarrollo Físico y Salud",
    descripcion: "Motricidad fina y gruesa, hábitos",
    icon: Activity,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
];

export default function DevelopmentAreasPage() {
  const [progress, setProgress] = useState<DevelopmentAreaProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/development-areas")
      .then((res) => {
        if (res?.success) setProgress(res.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const progressMap = new Map(
    progress.map((p) => [p.campo_formativo, p])
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Campos Formativos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Áreas de desarrollo en preescolar según el plan de estudios SEP.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staticCampos.map((campo) => {
          const Icon = campo.icon;
          const prog = progressMap.get(campo.nombre);
          return (
            <Card key={campo.nombre} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${campo.bg} shrink-0`}>
                    <Icon className={`w-5 h-5 ${campo.color}`} />
                  </div>
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm leading-tight">
                      {campo.nombre}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {campo.descripcion}
                    </p>
                  </div>
                </div>
              </CardHeader>
              {!loading && prog && (
                <CardContent className="pt-0 pb-4">
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {prog.nivel_general}
                    </Badge>
                    {prog.observacion && (
                      <p className="text-xs text-muted-foreground truncate">
                        {prog.observacion}
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
