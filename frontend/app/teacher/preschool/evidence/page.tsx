"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Image, Loader2, PlusCircle } from "lucide-react";
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

type EvidenceCategory = "artwork" | "project" | "activity" | "milestone" | "other";

const evidenceCategoryMeta: Record<EvidenceCategory, { label: string; color: string }> = {
  artwork:   { label: "Arte",      color: "bg-purple-100 text-purple-800" },
  project:   { label: "Proyecto",  color: "bg-blue-100 text-blue-800" },
  activity:  { label: "Actividad", color: "bg-green-100 text-green-800" },
  milestone: { label: "Logro",     color: "bg-yellow-100 text-yellow-800" },
  other:     { label: "Otro",      color: "bg-slate-100 text-slate-800" },
};

type Student = { id: string; first_name: string; last_name: string };
type Evidence = {
  id: string;
  student_id: string;
  student_name?: string;
  title: string;
  description: string;
  category: EvidenceCategory;
  image_url: string;
  is_visible_to_parent: boolean;
  created_at?: string;
};

const API_BASE = "/api/v1/teacher";

function EvidenceContent() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterStudentId, setFilterStudentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<EvidenceCategory>("activity");
  const [imageUrl, setImageUrl] = useState("");
  const [visibleToParent, setVisibleToParent] = useState(true);

  const loadStudents = async () => {
    const res = await authFetch(`${API_BASE}/preschool/students`);
    const raw = res?.data?.students ?? res?.data ?? [];
    const list: Student[] = Array.isArray(raw) ? raw : [];
    setStudents(list);
    if (list.length > 0) { setStudentId(list[0].id); setFilterStudentId(list[0].id); }
  };

  const loadEvidences = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStudentId) params.set("student_id", filterStudentId);
      const res = await authFetch(`${API_BASE}/preschool/evidence?${params}`);
      const raw = res?.data?.evidence ?? res?.data ?? [];
      setEvidences(Array.isArray(raw) ? raw : []);
    } catch {
      toast({ title: "Error al cargar evidencias", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);
  useEffect(() => { loadEvidences(); }, [filterStudentId]);

  const handleSave = async () => {
    if (!studentId) return toast({ title: "Selecciona un alumno", variant: "destructive" });
    if (!title.trim()) return toast({ title: "Escribe un título", variant: "destructive" });
    try {
      setSaving(true);
      const res = await authFetch(`${API_BASE}/preschool/evidence`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, title, description, category, image_url: imageUrl, is_visible_to_parent: visibleToParent }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: "Evidencia guardada" });
      setTitle(""); setDescription(""); setImageUrl("");
      await loadEvidences();
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

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("es-MX"); } catch { return iso; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Evidencias Fotográficas — Preescolar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registro de fotos y trabajos del alumno con control de visibilidad para padres.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5" />Agregar evidencia</CardTitle>
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
              <Label>Categoría</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as EvidenceCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(evidenceCategoryMeta) as EvidenceCategory[]).map((k) => (
                    <SelectItem key={k} value={k}>{evidenceCategoryMeta[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Dibujo libre, Maqueta del sistema solar…" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>URL de imagen</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" type="url" />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto o descripción de la evidencia…" rows={2} />
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
            Guardar evidencia
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2"><Image className="h-5 w-5" />Galería de evidencias</CardTitle>
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
          ) : evidences.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Image className="h-10 w-10" /><p>Sin evidencias registradas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Título</TableHead><TableHead>Categoría</TableHead><TableHead>Imagen</TableHead><TableHead>Fecha</TableHead><TableHead>Visibilidad</TableHead></TableRow></TableHeader>
              <TableBody>
                {evidences.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.student_name ?? studentName(e.student_id)}</TableCell>
                    <TableCell>{e.title}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${evidenceCategoryMeta[e.category]?.color ?? ""}`}>
                        {evidenceCategoryMeta[e.category]?.label ?? e.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      {e.image_url ? (
                        <a href={e.image_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline-offset-2 hover:underline">Ver imagen</a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{formatDate(e.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={e.is_visible_to_parent ? "default" : "outline"} className="flex w-fit items-center gap-1">
                        {e.is_visible_to_parent ? <><Eye className="h-3 w-3" /> Padres</> : <><EyeOff className="h-3 w-3" /> Privado</>}
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

export default function EvidencePage() {
  return (
    <ModuleGuard moduleKey="photos_evidence" moduleName="Evidencias Fotográficas">
      <EvidenceContent />
    </ModuleGuard>
  );
}
