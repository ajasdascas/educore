"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Filter, TrendingUp } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ParentGradesPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [period, setPeriod] = useState("current");
  const [grades, setGrades] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChildren = async () => {
      const res = await authFetch("/api/v1/parent/children");
      const list = res.success ? res.data || [] : [];
      setChildren(list);
      setChildId(list[0]?.id || "");
    };
    loadChildren();
  }, []);

  useEffect(() => {
    if (!childId) return;
    const loadGrades = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/v1/parent/children/${childId}/grades?period=${period}`);
        if (res.success) setGrades(res.data);
      } finally {
        setLoading(false);
      }
    };
    loadGrades();
  }, [childId, period]);

  const subjects = useMemo(() => grades?.subjects || [], [grades]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calificaciones</h1>
          <p className="text-muted-foreground">Consulta el promedio y detalle por materia.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={childId} onValueChange={setChildId}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Alumno" /></SelectTrigger>
            <SelectContent>{children.map((child) => <SelectItem key={child.id} value={child.id}>{child.first_name} {child.last_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Periodo actual</SelectItem>
              <SelectItem value="Trimestre 1">Trimestre 1</SelectItem>
              <SelectItem value="Trimestre 2">Trimestre 2</SelectItem>
              <SelectItem value="Trimestre 3">Trimestre 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Promedio" value={grades?.overall_gpa || 0} icon={<TrendingUp className="h-4 w-4 text-green-600" />} />
        <Metric title="Nivel" value={grades?.overall_grade || "-"} icon={<BookOpen className="h-4 w-4 text-blue-600" />} />
        <Metric title="Evaluaciones" value={grades?.summary?.total_assignments || 0} icon={<Filter className="h-4 w-4 text-purple-600" />} />
      </div>

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Cargando calificaciones...</div>
      ) : (
        <div className="grid gap-4">
          {subjects.map((subject: any) => (
            <Card key={subject.subject_id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span>{subject.subject_name}</span>
                  <span className="flex items-center gap-2">
                    <Badge>{subject.current_grade}</Badge>
                    <Badge variant="outline">{subject.letter_grade}</Badge>
                  </span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{subject.teacher_name || "Docente no asignado"}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(subject.assignments || []).map((grade: any) => (
                  <div key={grade.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">{grade.title}</p>
                      <p className="text-xs text-muted-foreground">{grade.date} · {grade.comments || "Sin comentarios"}</p>
                    </div>
                    <Badge variant={grade.score >= 80 ? "default" : "secondary"}>{grade.score}/{grade.max_score}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {subjects.length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">No hay calificaciones registradas para el filtro seleccionado.</CardContent></Card>}
        </div>
      )}
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
