"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, FileCheck2, Loader2, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { ModuleGuard } from "@/components/providers/ModuleGuard";
import { authFetch } from "@/lib/auth";

type Student = { id: string; first_name: string; last_name?: string; paternal_last_name?: string; maternal_last_name?: string; group_name?: string; grade_name?: string };
type ReportCard = {
  student_id: string;
  student_name: string;
  group_name: string;
  period: string;
  overall_gpa: number;
  overall_grade: string;
  attendance_rate: number;
  subject_grades: Array<{ subject_name: string; teacher_name: string; average: number; letter_grade: string; effort: string; behavior: string }>;
  comments: Array<{ teacher_name: string; subject: string; comment: string; date: string }>;
  generated_at: string;
};

const studentName = (student?: Student) =>
  student ? [student.first_name, student.paternal_last_name, student.maternal_last_name, student.last_name].filter(Boolean).join(" ") : "";

export default function SchoolAdminReportCardsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentID, setStudentID] = useState("");
  const [period, setPeriod] = useState("current");
  const [report, setReport] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    authFetch("/api/v1/school-admin/academic/students?per_page=100")
      .then((response) => {
        const list = Array.isArray(response?.data) ? response.data : response?.data?.items || [];
        setStudents(list);
        if (list[0]) setStudentID(list[0].id);
      })
      .catch(() => toast({ title: "No se pudieron cargar alumnos", variant: "destructive" }));
  }, []);

  const selectedStudent = useMemo(() => students.find((student) => student.id === studentID), [students, studentID]);

  const generate = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!studentID) return;
    try {
      setLoading(true);
      const response = await authFetch("/api/v1/school-admin/report-cards/generate", {
        method: "POST",
        body: JSON.stringify({ student_id: studentID, period, include_attendance: true, include_comments: true }),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo generar.");
      setReport(response.data);
      toast({ title: "Boleta generada", description: "Preview listo para revision y exportacion." });
    } catch (error) {
      toast({ title: "No se pudo generar", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const downloadPreview = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `boleta-${report.student_name.replaceAll(" ", "-").toLowerCase()}-${report.period}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModuleGuard moduleKey="grades">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Boletas</h1>
          <p className="text-sm text-muted-foreground">Generacion automatica con calificaciones, asistencia y comentarios docentes.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generador</CardTitle>
            <CardDescription>Elige alumno y periodo; revisa el preview antes de imprimir o exportar.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={generate}>
              <div className="space-y-2">
                <Label>Alumno</Label>
                <Select value={studentID} onValueChange={setStudentID}>
                  <SelectTrigger><SelectValue placeholder="Selecciona alumno" /></SelectTrigger>
                  <SelectContent>{students.map((student) => <SelectItem key={student.id} value={student.id}>{studentName(student)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Periodo</Label>
                <Input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="current / 2025-2026 / P1" />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={loading || !studentID}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}Generar</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Preview</CardTitle>
              <CardDescription>{report ? `${report.student_name} · ${report.group_name || selectedStudent?.group_name || "Sin grupo"}` : "Genera una boleta para ver el resultado."}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={!report} onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
              <Button variant="outline" disabled={!report} onClick={downloadPreview}><Download className="mr-2 h-4 w-4" />Exportar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {report ? (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Promedio</p><p className="text-2xl font-bold">{report.overall_gpa}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Nivel</p><p className="text-2xl font-bold">{report.overall_grade}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Asistencia</p><p className="text-2xl font-bold">{report.attendance_rate}%</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Periodo</p><p className="text-lg font-bold">{report.period}</p></CardContent></Card>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Profesor</TableHead><TableHead>Promedio</TableHead><TableHead>Nivel</TableHead><TableHead>Esfuerzo</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {report.subject_grades.map((subject) => (
                        <TableRow key={`${subject.subject_name}-${subject.teacher_name}`}>
                          <TableCell className="font-medium">{subject.subject_name}</TableCell>
                          <TableCell>{subject.teacher_name}</TableCell>
                          <TableCell>{subject.average}</TableCell>
                          <TableCell><Badge>{subject.letter_grade}</Badge></TableCell>
                          <TableCell>{subject.effort}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {report.comments.map((comment) => (
                    <div key={`${comment.subject}-${comment.date}`} className="rounded-lg border p-4">
                      <p className="font-medium">{comment.subject}</p>
                      <p className="text-sm text-muted-foreground">{comment.teacher_name}</p>
                      <p className="mt-2 text-sm">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">Sin preview generado.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleGuard>
  );
}
