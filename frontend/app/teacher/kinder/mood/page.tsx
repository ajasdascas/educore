"use client";

import { useEffect, useState } from "react";
import { Loader2, PlusCircle, Smile } from "lucide-react";
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

type MoodCode = "happy" | "calm" | "sad" | "anxious" | "tired" | "energetic" | "irritable";

const moodMeta: Record<MoodCode, { emoji: string; label: string; color: string }> = {
  happy:     { emoji: "😊", label: "Feliz",     color: "bg-green-100 text-green-800" },
  calm:      { emoji: "😌", label: "Tranquilo", color: "bg-blue-100 text-blue-800" },
  sad:       { emoji: "😢", label: "Triste",    color: "bg-slate-100 text-slate-800" },
  anxious:   { emoji: "😰", label: "Ansioso",   color: "bg-yellow-100 text-yellow-800" },
  tired:     { emoji: "😴", label: "Cansado",   color: "bg-purple-100 text-purple-800" },
  energetic: { emoji: "⚡", label: "Enérgico",  color: "bg-orange-100 text-orange-800" },
  irritable: { emoji: "😤", label: "Irritable", color: "bg-red-100 text-red-800" },
};

type KinderStudent = { id: string; first_name: string; last_name: string };
type MoodRecord = {
  id: string;
  student_id: string;
  student_name?: string;
  recorded_at: string;
  mood_code: MoodCode;
  notes: string;
};

function today() { return new Date().toISOString().slice(0, 10); }
function nowTime() { return new Date().toTimeString().slice(0, 5); }

const API_BASE = "/api/v1/teacher";

function MoodContent() {
  const { toast } = useToast();
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState<KinderStudent[]>([]);
  const [records, setRecords] = useState<MoodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [recordedAt, setRecordedAt] = useState(nowTime());
  const [moodCode, setMoodCode] = useState<MoodCode>("happy");
  const [notes, setNotes] = useState("");

  const loadStudents = async () => {
    const res = await authFetch(`${API_BASE}/kinder/students`);
    const raw = res?.data?.students ?? res?.data ?? [];
    const list: KinderStudent[] = Array.isArray(raw) ? raw : [];
    setStudents(list);
    if (list.length > 0 && !studentId) setStudentId(list[0].id);
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/kinder/mood?date=${date}`);
      const raw = res?.data?.records ?? res?.data ?? [];
      setRecords(Array.isArray(raw) ? raw : []);
    } catch {
      toast({ title: "Error al cargar estados de ánimo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { loadRecords(); }, [date]);

  const handleSave = async () => {
    if (!studentId) return toast({ title: "Selecciona un alumno", variant: "destructive" });
    try {
      setSaving(true);
      const res = await authFetch(`${API_BASE}/kinder/mood`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, recorded_at: `${date}T${recordedAt}:00`, mood_code: moodCode, notes }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: "Estado de ánimo registrado" });
      setNotes(""); setRecordedAt(nowTime());
      await loadRecords();
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

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seguimiento Emocional — Kinder</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registro puntual del estado emocional de cada alumno durante el día.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Smile className="h-5 w-5" />Registrar estado de ánimo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
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
              <Label>Hora</Label>
              <Input type="time" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado de ánimo</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(moodMeta) as MoodCode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMoodCode(m)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-all ${moodCode === m ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                >
                  <span>{moodMeta[m].emoji}</span> {moodMeta[m].label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Contexto o detalles adicionales…" rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving || !studentId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Guardar registro
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Smile className="h-5 w-5" />Registros del día</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando…</div>
          ) : records.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Smile className="h-10 w-10" /><p>Sin registros emocionales para esta fecha.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Hora</TableHead><TableHead>Estado</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.student_name ?? studentName(r.student_id)}</TableCell>
                    <TableCell>{formatTime(r.recorded_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${moodMeta[r.mood_code]?.color ?? ""}`}>
                        {moodMeta[r.mood_code]?.emoji} {moodMeta[r.mood_code]?.label ?? r.mood_code}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{r.notes || "—"}</TableCell>
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

export default function MoodPage() {
  return (
    <ModuleGuard moduleKey="mood_tracking" moduleName="Seguimiento Emocional">
      <MoodContent />
    </ModuleGuard>
  );
}
