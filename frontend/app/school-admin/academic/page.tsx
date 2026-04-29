"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, Eye, GraduationCap, Loader2, Pencil, Plus, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

type SchoolYear = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "planned" | "active" | "closed" | "archived";
  is_current: boolean;
  notes?: string;
  group_count: number;
  student_count: number;
};

type Subject = {
  id: string;
  name: string;
  code: string;
  description: string;
  credits: number;
  grade_level_id?: string;
  grade_name?: string;
  status: "active" | "inactive";
  teacher_count: number;
  student_count: number;
};

type Group = {
  id: string;
  name: string;
  grade_name: string;
  generation?: string;
  school_year_id?: string;
  school_year?: string;
  student_count: number;
  status: string;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  enrollment_id: string;
  group_id?: string;
  group_name?: string;
  grade_name?: string;
  status: string;
};

const gradeLevels = [
  { id: "grade-1", name: "Primero" },
  { id: "grade-2", name: "Segundo" },
  { id: "grade-3", name: "Tercero" },
  { id: "grade-4", name: "Cuarto" },
  { id: "grade-5", name: "Quinto" },
  { id: "grade-6", name: "Sexto" },
];

const emptyYear = { name: "", start_date: "", end_date: "", status: "planned", is_current: false, notes: "" };
const emptySubject = { name: "", code: "", description: "", credits: "1", grade_level_id: "all", status: "active" };

