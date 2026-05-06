"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";
import {
  Users,
  GraduationCap,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle
} from "lucide-react";

interface PlanLimits {
  max_students: number;
  max_teachers: number;
  current_students: number;
  current_teachers: number;
}

export default function SchoolAdminDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalStudents: number;
    totalTeachers: number;
    totalGroups: number;
    attendance: number;
  } | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [recentActivity, setRecentActivity] = useState<
    { id: number; type: string; message: string; time: string }[]
  >([]);

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const response = await authFetch("/api/v1/school-admin/dashboard");
        const data = response?.data;
        if (!mounted) return;

        if (data?.stats) {
          setStats({
            totalStudents: data.stats.total_students ?? 0,
            totalTeachers: data.stats.total_teachers ?? 0,
            totalGroups: data.stats.total_groups ?? 0,
            attendance: Math.round(data.stats.attendance_rate ?? 0),
          });
          if (data.stats.plan_limits) setPlanLimits(data.stats.plan_limits);
        }

        if (Array.isArray(data?.recent_activity)) {
          setRecentActivity(
            data.recent_activity.slice(0, 4).map((item: any, index: number) => ({
              id: item.id || index + 1,
              type: item.type || "student",
              message: item.description || item.title || "Actividad escolar registrada",
              time: "reciente",
            }))
          );
        }
      } catch {
        // network error — leave state empty, show empty states below
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const showQueuedModule = (moduleName: string) => {
    toast({
      title: `${moduleName} esta en la siguiente fase`,
      description: "Profesores se terminara primero para mantener cada modulo estable.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Escuela</h1>
        <p className="text-muted-foreground mt-2">
          Resumen general de la actividad escolar
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Estudiantes", icon: GraduationCap, value: stats?.totalStudents ?? null },
          { label: "Profesores",        icon: Users,          value: stats?.totalTeachers ?? null },
          { label: "Grupos",            icon: Users,          value: stats?.totalGroups ?? null },
          { label: "Asistencia Prom.", icon: TrendingUp,      value: stats?.attendance != null ? `${stats.attendance}%` : null },
        ].map(({ label, icon: Icon, value }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              ) : value != null ? (
                <div className="text-2xl font-bold">{value}</div>
              ) : (
                <div className="text-2xl font-bold text-muted-foreground">—</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan quota widget */}
      {planLimits && (planLimits.max_students > 0 || planLimits.max_teachers > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Límites del Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {planLimits.max_students > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Alumnos</span>
                  <span className="font-medium">{planLimits.current_students} / {planLimits.max_students}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      planLimits.current_students / planLimits.max_students >= 0.9
                        ? "bg-red-500"
                        : planLimits.current_students / planLimits.max_students >= 0.7
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, Math.round((planLimits.current_students / planLimits.max_students) * 100))}%` }}
                  />
                </div>
              </div>
            )}
            {planLimits.max_teachers > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Profesores</span>
                  <span className="font-medium">{planLimits.current_teachers} / {planLimits.max_teachers}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      planLimits.current_teachers / planLimits.max_teachers >= 0.9
                        ? "bg-red-500"
                        : planLimits.current_teachers / planLimits.max_teachers >= 0.7
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(100, Math.round((planLimits.current_teachers / planLimits.max_teachers) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map((i) => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)}
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividad reciente registrada.</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {activity.type === "student" && <GraduationCap className="h-4 w-4 text-blue-600" />}
                      {activity.type === "grade" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {activity.type === "attendance" && <Calendar className="h-4 w-4 text-orange-600" />}
                      {activity.type === "message" && <MessageCircle className="h-4 w-4 text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href="/school-admin/students"
              className="block w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center">
                <GraduationCap className="h-4 w-4 mr-3 text-blue-600" />
                <span className="text-sm font-medium">Matricular Estudiante</span>
              </div>
            </Link>
            <Link
              href="/school-admin/teachers"
              className="block w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-3 text-green-600" />
                <span className="text-sm font-medium">Registrar Profesor</span>
              </div>
            </Link>
            <Link
              href="/school-admin/attendance"
              className="block w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-3 text-orange-600" />
                <span className="text-sm font-medium">Tomar Asistencia</span>
              </div>
            </Link>
            <Link
              href="/school-admin/communications"
              className="block w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-3 text-purple-600" />
                <span className="text-sm font-medium">Enviar Comunicado</span>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Alerts placeholder — populated via real communications when available */}
    </div>
  );
}
