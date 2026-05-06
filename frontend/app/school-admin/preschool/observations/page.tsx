"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Eye, EyeOff, Loader2, PlusCircle } from "lucide-react";
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

type Category = "general" | "conduct" | "academic" | "social" | "physical";

const categoryMeta: Record<Category, { label: string; color: string }> = {
  general:  { label: "General",    color: "bg-slate-100 text-slate-800" },
  conduct:  { label: "Conducta",   color: "bg-red-100 text-red-800" },
  academic: { label: "Académico",  color: "bg-blue-100 text-blue-800" },
  social:   { label: "Social",     color: "bg-green-100 text-green-800" },
  physical: { label: "Físico",     color: "bg-orange-100 text-orange-800" },
};

type Student = { id: string; first_name: string; last_name: string };
type Observation = {
  id: string;
  student_id: string;
  student_name?: string;
  observed_at: string;
  category: Category;
  content: string;
  is_visible_to_parent: boolean;
};

function today() { return new Date().toISOString().slice(0, 10); }

const API_BASE = "/api/v1/school-admin";

function ObservationsContent() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterStudentId, setFilterStudentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [observedAt, setObservedAt] = useState(today());
  const [category, setCategory] = useState<Category>("general");
  const [content, setContent] = useState("");
  const [visibleToParent, setVisibleToParent] = useState(true);

  const loadStudents = async () => {
    const res = await authFetch(`${API_BASE}/preschool/students`);
    const raw = res?.data?.students ?? res?.data ?? [];
    const list: Student[] = Array.isArray(raw) ? raw : [];
    setStudents(list);
    if (list.length > 0) { setStudentId(list[0].id); setFilterStudentId(list[0].id); }
  };

  const loadObservations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStudentId) params.set("student_id", filterStudentId);
      const res = await authFetch(`${API_BASE}/preschool/observations?${params}`);
      const raw = res?.data?.observations ?? res?.data ?? [];
      setObservations(Array.isArray(raw) ? raw : []);
    } catch {
      toast({ title: "Error al cargar observaciones", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { loadObservations(); }, [filterStudentId]);

  const handleSave = async () => {
    if (!studentId) return toast({ title: "Selecciona un alumno", variant: "destructive" });
    if (!content.trim()) return toast({ title: "Escribe la observación", variant: "destructive" });
    try {
      setSaving(true);
      const res = await authFetch(`${API_BASE}/preschool/observations`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, observed_at: observedAt, category, content, is_visible_to_parent: visibleToParent }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: "Observación guardada" });
      setContent("");
      await loadObservations();
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

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("es-MX"); } catch { return iso; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Observaciones — Preescolar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Notas cualitativas del docente, opcionalmente visibles para los padres.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" />Nueva observación</CardTitle>
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
              <Input type="date" value={observedAt} onChange={(e) => setObservedAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(categoryMeta) as Category[]).map((k) => (
                    <SelectItem key={k} value={k}>{categoryMeta[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observación</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Describe la observación con detalle…" rows={3} />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="visible"
              checked={visibleToParent}
              onChange={(e) => setVisibleToParent(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="visible" className="flex items-center gap-1">
              {visibleToParent ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Visible para padres
            </Label>
          </div>
          <Button onClick={handleSave} disabled={saving || !studentId}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Guardar observación
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Observaciones registradas</CardTitle>
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
          ) : observations.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <ClipboardList className="h-10 w-10" /><p>Sin observaciones registradas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Fecha</TableHead><TableHead>Categoría</TableHead><TableHead>Observación</TableHead><TableHead>Visibilidad</TableHead></TableRow></TableHeader>
              <TableBody>
                {observations.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.student_name ?? studentName(o.student_id)}</TableCell>
                    <TableCell>{formatDate(o.observed_at)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${categoryMeta[o.category]?.color ?? ""}`}>
                        {categoryMeta[o.category]?.label ?? o.category}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-sm truncate">{o.content}</TableCell>
                    <TableCell>
                      <Badge variant={o.is_visible_to_parent ? "default" : "outline"} className="flex w-fit items-center gap-1">
                        {o.is_visible_to_parent ? <><Eye className="h-3 w-3" /> Padres</> : <><EyeOff className="h-3 w-3" /> Privado</>}
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

export default function ObservationsPage() {
  return (
    <ModuleGuard moduleKey="observations" moduleName="Observaciones">
      <ObservationsContent />
    </ModuleGuard>
  );
}
