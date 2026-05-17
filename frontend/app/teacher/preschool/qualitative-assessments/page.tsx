"use client";

import { useEffect, useState } from "react";
import { BookMarked, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";
import { ModuleGuard } from "@/components/providers/ModuleGuard";

type Nivel = "logrado" | "en_proceso" | "iniciando" | "requiere_apoyo";

const nivelMeta: Record<Nivel, { label: string; color: string }> = {
  logrado:        { label: "Logrado",        color: "bg-green-100 text-green-800" },
  en_proceso:     { label: "En proceso",     color: "bg-blue-100 text-blue-800" },
  iniciando:      { label: "Iniciando",      color: "bg-yellow-100 text-yellow-800" },
  requiere_apoyo: { label: "Requiere apoyo", color: "bg-red-100 text-red-800" },
};

const CAMPOS_FORMATIVOS = [
  "Lenguaje y comunicación",
  "Pensamiento matemático",
  "Exploración y conocimiento del mundo",
  "Desarrollo físico y salud",
  "Desarrollo personal y social",
  "Expresión y apreciación artísticas",
];

type Student = { id: string; first_name: string; last_name: string };
type Assessment = {
  id: string;
  student_id: string;
  student_name?: string;
  period: string;
  campo_formativo: string;
  aprendizaje_esperado: string;
  nivel: Nivel;
  notes: string;
};

const API_BASE = "/api/v1/teacher";

function QualitativeAssessmentsContent() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterStudentId, setFilterStudentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [period, setPeriod] = useState("2025-2026-T1");
  const [campoFormativo, setCampoFormativo] = useState(CAMPOS_FORMATIVOS[0]);
  const [aprendizajeEsperado, setAprendizajeEsperado] = useState("");
  const [nivel, setNivel] = useState<Nivel>("logrado");
  const [notes, setNotes] = useState("");

  const loadStudents = async () => {
    const res = await authFetch(`${API_BASE}/preschool/students`);
    const raw = res?.data?.students ?? res?.data ?? [];
    const list: Student[] = Array.isArray(raw) ? raw : [];
    setStudents(list);
    if (list.length > 0) { setStudentId(list[0].id); setFilterStudentId(list[0].id); }
  };

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ period: "current" });
      if (filterStudentId) params.set("student_id", filterStudentId);
      const res = await authFetch(`${API_BASE}/preschool/qualitative-assessments?${params}`);
      const raw = res?.data?.assessments ?? res?.data ?? [];
      setAssessments(Array.isArray(raw) ? raw : []);
    } catch {
      toast({ title: "Error al cargar evaluaciones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { loadAssessments(); }, [filterStudentId]);

  const handleSave = async () => {
    if (!studentId) return toast({ title: "Selecciona un alumno", variant: "destructive" });
    if (!aprendizajeEsperado.trim()) return toast({ title: "Escribe el aprendizaje esperado", variant: "destructive" });
    try {
      setSaving(true);
      const res = await authFetch(`${API_BASE}/preschool/qualitative-assessments`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, period, campo_formativo: campoFormativo, aprendizaje_esperado: aprendizajeEsperado, nivel, notes }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: "Evaluación guardada" });
      setAprendizajeEsperado(""); setNotes("");
      await loadAssessments();
    } catch (err) {
      toast({ title: "Error al guardar", description: err instanceof Error ? err.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const studentName = (id: string) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : id;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Evaluaciones Cualitativas — Preescolar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Evaluación por campos formativos SEP con niveles de logro.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" />Nueva evaluación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[220px_160px_1fr_160px]">
            <div className="space-y-2">
              <Label>Alumno</Label>
              <Select value={studentId || "none"} onValueChange={(v) => setStudentId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {students.length === 0
                    ? <SelectItem value="none">Sin alumnos</SelectItem>
                    : students.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2025-2026-T1" />
            </div>
            <div className="space-y-2">
              <Label>Campo Formativo</Label>
              <Select value={campoFormativo} onValueChange={setCampoFormativo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CAMPOS_FORMATIVOS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nivel</Label>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(nivelMeta) as Nivel[]).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNivel(n)}
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-all ${nivel === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    {nivelMeta[n].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Aprendizaje esperado</Label>
            <Input value={aprendizajeEsperado} onChange={(e) => setAprendizajeEsperado(e.target.value)} placeholder="Describe el aprendizaje esperado…" />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones adicionales…" rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving || !studentId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Guardar evaluación
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2"><BookMarked className="h-5 w-5" />Evaluaciones registradas</CardTitle>
          <div className="w-60">
            <Label>Filtrar por alumno</Label>
            <Select value={filterStudentId || "all"} onValueChange={(v) => setFilterStudentId(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando…</div>
          ) : assessments.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <BookMarked className="h-10 w-10" /><p>Sin evaluaciones registradas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Campo formativo</TableHead><TableHead>Aprendizaje esperado</TableHead><TableHead>Nivel</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.student_name ?? studentName(a.student_id)}</TableCell>
                    <TableCell>{a.campo_formativo}</TableCell>
                    <TableCell className="max-w-xs truncate">{a.aprendizaje_esperado}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${nivelMeta[a.nivel]?.color ?? ""}`}>
                        {nivelMeta[a.nivel]?.label ?? a.nivel}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{a.notes || "—"}</TableCell>
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

export default function QualitativeAssessmentsPage() {
  return (
    <ModuleGuard moduleKey="qualitative_assessments" moduleName="Evaluaciones Cualitativas">
      <QualitativeAssessmentsContent />
    </ModuleGuard>
  );
}
