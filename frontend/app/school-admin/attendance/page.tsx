"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, Save, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type GroupOption = {
  id: string;
  name: string;
  grade_name: string;
};

type AttendanceStudent = {
  student_id: string;
  first_name: string;
  last_name: string;
  status: AttendanceStatus;
  notes: string;
  last_changed?: string;
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Retardo",
  excused: "Justificado",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeGroups(response: any): GroupOption[] {
  const raw = response?.data?.groups || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

export default function AttendancePage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [groupID, setGroupID] = useState("");
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGroups = async () => {
    const response = await authFetch("/api/v1/school-admin/academic/groups");
    const nextGroups = normalizeGroups(response);
    setGroups(nextGroups);
    setGroupID((current) => current || nextGroups[0]?.id || "");
  };

  const loadAttendance = async (nextGroupID = groupID) => {
    if (!nextGroupID) return;
    try {
      setLoading(true);
      const response = await authFetch(`/api/v1/school-admin/attendance/groups/${nextGroupID}/today?date=${date}`);
      setStudents(Array.isArray(response?.data?.students) ? response.data.students : []);
    } catch (error) {
      toast({
        title: "No se pudo cargar asistencia",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (groupID) loadAttendance(groupID);
  }, [groupID, date]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => !term || `${student.first_name} ${student.last_name}`.toLowerCase().includes(term));
  }, [students, search]);

  const summary = useMemo(() => {
    const total = students.length || 1;
    const present = students.filter((student) => student.status === "present").length;
    const late = students.filter((student) => student.status === "late").length;
    const absent = students.filter((student) => student.status === "absent").length;
    const excused = students.filter((student) => student.status === "excused").length;
    const rate = Math.round(((present + late + excused) / total) * 100);
    return { present, late, absent, excused, rate, total: students.length };
  }, [students]);

  const updateStudent = (studentID: string, patch: Partial<AttendanceStudent>) => {
    setStudents((current) => current.map((student) => student.student_id === studentID ? { ...student, ...patch } : student));
  };

  const markAllPresent = () => {
    setStudents((current) => current.map((student) => ({ ...student, status: "present", notes: "" })));
  };

  const saveAttendance = async () => {
    try {
      setSaving(true);
      const response = await authFetch(`/api/v1/school-admin/attendance/groups/${groupID}/bulk`, {
        method: "POST",
        body: JSON.stringify({
          date,
          records: students.map((student) => ({
            student_id: student.student_id,
            status: student.status,
            notes: student.notes,
          })),
        }),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo guardar.");
      toast({ title: "Asistencia guardada", description: `${students.length} registros sincronizados.` });
      await loadAttendance(groupID);
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asistencias</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registro diario por grupo con estados, notas y resumen inmediato.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={markAllPresent} disabled={students.length === 0}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Todos presentes
          </Button>
          <Button onClick={saveAttendance} disabled={saving || students.length === 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar asistencia
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Asistencia</CardTitle><CalendarDays className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.rate}%</div><p className="text-xs text-muted-foreground">{summary.total} alumnos</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Presentes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{summary.present}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Retardos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{summary.late}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ausentes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{summary.absent}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Justificados</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{summary.excused}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[220px_180px_1fr]">
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select value={groupID || "none"} onValueChange={(value) => setGroupID(value === "none" ? "" : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{groups.length === 0 ? <SelectItem value="none">Sin grupos</SelectItem> : groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.grade_name} {group.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Buscar alumno</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Nombre del alumno" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando lista</div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground"><Users className="h-10 w-10" /><p>No hay alumnos para este grupo o filtro.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Estado</TableHead><TableHead>Notas</TableHead><TableHead>Ultimo cambio</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell><div className="font-medium">{student.first_name} {student.last_name}</div></TableCell>
                    <TableCell>
                      <Select value={student.status} onValueChange={(value) => updateStudent(student.student_id, { status: value as AttendanceStatus })}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input value={student.notes || ""} onChange={(event) => updateStudent(student.student_id, { notes: event.target.value })} placeholder="Observacion opcional" /></TableCell>
                    <TableCell><Badge variant="outline">{student.last_changed ? "Guardado" : "Pendiente"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
