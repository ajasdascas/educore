"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Save } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function TeacherGradesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [groupId, setGroupId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [period, setPeriod] = useState("current");
  const [students, setStudents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    authFetch("/api/v1/teacher/classes").then((res) => {
      const list = res.success ? res.data || [] : [];
      setClasses(list);
      if (list[0]) {
        setGroupId(list[0].group_id);
        setSubjectId(list[0].subject_id);
      }
    });
  }, []);

  useEffect(() => {
    if (!groupId || !subjectId) return;
    authFetch(`/api/v1/teacher/grades?group_id=${groupId}&subject_id=${subjectId}&period=${period}`).then((res) => {
      if (res.success) {
        setStudents(res.data.students || []);
        setSummary(res.data.summary || {});
      }
    });
  }, [groupId, subjectId, period]);

  const selectedClass = useMemo(() => classes.find((item) => item.group_id === groupId && item.subject_id === subjectId) || classes.find((item) => item.group_id === groupId), [classes, groupId, subjectId]);

  const update = (studentId: string, patch: any) => {
    setStudents((items) => items.map((item) => item.student_id === studentId ? { ...item, ...patch } : item));
  };

  const save = async () => {
    const res = await authFetch("/api/v1/teacher/grades", {
      method: "POST",
      body: JSON.stringify({ group_id: groupId, period, grades: students.map(({ student_id, score, notes }) => ({ student_id, subject_id: subjectId, score: Number(score || 0), type: "exam", notes })) }),
    });
    toast({ title: res.success ? "Calificaciones guardadas" : "No se pudo guardar", description: res.message || "Registro actualizado." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calificaciones</h1>
          <p className="text-muted-foreground">Captura y publica evaluaciones por grupo y materia.</p>
        </div>
        <Button onClick={save} disabled={!groupId || !subjectId}><Save className="mr-2 h-4 w-4" /> Guardar</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric title="Alumnos" value={summary.total || students.length} />
        <Metric title="Promedio" value={summary.average || 0} />
        <Metric title="Aprobando" value={summary.passing || 0} />
        <Metric title="Riesgo" value={summary.at_risk || 0} />
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> {selectedClass?.subject_name || "Materia"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px]">
            <Select value={groupId} onValueChange={(value) => {
              setGroupId(value);
              const item = classes.find((candidate) => candidate.group_id === value);
              if (item?.subject_id) setSubjectId(item.subject_id);
            }}>
              <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
              <SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.group_id}>{item.group_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Materia" /></SelectTrigger>
              <SelectContent>{classes.filter((item) => item.group_id === groupId).map((item) => <SelectItem key={`${item.group_id}-${item.subject_id}`} value={item.subject_id}>{item.subject_name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Actual</SelectItem>
                <SelectItem value="trimestre-1">Trimestre 1</SelectItem>
                <SelectItem value="trimestre-2">Trimestre 2</SelectItem>
                <SelectItem value="final">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left"><tr><th className="p-3">Alumno</th><th className="p-3">Matricula</th><th className="p-3">Calificacion</th><th className="p-3">Notas</th></tr></thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.student_id} className="border-t">
                    <td className="p-3 font-medium">{student.student_name}</td>
                    <td className="p-3">{student.enrollment_id || "N/D"}</td>
                    <td className="p-3"><Input type="number" min={0} max={100} value={student.score || 0} onChange={(e) => update(student.student_id, { score: e.target.value })} /></td>
                    <td className="p-3"><Input value={student.notes || ""} onChange={(e) => update(student.student_id, { notes: e.target.value })} placeholder="Retroalimentacion" /></td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No hay alumnos para calificar.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>;
}
