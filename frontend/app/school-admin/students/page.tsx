"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

type StudentStatus = "active" | "inactive" | "graduated" | "withdrawn";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  enrollment_id: string;
  status: StudentStatus;
  group_id?: string;
  group_name: string;
  grade_name: string;
  parent_name: string;
  parent_email: string;
  parent_phone?: string;
  birth_date?: string;
  address?: string;
  attendance_rate?: number;
  average_grade?: number;
  total_absences?: number;
  created_at: string;
  updated_at: string;
  recent_grades?: Array<{ id: string; description: string; score: number; max_score: number; teacher_name: string }>;
  recent_attendance?: Array<{ date: string; status: string; notes: string }>;
};

type GroupOption = {
  id: string;
  name: string;
  grade_name: string;
};

type StudentFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string;
  address: string;
  group_id: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  enrollment_id: string;
  status: StudentStatus;
};

const emptyForm: StudentFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  birth_date: "",
  address: "",
  group_id: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  enrollment_id: "",
  status: "active",
};

const fallbackGroups: GroupOption[] = [
  { id: "group-1a", name: "1A", grade_name: "Primero" },
  { id: "group-2b", name: "2B", grade_name: "Segundo" },
  { id: "group-3a", name: "3A", grade_name: "Tercero" },
  { id: "group-4a", name: "4A", grade_name: "Cuarto" },
];

function getStudentName(student: Student) {
  return `${student.first_name} ${student.last_name}`.trim();
}

function normalizeStudents(response: any): Student[] {
  const raw = response?.data?.students || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeGroups(response: any): GroupOption[] {
  const raw = response?.data?.groups || response?.data || [];
  return Array.isArray(raw) && raw.length > 0 ? raw : fallbackGroups;
}

function toForm(student: Student): StudentFormState {
  return {
    first_name: student.first_name || "",
    last_name: student.last_name || "",
    email: student.email || "",
    phone: student.phone || "",
    birth_date: student.birth_date || "",
    address: student.address || "",
    group_id: student.group_id || "",
    parent_name: student.parent_name || "",
    parent_email: student.parent_email || "",
    parent_phone: student.parent_phone || "",
    enrollment_id: student.enrollment_id || "",
    status: student.status || "active",
  };
}

function toPayload(form: StudentFormState) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    birth_date: form.birth_date,
    address: form.address.trim(),
    group_id: form.group_id,
    parent_name: form.parent_name.trim(),
    parent_email: form.parent_email.trim().toLowerCase(),
    parent_phone: form.parent_phone.trim(),
    enrollment_id: form.enrollment_id.trim(),
    status: form.status,
  };
}

function statusLabel(status: StudentStatus) {
  const labels: Record<StudentStatus, string> = {
    active: "Activo",
    inactive: "Pausado",
    graduated: "Egresado",
    withdrawn: "Baja",
  };
  return labels[status] || status;
}

