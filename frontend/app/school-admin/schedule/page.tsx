"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Eye, Filter, Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
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

type ScheduleStatus = "active" | "inactive";

type ScheduleBlock = {
  id: string;
  group_id: string;
  group_name: string;
  grade_name: string;
  teacher_id: string;
  teacher_name: string;
  subject_id?: string;
  subject: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  status: ScheduleStatus;
  notes?: string;
  created_at: string;
  updated_at?: string;
};

type SchoolGroup = {
  id: string;
  name: string;
  grade_name: string;
  room: string;
  status: string;
};

type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
};

type Subject = {
  id: string;
  name: string;
  code: string;
  status: string;
};

type ScheduleFormState = {
  group_id: string;
  teacher_id: string;
  subject_id: string;
  subject: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  status: ScheduleStatus;
  notes: string;
};

const days = [
  { value: "monday", label: "Lunes", short: "Lun" },
  { value: "tuesday", label: "Martes", short: "Mar" },
  { value: "wednesday", label: "Miercoles", short: "Mie" },
  { value: "thursday", label: "Jueves", short: "Jue" },
  { value: "friday", label: "Viernes", short: "Vie" },
];

const emptyForm: ScheduleFormState = {
  group_id: "",
  teacher_id: "",
  subject_id: "",
  subject: "",
  day: "monday",
  start_time: "08:00",
  end_time: "08:50",
  room: "",
  status: "active",
  notes: "",
};

