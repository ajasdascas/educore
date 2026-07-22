"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, CalendarCheck, GraduationCap, MessageCircle, Users } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeacherDashboardData {
  stats?: {
    total_groups?: number;
    total_students?: number;
    today_classes?: number;
    pending_attendance?: number;
    average_grade?: number | null;
  };
  today_classes?: Array<{
    id: string;
    subject_name: string;
    grade_name: string;
    group_name: string;
    start_time?: string;
    end_time?: string;
    room?: string;
    group_id: string;
  }>;
  alerts?: Array<{
    id: string;
    priority: string;
    type: string;
    title: string;
    message: string;
  }>;
  recent_messages?: Array<{
    id: string;
    subject: string;
    sender_name: string;
  }>;
}

export default function TeacherDashboard() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    authFetch("/api/v1/teacher/dashboard")
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setIsEmpty(true);
        }
      })
      .catch(() => setIsEmpty(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">Cargando panel docente...</div>;

  if (isEmpty || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <GraduationCap className="w-12 h-12 text-muted-foreground/40" />
        <div className="text-center">
          <p className="font-semibold">No se pudo cargar el panel docente.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Intenta nuevamente. Si el problema continua, contacta al administrador de tu escuela.
          </p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const todayClasses = data?.today_classes || [];
  const alerts = data?.alerts || [];
  const messages = data?.recent_messages || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Docente</h1>
          <p className="text-muted-foreground">Gestiona tus grupos, asistencias, calificaciones y comunicacion con padres.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href="/teacher/attendance">Tomar asistencia</Link></Button>
          <Button asChild variant="outline"><Link href="/teacher/grades">Capturar calificaciones</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Grupos" value={stats.total_groups || 0} icon={<BookOpen className="h-4 w-4" />} />
        <Metric title="Alumnos" value={stats.total_students || 0} icon={<Users className="h-4 w-4" />} />
        <Metric title="Clases hoy" value={stats.today_classes || 0} icon={<CalendarCheck className="h-4 w-4" />} />
        <Metric title="Asistencias pendientes" value={stats.pending_attendance || 0} icon={<AlertTriangle className="h-4 w-4" />} />
        <Metric title="Promedio" value={stats.average_grade ?? "Sin datos"} icon={<GraduationCap className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Clases de hoy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayClasses.length === 0 && <p className="text-sm text-muted-foreground">No tienes clases asignadas para hoy.</p>}
            {todayClasses.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.subject_name}</p>
                    <p className="text-sm text-muted-foreground">{item.grade_name} {item.group_name} · {item.start_time || "--:--"}-{item.end_time || "--:--"} · {item.room || "Salon N/D"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline"><Link href={`/teacher/classes?group=${item.group_id}`}>Ver grupo</Link></Button>
                    <Button asChild size="sm"><Link href={`/teacher/attendance?group_id=${item.group_id}`}>Asistencia</Link></Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Alertas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {alerts.length === 0 && <p className="text-sm text-muted-foreground">No hay alertas pendientes.</p>}
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border p-3">
                  <Badge variant={alert.priority === "high" ? "destructive" : "secondary"}>{alert.type}</Badge>
                  <p className="mt-2 font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Mensajes recientes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 && <p className="text-sm text-muted-foreground">Sin mensajes recientes.</p>}
              {messages.map((message) => (
                <div key={message.id} className="rounded-lg border p-3">
                  <p className="font-medium">{message.subject}</p>
                  <p className="text-sm text-muted-foreground">{message.sender_name}</p>
                </div>
              ))}
              <Button asChild variant="outline" className="w-full"><Link href="/teacher/messages">Abrir mensajes</Link></Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{title}</span></div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
