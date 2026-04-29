"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, Eye, Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
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
import { ModuleGuard } from "@/components/providers/ModuleGuard";

type GroupStatus = "active" | "inactive";

type Group = {
  id: string;
  name: string;
  grade_level_id?: string;
  grade_name: string;
  school_year_id?: string;
  school_year?: string;
  generation?: string;
  teacher_id?: string;
  teacher_ids?: string[];
  teacher_name: string;
  subject_ids?: string[];
  student_ids?: string[];
  student_count: number;
  max_students: number;
  room: string;
  schedule: string;
  status: GroupStatus;
  description?: string;
  created_at: string;
  students?: Array<{ id: string; first_name: string; last_name: string; enrollment_id: string; status: string; grade_name?: string; group_name?: string }>;
  teachers?: Teacher[];
  subjects?: Subject[];
};

type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  specialties?: string[];
  email?: string;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  enrollment_id: string;
  status: string;
  group_id?: string;
  group_name?: string;
  grade_name?: string;
};

type Subject = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type SchoolYear = {
  id: string;
  name: string;
  is_current: boolean;
  status: string;
};

type GroupFormState = {
  name: string;
  grade_level_id: string;
  school_year_id: string;
  generation: string;
  teacher_ids: string[];
  student_ids: string[];
  subject_ids: string[];
  max_students: string;
  room: string;
  schedule: string;
  status: GroupStatus;
  description: string;
};

const gradeLevels = [
  { id: "grade-1", name: "Primero" },
  { id: "grade-2", name: "Segundo" },
  { id: "grade-3", name: "Tercero" },
  { id: "grade-4", name: "Cuarto" },
  { id: "grade-5", name: "Quinto" },
  { id: "grade-6", name: "Sexto" },
];

const emptyForm: GroupFormState = {
  name: "",
  grade_level_id: "grade-1",
  school_year_id: "",
  generation: "",
  teacher_ids: [],
  student_ids: [],
  subject_ids: [],
  max_students: "30",
  room: "",
  schedule: "Lun-Vie 08:00-13:30",
  status: "active",
  description: "",
};