function normalizeBlocks(response: any): ScheduleBlock[] {
  const raw = response?.data?.schedule || response?.data?.blocks || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeGroups(response: any): SchoolGroup[] {
  const raw = response?.data?.groups || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeTeachers(response: any): Teacher[] {
  const raw = response?.data?.teachers || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeSubjects(response: any): Subject[] {
  const raw = response?.data?.subjects || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function dayLabel(day: string) {
  return days.find((item) => item.value === day)?.label || day;
}

function groupLabel(group: SchoolGroup) {
  return `${group.grade_name} ${group.name}`.trim();
}

function teacherName(teacher: Teacher) {
  return `${teacher.first_name} ${teacher.last_name}`.trim();
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

function toForm(block: ScheduleBlock): ScheduleFormState {
  return {
    group_id: block.group_id || "",
    teacher_id: block.teacher_id || "",
    subject_id: block.subject_id || "",
    subject: block.subject || "",
    day: block.day || "monday",
    start_time: block.start_time || "08:00",
    end_time: block.end_time || "08:50",
    room: block.room || "",
    status: block.status || "active",
    notes: block.notes || "",
  };
}

function toPayload(form: ScheduleFormState) {
  return {
    group_id: form.group_id,
    teacher_id: form.teacher_id,
    subject_id: form.subject_id,
    subject: form.subject.trim(),
    day: form.day,
    start_time: form.start_time,
    end_time: form.end_time,
    room: form.room.trim(),
    status: form.status,
    notes: form.notes.trim(),
  };
}

function SchoolScheduleContent() {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(emptyForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scheduleResponse, groupsResponse, teachersResponse, subjectsResponse] = await Promise.all([
        authFetch("/api/v1/school-admin/academic/schedule"),
        authFetch("/api/v1/school-admin/academic/groups"),
        authFetch("/api/v1/school-admin/academic/teachers"),
        authFetch("/api/v1/school-admin/academic/subjects"),
      ]);
      setBlocks(normalizeBlocks(scheduleResponse));
      setGroups(normalizeGroups(groupsResponse));
      setTeachers(normalizeTeachers(teachersResponse));
      setSubjects(normalizeSubjects(subjectsResponse).filter((subject) => subject.status === "active"));
    } catch (error) {
      toast({
        title: "No se pudo cargar horarios",
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

  const filteredBlocks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return blocks
      .filter((block) => {
        const matchesSearch = !term || `${block.subject} ${block.teacher_name} ${block.group_name} ${block.grade_name} ${block.room}`.toLowerCase().includes(term);
        const matchesGroup = groupFilter === "all" || block.group_id === groupFilter;
        const matchesDay = dayFilter === "all" || block.day === dayFilter;
        const matchesStatus = statusFilter === "all" || block.status === statusFilter;
        return matchesSearch && matchesGroup && matchesDay && matchesStatus;
      })
      .sort((a, b) => {
        const dayDiff = days.findIndex((day) => day.value === a.day) - days.findIndex((day) => day.value === b.day);
        if (dayDiff !== 0) return dayDiff;
        return toMinutes(a.start_time) - toMinutes(b.start_time);
      });
  }, [blocks, dayFilter, groupFilter, search, statusFilter]);

  const stats = useMemo(() => {
    const active = blocks.filter((block) => block.status === "active").length;
    const groupsCovered = new Set(blocks.filter((block) => block.status === "active").map((block) => block.group_id)).size;
    const weeklyMinutes = blocks
      .filter((block) => block.status === "active")
      .reduce((sum, block) => sum + Math.max(0, toMinutes(block.end_time) - toMinutes(block.start_time)), 0);
    const conflictCount = blocks.filter((block) => hasConflict(block, blocks)).length;
    return { total: blocks.length, active, groupsCovered, weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10, conflictCount };
  }, [blocks]);

  const groupedByDay = useMemo(() => {
    return days.map((day) => ({
      ...day,
      blocks: filteredBlocks.filter((block) => block.day === day.value),
    }));
  }, [filteredBlocks]);

  const activeTeachers = useMemo(() => teachers.filter((teacher) => teacher.status === "active"), [teachers]);
  const activeGroups = useMemo(() => groups.filter((group) => group.status === "active"), [groups]);
  const activeSubjects = useMemo(() => subjects.filter((subject) => subject.status === "active"), [subjects]);

  const updateGroup = (groupID: string) => {
    const normalizedGroupID = groupID === "none" ? "" : groupID;
    const group = groups.find((item) => item.id === normalizedGroupID);
    setForm((current) => ({
      ...current,
      group_id: normalizedGroupID,
      room: current.room || group?.room || "",
    }));
  };

  const openCreate = (day = dayFilter !== "all" ? dayFilter : "monday") => {
    const defaultGroup = activeGroups[0]?.id || "";
    const defaultTeacher = activeTeachers[0]?.id || "";
    const defaultSubject = activeSubjects[0];
    const group = activeGroups.find((item) => item.id === defaultGroup);
    setEditingBlock(null);
    setForm({ ...emptyForm, day, group_id: defaultGroup, teacher_id: defaultTeacher, subject_id: defaultSubject?.id || "", subject: defaultSubject?.name || "", room: group?.room || "" });
    setFormOpen(true);
  };

  const openEdit = (block: ScheduleBlock) => {
    setEditingBlock(block);
    setForm(toForm(block));
    setFormOpen(true);
  };

  const openDetail = async (block: ScheduleBlock) => {
    setSelectedBlock(block);
    setDetailOpen(true);
    try {
      const response = await authFetch(`/api/v1/school-admin/academic/schedule/${block.id}`);
      if (response?.success && response.data) setSelectedBlock(response.data);
    } catch {
      setSelectedBlock(block);
    }
  };

  const validateForm = () => {
    if (!form.group_id) return "Selecciona un grupo.";
    if (!form.teacher_id) return "Selecciona un profesor.";
    if (!form.subject_id && !form.subject.trim()) return "Selecciona una materia.";
    if (toMinutes(form.start_time) >= toMinutes(form.end_time)) return "La hora final debe ser mayor a la hora inicial.";
    return "";
  };

  const saveBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateForm();
    if (error) {
      toast({ title: "Revisa el formulario", description: error, variant: "destructive" });
      return;
    }

    const conflict = blocks.find((block) => {
      if (block.id === editingBlock?.id || block.status !== "active" || form.status !== "active" || block.day !== form.day) return false;
      if (!overlaps(form.start_time, form.end_time, block.start_time, block.end_time)) return false;
      const sameGroup = block.group_id === form.group_id;
      const sameTeacher = Boolean(form.teacher_id && block.teacher_id === form.teacher_id);
      const sameRoom = Boolean(form.room.trim() && block.room.trim().toLowerCase() === form.room.trim().toLowerCase());
      return sameGroup || sameTeacher || sameRoom;
    });
    if (conflict) {
      const reason = conflict.group_id === form.group_id
        ? "grupo"
        : conflict.teacher_id === form.teacher_id
          ? "profesor"
          : "salon";
      toast({
        title: "Cruce detectado",
        description: `Hay conflicto de ${reason} con ${conflict.subject} de ${conflict.start_time} a ${conflict.end_time}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const endpoint = editingBlock ? `/api/v1/school-admin/academic/schedule/${editingBlock.id}` : "/api/v1/school-admin/academic/schedule";
      const response = await authFetch(endpoint, {
        method: editingBlock ? "PUT" : "POST",
        body: JSON.stringify(toPayload(form)),
      });
      if (!response?.success) throw new Error(response?.message || "Operacion rechazada por el servidor.");
      toast({ title: editingBlock ? "Horario actualizado" : "Bloque creado", description: "La agenda semanal quedo sincronizada." });
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

  const changeStatus = async (block: ScheduleBlock) => {
    const status: ScheduleStatus = block.status === "active" ? "inactive" : "active";
    try {
      const response = await authFetch(`/api/v1/school-admin/academic/schedule/${block.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...block, status }),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo cambiar el estado.");
      setBlocks((current) => current.map((item) => (item.id === block.id ? { ...item, status } : item)));
      toast({ title: "Estado actualizado", description: `${block.subject} fue ${status === "active" ? "activado" : "pausado"}.` });
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const deleteBlock = async () => {
    if (!selectedBlock) return;
    try {
      setSaving(true);
      const response = await authFetch(`/api/v1/school-admin/academic/schedule/${selectedBlock.id}`, { method: "DELETE" });
      if (!response?.success) throw new Error(response?.message || "No se pudo eliminar.");
      setBlocks((current) => current.filter((block) => block.id !== selectedBlock.id));
      toast({ title: "Bloque eliminado", description: "El horario se retiro de la agenda semanal." });
      setDeleteOpen(false);
      setSelectedBlock(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Horarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Planea la agenda semanal por grupo, profesor, materia y salon.</p>
        </div>
        <Button onClick={() => openCreate()} className="w-full md:w-auto"><Plus className="mr-2 h-4 w-4" />Nuevo bloque</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Bloques</CardTitle><CalendarDays className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">{stats.active} activos en calendario</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Grupos cubiertos</CardTitle><Users className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.groupsCovered}</div><p className="text-xs text-muted-foreground">Con al menos un bloque activo</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Horas semanales</CardTitle><Clock className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.weeklyHours}</div><p className="text-xs text-muted-foreground">Horas lectivas programadas</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Cruces</CardTitle><Filter className="h-4 w-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.conflictCount}</div><p className="text-xs text-muted-foreground">Bloques que requieren revision</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <CardTitle>Agenda semanal</CardTitle>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_150px_auto]">
              <div className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar materia, profesor o salon" className="pl-9" /></div>
              <Select value={groupFilter} onValueChange={setGroupFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los grupos</SelectItem>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{groupLabel(group)}</SelectItem>)}</SelectContent></Select>
              <Select value={dayFilter} onValueChange={setDayFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los dias</SelectItem>{days.map((day) => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}</SelectContent></Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="inactive">Pausados</SelectItem></SelectContent></Select>
              <Button variant="outline" onClick={() => { setSearch(""); setGroupFilter("all"); setDayFilter("all"); setStatusFilter("all"); }}>Limpiar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando horarios</div>
          ) : filteredBlocks.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><CalendarDays className="h-10 w-10 text-muted-foreground" /><div><p className="font-medium">No hay horarios con esos filtros</p><p className="text-sm text-muted-foreground">Ajusta la busqueda o crea un bloque semanal.</p></div><Button onClick={() => openCreate()}><Plus className="mr-2 h-4 w-4" />Nuevo bloque</Button></div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-5">
              {groupedByDay.map((day) => (
                <div key={day.value} className="min-h-48 rounded-lg border bg-background">
                  <div className="flex items-center justify-between border-b p-3">
                    <div>
                      <p className="font-semibold">{day.label}</p>
                      <p className="text-xs text-muted-foreground">{day.blocks.length} bloques</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" title={`Agregar ${day.label}`} onClick={() => openCreate(day.value)}><Plus className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-2 p-3">
                    {day.blocks.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">Sin clases</p>
                    ) : (
                      day.blocks.map((block) => {
                        const conflict = hasConflict(block, blocks);
                        return (
                          <div key={block.id} className={`rounded-md border p-3 text-sm ${conflict ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : "bg-card"}`}>
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium leading-tight">{block.subject}</p>
                                <p className="text-xs text-muted-foreground">{block.start_time} - {block.end_time}</p>
                              </div>
                              <Badge variant={block.status === "active" ? "default" : "outline"}>{block.status === "active" ? "Activo" : "Pausado"}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{block.grade_name} {block.group_name} - {block.room || "Sin salon"}</p>
                            <p className="text-xs text-muted-foreground">{block.teacher_name || "Sin profesor"}</p>
                            {conflict && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Cruce de horario</p>}
                            <div className="mt-3 flex justify-end gap-1">
                              <Button variant="ghost" size="icon-sm" title="Ver detalle" onClick={() => openDetail(block)}><Eye className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(block)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon-sm" title={block.status === "active" ? "Pausar" : "Activar"} onClick={() => changeStatus(block)}><Clock className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon-sm" title="Eliminar" onClick={() => { setSelectedBlock(block); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Listado operativo</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Dia</TableHead><TableHead>Horario</TableHead><TableHead>Grupo</TableHead><TableHead>Materia</TableHead><TableHead>Profesor</TableHead><TableHead>Salon</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredBlocks.map((block) => (
                <TableRow key={block.id}>
                  <TableCell>{dayLabel(block.day)}</TableCell>
                  <TableCell>{block.start_time} - {block.end_time}</TableCell>
                  <TableCell>{block.grade_name} {block.group_name}</TableCell>
                  <TableCell>{block.subject}</TableCell>
                  <TableCell>{block.teacher_name || "Sin profesor"}</TableCell>
                  <TableCell>{block.room || "Sin salon"}</TableCell>
                  <TableCell><Badge variant={block.status === "active" ? "default" : "outline"}>{block.status === "active" ? "Activo" : "Pausado"}</Badge></TableCell>
                  <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" title="Ver detalle" onClick={() => openDetail(block)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(block)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title={block.status === "active" ? "Pausar" : "Activar"} onClick={() => changeStatus(block)}><Clock className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Eliminar" onClick={() => { setSelectedBlock(block); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingBlock ? "Editar bloque" : "Nuevo bloque"}</DialogTitle><DialogDescription>Asigna grupo, profesor, materia, dia y franja horaria.</DialogDescription></DialogHeader>
          <form onSubmit={saveBlock} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Grupo</Label><Select value={form.group_id || "none"} onValueChange={updateGroup}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Selecciona grupo</SelectItem>{activeGroups.map((group) => <SelectItem key={group.id} value={group.id}>{groupLabel(group)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Profesor</Label><Select value={form.teacher_id || "none"} onValueChange={(value) => setForm((current) => ({ ...current, teacher_id: value === "none" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Selecciona profesor</SelectItem>{activeTeachers.map((teacher) => <SelectItem key={teacher.id} value={teacher.id}>{teacherName(teacher)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Materia</Label><Select value={form.subject_id || "none"} onValueChange={(value) => { const subject = activeSubjects.find((item) => item.id === value); setForm((current) => ({ ...current, subject_id: value === "none" ? "" : value, subject: subject?.name || current.subject })); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Selecciona materia</SelectItem>{activeSubjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name} ({subject.code})</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Dia</Label><Select value={form.day} onValueChange={(value) => setForm((current) => ({ ...current, day: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{days.map((day) => <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="start_time">Inicio</Label><Input id="start_time" type="time" value={form.start_time} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="end_time">Fin</Label><Input id="end_time" type="time" value={form.end_time} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="room">Salon</Label><Input id="room" value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Estado</Label><Select value={form.status} onValueChange={(value: ScheduleStatus) => setForm((current) => ({ ...current, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Activo</SelectItem><SelectItem value="inactive">Pausado</SelectItem></SelectContent></Select></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="notes">Notas</Label><Textarea id="notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Material, instrucciones o excepciones del bloque" /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{selectedBlock ? selectedBlock.subject : "Detalle del bloque"}</DialogTitle><DialogDescription>Informacion operativa de la clase programada.</DialogDescription></DialogHeader>
          {selectedBlock && <div className="space-y-4"><div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Grupo</p><p className="font-medium">{selectedBlock.grade_name} {selectedBlock.group_name}</p></div><div><p className="text-xs text-muted-foreground">Dia</p><p className="font-medium">{dayLabel(selectedBlock.day)}</p></div><div><p className="text-xs text-muted-foreground">Horario</p><p className="font-medium">{selectedBlock.start_time} - {selectedBlock.end_time}</p></div><div><p className="text-xs text-muted-foreground">Salon</p><p className="font-medium">{selectedBlock.room || "Sin salon"}</p></div><div><p className="text-xs text-muted-foreground">Profesor</p><p className="font-medium">{selectedBlock.teacher_name || "Sin profesor"}</p></div><div><p className="text-xs text-muted-foreground">Estado</p><p className="font-medium">{selectedBlock.status === "active" ? "Activo" : "Pausado"}</p></div></div><div><p className="mb-2 text-sm font-medium">Notas</p><p className="rounded-md border p-3 text-sm text-muted-foreground">{selectedBlock.notes || "Sin notas registradas."}</p></div></div>}
          <DialogFooter><Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>{selectedBlock && <Button onClick={() => { setDetailOpen(false); openEdit(selectedBlock); }}><Pencil className="mr-2 h-4 w-4" />Editar</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Eliminar bloque</DialogTitle><DialogDescription>Esta accion retira la clase de la agenda semanal.</DialogDescription></DialogHeader>
          <div className="rounded-lg border p-3 text-sm">{selectedBlock ? `${dayLabel(selectedBlock.day)} ${selectedBlock.start_time} - ${selectedBlock.subject}` : "Bloque seleccionado"}</div>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button><Button variant="destructive" onClick={deleteBlock} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SchoolSchedulePage() {
  return (
    <ModuleGuard moduleKey="schedules" moduleName="Horarios">
      <SchoolScheduleContent />
    </ModuleGuard>
  );
}

function hasConflict(block: ScheduleBlock, blocks: ScheduleBlock[]) {
  if (block.status !== "active") return false;
  return blocks.some((item) => {
    if (item.id === block.id || item.status !== "active" || item.day !== block.day) return false;
    if (!overlaps(block.start_time, block.end_time, item.start_time, item.end_time)) return false;
    const sameGroup = item.group_id === block.group_id;
    const sameTeacher = Boolean(block.teacher_id && item.teacher_id === block.teacher_id);
    const sameRoom = Boolean(block.room && item.room && item.room.trim().toLowerCase() === block.room.trim().toLowerCase());
    return sameGroup || sameTeacher || sameRoom;
  });
}
