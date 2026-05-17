"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, PlusCircle, ShieldAlert } from "lucide-react";
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

type IncidentType = "fall" | "bite" | "scratch" | "illness" | "allergy" | "other";

const incidentMeta: Record<IncidentType, { label: string; color: string }> = {
  fall:    { label: "Caída",      color: "bg-orange-100 text-orange-800" },
  bite:    { label: "Mordida",    color: "bg-red-100 text-red-800" },
  scratch: { label: "Rasguño",    color: "bg-yellow-100 text-yellow-800" },
  illness: { label: "Enfermedad", color: "bg-blue-100 text-blue-800" },
  allergy: { label: "Alergia",    color: "bg-purple-100 text-purple-800" },
  other:   { label: "Otro",       color: "bg-slate-100 text-slate-800" },
};

type KinderStudent = { id: string; first_name: string; last_name: string };
type Incident = {
  id: string;
  student_id: string;
  student_name?: string;
  occurred_at: string;
  incident_type: IncidentType;
  description: string;
  action_taken: string;
  notified_parent: boolean;
};

function today() { return new Date().toISOString().slice(0, 10); }
function nowTime() { return new Date().toTimeString().slice(0, 5); }

const API_BASE = "/api/v1/school-admin";

function IncidentsContent() {
  const { toast } = useToast();
  const [students, setStudents] = useState<KinderStudent[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [studentId, setStudentId] = useState("");
  const [occurDate, setOccurDate] = useState(today());
  const [occurTime, setOccurTime] = useState(nowTime());
  const [incidentType, setIncidentType] = useState<IncidentType>("fall");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [notifiedParent, setNotifiedParent] = useState(false);

  const loadStudents = async () => {
    const res = await authFetch(`${API_BASE}/kinder/students`);
    const raw = res?.data?.students ?? res?.data ?? [];
    const list: KinderStudent[] = Array.isArray(raw) ? raw : [];
    setStudents(list);
    if (list.length > 0 && !studentId) setStudentId(list[0].id);
  };

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_BASE}/kinder/incidents`);
      const raw = res?.data?.incidents ?? res?.data ?? [];
      setIncidents(Array.isArray(raw) ? raw : []);
    } catch {
      toast({ title: "Error al cargar incidentes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); loadIncidents(); }, []);

  const handleSave = async () => {
    if (!studentId) return toast({ title: "Selecciona un alumno", variant: "destructive" });
    if (!description.trim()) return toast({ title: "Describe el incidente", variant: "destructive" });
    try {
      setSaving(true);
      const res = await authFetch(`${API_BASE}/kinder/incidents`, {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId,
          occurred_at: `${occurDate}T${occurTime}:00`,
          incident_type: incidentType,
          description,
          action_taken: actionTaken,
          notified_parent: notifiedParent,
        }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: "Incidente registrado" });
      setDescription("");
      setActionTaken("");
      setNotifiedParent(false);
      await loadIncidents();
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

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("es-MX") + " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidentes — Kinder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registro de caídas, mordidas, alergias y cualquier incidente relevante.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Reportar incidente</CardTitle>
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
              <Input type="date" value={occurDate} onChange={(e) => setOccurDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={occurTime} onChange={(e) => setOccurTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de incidente</Label>
              <Select value={incidentType} onValueChange={(v) => setIncidentType(v as IncidentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(incidentMeta) as IncidentType[]).map((k) => (
                    <SelectItem key={k} value={k}>{incidentMeta[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿Qué ocurrió exactamente?" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Acción tomada</Label>
            <Textarea value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} placeholder="Primeros auxilios, llamada a los padres, etc." rows={2} />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="notified"
              checked={notifiedParent}
              onChange={(e) => setNotifiedParent(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="notified">Padres notificados</Label>
          </div>
          <Button onClick={handleSave} disabled={saving || !studentId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Registrar incidente
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />Historial de incidentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando…</div>
          ) : incidents.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ShieldAlert className="h-10 w-10" /><p>Sin incidentes registrados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Fecha / Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead><TableHead>Acción</TableHead><TableHead>Padres</TableHead></TableRow></TableHeader>
              <TableBody>
                {incidents.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.student_name ?? studentName(i.student_id)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(i.occurred_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${incidentMeta[i.incident_type]?.color ?? ""}`}>
                        {incidentMeta[i.incident_type]?.label ?? i.incident_type}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{i.description}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{i.action_taken || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={i.notified_parent ? "default" : "outline"}>
                        {i.notified_parent ? "Notificados" : "Pendiente"}
                      </Badge>
                    </TableCell>
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

export default function IncidentsPage() {
  return (
    <ModuleGuard moduleKey="incidents" moduleName="Incidentes">
      <IncidentsContent />
    </ModuleGuard>
  );
}