function normalizeGroups(response: any): Group[] {
  const raw = response?.data?.groups || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeTeachers(response: any): Teacher[] {
  const raw = response?.data?.teachers || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeStudents(response: any): Student[] {
  const raw = response?.data?.students || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeSubjects(response: any): Subject[] {
  const raw = response?.data?.subjects || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeSchoolYears(response: any): SchoolYear[] {
  const raw = response?.data?.school_years || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function toForm(group: Group): GroupFormState {
  return {
    name: group.name || "",
    grade_level_id: group.grade_level_id || gradeLevels.find((item) => item.name === group.grade_name)?.id || "grade-1",
    school_year_id: group.school_year_id || "",
    generation: group.generation || "",
    teacher_ids: group.teacher_ids || (group.teacher_id ? [group.teacher_id] : []),
    student_ids: group.student_ids || group.students?.map((student) => student.id) || [],
    subject_ids: group.subject_ids || group.subjects?.map((subject) => subject.id) || [],
    max_students: String(group.max_students || 30),
    room: group.room || "",
    schedule: group.schedule || "",
    status: group.status || "active",
    description: group.description || "",
  };
}

function toPayload(form: GroupFormState) {
  return {
    name: form.name.trim(),
    grade_level_id: form.grade_level_id,
    school_year_id: form.school_year_id,
    generation: form.generation.trim(),
    teacher_ids: form.teacher_ids,
    student_ids: form.student_ids,
    subject_ids: form.subject_ids,
    teacher_id: form.teacher_ids[0] || "",
    max_students: Number(form.max_students || 30),
    room: form.room.trim(),
    schedule: form.schedule.trim(),
    status: form.status,
    description: form.description.trim(),
  };
}

function teacherName(teacher: Teacher) {
  return `${teacher.first_name} ${teacher.last_name}`.trim();
}

function SchoolGroupsContent() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [form, setForm] = useState<GroupFormState>(emptyForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsResponse, teachersResponse, studentsResponse, subjectsResponse, yearsResponse] = await Promise.all([
        authFetch("/api/v1/school-admin/academic/groups"),
        authFetch("/api/v1/school-admin/academic/teachers"),
        authFetch("/api/v1/school-admin/academic/students?per_page=500"),
        authFetch("/api/v1/school-admin/academic/subjects"),
        authFetch("/api/v1/school-admin/academic/school-years"),
      ]);
      setGroups(normalizeGroups(groupsResponse));
      setTeachers(normalizeTeachers(teachersResponse).filter((teacher) => teacher.status === "active"));
      setStudents(normalizeStudents(studentsResponse));
      setSubjects(normalizeSubjects(subjectsResponse).filter((subject) => subject.status === "active"));
      setSchoolYears(normalizeSchoolYears(yearsResponse));
    } catch (error) {
      toast({
        title: "No se pudieron cargar grupos",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return groups.filter((group) => {
      const matchesSearch = !term || `${group.grade_name} ${group.name} ${group.teacher_name} ${group.room}`.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || group.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [groups, search, statusFilter]);

  const stats = useMemo(() => {
    const active = groups.filter((group) => group.status === "active").length;
    const assigned = groups.filter((group) => !!group.teacher_name).length;
    const capacity = groups.reduce((sum, group) => sum + (group.max_students || 0), 0);
    const students = groups.reduce((sum, group) => sum + (group.student_count || 0), 0);
    return { total: groups.length, active, assigned, occupancy: capacity ? Math.round((students / capacity) * 100) : 0 };
  }, [groups]);

  const currentYear = useMemo(() => schoolYears.find((year) => year.is_current) || schoolYears[0], [schoolYears]);

  const openCreate = () => {
    setEditingGroup(null);
    setForm({ ...emptyForm, school_year_id: currentYear?.id || "", generation: `Generacion ${new Date().getFullYear() + 6}` });
    setFormOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setForm(toForm(group));
    setFormOpen(true);
  };

  const openDetail = async (group: Group) => {
    setSelectedGroup(group);
    setDetailOpen(true);
    try {
      const response = await authFetch(`/api/v1/school-admin/academic/groups/${group.id}`);
      if (response?.success && response.data) setSelectedGroup(response.data);
    } catch {
      setSelectedGroup(group);
    }
  };

  const saveGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Revisa el formulario", description: "El nombre del grupo es obligatorio.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const endpoint = editingGroup ? `/api/v1/school-admin/academic/groups/${editingGroup.id}` : "/api/v1/school-admin/academic/groups";
      const response = await authFetch(endpoint, {
        method: editingGroup ? "PUT" : "POST",
        body: JSON.stringify(toPayload(form)),
      });
      if (!response?.success) throw new Error(response?.message || "Operacion rechazada por el servidor.");
      toast({ title: editingGroup ? "Grupo actualizado" : "Grupo creado", description: "La estructura academica quedo sincronizada." });
      setFormOpen(false);
      await loadData();
    } catch (error) {
      toast({
        title: "No se pudo guardar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (group: Group) => {
    const status: GroupStatus = group.status === "active" ? "inactive" : "active";
    try {
      const response = await authFetch(`/api/v1/school-admin/academic/groups/${group.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo cambiar el estado.");
      setGroups((current) => current.map((item) => (item.id === group.id ? { ...item, status } : item)));
      toast({ title: "Estado actualizado", description: `${group.grade_name} ${group.name} fue actualizado.` });
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const deleteGroup = async () => {
    if (!selectedGroup) return;
    try {
      setSaving(true);
      const response = await authFetch(`/api/v1/school-admin/academic/groups/${selectedGroup.id}`, { method: "DELETE" });
      if (!response?.success) throw new Error(response?.message || "No se pudo eliminar.");
      setGroups((current) => current.filter((group) => group.id !== selectedGroup.id));
      toast({ title: "Grupo eliminado", description: "El grupo fue retirado del ciclo actual." });
      setDeleteOpen(false);
      setSelectedGroup(null);
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grupos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organiza grados, generaciones, profesores, alumnos y materias por grupo.</p>
        </div>
        <Button onClick={openCreate} className="w-full md:w-auto"><Plus className="mr-2 h-4 w-4" />Nuevo grupo</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><BookOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Grupos registrados</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Activos</CardTitle><Users className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.active}</div><p className="text-xs text-muted-foreground">En ciclo actual</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ciclo actual</CardTitle><CalendarDays className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-lg font-bold">{currentYear?.name || "Sin ciclo"}</div><p className="text-xs text-muted-foreground">{stats.assigned} grupos con profesor</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ocupacion</CardTitle><BookOpen className="h-4 w-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.occupancy}%</div><p className="text-xs text-muted-foreground">Cupos utilizados</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Mapa de grupos</CardTitle>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_auto]">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo" className="pl-9" /></div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="inactive">Pausados</SelectItem></SelectContent></Select>
              <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Limpiar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando grupos</div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><BookOpen className="h-10 w-10 text-muted-foreground" /><div><p className="font-medium">No hay grupos con esos filtros</p><p className="text-sm text-muted-foreground">Ajusta la busqueda o crea un grupo.</p></div><Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nuevo grupo</Button></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>Ciclo / generacion</TableHead><TableHead>Profesores</TableHead><TableHead>Materias</TableHead><TableHead>Cupo</TableHead><TableHead>Salon</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell><div className="font-medium">{group.grade_name} {group.name}</div><div className="text-xs text-muted-foreground">{group.description || "Sin descripcion"}</div></TableCell>
                    <TableCell><div className="font-medium">{group.school_year || currentYear?.name || "Sin ciclo"}</div><div className="text-xs text-muted-foreground">{group.generation || "Sin generacion"}</div></TableCell>
                    <TableCell>{group.teacher_name || <span className="text-muted-foreground">Sin profesor</span>}</TableCell>
                    <TableCell>{(group.subject_ids || []).length || group.subjects?.length || 0}</TableCell>
                    <TableCell>{group.student_count}/{group.max_students}</TableCell>
                    <TableCell>{group.room || "No asignado"}</TableCell>
                    <TableCell><Badge variant={group.status === "active" ? "default" : "outline"}>{group.status === "active" ? "Activo" : "Pausado"}</Badge></TableCell>
                    <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" title="Ver detalle" onClick={() => openDetail(group)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(group)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title={group.status === "active" ? "Pausar" : "Activar"} onClick={() => changeStatus(group)}><Users className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Eliminar" onClick={() => { setSelectedGroup(group); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingGroup ? "Editar grupo" : "Nuevo grupo"}</DialogTitle><DialogDescription>Define grado, cupo, salon y profesor titular.</DialogDescription></DialogHeader>
          <form onSubmit={saveGroup} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="name">Nombre</Label><Input id="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Grado</Label><Select value={form.grade_level_id} onValueChange={(value) => setForm((current) => ({ ...current, grade_level_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{gradeLevels.map((grade) => <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Ciclo escolar</Label><Select value={form.school_year_id || currentYear?.id || "none"} onValueChange={(value) => setForm((current) => ({ ...current, school_year_id: value === "none" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin ciclo</SelectItem>{schoolYears.map((year) => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="generation">Generacion</Label><Input id="generation" value={form.generation} onChange={(event) => setForm((current) => ({ ...current, generation: event.target.value }))} placeholder="Generacion 2031" /></div>
              <div className="space-y-2"><Label htmlFor="max_students">Cupo maximo</Label><Input id="max_students" type="number" min="1" value={form.max_students} onChange={(event) => setForm((current) => ({ ...current, max_students: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="room">Salon</Label><Input id="room" value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="schedule">Horario</Label><Input id="schedule" value={form.schedule} onChange={(event) => setForm((current) => ({ ...current, schedule: event.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="description">Descripcion</Label><Textarea id="description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2">
                <Label>Profesores asociados</Label>
                <div className="grid max-h-36 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                  {teachers.map((teacher) => (
                    <label key={teacher.id} className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-muted">
                      <input type="checkbox" checked={form.teacher_ids.includes(teacher.id)} onChange={(event) => setForm((current) => ({ ...current, teacher_ids: event.target.checked ? Array.from(new Set([...current.teacher_ids, teacher.id])) : current.teacher_ids.filter((id) => id !== teacher.id) }))} />
                      <span><span className="font-medium">{teacherName(teacher)}</span><span className="block text-xs text-muted-foreground">{teacher.specialties?.join(", ") || teacher.email || "Profesor activo"}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Materias del grupo</Label>
                <div className="grid max-h-36 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                  {subjects.map((subject) => (
                    <label key={subject.id} className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-muted">
                      <input type="checkbox" checked={form.subject_ids.includes(subject.id)} onChange={(event) => setForm((current) => ({ ...current, subject_ids: event.target.checked ? Array.from(new Set([...current.subject_ids, subject.id])) : current.subject_ids.filter((id) => id !== subject.id) }))} />
                      <span>{subject.name} <span className="text-xs text-muted-foreground">({subject.code})</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Alumnos asignados</Label>
                <div className="grid max-h-44 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                  {students.map((student) => (
                    <label key={student.id} className="flex items-start gap-2 rounded-md p-2 text-sm hover:bg-muted">
                      <input type="checkbox" checked={form.student_ids.includes(student.id)} onChange={(event) => setForm((current) => ({ ...current, student_ids: event.target.checked ? Array.from(new Set([...current.student_ids, student.id])) : current.student_ids.filter((id) => id !== student.id) }))} />
                      <span><span className="font-medium">{student.first_name} {student.last_name}</span><span className="block text-xs text-muted-foreground">{student.enrollment_id} · {student.grade_name || "Sin grado"}</span></span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{selectedGroup ? `${selectedGroup.grade_name} ${selectedGroup.name}` : "Detalle del grupo"}</DialogTitle><DialogDescription>Resumen operativo del grupo.</DialogDescription></DialogHeader>
          {selectedGroup && <div className="space-y-4"><div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Ciclo</p><p className="font-medium">{selectedGroup.school_year || currentYear?.name || "Sin ciclo"}</p></div><div><p className="text-xs text-muted-foreground">Generacion</p><p className="font-medium">{selectedGroup.generation || "Sin generacion"}</p></div><div><p className="text-xs text-muted-foreground">Salon</p><p className="font-medium">{selectedGroup.room || "No asignado"}</p></div><div><p className="text-xs text-muted-foreground">Cupo</p><p className="font-medium">{selectedGroup.student_count}/{selectedGroup.max_students}</p></div></div><div><p className="mb-2 text-sm font-medium">Profesores asociados</p><div className="space-y-2">{(selectedGroup.teachers || []).length > 0 ? selectedGroup.teachers?.map((teacher) => <div key={teacher.id} className="rounded-md border p-3 text-sm">{teacherName(teacher)}<span className="block text-xs text-muted-foreground">{teacher.email || teacher.specialties?.join(", ") || "Profesor"}</span></div>) : <p className="text-sm text-muted-foreground">Sin profesores asociados.</p>}</div></div><div><p className="mb-2 text-sm font-medium">Materias del grupo</p><div className="grid gap-2 sm:grid-cols-2">{(selectedGroup.subjects || []).length > 0 ? selectedGroup.subjects?.map((subject) => <div key={subject.id} className="rounded-md border p-3 text-sm">{subject.name}<span className="ml-2 text-xs text-muted-foreground">{subject.code}</span></div>) : <p className="text-sm text-muted-foreground">Sin materias asignadas.</p>}</div></div><div><p className="mb-2 text-sm font-medium">Estudiantes asignados</p><div className="space-y-2">{(selectedGroup.students || []).length > 0 ? selectedGroup.students?.map((student) => <div key={student.id} className="rounded-md border p-3 text-sm">{student.first_name} {student.last_name} - {student.enrollment_id}</div>) : <p className="text-sm text-muted-foreground">Sin estudiantes asignados.</p>}</div></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>{selectedGroup && <Button onClick={() => { setDetailOpen(false); openEdit(selectedGroup); }}><Pencil className="mr-2 h-4 w-4" />Editar</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Eliminar grupo</DialogTitle><DialogDescription>Esta accion retira el grupo del ciclo actual.</DialogDescription></DialogHeader>
          <div className="rounded-lg border p-3 text-sm">{selectedGroup ? `${selectedGroup.grade_name} ${selectedGroup.name}` : "Grupo seleccionado"}</div>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button><Button variant="destructive" onClick={deleteGroup} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SchoolGroupsPage() {
  return (
    <ModuleGuard moduleKey="groups" moduleName="Grupos">
      <SchoolGroupsContent />
    </ModuleGuard>
  );
}