function normalize<T>(response: any, key: string): T[] {
  const raw = response?.data?.[key] || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function statusLabel(status: string) {
  const labels: Record<string, string> = { planned: "Planeado", active: "Actual", closed: "Cerrado", archived: "Archivado", inactive: "Pausado" };
  return labels[status] || status;
}

export default function SchoolAcademicStructurePage() {
  const { toast } = useToast();
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [yearOpen, setYearOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<SchoolYear | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [yearForm, setYearForm] = useState<any>(emptyYear);
  const [subjectForm, setSubjectForm] = useState<any>(emptySubject);

  const loadData = async () => {
    try {
      setLoading(true);
      const [yearsResponse, subjectsResponse, groupsResponse, studentsResponse] = await Promise.all([
        authFetch("/api/v1/school-admin/academic/school-years"),
        authFetch("/api/v1/school-admin/academic/subjects"),
        authFetch("/api/v1/school-admin/academic/groups"),
        authFetch("/api/v1/school-admin/academic/students?per_page=500"),
      ]);
      setYears(normalize<SchoolYear>(yearsResponse, "school_years"));
      setSubjects(normalize<Subject>(subjectsResponse, "subjects"));
      setGroups(normalize<Group>(groupsResponse, "groups"));
      setStudents(normalize<Student>(studentsResponse, "students"));
    } catch (error) {
      toast({ title: "No se pudo cargar estructura academica", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentYear = years.find((year) => year.is_current) || years[0];
  const previousYears = years.filter((year) => !year.is_current);
  const activeSubjects = subjects.filter((subject) => subject.status === "active");

  const gradeGeneration = useMemo(() => {
    return gradeLevels.map((grade) => {
      const gradeGroups = groups.filter((group) => group.grade_name === grade.name);
      const gradeStudents = students.filter((student) => student.grade_name === grade.name || gradeGroups.some((group) => group.id === student.group_id));
      const generations = Array.from(new Set(gradeGroups.map((group) => group.generation || "Generacion no definida")));
      return { grade, groups: gradeGroups, students: gradeStudents, generations };
    });
  }, [groups, students]);

  const filteredSubjects = subjects.filter((subject) => {
    const term = search.trim().toLowerCase();
    return !term || `${subject.name} ${subject.code} ${subject.description}`.toLowerCase().includes(term);
  });

  const openYear = (year?: SchoolYear) => {
    setEditingYear(year || null);
    setYearForm(year ? { ...year } : { ...emptyYear, start_date: currentYear?.start_date || "2026-08-24", end_date: "2027-07-09" });
    setYearOpen(true);
  };

  const openSubject = (subject?: Subject) => {
    setEditingSubject(subject || null);
    setSubjectForm(subject ? { ...subject, credits: String(subject.credits || 1), grade_level_id: subject.grade_level_id || "all" } : emptySubject);
    setSubjectOpen(true);
  };

  const saveYear = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!yearForm.name || !yearForm.start_date || !yearForm.end_date) {
      toast({ title: "Revisa el ciclo", description: "Nombre, inicio y fin son obligatorios.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const response = await authFetch(editingYear ? `/api/v1/school-admin/academic/school-years/${editingYear.id}` : "/api/v1/school-admin/academic/school-years", {
        method: editingYear ? "PUT" : "POST",
        body: JSON.stringify(yearForm),
      });
      if (!response?.success) throw new Error(response?.message || "Operacion rechazada.");
      toast({ title: editingYear ? "Ciclo actualizado" : "Ciclo creado", description: "La estructura de ciclos quedo sincronizada." });
      setYearOpen(false);
      await loadData();
    } catch (error) {
      toast({ title: "No se pudo guardar", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveSubject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subjectForm.name || !subjectForm.code) {
      toast({ title: "Revisa la materia", description: "Nombre y clave son obligatorios.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const payload = { ...subjectForm, grade_level_id: subjectForm.grade_level_id === "all" ? "" : subjectForm.grade_level_id, credits: Number(subjectForm.credits || 1) };
      const response = await authFetch(editingSubject ? `/api/v1/school-admin/academic/subjects/${editingSubject.id}` : "/api/v1/school-admin/academic/subjects", {
        method: editingSubject ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      if (!response?.success) throw new Error(response?.message || "Operacion rechazada.");
      toast({ title: editingSubject ? "Materia actualizada" : "Materia creada", description: "El catalogo academico quedo actualizado." });
      setSubjectOpen(false);
      await loadData();
    } catch (error) {
      toast({ title: "No se pudo guardar", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-80 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando estructura academica</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estructura Academica</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ciclos escolares, materias, generaciones y organizacion por grado.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => openYear()}><CalendarDays className="mr-2 h-4 w-4" />Nuevo ciclo</Button>
          <Button onClick={() => openSubject()}><Plus className="mr-2 h-4 w-4" />Nueva materia</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ciclo actual</CardTitle><CalendarDays className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-xl font-bold">{currentYear?.name || "Sin ciclo"}</div><p className="text-xs text-muted-foreground">{currentYear ? `${currentYear.start_date} a ${currentYear.end_date}` : "Crea un ciclo para iniciar"}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ciclos anteriores</CardTitle><Eye className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{previousYears.length}</div><p className="text-xs text-muted-foreground">Disponibles para historial</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Materias activas</CardTitle><BookOpen className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{activeSubjects.length}</div><p className="text-xs text-muted-foreground">Catalogo institucional</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Alumnos clasificados</CardTitle><Users className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{students.length}</div><p className="text-xs text-muted-foreground">Por grado y generacion</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader><CardTitle>Ciclos escolares</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {years.map((year) => (
              <div key={year.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{year.name}</p>
                    <p className="text-xs text-muted-foreground">{year.start_date} - {year.end_date}</p>
                  </div>
                  <Badge variant={year.is_current ? "default" : "outline"}>{year.is_current ? "Actual" : statusLabel(year.status)}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-muted p-2"><p className="text-xs text-muted-foreground">Grupos</p><p className="font-medium">{year.group_count}</p></div>
                  <div className="rounded-md bg-muted p-2"><p className="text-xs text-muted-foreground">Alumnos</p><p className="font-medium">{year.student_count}</p></div>
                </div>
                <Button className="mt-3 w-full" variant="outline" size="sm" onClick={() => openYear(year)}><Pencil className="mr-2 h-4 w-4" />Editar ciclo</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>Catalogo global de materias</CardTitle>
              <div className="relative w-full lg:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar materia" className="pl-9" /></div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Clave</TableHead><TableHead>Grado</TableHead><TableHead>Creditos</TableHead><TableHead>Cobertura</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredSubjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell><div className="font-medium">{subject.name}</div><div className="text-xs text-muted-foreground">{subject.description || "Sin descripcion"}</div></TableCell>
                    <TableCell>{subject.code}</TableCell>
                    <TableCell>{subject.grade_name || "Todos"}</TableCell>
                    <TableCell>{subject.credits}</TableCell>
                    <TableCell>{subject.teacher_count} profesores / {subject.student_count} alumnos</TableCell>
                    <TableCell><Badge variant={subject.status === "active" ? "default" : "outline"}>{subject.status === "active" ? "Activa" : "Pausada"}</Badge></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon-sm" onClick={() => openSubject(subject)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Alumnos por grado y generacion</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gradeGeneration.map((item) => (
              <div key={item.grade.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{item.grade.name}</p>
                    <p className="text-xs text-muted-foreground">{item.generations.join(", ") || "Sin generacion"}</p>
                  </div>
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-muted p-2"><p className="text-xs text-muted-foreground">Grupos</p><p className="font-medium">{item.groups.length}</p></div>
                  <div className="rounded-md bg-muted p-2"><p className="text-xs text-muted-foreground">Alumnos</p><p className="font-medium">{item.students.length}</p></div>
                </div>
                <div className="mt-3 space-y-2">
                  {item.groups.map((group) => <div key={group.id} className="rounded-md border p-2 text-sm">{group.name} · {group.student_count} alumnos · {group.status === "active" ? "Activo" : "Pausado"}</div>)}
                  {item.groups.length === 0 && <p className="text-sm text-muted-foreground">Sin grupos registrados.</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={yearOpen} onOpenChange={setYearOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingYear ? "Editar ciclo escolar" : "Nuevo ciclo escolar"}</DialogTitle><DialogDescription>Define el periodo academico y si sera el ciclo actual.</DialogDescription></DialogHeader>
          <form onSubmit={saveYear} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label>Nombre</Label><Input value={yearForm.name} onChange={(event) => setYearForm((current: any) => ({ ...current, name: event.target.value }))} placeholder="Ciclo 2026-2027" /></div>
              <div className="space-y-2"><Label>Inicio</Label><Input type="date" value={yearForm.start_date} onChange={(event) => setYearForm((current: any) => ({ ...current, start_date: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Fin</Label><Input type="date" value={yearForm.end_date} onChange={(event) => setYearForm((current: any) => ({ ...current, end_date: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Estado</Label><Select value={yearForm.status} onValueChange={(value) => setYearForm((current: any) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="planned">Planeado</SelectItem><SelectItem value="active">Activo</SelectItem><SelectItem value="closed">Cerrado</SelectItem><SelectItem value="archived">Archivado</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Ciclo actual</Label><Select value={yearForm.is_current ? "yes" : "no"} onValueChange={(value) => setYearForm((current: any) => ({ ...current, is_current: value === "yes", status: value === "yes" ? "active" : current.status }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Si</SelectItem><SelectItem value="no">No</SelectItem></SelectContent></Select></div>
              <div className="space-y-2 sm:col-span-2"><Label>Notas</Label><Textarea value={yearForm.notes || ""} onChange={(event) => setYearForm((current: any) => ({ ...current, notes: event.target.value }))} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setYearOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={subjectOpen} onOpenChange={setSubjectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSubject ? "Editar materia" : "Nueva materia"}</DialogTitle><DialogDescription>Administra el catalogo global de materias de la institucion.</DialogDescription></DialogHeader>
          <form onSubmit={saveSubject} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Nombre</Label><Input value={subjectForm.name} onChange={(event) => setSubjectForm((current: any) => ({ ...current, name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Clave</Label><Input value={subjectForm.code} onChange={(event) => setSubjectForm((current: any) => ({ ...current, code: event.target.value.toUpperCase() }))} /></div>
              <div className="space-y-2"><Label>Grado</Label><Select value={subjectForm.grade_level_id || "all"} onValueChange={(value) => setSubjectForm((current: any) => ({ ...current, grade_level_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los grados</SelectItem>{gradeLevels.map((grade) => <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Creditos</Label><Input type="number" min="1" value={subjectForm.credits} onChange={(event) => setSubjectForm((current: any) => ({ ...current, credits: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Estado</Label><Select value={subjectForm.status} onValueChange={(value) => setSubjectForm((current: any) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Activa</SelectItem><SelectItem value="inactive">Pausada</SelectItem></SelectContent></Select></div>
              <div className="space-y-2 sm:col-span-2"><Label>Descripcion</Label><Textarea value={subjectForm.description} onChange={(event) => setSubjectForm((current: any) => ({ ...current, description: event.target.value }))} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setSubjectOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
