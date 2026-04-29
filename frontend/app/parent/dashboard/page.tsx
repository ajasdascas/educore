"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, Bell, BookOpen, Calendar, CheckCircle2, GraduationCap, MessageCircle, Trophy } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChildSummary = {
  id: string;
  first_name: string;
  last_name: string;
  group_name: string;
  grade_name: string;
  attendance_rate: number;
  current_gpa: number;
  recent_grade?: string;
  next_class?: string;
};

export default function ParentDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await authFetch("/api/v1/parent/dashboard");
        if (response.success) setDashboard(response.data);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const children: ChildSummary[] = dashboard?.children || [];
  const stats = dashboard?.quick_stats || {};
  const activity = dashboard?.recent_activity || [];
  const events = dashboard?.upcoming_events || [];
  const notifications = dashboard?.recent_notifications || [];

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Cargando portal...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portal de Padres</h1>
          <p className="text-muted-foreground">Seguimiento academico, asistencia y comunicacion escolar.</p>
        </div>
        <Link href="/parent/messages" className={cn(buttonVariants(), "w-fit")}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Enviar mensaje
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Hijos vinculados" value={stats.total_children ?? children.length} icon={<GraduationCap className="h-4 w-4 text-blue-600" />} />
        <Metric title="Asistencia global" value={`${stats.overall_attendance ?? 0}%`} icon={<Calendar className="h-4 w-4 text-green-600" />} />
        <Metric title="Promedio global" value={stats.overall_gpa ?? 0} icon={<BookOpen className="h-4 w-4 text-purple-600" />} />
        <Metric title="Pendientes" value={stats.pending_assignments ?? 0} icon={<AlertCircle className="h-4 w-4 text-amber-600" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {children.map((child) => (
          <Card key={child.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <GraduationCap className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="truncate">{child.first_name} {child.last_name}</span>
                </span>
                <Badge variant="outline">{child.grade_name} {child.group_name}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-md border p-3">
                  <p className="text-2xl font-bold text-green-600">{child.current_gpa || 0}</p>
                  <p className="text-xs text-muted-foreground">Promedio</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-2xl font-bold text-blue-600">{child.attendance_rate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Asistencia</p>
                </div>
              </div>
              <div className="grid gap-1 text-sm text-muted-foreground">
                <span>Ultima calificacion: {child.recent_grade || "Sin registros recientes"}</span>
                <span>Siguiente clase: {child.next_class || "No disponible"}</span>
              </div>
              <Link href={`/parent/children?child=${encodeURIComponent(child.id)}`} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>Ver detalle</Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.length === 0 && <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>}
            {activity.map((item: any) => (
              <Link key={item.id} href={item.action_url || "/parent/dashboard"} className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/50">
                <BookOpen className="mt-0.5 h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.child_name && <Badge variant="secondary">{item.child_name}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Proximos eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 && <p className="text-sm text-muted-foreground">No hay eventos proximos.</p>}
            {events.map((event: any) => (
              <div key={event.id} className="rounded-md border p-3">
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.date} {event.time}</p>
                {event.child_name && <p className="text-xs text-muted-foreground">{event.child_name}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones rapidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <QuickAction href="/parent/grades" icon={<BookOpen className="h-6 w-6 text-green-600" />} label="Ver calificaciones" />
            <QuickAction href="/parent/attendance" icon={<Calendar className="h-6 w-6 text-blue-600" />} label="Ver asistencia" />
            <QuickAction href="/parent/messages" icon={<MessageCircle className="h-6 w-6 text-purple-600" />} label="Mensajes" />
            <QuickAction href="/parent/children" icon={<Trophy className="h-6 w-6 text-amber-600" />} label="Mis hijos" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-600" />
            Notificaciones importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 && <p className="text-sm text-muted-foreground">No hay notificaciones pendientes.</p>}
          {notifications.map((notification: any) => (
            <Link key={notification.id} href="/parent/notifications" className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/50">
              <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />
              <div>
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-xs text-muted-foreground">{notification.is_read ? "Leida" : "Pendiente"}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="rounded-lg border p-4 text-center transition-colors hover:bg-muted/50">
      <span className="mx-auto mb-2 flex justify-center">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
