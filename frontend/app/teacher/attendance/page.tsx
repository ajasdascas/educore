"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Save } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const today = new Date().toISOString().slice(0, 10);
const statuses = [
  { value: "present", label: "Presente" },
  { value: "absent", label: "Ausente" },
  { value: "late", label: "Retardo" },
  { value: "excused", label: "Justificado" },
];

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [groupId, setGroupId] = useState("");
  const [date, setDate] = useState(today);
  const [students, setStudents] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    authFetch("/api/v1/teacher/classes").then((res) => {
      const list = res.success ? res.data || [] : [];
      setClasses(list);
      if (list[0]) setGroupId(list[0].group_id);
    });
  }, []);

  useEffect(() => {
    if (!groupId) return;
    authFetch(`/api/v1/teacher/attendance?group_id=${groupId}&date=${date}`).then((res) => {
      if (res.success) {
        setStudents(res.data.students || []);
        setSummary(res.data.summary || {});
      }
    });
  }, [groupId, date]);

  const update = (studentId: string, patch: any) => {
    setStudents((items) => items.map((item) => item.student_id === studentId ? { ...item, ...patch } : item));
  };

  const save = async () => {
    const res = await authFetch("/api/v1/teacher/attendance", {
      method: "POST",
      body: JSON.stringify({ group_id: groupId, date, records: students.map(({ student_id, status, notes }) => ({ student_id, status, notes })) }),
    });
    toast({ title: res.success ? "Asistencia guardada" : "No se pudo guardar", description: res.message || "Registro actualizado." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asistencia</h1>
          <p className="text-muted-foreground">Marca asistencia por grupo y fecha.</p>
        </div>
        <Button onClick={save} disabled={!groupId}><Save className="mr-2 h-4 w-4" /> Guardar</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Total" value={summary.total || students.length} />
        <Metric title="Presentes" value={summary.present || 0} />
        <Metric title="Ausentes" value={summary.absent || 0} />
        <Metric title="Retardos" value={summary.late || 0} />
        <Metric title="Justificados" value={summary.excused || 0} />
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> Pase de lista</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger><SelectValue placeholder="Selecciona grupo" /></SelectTrigger>
              <SelectContent>{classes.map((item) => <SelectItem key={item.id} value={item.group_id}>{item.group_name} · {item.subject_name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left"><tr><th className="p-3">Alumno</th><th className="p-3">Matricula</th><th className="p-3">Estado</th><th className="p-3">Notas</th></tr></thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.student_id} className="border-t">
                    <td className="p-3 font-medium">{student.student_name}</td>
                    <td className="p-3">{student.enrollment_id || "N/D"}</td>
                    <td className="p-3">
                      <Select value={student.status || "present"} onValueChange={(value) => update(student.student_id, { status: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                    <td className="p-3"><Input value={student.notes || ""} onChange={(e) => update(student.student_id, { notes: e.target.value })} placeholder="Notas" /></td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No hay alumnos en este grupo.</td></tr>}
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
