"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User, BarChart3, ClipboardList, CreditCard, MessageSquare,
  FileText, CheckSquare, Bell, Star, ArrowRight, Users, Heart,
} from "lucide-react";
import { authFetch } from "@/lib/auth";
import { API_URL } from "@/lib/api";

interface Child { id: string; first_name: string; last_name: string; grade?: string; group?: string }

const MODULES = [
  { label: "Mis Hijos",          icon: User,          href: "/parent/children",      color: "text-blue-400",   bg: "bg-blue-500/10",   desc: "Perfil y datos de tus hijos" },
  { label: "Calificaciones",     icon: BarChart3,     href: "/parent/grades",        color: "text-purple-400", bg: "bg-purple-500/10", desc: "Historial de evaluaciones y promedios" },
  { label: "Asistencias",        icon: ClipboardList, href: "/parent/attendance",    color: "text-green-400",  bg: "bg-green-500/10",  desc: "Registro de asistencia diaria" },
  { label: "Pagos",              icon: CreditCard,    href: "/parent/payments",      color: "text-emerald-400",bg: "bg-emerald-500/10",desc: "Estado de cuenta y adeudos" },
  { label: "Mensajes",           icon: MessageSquare, href: "/parent/messages",      color: "text-cyan-400",   bg: "bg-cyan-500/10",   desc: "Comunicación con profesores y dirección" },
  { label: "Documentos",         icon: FileText,      href: "/parent/documents",     color: "text-amber-400",  bg: "bg-amber-500/10",  desc: "Expediente digital de tu hijo" },
  { label: "Consentimientos",    icon: CheckSquare,   href: "/parent/consents",      color: "text-rose-400",   bg: "bg-rose-500/10",   desc: "Autorizaciones y permisos pendientes" },
  { label: "Notificaciones",     icon: Bell,          href: "/parent/notifications", color: "text-slate-400",  bg: "bg-slate-500/10",  desc: "Avisos importantes de la escuela" },
];

function ParentsPortalInner() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("slug") || "";
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    authFetch(`${API_URL}/api/v1/parent/children`)
      .then((d) => setChildren(d?.data?.children || []))
      .catch(() => {});
  }, [slug]);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-600/20 to-teal-600/10 border border-emerald-500/20">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Heart className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Portal de Padres</h1>
          <p className="text-slate-400 text-sm mt-0.5">Seguimiento escolar de tus hijos — calificaciones, asistencia y comunicación</p>
        </div>
      </div>

      {/* My children */}
      {children.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Mis Hijos</h2>
            <Link href="/parent/children" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Ver detalles <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {children.slice(0, 4).map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white text-sm truncate">{child.first_name} {child.last_name}</p>
                  <p className="text-xs text-slate-500">{child.grade ?? "Sin grado"} {child.group ? `· Grupo ${child.group}` : ""}</p>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-2.5 h-2.5 ${i < 4 ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modules */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Acceso rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.label}
                href={m.href}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all text-center group"
              >
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors leading-tight">
                  {m.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Asistencia promedio", value: "94%",  sub: "Este mes",          color: "text-green-400",  bg: "bg-green-500/10" },
          { label: "Calificación gral.",  value: "8.7",  sub: "Promedio general",  color: "text-blue-400",   bg: "bg-blue-500/10" },
          { label: "Adeudo pendiente",    value: "$0",   sub: "Al corriente",      color: "text-emerald-400",bg: "bg-emerald-500/10" },
        ].map((item) => (
          <div key={item.label} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className={`text-2xl font-bold ${item.color} mb-0.5`}>{item.value}</div>
            <div className="text-sm font-medium text-white">{item.label}</div>
            <div className="text-xs text-slate-500">{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ParentsPortalPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-slate-500 text-sm">Cargando portal…</div>}>
      <ParentsPortalInner />
    </Suspense>
  );
}
