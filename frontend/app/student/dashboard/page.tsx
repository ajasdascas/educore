"use client";

import { useEffect, useState } from "react";
import { BookOpen, ClipboardCheck, Calendar, TrendingUp, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/auth";
import { useAuth } from "@/components/providers/AuthProvider";

interface GradeSummary {
  subject_name: string;
  grade: number;
  period: string;
  eval_type: string;
  recorded_date: string;
}

interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

interface StudentProfile {
  first_name: string;
  last_name: string;
  enrollment_number: string;
  group_name: string | null;
  grade_name: string | null;
  status: string;
}

interface DashboardData {
  student: StudentProfile;
  recent_grades: GradeSummary[];
  attendance_summary: AttendanceSummary;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch("/api/v1/student/dashboard")
      .then((res) => {
        if (res?.success && res.data) {
          setData(res.data);
        } else {
          setError("No se pudo cargar tu información. Verifica que tu cuenta esté activa.");
        }
      })
      .catch(() => setError("Error de conexión con el servidor."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Cargando tu portal...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <GraduationCap className="w-12 h-12 text-muted-foreground/50" />
        <div className="text-center">
          <p className="font-semibold text-foreground">Portal de Estudiantes</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error || "No se encontró tu perfil de estudiante."}
          </p>
          <p className="text-xs text-muted-foreground mt-3 bg-muted/50 p-3 rounded-lg">
            Si acabas de ser inscrito, espera a que tu institución active tu acceso.
          </p>
        </div>
      </div>
    );
  }

  const { student, recent_grades, attendance_summary } = data;
  const fullName = `${student.first_name} ${student.last_name}`.trim();
  const attendanceRate = attendance_summary.rate?.toFixed(1) ?? "0.0";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Bienvenido, {student.first_name}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {student.grade_name && student.group_name
            ? `${student.grade_name} · ${student.group_name}`
            : "Sin grupo asignado"}
          {student.enrollment_number && (
            <span className="ml-2 text-xs font-mono">
              #{student.enrollment_number}
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ClipboardCheck}
          label="Asistencia"
          value={`${attendanceRate}%`}
          sub={`${attendance_summary.present}/${attendance_summary.total_days} días`}
          color="bg-emerald-500"
        />
        <StatCard
          icon={BookOpen}
          label="Calificaciones"
          value={recent_grades.length}
          sub="evaluaciones recientes"
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Faltas"
          value={attendance_summary.absent}
          sub="total de ausencias"
          color="bg-rose-500"
        />
        <StatCard
          icon={Calendar}
          label="Tardanzas"
          value={attendance_summary.late}
          sub="retardos / enfermedades"
          color="bg-amber-500"
        />
      </div>

      {/* Recent grades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calificaciones recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recent_grades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay calificaciones registradas aún.</p>
          ) : (
            <div className="space-y-2">
              {recent_grades.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{g.subject_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.eval_type} · {g.period}
                    </p>
                  </div>
                  <span
                    className={`text-lg font-bold ${
                      g.grade >= 7 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {g.grade}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
