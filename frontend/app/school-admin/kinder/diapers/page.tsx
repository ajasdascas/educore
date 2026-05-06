"use client";

import { useEffect, useState } from "react";
import { Baby, Loader2, PlusCircle } from "lucide-react";
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

type DiaperType = "wet" | "soiled" | "both" | "dry";

const diaperMeta: Record<DiaperType, { label: string; color: string }> = {
  wet:    { label: "Mojado",    color: "bg-blue-100 text-blue-800" },
  soiled: { label: "Sucio",     color: "bg-amber-100 text-amber-800" },
  both:   { label: "Ambos",     color: "bg-orange-100 text-orange-800" },
  dry:    { label: "Limpio",    color: "bg-green-100 text-green-800" },
};

type KinderStudent = { id: string; first_name: string; last_name: string };
type DiaperRecord = {
  id: string;
  student_id: string;
  student_name?: string;
  changed_at: string;
  diaper_type: DiaperType;
  notes: string;
};

function today() { return new Date().toISOString().slice(0, 10); }
function nowTime() { return new Date().toTimeString().slice(0, 5); }

const API_BASE = "/api/v1/school-admin";

function DiapersContent() {
  const { toast } = useToast();
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState<KinderStudent[]>([]);
  const [records, setRecords] = useState<DiaperRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [changedAt, setChangedAt] = useState(nowTime());
  const [diaperType, setDiaperType] = useState<DiaperType>("wet");
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
      const res = await authFetch(`${API_BASE}/kinder/diapers?date=${date}`);
      const raw = res?.data?.diapers ?? res?.data ?? [];
      setRecords(Array.isArray(raw) ? raw : []);
    } catch {
      toast({ title: "Error al cargar cambios", variant: "destructive" });
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
      const res = await authFetch(`${API_BASE}/kinder/diapers`, {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          changed_at: `${date}T${changedAt}:00`,
          diaper_type: diaperType,
          notes,
        }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: "Cambio registrado" });
      setNotes("");
      setChangedAt(nowTime());
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cambios de Pañal — Kinder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registro de cambios de pañal con hora y tipo.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" />Registrar cambio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
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
              <Label>Hora del cambio</Label>
              <Input type="time" value={changedAt} onChange={(e) => setChangedAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={diaperType} onValueChange={(v) => setDiaperType(v as DiaperType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(diaperMeta) as DiaperType[]).map((k) => (
                    <SelectItem key={k} value={k}>{diaperMeta[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones opcionales…" rows={2} />
          </div>
          <Button onClick={handleSave} disabled={saving || !studentId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Registrar cambio
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Baby className="h-5 w-5" />Cambios del día</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando…</div>
          ) : records.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Baby className="h-10 w-10" /><p>Sin registros para esta fecha.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.student_name ?? studentName(r.student_id)}</TableCell>
                    <TableCell>{formatTime(r.changed_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${diaperMeta[r.diaper_type]?.color ?? ""}`}>
                        {diaperMeta[r.diaper_type]?.label ?? r.diaper_type}
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

export default function DiapersPage() {
  return (
    <ModuleGuard moduleKey="diapers" moduleName="Cambios de Pañal">
      <DiapersContent />
    </ModuleGuard>
  );
}
