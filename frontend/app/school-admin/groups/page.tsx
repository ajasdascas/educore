"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, Eye, Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
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

type GroupStatus = "active" | "inactive";

type Group = {
  id: string;
  name: string;
  grade_level_id?: string;
  grade_name: string;
  teacher_id?: string;
  teacher_name: string;
  student_count: number;
  max_students: number;
  room: string;
  schedule: string;
  status: GroupStatus;
  description?: string;
  created_at: string;
  students?: Array<{ id: string; first_name: string; last_name: string; enrollment_id: string; status: string }>;
};

type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
};

type GroupFormState = {
  name: string;
  grade_level_id: string;
  teacher_id: string;
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
  teacher_id: "",
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

function toForm(group: Group): GroupFormState {
  return {
    name: group.name || "",
    grade_level_id: group.grade_level_id || gradeLevels.find((item) => item.name === group.grade_name)?.id || "grade-1",
    teacher_id: group.teacher_id || "",
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
    teacher_id: form.teacher_id === "none" ? "" : form.teacher_id,
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

export default function SchoolGroupsPage() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
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
      const [groupsResponse, teachersResponse] = await Promise.all([
        authFetch("/api/v1/school-admin/academic/groups"),
        authFetch("/api/v1/school-admin/academic/teachers"),
      ]);
      setGroups(normalizeGroups(groupsResponse));
      setTeachers(normalizeTeachers(teachersResponse).filter((teacher) => teacher.status === "active"));
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

  const openCreate = () => {
    setEditingGroup(null);
    setForm(emptyForm);
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
          <p className="mt-1 text-sm text-muted-foreground">Organiza grados, cupos, salones y profesor titular.</p>
        </div>
        <Button onClick={openCreate} className="w-full md:w-auto"><Plus className="mr-2 h-4 w-4" />Nuevo grupo</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><BookOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Grupos registrados</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Activos</CardTitle><Users className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.active}</div><p className="text-xs text-muted-foreground">En ciclo actual</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Con titular</CardTitle><Users className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.assigned}</div><p className="text-xs text-muted-foreground">Profesor asignado</p></CardContent></Card>
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
              <TableHeader><TableRow><TableHead>Grupo</TableHead><TableHead>Titular</TableHead><TableHead>Cupo</TableHead><TableHead>Salon</TableHead><TableHead>Horario</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell><div className="font-medium">{group.grade_name} {group.name}</div><div className="text-xs text-muted-foreground">{group.description || "Sin descripcion"}</div></TableCell>
                    <TableCell>{group.teacher_name || <span className="text-muted-foreground">Sin titular</span>}</TableCell>
                    <TableCell>{group.student_count}/{group.max_students}</TableCell>
                    <TableCell>{group.room || "No asignado"}</TableCell>
                    <TableCell>{group.schedule || "No asignado"}</TableCell>
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
              <div className="space-y-2"><Label>Profesor titular</Label><Select value={form.teacher_id || "none"} onValueChange={(value) => setForm((current) => ({ ...current, teacher_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin titular</SelectItem>{teachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacherName(teacher)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="max_students">Cupo maximo</Label><Input id="max_students" type="number" min="1" value={form.max_students} onChange={(event) => setForm((current) => ({ ...current, max_students: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="room">Salon</Label><Input id="room" value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="schedule">Horario</Label><Input id="schedule" value={form.schedule} onChange={(event) => setForm((current) => ({ ...current, schedule: event.target.value }))} /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="description">Descripcion</Label><Textarea id="description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{selectedGroup ? `${selectedGroup.grade_name} ${selectedGroup.name}` : "Detalle del grupo"}</DialogTitle><DialogDescription>Resumen operativo del grupo.</DialogDescription></DialogHeader>
          {selectedGroup && <div className="space-y-4"><div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Titular</p><p className="font-medium">{selectedGroup.teacher_name || "Sin titular"}</p></div><div><p className="text-xs text-muted-foreground">Salon</p><p className="font-medium">{selectedGroup.room || "No asignado"}</p></div><div><p className="text-xs text-muted-foreground">Horario</p><p className="font-medium">{selectedGroup.schedule || "No asignado"}</p></div><div><p className="text-xs text-muted-foreground">Cupo</p><p className="font-medium">{selectedGroup.student_count}/{selectedGroup.max_students}</p></div></div><div><p className="mb-2 text-sm font-medium">Estudiantes asignados</p><div className="space-y-2">{(selectedGroup.students || []).length > 0 ? selectedGroup.students?.map((student) => <div key={student.id} className="rounded-md border p-3 text-sm">{student.first_name} {student.last_name} - {student.enrollment_id}</div>) : <p className="text-sm text-muted-foreground">Sin estudiantes asignados.</p>}</div></div></div>}
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
