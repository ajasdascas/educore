"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, FileUp, Loader2, Pencil, Search, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ModuleGuard } from "@/components/providers/ModuleGuard";
import { authFetch } from "@/lib/auth";

type Student = { id: string; first_name: string; last_name?: string; paternal_last_name?: string; maternal_last_name?: string; group_name?: string };
type StorageStatus = "physical_only" | "digital_only" | "both";
type DocumentItem = {
  id: string;
  student_id: string;
  student_name?: string;
  title: string;
  description?: string;
  category: string;
  file_name?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  storage_status?: StorageStatus;
  is_verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
};

type DocumentForm = {
  student_id: string;
  title: string;
  description: string;
  category: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  storage_status: StorageStatus;
};

const emptyForm: DocumentForm = {
  student_id: "",
  title: "",
  description: "",
  category: "enrollment",
  file_name: "",
  file_url: "",
  file_size: 0,
  mime_type: "application/pdf",
  storage_status: "digital_only",
};

const categories = [
  { value: "enrollment", label: "Inscripcion" },
  { value: "identification", label: "Identificacion" },
  { value: "medical", label: "Medico" },
  { value: "academic_history", label: "Historial academico" },
  { value: "report_card", label: "Boleta" },
  { value: "other", label: "Otros" },
];

const storageStates: Array<{ value: StorageStatus; label: string }> = [
  { value: "physical_only", label: "Solo fisico" },
  { value: "digital_only", label: "Solo digital" },
  { value: "both", label: "Fisico y digital" },
];

const studentName = (student?: Student) =>
  student ? [student.first_name, student.paternal_last_name, student.maternal_last_name, student.last_name].filter(Boolean).join(" ") : "";

const categoryLabel = (value: string) => categories.find((item) => item.value === value)?.label || value;
const storageLabel = (value?: string) => storageStates.find((item) => item.value === value)?.label || "Solo digital";

function fileSizeLabel(size?: number) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

