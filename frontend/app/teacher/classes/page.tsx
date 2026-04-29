"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, Users } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/teacher/classes").then((res) => {
      const list = res.success ? res.data || [] : [];
      setClasses(list);
      if (list[0]) selectClass(list[0]);
    }).finally(() => setLoading(false));
  }, []);

  const selectClass = async (item: any) => {
    setSelected(item);
    const res = await authFetch(`/api/v1/teacher/classes/${item.group_id}/students`);
    setStudents(res.success ? res.data || [] : []);
  };

  const filtered = useMemo(() => students.filter((student) => `${student.first_name} ${student.last_name} ${student.enrollment_id}`.toLowerCase().includes(search.toLowerCase())), [students, search]);

  if (loading) return <div className="animate-pulse text-muted-foreground">Cargando grupos...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Grupos</h1>
        <p className="text-muted-foreground">Consulta tus grupos asignados y la informacion academica de tus alumnos.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {classes.length === 0 && <Empty text="Aun no tienes grupos asignados." />}
          {classes.map((item) => (
            <button key={item.id} onClick={() => selectClass(item)} className={`w-full rounded-lg border p-4 text-left hover:bg-muted/50 ${selected?.id === item.id ? "border-primary bg-primary/5" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary"><BookOpen className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <p className="font-semibold">{item.subject_name}</p>
                  <p className="text-sm text-muted-foreground">{item.grade_name} {item.group_name}</p>
                  <p className="text-xs text-muted-foreground">{item.student_count} alumnos</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {selected ? `${selected.subject_name} · ${selected.group_name}` : "Selecciona un grupo"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar alumno" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr><th className="p-3">Alumno</th><th className="p-3">Matricula</th><th className="p-3">Asistencia</th><th className="p-3">Promedio</th><th className="p-3">Estado</th></tr>
                </thead>
                <tbody>
                  {filtered.map((student) => (
                    <tr key={student.id} className="border-t">
                      <td className="p-3 font-medium">{student.first_name} {student.last_name}</td>
                      <td className="p-3">{student.enrollment_id || "N/D"}</td>
                      <td className="p-3">{student.attendance_rate || 0}%</td>
                      <td className="p-3">{student.average_grade || 0}</td>
                      <td className="p-3"><Badge variant="secondary">{student.status || "active"}</Badge></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sin alumnos para mostrar.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{text}</div>;
}
