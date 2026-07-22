"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, FileCheck2, FileJson2, Loader2 } from "lucide-react";
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
  snapshot_id: string;
  snapshot_sha256: string;
  snapshot_payload_json: string;
  school_name: string;
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
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    authFetch("/api/v1/school-admin/academic/students?per_page=100")
      .then((response) => {
        const list = Array.isArray(response?.data) ? response.data : response?.data?.items || [];
        setStudents(list);
        if (list[0]) setStudentID(list[0].id);
      })
      .catch(() => toast({ title: "No se pudieron cargar alumnos", variant: "destructive" }));
  }, [toast]);

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
      if (!response?.success) throw new Error(response?.error || response?.message || "No se pudo generar.");
      if (!response.data?.snapshot_id || !response.data?.snapshot_sha256 || !response.data?.snapshot_payload_json) throw new Error("El servidor no confirmo la persistencia del snapshot.");
      setReport(response.data);
      toast({ title: "Boleta generada", description: "El snapshot inmutable quedo guardado antes de habilitar la exportacion." });
    } catch (error) {
      toast({ title: "No se pudo generar", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!report || exporting) return;
    try {
      setExporting(true);
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;
      const lineH = 7;
      let y = 22;

      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("BOLETA DE CALIFICACIONES", margin, y);
      y += lineH + 2;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(report.school_name, margin, y);
      y += lineH;
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageW - margin, y);
      y += 9;

      // Student info
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Alumno: ${report.student_name}`, margin, y); y += lineH;
      doc.text(`Grupo: ${report.group_name || selectedStudent?.group_name || "Sin grupo"}`, margin, y); y += lineH;
      doc.text(`Periodo: ${report.period}`, margin, y); y += lineH;
      doc.setFont("helvetica", "bold");
      doc.text(`Promedio general: ${report.overall_gpa.toFixed(2)}   Nivel: ${report.overall_grade}`, margin, y); y += lineH;
      doc.setFont("helvetica", "normal");
      doc.text(`Asistencia: ${report.attendance_rate}%`, margin, y); y += lineH;
      const genDate = new Date(report.generated_at).toLocaleString("es-MX");
      doc.text(`Generado: ${genDate}`, margin, y); y += lineH + 4;

      // Grades
      doc.line(margin, y, pageW - margin, y); y += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("CALIFICACIONES", margin, y); y += lineH + 2;
      doc.line(margin, y, pageW - margin, y); y += 7;

      if (report.subject_grades.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.text("Sin calificaciones registradas para este periodo.", margin, y);
        y += lineH + 4;
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Materia", margin, y);
        doc.text("Profesor", margin + 65, y);
        doc.text("Promedio", margin + 125, y);
        doc.text("Nivel", margin + 150, y);
        y += lineH;
        doc.line(margin, y, pageW - margin, y); y += 4;

        doc.setFont("helvetica", "normal");
        for (const sg of report.subject_grades) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(sg.subject_name.substring(0, 30), margin, y);
          doc.text(sg.teacher_name.substring(0, 26), margin + 65, y);
          doc.text(sg.average.toFixed(2), margin + 125, y);
          doc.text(sg.letter_grade, margin + 150, y);
          y += lineH;
        }
        y += 4;
      }

      // Comments
      if (report.comments.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.line(margin, y, pageW - margin, y); y += 7;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("COMENTARIOS DOCENTES", margin, y); y += lineH + 2;
        doc.line(margin, y, pageW - margin, y); y += 7;

        doc.setFontSize(10);
        for (const c of report.comments) {
          if (y > 260) { doc.addPage(); y = 20; }
          doc.setFont("helvetica", "bold");
          doc.text(`${c.subject} - ${c.teacher_name}`, margin, y); y += lineH - 1;
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(c.comment, pageW - margin * 2) as string[];
          for (const line of lines) {
            if (y > 278) { doc.addPage(); y = 20; }
            doc.text(line, margin, y); y += lineH - 1;
          }
          y += 4;
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(`Snapshot ${report.snapshot_id} | SHA-256 ${report.snapshot_sha256}`, pageW / 2, 286, { align: "center" });
      doc.text(`Generado por ${report.school_name} con EduCore`, pageW / 2, 290, { align: "center" });

      const slug = report.student_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      doc.save(`boleta-${slug}-${report.period}.pdf`);
      toast({ title: "PDF exportado", description: `boleta-${slug}-${report.period}.pdf descargado.` });
    } catch {
      toast({ title: "No se pudo exportar", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const downloadJSON = async () => {
    if (!report?.snapshot_id || !report.snapshot_payload_json) return;
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(report.snapshot_payload_json));
      const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (checksum !== report.snapshot_sha256) {
        toast({ title: "Snapshot invalido", description: "El SHA-256 no coincide; la descarga fue bloqueada.", variant: "destructive" });
        return;
      }
    }
    const blob = new Blob([report.snapshot_payload_json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `boleta-snapshot-${report.snapshot_id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <ModuleGuard moduleKey="report_cards" moduleName="Boletas">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Boletas</h1>
          <p className="text-sm text-muted-foreground">Generacion automatica con calificaciones, asistencia y comentarios docentes.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generador</CardTitle>
            <CardDescription>Elige alumno y periodo. Cada resultado se guarda como snapshot JSON con SHA-256 antes de exportarse.</CardDescription>
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
              <CardDescription>{report ? `${report.school_name} · ${report.student_name} · ${report.group_name || selectedStudent?.group_name || "Sin grupo"}` : "Genera una boleta para ver el resultado."}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={!report?.snapshot_id} onClick={() => void downloadJSON()}><FileJson2 className="mr-2 h-4 w-4" />JSON</Button>
              <Button variant="outline" disabled={!report?.snapshot_id || exporting} onClick={() => void downloadPDF()}>
                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Exportar PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {report ? (
              <>
                <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Snapshot:</span> {report.snapshot_id}</p>
                  <p className="break-all"><span className="font-medium text-foreground">SHA-256:</span> {report.snapshot_sha256}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Promedio</p><p className="text-2xl font-bold">{report.overall_gpa}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Nivel</p><p className="text-2xl font-bold">{report.overall_grade}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Asistencia</p><p className="text-2xl font-bold">{report.attendance_rate}%</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Periodo</p><p className="text-lg font-bold">{report.period}</p></CardContent></Card>
                </div>
                {report.subject_grades.length > 0 ? (
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
                ) : (
                  <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">Sin calificaciones registradas para este periodo.</div>
                )}
                {report.comments.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {report.comments.map((comment) => (
                      <div key={`${comment.subject}-${comment.date}`} className="rounded-lg border p-4">
                        <p className="font-medium">{comment.subject}</p>
                        <p className="text-sm text-muted-foreground">{comment.teacher_name}</p>
                        <p className="mt-2 text-sm">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
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