async function fileToDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SchoolAdminDocumentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [storageFilter, setStorageFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [form, setForm] = useState<DocumentForm>(emptyForm);
  const { toast } = useToast();

  const loadStudents = async () => {
    const response = await authFetch("/api/v1/school-admin/academic/students?per_page=100");
    const list = Array.isArray(response?.data) ? response.data : response?.data?.students || response?.data?.items || [];
    setStudents(list);
    if (list[0] && !form.student_id) setForm((current) => ({ ...current, student_id: list[0].id }));
    return list;
  };

  const loadDocuments = async (studentList = students) => {
    const targetStudents = selectedStudent === "all" ? studentList : studentList.filter((student) => student.id === selectedStudent);
    const batches = await Promise.all(targetStudents.map((student) => authFetch(`/api/v1/school-admin/documents/${student.id}`).catch(() => null)));
    setDocuments(batches.flatMap((response) => (response?.success && Array.isArray(response.data) ? response.data : [])));
  };

  useEffect(() => {
    loadStudents().then((list) => loadDocuments(list)).catch(() => {
      toast({ title: "No se pudieron cargar documentos", variant: "destructive" });
    });
  }, []);

  useEffect(() => {
    if (students.length) loadDocuments();
  }, [selectedStudent]);

  const filtered = useMemo(() => documents.filter((doc) => {
    const matchesQuery = !query || `${doc.title} ${doc.file_name} ${doc.student_name}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || doc.category === category;
    const matchesStorage = storageFilter === "all" || doc.storage_status === storageFilter;
    return matchesQuery && matchesCategory && matchesStorage && doc.status !== "deleted";
  }), [documents, query, category, storageFilter]);

  const stats = useMemo(() => ({
    total: documents.filter((doc) => doc.status !== "deleted").length,
    verified: documents.filter((doc) => doc.is_verified && doc.status !== "deleted").length,
    digital: documents.filter((doc) => doc.storage_status !== "physical_only" && doc.status !== "deleted").length,
  }), [documents]);

  const openCreate = () => {
    setEditingDoc(null);
    setForm({ ...emptyForm, student_id: selectedStudent !== "all" ? selectedStudent : students[0]?.id || "" });
    setUploadOpen(true);
  };

  const openEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setForm({
      student_id: doc.student_id,
      title: doc.title,
      description: doc.description || "",
      category: doc.category || "other",
      file_name: doc.file_name || "",
      file_url: doc.file_url || "",
      file_size: doc.file_size || 0,
      mime_type: doc.mime_type || "application/pdf",
      storage_status: doc.storage_status || "digital_only",
    });
    setUploadOpen(true);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Archivo no permitido", description: "Solo se aceptan PDF, JPG o PNG.", variant: "destructive" });
      return;
    }
    const dataUrl = await fileToDataURL(file);
    setForm((current) => ({
      ...current,
      file_name: file.name,
      file_url: dataUrl,
      file_size: file.size,
      mime_type: file.type,
      storage_status: current.storage_status === "physical_only" ? "both" : current.storage_status,
    }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      const endpoint = editingDoc ? `/api/v1/school-admin/documents/${editingDoc.id}` : "/api/v1/school-admin/documents";
      const response = await authFetch(endpoint, {
        method: editingDoc ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo guardar.");
      toast({ title: editingDoc ? "Documento reemplazado" : "Documento guardado", description: "El expediente digital fue actualizado." });
      setUploadOpen(false);
      await loadDocuments();
    } catch (error) {
      toast({ title: "No se pudo guardar", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const verify = async (doc: DocumentItem) => {
    try {
      const response = await authFetch(`/api/v1/school-admin/documents/${doc.id}/verify`, { method: "PATCH" });
      if (!response?.success) throw new Error(response?.message || "No se pudo verificar.");
      setDocuments((current) => current.map((item) => item.id === doc.id ? { ...item, is_verified: true, verified_at: new Date().toISOString() } : item));
      toast({ title: "Documento verificado" });
    } catch (error) {
      toast({ title: "No se pudo verificar", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    }
  };

  const remove = async (doc: DocumentItem) => {
    try {
      const response = await authFetch(`/api/v1/school-admin/documents/${doc.id}`, { method: "DELETE" });
      if (!response?.success) throw new Error(response?.message || "No se pudo eliminar.");
      setDocuments((current) => current.filter((item) => item.id !== doc.id));
      toast({ title: "Documento eliminado" });
    } catch (error) {
      toast({ title: "No se pudo eliminar", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    }
  };

  return (
    <ModuleGuard moduleKey="students">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">Documentos</h1>
            <p className="text-sm text-muted-foreground">Expedientes fisicos y digitales por estudiante.</p>
          </div>
          <Button onClick={openCreate} className="w-full sm:w-auto"><FileUp className="mr-2 h-4 w-4" />Subir documento</Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Documentos</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Digitales</p><p className="text-2xl font-bold">{stats.digital}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Verificados</p><p className="text-2xl font-bold">{stats.verified}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Repositorio escolar</CardTitle>
            <CardDescription>Filtra por alumno, categoria, estado o nombre de archivo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_220px_220px_200px]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar documento" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los alumnos</SelectItem>
                  {students.map((student) => <SelectItem key={student.id} value={student.id}>{studentName(student)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorias</SelectItem>
                  {categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={storageFilter} onValueChange={setStorageFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {storageStates.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow><TableHead>Documento</TableHead><TableHead>Alumno</TableHead><TableHead>Categoria</TableHead><TableHead>Estado</TableHead><TableHead>Archivo</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="min-w-64 max-w-80"><p className="truncate font-medium" title={doc.title}>{doc.title}</p><p className="line-clamp-2 text-xs text-muted-foreground">{doc.description || "Sin descripcion"}</p></TableCell>
                      <TableCell className="min-w-52 max-w-64 truncate">{doc.student_name || studentName(students.find((student) => student.id === doc.student_id))}</TableCell>
                      <TableCell><Badge variant="outline">{categoryLabel(doc.category)}</Badge></TableCell>
                      <TableCell><div className="flex flex-col gap-1"><Badge variant={doc.storage_status === "physical_only" ? "secondary" : "default"}>{storageLabel(doc.storage_status)}</Badge>{doc.is_verified && <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" />Verificado</span>}</div></TableCell>
                      <TableCell className="min-w-48 max-w-64"><p className="truncate">{doc.file_name || doc.mime_type || "Sin archivo digital"}</p><p className="text-xs text-muted-foreground">{fileSizeLabel(doc.file_size)}</p></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" title="Preview" disabled={!doc.file_url} onClick={() => { setPreviewDoc(doc); setPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon-sm" title="Reemplazar" onClick={() => openEdit(doc)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon-sm" title="Verificar" disabled={!!doc.is_verified} onClick={() => verify(doc)}><ShieldCheck className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon-sm" title="Eliminar" onClick={() => remove(doc)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Sin documentos para este filtro.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingDoc ? "Reemplazar documento" : "Subir documento"}</DialogTitle>
              <DialogDescription>PDF, JPG o PNG. Puedes registrar documentos fisicos aunque aun no tengan archivo digital.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={save}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2"><Label>Alumno</Label><Select value={form.student_id} onValueChange={(value) => setForm((current) => ({ ...current, student_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{students.map((student) => <SelectItem key={student.id} value={student.id}>{studentName(student)}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Titulo</Label><Input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Categoria</Label><Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Estado del expediente</Label><Select value={form.storage_status} onValueChange={(value) => setForm((current) => ({ ...current, storage_status: value as StorageStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{storageStates.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Archivo digital</Label><Input type="file" accept="application/pdf,image/jpeg,image/png" onChange={handleFile} /></div>
                <div className="space-y-2 sm:col-span-2"><Label>Descripcion</Label><Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
              </div>
              {form.file_name && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{form.file_name}</p>
                  <p className="text-muted-foreground">{form.mime_type} {fileSizeLabel(form.file_size) ? `- ${fileSizeLabel(form.file_size)}` : ""}</p>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingDoc ? "Guardar cambios" : "Guardar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewDoc?.title || "Preview"}</DialogTitle>
              <DialogDescription>{previewDoc?.file_name || previewDoc?.mime_type || "Documento digital"}</DialogDescription>
            </DialogHeader>
            <div className="min-h-[320px] overflow-hidden rounded-lg border bg-muted/30">
              {previewDoc?.mime_type?.startsWith("image/") && previewDoc.file_url ? (
                <img src={previewDoc.file_url} alt={previewDoc.title} className="h-[60vh] w-full object-contain" />
              ) : previewDoc?.file_url ? (
                <iframe title={previewDoc.title} src={previewDoc.file_url} className="h-[60vh] w-full" />
              ) : (
                <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">Este documento no tiene archivo digital.</div>
              )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setPreviewOpen(false)}>Cerrar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGuard>
  );
}
