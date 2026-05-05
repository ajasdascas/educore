"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, LogIn, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

// Convierte "kinder-uno" → "Kinder Uno"
function formatSlug(s: string) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

interface PortalDef {
  role: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
}

const PORTALS: PortalDef[] = [
  {
    role: "school_admin",
    label: "Director / Coordinador",
    desc: "Gestión académica completa: alumnos, profesores, grupos, horarios y reportes.",
    icon: "🏫",
    color: "hover:border-blue-500/40",
  },
  {
    role: "teacher",
    label: "Profesor",
    desc: "Registro de asistencias, captura de calificaciones y comunicación con padres.",
    icon: "👨‍🏫",
    color: "hover:border-purple-500/40",
  },
  {
    role: "parent",
    label: "Padre de familia",
    desc: "Seguimiento escolar de tus hijos: calificaciones, asistencia, pagos y mensajes.",
    icon: "👨‍👩‍👧",
    color: "hover:border-emerald-500/40",
  },
];

const ROLE_LABELS: Record<string, string> = {
  school_admin: "Director / Coordinador",
  teacher: "Profesor",
  parent: "Padre de familia",
};

function EscuelaInner() {
  const params = useSearchParams();
  const [slug, setSlug] = useState(params.get("slug") || "");
  const role = params.get("role") || "";
  const [schoolName, setSchoolName] = useState("");
  const [loadingName, setLoadingName] = useState(false);

  // Detect school slug from subdomain (kinder1.onlineu.mx)
  useEffect(() => {
    if (!slug && typeof window !== "undefined") {
      const host = window.location.hostname;
      const parts = host.split(".");
      if (parts.length >= 3 && parts[parts.length - 2] === "onlineu" && parts[parts.length - 1] === "mx") {
        setSlug(parts[0]);
      }
    }
  }, [slug]);

  // Try to fetch the school's real name
  useEffect(() => {
    if (!slug) return;
    setLoadingName(true);
    fetch(`${API_URL}/api/v1/public/school-info?slug=${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data?.name) setSchoolName(d.data.name);
      })
      .catch(() => {})
      .finally(() => setLoadingName(false));
  }, [slug]);

  const displayName = schoolName || (slug ? formatSlug(slug) : "Tu Institución");

  // If a specific role is requested, show a direct login card
  if (role && ROLE_LABELS[role]) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-slate-500 text-xs font-mono mb-1">{slug}.onlineu.mx</p>
            <h1 className="text-2xl font-bold text-white">
              {loadingName ? <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" /> : displayName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">Portal — {ROLE_LABELS[role]}</p>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-2xl">
            <p className="text-slate-400 text-sm text-center mb-5">
              Accede con tu correo y contraseña institucional
            </p>
            <Link
              href={`/login?slug=${slug}&role=${role}`}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-blue-500 hover:to-indigo-500"
            >
              <LogIn className="w-4 h-4" />
              Iniciar sesión
            </Link>
            <div className="mt-4 text-center">
              <Link
                href={`/escuela/?slug=${slug}`}
                className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                ← Ver todos los portales
              </Link>
            </div>
          </div>
          <p className="text-center text-xs text-slate-700 mt-6">
            Powered by{" "}
            <a href="https://onlineu.mx/educore/" className="hover:text-slate-500 transition-colors">
              EduCore
            </a>
          </p>
        </div>
      </main>
    );
  }

  // Show all portals (landing page)
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          {slug && <p className="text-slate-600 text-xs font-mono mb-1">{slug}.onlineu.mx</p>}
          <h1 className="text-3xl font-bold text-white">
            {loadingName ? <span className="text-slate-400">Cargando...</span> : displayName}
          </h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de gestión escolar · EduCore</p>
        </div>

        {/* Portal selector */}
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 pl-1">
          ¿Con qué perfil deseas ingresar?
        </p>
        <div className="space-y-3">
          {PORTALS.map((portal) => (
            <Link
              key={portal.role}
              href={`/login?slug=${slug}&role=${portal.role}`}
              className={`flex items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 ${portal.color} hover:bg-slate-800/60 transition-all group`}
            >
              <span className="text-2xl shrink-0">{portal.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm group-hover:text-blue-200 transition-colors">
                  {portal.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{portal.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors shrink-0" />
            </Link>
          ))}
        </div>

        {/* Admin link */}
        <div className="mt-6 text-center">
          <a
            href="https://onlineu.mx/educore/"
            className="text-xs text-slate-700 hover:text-slate-500 transition-colors"
          >
            Powered by EduCore · onlineu.mx
          </a>
        </div>
      </div>
    </main>
  );
}

export default function EscuelaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
        </div>
      }
    >
      <EscuelaInner />
    </Suspense>
  );
}
