"use client";

import { useEffect, useState } from "react";
import { BedDouble, Loader2, Moon, PlusCircle } from "lucide-react";
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

type Quality = "good" | "restless" | "none";

const qualityMeta: Record<Quality, { label: string; color: string }> = {
  good:     { label: "Buena",     color: "bg-green-100 text-green-800" },
  restless: { label: "Agitado",   color: "bg-yellow-100 text-yellow-800" },
  none:     { label: "No durmió", color: "bg-red-100 text-red-800" },
};

type KinderStudent = { id: string; first_name: string; last_name: string };
type NapRecord = {
  id: string;
  student_id: string;
  student_name?: string;
  nap_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  quality: Quality;
  notes: string;
};

function today() { return new Date().toISOString().slice(0, 10); }

const API_BASE = "/api/v1/teacher";

function NapsContent() {
  const { toast } = useToast();
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState<KinderStudent[]>([]);
  const [naps, setNaps] = useState<NapRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("14:30");
  const [quality, setQuality] = useState<Quality>("good");
  const [notes, setNotes] = useState("");

  const durationMinutes = (() => {
    try {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const diff = (eh * 60 + em) - (sh * 60 + sm);
      return diff > 0 ? diff : 0;
    } catch { return 0; }
  })();

  const loadStudents = async () => {
    const res = await authFetch(`${API_BASE}/kinder/students`);
    const raw = res?.data?.students ?? res?.data ?? [];
    const list: KinderStudent[] = Array.isArray(raw) ? raw : [];
    setStudents(list);
    if (list.length > 0 && !studentId) setStudentId(list[0].id);
  };

  const loadNaps = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/kinder/naps?date=${date}`);
      const raw = res?.data?.naps ?? res?.data ?? [];
      setNaps(Array.isArray(raw) ? raw : []);
    } catch {
      toast({ title: "Error al cargar siestas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { loadNaps(); }, [date]);

  const handleSave = async () => {
    if (!studentId) return toast({ title: "Selecciona un alumno", variant: "destructive" });
    try {
      setSaving(true);
      const res = await authFetch(`${API_BASE}/kinder/naps`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, nap_date: date, start_time: startTime, end_time: endTime, duration_minutes: durationMinutes, quality, notes }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: "Siesta registrada" });
      setNotes("");
      await loadNaps();
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
        <h1 className="text-3xl font-bold tracking-tight">Siestas — Kinder</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registro de horarios y calidad de siesta por alumno.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Moon className="h-5 w-5" />Nuevo registro</CardTitle>
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
              <Label>Calidad</Label>
              <Select value={quality} onValueChange={(v) => setQuality(v as Quality)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(qualityMeta) as Quality[]).map((k) => (
                    <SelectItem key={k} value={k}>{qualityMeta[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duración calculada</Label>
              <Input readOnly value={`${durationMinutes} min`} className="bg-muted" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones…" rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving || !studentId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Guardar siesta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BedDouble className="h-5 w-5" />Siestas del día</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando…</div>
          ) : naps.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <BedDouble className="h-10 w-10" /><p>Sin siestas registradas para esta fecha.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Inicio</TableHead><TableHead>Fin</TableHead><TableHead>Duración</TableHead><TableHead>Calidad</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
              <TableBody>
                {naps.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.student_name ?? studentName(n.student_id)}</TableCell>
                    <TableCell>{n.start_time}</TableCell>
                    <TableCell>{n.end_time}</TableCell>
                    <TableCell>{n.duration_minutes} min</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${qualityMeta[n.quality]?.color ?? ""}`}>
                        {qualityMeta[n.quality]?.label ?? n.quality}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{n.notes || "—"}</TableCell>
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

export default function NapsPage() {
  return (
    <ModuleGuard moduleKey="naps" moduleName="Siestas">
      <NapsContent />
    </ModuleGuard>
  );
}
