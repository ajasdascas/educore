"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, GraduationCap, Users, UserCheck, ArrowRight } from "lucide-react";

const PORTALS = [
  {
    key: "school-admin",
    label: "Administración Escolar",
    desc: "Panel del director. Gestiona profesores, alumnos, grupos, horarios, reportes y configuración institucional.",
    icon: LayoutDashboard,
    color: "blue",
    href: "/school-portal/school-admin",
    available: true,
  },
  {
    key: "teachers",
    label: "Portal de Profesores",
    desc: "Acceso docente. Registro de asistencias, captura de calificaciones y comunicación con padres.",
    icon: GraduationCap,
    color: "purple",
    href: "/school-portal/teachers",
    available: true,
  },
  {
    key: "parents",
    label: "Portal de Padres",
    desc: "Seguimiento de hijos. Calificaciones, asistencia, pagos, comunicados y consentimientos.",
    icon: Users,
    color: "green",
    href: "/school-portal/parents",
    available: true,
  },
  {
    key: "students",
    label: "Portal de Alumnos",
    desc: "Acceso estudiantil. Módulo en desarrollo — próximamente disponible.",
    icon: UserCheck,
    color: "orange",
    href: "/school-portal/students",
    available: false,
  },
];

const COLORS: Record<string, { bg: string; icon: string; border: string; btn: string }> = {
  blue:   { bg: "bg-blue-500/10",   icon: "text-blue-400",   border: "border-blue-500/20",   btn: "bg-blue-600 hover:bg-blue-500" },
  purple: { bg: "bg-purple-500/10", icon: "text-purple-400", border: "border-purple-500/20", btn: "bg-purple-600 hover:bg-purple-500" },
  green:  { bg: "bg-emerald-500/10",icon: "text-emerald-400",border: "border-emerald-500/20",btn: "bg-emerald-600 hover:bg-emerald-500" },
  orange: { bg: "bg-orange-500/10", icon: "text-orange-400", border: "border-orange-500/20", btn: "bg-slate-700 cursor-not-allowed" },
};

function PortalHubInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";

  const link = (href: string) => (slug ? `${href}?slug=${slug}` : href);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Módulos del Portal</h1>
        <p className="text-slate-400 text-sm">
          Selecciona un módulo para acceder al portal correspondiente de esta institución.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {PORTALS.map((p) => {
          const c = COLORS[p.color];
          const Icon = p.icon;
          return (
            <div
              key={p.key}
              className={`flex flex-col gap-5 p-6 rounded-2xl border ${c.border} bg-slate-900/60 ${
                p.available ? "hover:bg-slate-800/60 transition-colors" : "opacity-60"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${c.icon}`} />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-white mb-1.5">{p.label}</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
              {p.available ? (
                <Link
                  href={link(p.href)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${c.btn} self-start shadow-md`}
                >
                  Abrir portal <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 bg-slate-800 self-start">
                  Próximamente
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SchoolPortalPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-slate-500 text-sm">Cargando portales…</div>}>
      <PortalHubInner />
    </Suspense>
  );
}
