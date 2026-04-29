"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Calculator, Loader2, Save, Search, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

type GroupOption = { id: string; name: string; grade_name: string; subject_ids?: string[] };
type SubjectOption = { id: string; name: string; code: string };
type GradeStudent = {
  student_id: string;
  first_name: string;
  last_name: string;
  average: number;
  letter_grade: string;
  grades: Array<{ id: string; score: number; max_score: number; description: string; type: string; date: string }>;
};

function normalizeArray(response: any) {
  return Array.isArray(response?.data) ? response.data : response?.data?.items || [];
}

export default function GradesPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [groupID, setGroupID] = useState("");
  const [subjectID, setSubjectID] = useState("");
  const [description, setDescription] = useState("Evaluacion parcial");
  const [type, setType] = useState("exam");
  const [weight, setWeight] = useState("40");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<GradeStudent[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCatalogs = async () => {
    const [groupsResponse, subjectsResponse] = await Promise.all([
      authFetch("/api/v1/school-admin/academic/groups"),
      authFetch("/api/v1/school-admin/academic/subjects"),
    ]);
    const nextGroups = normalizeArray(groupsResponse);
    const nextSubjects = normalizeArray(subjectsResponse);
    setGroups(nextGroups);
    setSubjects(nextSubjects);
    setGroupID((current) => current || nextGroups[0]?.id || "");
    setSubjectID((current) => current || nextSubjects[0]?.id || "");
  };

  const loadGrades = async (nextGroupID = groupID, nextSubjectID = subjectID) => {
    if (!nextGroupID || !nextSubjectID) return;
    try {
      setLoading(true);
      const response = await authFetch(`/api/v1/school-admin/grades/groups/${nextGroupID}/subjects/${nextSubjectID}`);
      const nextStudents = Array.isArray(response?.data?.students) ? response.data.students : [];
      setStudents(nextStudents);
      setScores(Object.fromEntries(nextStudents.map((student: GradeStudent) => [student.student_id, ""])));
    } catch (error) {
      toast({
        title: "No se pudieron cargar calificaciones",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    if (groupID && subjectID) loadGrades(groupID, subjectID);
  }, [groupID, subjectID]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => !term || `${student.first_name} ${student.last_name}`.toLowerCase().includes(term));
  }, [students, search]);

  const summary = useMemo(() => {
    const averages = students.map((student) => Number(student.average || 0));
    const count = averages.length || 1;
    const average = Math.round(averages.reduce((sum, score) => sum + score, 0) / count);
    const passing = students.filter((student) => Number(student.average || 0) >= 60).length;
    const pending = Object.values(scores).filter((score) => score.trim()).length;
    return { average, passing, pending, total: students.length };
  }, [students, scores]);

  const saveGrades = async () => {
    const grades = Object.entries(scores)
      .filter(([, score]) => score.trim())
      .map(([studentID, score]) => ({
        student_id: studentID,
        subject_id: subjectID,
        score: Number(score),
        type,
        description,
        weight: Number(weight || 0),
      }));
    if (grades.length === 0) {
      toast({ title: "Sin cambios", description: "Captura al menos una calificacion.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const response = await authFetch("/api/v1/school-admin/grades/grades/bulk", {
        method: "POST",
        body: JSON.stringify({ grades }),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo guardar.");
      toast({ title: "Calificaciones guardadas", description: `${grades.length} evaluaciones sincronizadas.` });
      await loadGrades(groupID, subjectID);
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

  const selectedSubject = subjects.find((subject) => subject.id === subjectID);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">Captura evaluaciones por grupo y materia, con promedios inmediatos.</p>
        </div>
        <Button onClick={saveGrades} disabled={saving || students.length === 0}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar calificaciones
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Promedio</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.average}</div><p className="text-xs text-muted-foreground">{selectedSubject?.name || "Materia"}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Aprobados</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{summary.passing}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Capturados ahora</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{summary.pending}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Alumnos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{summary.total}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[180px_220px_180px_1fr]">
            <div className="space-y-2"><Label>Grupo</Label><Select value={groupID || "none"} onValueChange={(value) => setGroupID(value === "none" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{groups.length === 0 ? <SelectItem value="none">Sin grupos</SelectItem> : groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.grade_name} {group.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Materia</Label><Select value={subjectID || "none"} onValueChange={(value) => setSubjectID(value === "none" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{subjects.length === 0 ? <SelectItem value="none">Sin materias</SelectItem> : subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Tipo</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quiz">Quiz</SelectItem><SelectItem value="exam">Examen</SelectItem><SelectItem value="homework">Tarea</SelectItem><SelectItem value="project">Proyecto</SelectItem><SelectItem value="final">Final</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Buscar alumno</Label><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></div></div>
            <div className="space-y-2 lg:col-span-3"><Label>Descripcion</Label><Input value={description} onChange={(event) => setDescription(event.target.value)} /></div>
            <div className="space-y-2"><Label>Peso (%)</Label><Input inputMode="numeric" value={weight} onChange={(event) => setWeight(event.target.value.replace(/\D/g, "").slice(0, 3))} /></div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando calificaciones</div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground"><BookOpen className="h-10 w-10" /><p>No hay alumnos para este grupo o filtro.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Promedio actual</TableHead><TableHead>Ultima evaluacion</TableHead><TableHead>Nueva calificacion</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((student) => {
                  const lastGrade = student.grades?.[0];
                  return (
                    <TableRow key={student.student_id}>
                      <TableCell><div className="font-medium">{student.first_name} {student.last_name}</div></TableCell>
                      <TableCell><Badge variant={student.average >= 60 ? "default" : "destructive"}>{student.average || 0} {student.letter_grade || ""}</Badge></TableCell>
                      <TableCell>{lastGrade ? `${lastGrade.description}: ${lastGrade.score}/${lastGrade.max_score}` : "Sin evaluaciones"}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-muted-foreground" /><Input className="w-28" inputMode="decimal" value={scores[student.student_id] || ""} onChange={(event) => setScores((current) => ({ ...current, [student.student_id]: event.target.value.replace(/[^0-9.]/g, "").slice(0, 5) }))} placeholder="0-100" /></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
