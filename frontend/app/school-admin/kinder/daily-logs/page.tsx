"use client";

import { useEffect, useState } from "react";
import { BookOpen, Loader2, PlusCircle, SmilePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

type Mood = "happy" | "calm" | "sad" | "anxious" | "tired" | "energetic" | "irritable";

const moodMeta: Record<Mood, { emoji: string; label: string; color: string }> = {
  happy:     { emoji: "😊", label: "Feliz",     color: "bg-green-100 text-green-800" },
  calm:      { emoji: "😌", label: "Tranquilo", color: "bg-blue-100 text-blue-800" },
  sad:       { emoji: "😢", label: "Triste",    color: "bg-slate-100 text-slate-800" },
  anxious:   { emoji: "😰", label: "Ansioso",   color: "bg-yellow-100 text-yellow-800" },
  tired:     { emoji: "😴", label: "Cansado",   color: "bg-purple-100 text-purple-800" },
  energetic: { emoji: "⚡", label: "Enérgico",  color: "bg-orange-100 text-orange-800" },
  irritable: { emoji: "😤", label: "Irritable", color: "bg-red-100 text-red-800" },
};

type KinderStudent = { id: string; first_name: string; last_name: string };
type DailyLog = {
  id: string;
  student_id: string;
  student_name?: string;
  log_date: string;
  general_mood: Mood;
  notes: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

const API_BASE = "/api/v1/school-admin";

function DailyLogsContent() {
  const { toast } = useToast();
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState<KinderStudent[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [mood, setMood] = useState<Mood>("happy");
  const [notes, setNotes] = useState("");

  const loadStudents = async () => {
    const res = await authFetch(`${API_BASE}/kinder/students`);
    const raw = res?.data?.students ?? res?.data ?? [];
    const list: KinderStudent[] = Array.isArray(raw) ? raw : [];
    setStudents(list);
    if (list.length > 0 && !studentId) setStudentId(list[0].id);
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/kinder/daily-logs?date=${date}`);
      setLogs(Array.isArray(res?.data?.logs ?? res?.data) ? (res?.data?.logs ?? res?.data) : []);
    } catch (err) {
      toast({ title: "Error al cargar bitácoras", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { loadLogs(); }, [date]);

  const handleSave = async () => {
    if (!studentId) return toast({ title: "Selecciona un alumno", variant: "destructive" });
    try {
      setSaving(true);
      const res = await authFetch(`${API_BASE}/kinder/daily-logs`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, log_date: date, general_mood: mood, notes }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: "Bitácora guardada" });
      setNotes("");
      await loadLogs();
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bitácora Diaria — Kinder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registro del estado emocional y notas generales del día.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SmilePlus className="h-5 w-5" />Nuevo registro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[220px_180px_1fr]">
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
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Estado de ánimo</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(moodMeta) as Mood[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-all ${mood === m ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                  >
                    <span>{moodMeta[m].emoji}</span> {moodMeta[m].label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones del día…" rows={3} />
          </div>
          <Button onClick={handleSave} disabled={saving || !studentId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Guardar registro
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Registros del día</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando…</div>
          ) : logs.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10" /><p>Sin registros para esta fecha.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Estado de ánimo</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.student_name ?? studentName(log.student_id)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${moodMeta[log.general_mood]?.color ?? ""}`}>
                        {moodMeta[log.general_mood]?.emoji} {moodMeta[log.general_mood]?.label ?? log.general_mood}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{log.notes || "—"}</TableCell>
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

export default function DailyLogsPage() {
  return (
    <ModuleGuard moduleKey="daily_logs" moduleName="Bitácora Diaria">
      <DailyLogsContent />
    </ModuleGuard>
  );
}
