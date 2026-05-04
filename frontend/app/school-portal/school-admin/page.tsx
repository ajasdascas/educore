"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Users, GraduationCap, UserCheck, BarChart3, MessageSquare,
  Calendar, FileText, Settings, TrendingUp, AlertCircle, CheckCircle2,
  ArrowRight, BookOpen, Clock,
} from "lucide-react";
import { authFetch } from "@/lib/auth";
import { API_URL } from "@/lib/api";

interface Stats {
  total_teachers: number;
  total_students: number;
  total_parents: number;
  total_groups: number;
}

const QUICK_ACTIONS = [
  { label: "Gestionar Profesores",   icon: GraduationCap, href: "/school-admin/teachers",     color: "text-purple-400", bg: "bg-purple-500/10" },
  { label: "Gestionar Alumnos",      icon: UserCheck,     href: "/school-admin/students",      color: "text-blue-400",   bg: "bg-blue-500/10" },
  { label: "Ver Grupos",             icon: BookOpen,      href: "/school-admin/groups",         color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { label: "Comunicaciones",         icon: MessageSquare, href: "/school-admin/communications", color: "text-cyan-400",   bg: "bg-cyan-500/10" },
  { label: "Horarios",               icon: Calendar,      href: "/school-admin/schedule",       color: "text-green-400",  bg: "bg-green-500/10" },
  { label: "Reportes",               icon: BarChart3,     href: "/school-admin/reports",        color: "text-amber-400",  bg: "bg-amber-500/10" },
  { label: "Boletas",                icon: FileText,      href: "/school-admin/report-cards",   color: "text-rose-400",   bg: "bg-rose-500/10" },
  { label: "Configuración",          icon: Settings,      href: "/school-admin/settings",       color: "text-slate-400",  bg: "bg-slate-500/10" },
];

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function SchoolAdminPortalInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${API_URL}/api/v1/school/stats`)
      .then((d) => setStats(d?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const passSlug = (href: string) => (slug ? `${href}` : href);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión institucional completa</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Profesores"  value={loading ? 0 : (stats?.total_teachers ?? 0)} icon={GraduationCap} color="bg-purple-500/15 text-purple-400" />
        <StatCard label="Alumnos"     value={loading ? 0 : (stats?.total_students ?? 0)} icon={UserCheck}     color="bg-blue-500/15   text-blue-400" />
        <StatCard label="Padres"      value={loading ? 0 : (stats?.total_parents  ?? 0)} icon={Users}         color="bg-green-500/15  text-green-400" />
        <StatCard label="Grupos"      value={loading ? 0 : (stats?.total_groups   ?? 0)} icon={BookOpen}      color="bg-indigo-500/15 text-indigo-400" />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Acceso rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.label}
                href={passSlug(a.href)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all text-center group"
              >
                <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${a.color}`} />
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors leading-tight">
                  {a.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-white text-sm">Rendimiento Académico</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Asistencia promedio", value: "92%", color: "bg-green-500" },
              { label: "Calificación promedio", value: "8.4", color: "bg-blue-500" },
              { label: "Alumnos en riesgo", value: "3%", color: "bg-amber-500" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{item.label}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href={passSlug("/school-admin/reports")}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Ver reportes completos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-white text-sm">Alertas y Pendientes</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Documentos por verificar", count: 4, status: "warn" },
              { label: "Solicitudes de comunicado", count: 2, status: "info" },
              { label: "Pagos vencidos",            count: 7, status: "error" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.status === "warn"  && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                  {item.status === "info"  && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                  {item.status === "error" && <div className="w-2 h-2 rounded-full bg-red-400" />}
                  <span className="text-sm text-slate-400">{item.label}</span>
                </div>
                <span className="text-xs font-bold text-white bg-slate-700 px-2 py-0.5 rounded-full">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Sistema operando con normalidad
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchoolAdminPortalPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-slate-500 text-sm">Cargando panel…</div>}>
      <SchoolAdminPortalInner />
    </Suspense>
  );
}