export default function SchoolStudentsPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>(fallbackGroups);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormState>(emptyForm);

  const loadGroups = async () => {
    try {
      const response = await authFetch("/api/v1/school-admin/academic/groups");
      setGroups(normalizeGroups(response));
    } catch {
      setGroups(fallbackGroups);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/v1/school-admin/academic/students");
      setStudents(normalizeStudents(response));
    } catch (error) {
      toast({
        title: "No se pudieron cargar estudiantes",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !term ||
        `${getStudentName(student)} ${student.enrollment_id} ${student.parent_name} ${student.parent_email}`
          .toLowerCase()
          .includes(term);
      const matchesStatus = statusFilter === "all" || student.status === statusFilter;
      const matchesGroup = groupFilter === "all" || student.group_id === groupFilter;
      return matchesSearch && matchesStatus && matchesGroup;
    });
  }, [students, search, statusFilter, groupFilter]);

  const stats = useMemo(() => {
    const active = students.filter((student) => student.status === "active").length;
    const inactive = students.filter((student) => student.status === "inactive").length;
    const attention = students.filter((student) => (student.attendance_rate || 100) < 85 || (student.average_grade || 100) < 80).length;
    return { total: students.length, active, inactive, attention };
  }, [students]);

  const openCreate = () => {
    setEditingStudent(null);
    setForm({
      ...emptyForm,
      enrollment_id: `ALU-${new Date().getFullYear()}-${String(students.length + 1).padStart(3, "0")}`,
    });
    setFormOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setForm(toForm(student));
    setFormOpen(true);
  };

  const openDetail = async (student: Student) => {
    setSelectedStudent(student);
    setDetailOpen(true);

    try {
      const response = await authFetch(`/api/v1/school-admin/academic/students/${student.id}`);
      if (response?.success && response.data) setSelectedStudent(response.data);
    } catch {
      setSelectedStudent(student);
    }
  };

  const validateForm = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return "Nombre y apellido son obligatorios.";
    if (!form.enrollment_id.trim()) return "La matricula es obligatoria.";
    if (!form.parent_name.trim()) return "El tutor principal es obligatorio.";
    if (!form.parent_email.includes("@")) return "Ingresa un email valido del tutor.";
    if (!form.parent_phone.trim()) return "El telefono del tutor es obligatorio.";
    return "";
  };

  const saveStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast({ title: "Revisa el formulario", description: validationError, variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const endpoint = editingStudent
        ? `/api/v1/school-admin/academic/students/${editingStudent.id}`
        : "/api/v1/school-admin/academic/students";
      const response = await authFetch(endpoint, {
        method: editingStudent ? "PUT" : "POST",
        body: JSON.stringify(toPayload(form)),
      });

      if (!response?.success) throw new Error(response?.message || "Operacion rechazada por el servidor.");

      toast({
        title: editingStudent ? "Estudiante actualizado" : "Estudiante matriculado",
        description: "El expediente quedo sincronizado.",
      });
      setFormOpen(false);
      await loadStudents();
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

  const changeStatus = async (student: Student, status: StudentStatus) => {
    try {
      const response = await authFetch(`/api/v1/school-admin/academic/students/${student.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo cambiar el estado.");
      setStudents((current) => current.map((item) => (item.id === student.id ? { ...item, status } : item)));
      toast({ title: "Estado actualizado", description: `${getStudentName(student)} ahora esta ${statusLabel(status).toLowerCase()}.` });
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const deleteStudent = async () => {
    if (!selectedStudent) return;
    try {
      setSaving(true);
      const response = await authFetch(`/api/v1/school-admin/academic/students/${selectedStudent.id}`, {
        method: "DELETE",
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo eliminar.");
      setStudents((current) => current.filter((student) => student.id !== selectedStudent.id));
      toast({ title: "Estudiante eliminado", description: "El expediente fue retirado del directorio." });
      setDeleteOpen(false);
      setSelectedStudent(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Estudiantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Expedientes, tutores, grupos y estado academico de cada alumno.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Matricular estudiante
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Expedientes registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Inscritos actualmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pausados</CardTitle>
            <UserRound className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Sin actividad actual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atencion</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attention}</div>
            <p className="text-xs text-muted-foreground">Asistencia o promedio bajo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <CardTitle>Directorio de estudiantes</CardTitle>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_160px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar alumno" className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Pausados</SelectItem>
                  <SelectItem value="graduated">Egresados</SelectItem>
                  <SelectItem value="withdrawn">Baja</SelectItem>
                </SelectContent>
              </Select>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.grade_name} {group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); setGroupFilter("all"); }}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando estudiantes
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <GraduationCap className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No hay estudiantes con esos filtros</p>
                <p className="text-sm text-muted-foreground">Ajusta la busqueda o matricula un estudiante.</p>
              </div>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Matricular estudiante</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Matricula</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Tutor</TableHead>
                  <TableHead>Rendimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="font-medium">{getStudentName(student)}</div>
                      <div className="text-xs text-muted-foreground">{student.email || "Sin email de alumno"}</div>
                    </TableCell>
                    <TableCell>{student.enrollment_id}</TableCell>
                    <TableCell>
                      <div>{student.grade_name || "Sin grado"}</div>
                      <div className="text-xs text-muted-foreground">{student.group_name || "Sin grupo"}</div>
                    </TableCell>
                    <TableCell>
                      <div>{student.parent_name}</div>
                      <div className="text-xs text-muted-foreground">{student.parent_email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{student.average_grade || 0} promedio</div>
                      <div className="text-xs text-muted-foreground">{student.attendance_rate || 0}% asistencia</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === "active" ? "default" : "outline"}>{statusLabel(student.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" title="Ver detalle" onClick={() => openDetail(student)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(student)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" title={student.status === "active" ? "Pausar" : "Activar"} onClick={() => changeStatus(student, student.status === "active" ? "inactive" : "active")}>
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="Eliminar" onClick={() => { setSelectedStudent(student); setDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Editar estudiante" : "Matricular estudiante"}</DialogTitle>
            <DialogDescription>Actualiza expediente escolar, tutor principal y grupo asignado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveStudent} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input id="first_name" value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input id="last_name" value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="enrollment_id">Matricula</Label>
                <Input id="enrollment_id" value={form.enrollment_id} onChange={(event) => setForm((current) => ({ ...current, enrollment_id: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                <Input id="birth_date" type="date" value={form.birth_date} onChange={(event) => setForm((current) => ({ ...current, birth_date: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email alumno</Label>
                <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Telefono alumno</Label>
                <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Grupo</Label>
                <Select value={form.group_id || "none"} onValueChange={(value) => setForm((current) => ({ ...current, group_id: value === "none" ? "" : value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin grupo</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>{group.grade_name} {group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as StudentStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Pausado</SelectItem>
                    <SelectItem value="graduated">Egresado</SelectItem>
                    <SelectItem value="withdrawn">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_name">Tutor principal</Label>
                <Input id="parent_name" value={form.parent_name} onChange={(event) => setForm((current) => ({ ...current, parent_name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_email">Email tutor</Label>
                <Input id="parent_email" type="email" value={form.parent_email} onChange={(event) => setForm((current) => ({ ...current, parent_email: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="parent_phone">Telefono tutor</Label>
                <Input id="parent_phone" value={form.parent_phone} onChange={(event) => setForm((current) => ({ ...current, parent_phone: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Direccion / notas</Label>
                <Textarea id="address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedStudent ? getStudentName(selectedStudent) : "Detalle del estudiante"}</DialogTitle>
            <DialogDescription>Resumen academico, tutor y seguimiento reciente.</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                <div><p className="text-xs text-muted-foreground">Matricula</p><p className="font-medium">{selectedStudent.enrollment_id}</p></div>
                <div><p className="text-xs text-muted-foreground">Grupo</p><p className="font-medium">{selectedStudent.grade_name} {selectedStudent.group_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Tutor</p><p className="font-medium">{selectedStudent.parent_name}</p></div>
                <div><p className="text-xs text-muted-foreground">Contacto tutor</p><p className="font-medium">{selectedStudent.parent_email}</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Asistencia</p><p className="text-xl font-bold">{selectedStudent.attendance_rate || 0}%</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Promedio</p><p className="text-xl font-bold">{selectedStudent.average_grade || 0}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Faltas</p><p className="text-xl font-bold">{selectedStudent.total_absences || 0}</p></CardContent></Card>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Actividad reciente</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {(selectedStudent.recent_grades || []).map((grade) => (
                    <div key={grade.id} className="rounded-md border p-3">{grade.description}: {grade.score}/{grade.max_score} - {grade.teacher_name}</div>
                  ))}
                  {(selectedStudent.recent_attendance || []).map((item) => (
                    <div key={item.date} className="rounded-md border p-3">{item.date}: {item.status}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
            {selectedStudent && <Button onClick={() => { setDetailOpen(false); openEdit(selectedStudent); }}><Pencil className="mr-2 h-4 w-4" />Editar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar estudiante</DialogTitle>
            <DialogDescription>Esta accion retira el expediente del directorio escolar.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border p-3 text-sm">
            {selectedStudent ? getStudentName(selectedStudent) : "Estudiante seleccionado"}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteStudent} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
