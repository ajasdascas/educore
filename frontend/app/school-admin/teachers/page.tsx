"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
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
import { ModuleGuard } from "@/components/providers/ModuleGuard";

type Teacher = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_id: string;
  status: "active" | "inactive";
  specialties: string[];
  group_count: number;
  hire_date: string;
  created_at: string;
  address?: string;
  salary?: number;
  performance?: {
    student_count: number;
    attendance_rate: number;
    average_grade: number;
    student_satisfaction: number;
  };
};

type TeacherFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  employee_id: string;
  hire_date: string;
  specialties: string;
  address: string;
  salary: string;
  status: "active" | "inactive";
};

const emptyForm: TeacherFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  employee_id: "",
  hire_date: new Date().toISOString().slice(0, 10),
  specialties: "",
  address: "",
  salary: "",
  status: "active",
};

function getTeacherName(teacher: Teacher) {
  return `${teacher.first_name} ${teacher.last_name}`.trim();
}

function normalizeTeachers(response: any): Teacher[] {
  const raw = response?.data?.teachers || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function toForm(teacher: Teacher): TeacherFormState {
  return {
    first_name: teacher.first_name || "",
    last_name: teacher.last_name || "",
    email: teacher.email || "",
    phone: teacher.phone || "",
    employee_id: teacher.employee_id || "",
    hire_date: teacher.hire_date || new Date().toISOString().slice(0, 10),
    specialties: (teacher.specialties || []).join(", "),
    address: teacher.address || "",
    salary: teacher.salary ? String(teacher.salary) : "",
    status: teacher.status || "active",
  };
}

function toPayload(form: TeacherFormState) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    employee_id: form.employee_id.trim(),
    hire_date: form.hire_date,
    address: form.address.trim(),
    salary: Number(form.salary || 0),
    status: form.status,
    specialties: form.specialties
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

function SchoolTeachersContent() {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherFormState>(emptyForm);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/v1/school-admin/academic/teachers");
      setTeachers(normalizeTeachers(response));
    } catch (error) {
      toast({
        title: "No se pudieron cargar profesores",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return teachers.filter((teacher) => {
      const matchesSearch =
        !term ||
        `${getTeacherName(teacher)} ${teacher.email} ${teacher.employee_id} ${(teacher.specialties || []).join(" ")}`
          .toLowerCase()
          .includes(term);
      const matchesStatus = statusFilter === "all" || teacher.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [teachers, search, statusFilter]);

  const stats = useMemo(() => {
    const active = teachers.filter((teacher) => teacher.status === "active").length;
    const inactive = teachers.length - active;
    const assigned = teachers.filter((teacher) => teacher.group_count > 0).length;
    return { total: teachers.length, active, inactive, assigned };
  }, [teachers]);

  const openCreate = () => {
    setEditingTeacher(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setForm(toForm(teacher));
    setFormOpen(true);
  };

  const openDetail = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setDetailOpen(true);

    try {
      const response = await authFetch(`/api/v1/school-admin/academic/teachers/${teacher.id}`);
      if (response?.success && response.data) {
        setSelectedTeacher(response.data);
      }
    } catch {
      setSelectedTeacher(teacher);
    }
  };

  const validateForm = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return "Nombre y apellido son obligatorios.";
    if (!form.email.includes("@")) return "Ingresa un email valido.";
    if (!form.phone.trim()) return "El telefono es obligatorio.";
    if (!form.employee_id.trim()) return "El ID de empleado es obligatorio.";
    if (!form.hire_date) return "La fecha de ingreso es obligatoria.";
    return "";
  };

  const saveTeacher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast({ title: "Revisa el formulario", description: validationError, variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const endpoint = editingTeacher
        ? `/api/v1/school-admin/academic/teachers/${editingTeacher.id}`
        : "/api/v1/school-admin/academic/teachers";
      const response = await authFetch(endpoint, {
        method: editingTeacher ? "PUT" : "POST",
        body: JSON.stringify(toPayload(form)),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Operacion rechazada por el servidor.");
      }

      toast({
        title: editingTeacher ? "Profesor actualizado" : "Profesor registrado",
        description: "El directorio docente quedo sincronizado.",
      });
      setFormOpen(false);
      await loadTeachers();
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

  const toggleTeacherStatus = async (teacher: Teacher) => {
    const nextStatus = teacher.status === "active" ? "inactive" : "active";
    try {
      const response = await authFetch(`/api/v1/school-admin/academic/teachers/${teacher.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response?.success) {
        throw new Error(response?.message || "No se pudo cambiar el estado.");
      }

      setTeachers((current) =>
        current.map((item) => (item.id === teacher.id ? { ...item, status: nextStatus } : item))
      );
      toast({
        title: nextStatus === "active" ? "Profesor activado" : "Profesor pausado",
        description: `${getTeacherName(teacher)} fue actualizado correctamente.`,
      });
    } catch (error) {
      toast({
        title: "No se pudo actualizar el estado",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profesores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Directorio docente, datos laborales y estado operativo de la escuela.
          </p>
        </div>
        <Button onClick={openCreate} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo profesor
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Docentes registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Disponibles para asignacion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En grupos</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigned}</div>
            <p className="text-xs text-muted-foreground">Con carga academica</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pausados</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Sin acceso operativo</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Directorio docente</CardTitle>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_180px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar profesor"
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Pausados</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando profesores
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No hay profesores con esos filtros</p>
                <p className="text-sm text-muted-foreground">Ajusta la busqueda o registra un nuevo profesor.</p>
              </div>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo profesor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profesor</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead>Grupos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>
                      <div className="font-medium">{getTeacherName(teacher)}</div>
                      <div className="text-xs text-muted-foreground">{teacher.email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{teacher.employee_id}</div>
                      <div className="text-xs text-muted-foreground">{teacher.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-72 flex-wrap gap-1">
                        {(teacher.specialties || []).length > 0 ? (
                          teacher.specialties.map((specialty) => (
                            <Badge key={specialty} variant="outline">
                              {specialty}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin especialidad</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{teacher.group_count}</TableCell>
                    <TableCell>
                      <Badge variant={teacher.status === "active" ? "default" : "outline"}>
                        {teacher.status === "active" ? "Activo" : "Pausado"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openDetail(teacher)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(teacher)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => toggleTeacherStatus(teacher)}
                          title={teacher.status === "active" ? "Pausar" : "Activar"}
                        >
                          {teacher.status === "active" ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "Editar profesor" : "Nuevo profesor"}</DialogTitle>
            <DialogDescription>
              Mantén actualizado el expediente docente y su disponibilidad operativa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveTeacher} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_id">ID empleado</Label>
                <Input
                  id="employee_id"
                  value={form.employee_id}
                  onChange={(event) => setForm((current) => ({ ...current, employee_id: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">Fecha de ingreso</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={form.hire_date}
                  onChange={(event) => setForm((current) => ({ ...current, hire_date: event.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="specialties">Especialidades</Label>
                <Input
                  id="specialties"
                  value={form.specialties}
                  onChange={(event) => setForm((current) => ({ ...current, specialties: event.target.value }))}
                  placeholder="Matematicas, Fisica, Ingles"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Sueldo mensual</Label>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  value={form.salary}
                  onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, status: value as "active" | "inactive" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Direccion</Label>
                <Textarea
                  id="address"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedTeacher ? getTeacherName(selectedTeacher) : "Detalle del profesor"}</DialogTitle>
            <DialogDescription>Perfil docente y resumen operativo.</DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedTeacher.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefono</p>
                  <p className="font-medium">{selectedTeacher.phone || "No disponible"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ID empleado</p>
                  <p className="font-medium">{selectedTeacher.employee_id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ingreso</p>
                  <p className="font-medium">{selectedTeacher.hire_date || "No disponible"}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-muted-foreground">Especialidades</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedTeacher.specialties || []).map((specialty) => (
                    <Badge key={specialty} variant="outline">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Grupos</p>
                    <p className="text-xl font-bold">{selectedTeacher.group_count}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Alumnos</p>
                    <p className="text-xl font-bold">{selectedTeacher.performance?.student_count || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Promedio</p>
                    <p className="text-xl font-bold">{selectedTeacher.performance?.average_grade || 0}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
            {selectedTeacher && (
              <Button
                onClick={() => {
                  setDetailOpen(false);
                  openEdit(selectedTeacher);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SchoolTeachersPage() {
  return (
    <ModuleGuard moduleKey="users" moduleName="Profesores">
      <SchoolTeachersContent />
    </ModuleGuard>
  );
}
