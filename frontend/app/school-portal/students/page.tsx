"use client";

// ⚠️  MÓDULO PENDIENTE — funcionalidades de Alumnos aún no definidas.
// Este placeholder mantiene la ruta activa y visible en el portal.

import { Suspense } from "react";
import { UserCheck, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

function StudentsPlaceholderInner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center mb-6">
        <UserCheck className="w-9 h-9 text-orange-400" />
      </div>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-5">
        <Sparkles className="w-3 h-3" />
        En desarrollo
      </div>
      <h1 className="text-2xl font-bold text-white mb-3">Portal de Alumnos</h1>
      <p className="text-slate-400 max-w-md leading-relaxed mb-8">
        Este módulo está actualmente en planificación. Las funcionalidades del portal de alumnos
        serán definidas y desarrolladas en la próxima fase del proyecto.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-sm w-full text-left mb-8">
        {[
          "Perfil del alumno",
          "Calificaciones personales",
          "Horario de clases",
          "Tareas y actividades",
          "Comunicación con profesores",
          "Historial académico",
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400/50 shrink-0" />
            {feature}
          </div>
        ))}
      </div>
      <Link
        href="/school-portal"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
      >
        <ArrowRight className="w-4 h-4 rotate-180" /> Volver al portal
      </Link>
    </div>
  );
}

export default function StudentsPortalPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-slate-500 text-sm">Cargando…</div>}>
      <StudentsPlaceholderInner />
    </Suspense>
  );
}
