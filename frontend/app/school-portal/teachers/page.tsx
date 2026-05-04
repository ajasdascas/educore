"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, ClipboardList, BarChart3, MessageSquare,
  Calendar, CheckCircle2, Clock, Users, ArrowRight, GraduationCap,
} from "lucide-react";
import { authFetch } from "@/lib/auth";
import { API_URL } from "@/lib/api";

interface Group { id: string; name: string; level: string; student_count: number }

const MODULES = [
  { label: "Mis Grupos",       icon: BookOpen,      href: "/teacher/classes",    color: "text-blue-400",   bg: "bg-blue-500/10",   desc: "Ve tus grupos y alumnos asignados" },
  { label: "Asistencias",      icon: ClipboardList, href: "/teacher/attendance", color: "text-green-400",  bg: "bg-green-500/10",  desc: "Registra y consulta la asistencia diaria" },
  { label: "Calificaciones",   icon: BarChart3,     href: "/teacher/grades",     color: "text-purple-400", bg: "bg-purple-500/10", desc: "Captura y revisa evaluaciones" },
  { label: "Mensajes",         icon: MessageSquare, href: "/teacher/messages",   color: "text-cyan-400",   bg: "bg-cyan-500/10",   desc: "Comunicación con padres y dirección" },
  { label: "Horario",          icon: Calendar,      href: "/teacher/classes",    color: "text-amber-400",  bg: "bg-amber-500/10",  desc: "Consulta tu horario semanal" },
  { label: "Notificaciones",   icon: CheckCircle2,  href: "/teacher/notifications",color:"text-rose-400",  bg: "bg-rose-500/10",   desc: "Avisos y alertas del sistema" },
];

function TeacherPortalInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    authFetch(`${API_URL}/api/v1/school/groups?per_page=5`)
      .then((d) => setGroups(d?.data?.groups || []))
      .catch(() => {});
  }, [slug]);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-600/20 to-indigo-600/10 border border-purple-500/20">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center shrink-0">
          <GraduationCap className="w-7 h-7 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Portal de Profesores</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gestión docente — asistencias, calificaciones y comunicación</p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Módulos disponibles</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.label}
                href={m.href}
                className="flex flex-col gap-3 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">{m.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{m.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* My groups preview */}
      {groups.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Mis Grupos</h2>
            <Link href="/teacher/classes" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{g.name}</p>
                    <p className="text-xs text-slate-500">{g.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5" />
                  <span>{g.student_count} alumnos</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherPortalPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-slate-500 text-sm">Cargando portal…</div>}>
      <TeacherPortalInner />
    </Suspense>
  );
}
