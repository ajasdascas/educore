"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";
import { ModuleGuard } from "@/components/providers/ModuleGuard";

type StudentStatus = "active" | "inactive" | "graduated" | "withdrawn";
type ParentRelationship = "mother" | "father" | "guardian" | "other";

type ParentContact = {
  id?: string;
  first_name: string;
  paternal_last_name: string;
  maternal_last_name: string;
  email: string;
  phone: string;
  relationship: ParentRelationship;
  is_primary: boolean;
  notes?: string;
};

type AcademicHistoryItem = {
  id: string;
  school_year_id: string;
  school_year: string;
  grade_name: string;
  group_name: string;
  status: string;
  average_grade: number;
  attendance_rate: number;
  absences: number;
  notes: string;
};

type Student = {
  id: string;
  first_name: string;
  paternal_last_name?: string;
  maternal_last_name?: string;
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
  parents?: ParentContact[];
  birth_date?: string;
  birth_day?: string;
  birth_month?: string;
  birth_year?: string;
  address?: string;
  attendance_rate?: number;
  average_grade?: number;
  total_absences?: number;
  academic_history?: AcademicHistoryItem[];
  created_at: string;
  updated_at: string;
  recent_grades?: Array<{ id: string; description: string; score: number; max_score: number; teacher_name: string }>;
  recent_attendance?: Array<{ date: string; status: string; notes: string }>;
  schedule?: Array<{ id: string; day: string; start_time: string; end_time: string; subject: string; teacher_name: string; room?: string }>;
  documents?: Array<{
    id: string;
    title: string;
    description?: string;
    category: string;
    file_name: string;
    file_url?: string;
    file_size?: number;
    mime_type: string;
    storage_status?: "physical_only" | "digital_only" | "both";
    is_verified?: boolean;
    verified_at?: string;
    created_at: string;
  }>;
  observations?: Array<{ id: string; type: string; note: string; author: string; created_at: string }>;
};

type GroupOption = {
  id: string;
  name: string;
  grade_name: string;
};

type SchoolYear = {
  id: string;
  name: string;
  status: string;
  is_current: boolean;
};

type StudentFormState = {
  first_name: string;
  paternal_last_name: string;
  maternal_last_name: string;
  email: string;
  phone: string;
  birth_day: string;
  birth_month: string;
  birth_year: string;
  address: string;
  group_id: string;
  enrollment_id: string;
  status: StudentStatus;
  parents: ParentContact[];
};

type ImportPreviewRow = Record<string, string>;

const emptyParent: ParentContact = {
  first_name: "",
  paternal_last_name: "",
  maternal_last_name: "",
  email: "",
  phone: "",
  relationship: "mother",
  is_primary: true,
  notes: "",
};

const emptyForm: StudentFormState = {
  first_name: "",
  paternal_last_name: "",
  maternal_last_name: "",
  email: "",
  phone: "",
  birth_day: "",
  birth_month: "",
  birth_year: "",
  address: "",
  group_id: "",
  enrollment_id: "",
  status: "active",
  parents: [{ ...emptyParent }],
};

const fallbackGroups: GroupOption[] = [
  { id: "group-1a", name: "1A", grade_name: "Primero" },
  { id: "group-2b", name: "2B", grade_name: "Segundo" },
  { id: "group-3a", name: "3A", grade_name: "Tercero" },
  { id: "group-4a", name: "4A", grade_name: "Cuarto" },
];

const importFields = [
  { key: "first_name", label: "Nombre(s)", required: true },
  { key: "paternal_last_name", label: "Apellido paterno", required: true },
  { key: "maternal_last_name", label: "Apellido materno", required: true },
  { key: "enrollment_id", label: "Matricula", required: true },
  { key: "birth_day", label: "Dia nacimiento", required: true },
  { key: "birth_month", label: "Mes nacimiento", required: true },
  { key: "birth_year", label: "Ano nacimiento", required: true },
  { key: "group_name", label: "Grupo" },
  { key: "address", label: "Direccion / notas" },
  { key: "parent1_first_name", label: "Papa/Mama 1 nombre", required: true },
  { key: "parent1_paternal_last_name", label: "Papa/Mama 1 apellido paterno" },
  { key: "parent1_maternal_last_name", label: "Papa/Mama 1 apellido materno" },
  { key: "parent1_email", label: "Papa/Mama 1 email", required: true },
  { key: "parent1_phone", label: "Papa/Mama 1 telefono", required: true },
  { key: "parent2_first_name", label: "Papa/Mama 2 nombre" },
  { key: "parent2_paternal_last_name", label: "Papa/Mama 2 apellido paterno" },
  { key: "parent2_maternal_last_name", label: "Papa/Mama 2 apellido materno" },
  { key: "parent2_email", label: "Papa/Mama 2 email" },
  { key: "parent2_phone", label: "Papa/Mama 2 telefono" },
  { key: "school_year", label: "Ciclo escolar historial" },
  { key: "history_grade_name", label: "Grado historial" },
  { key: "history_group_name", label: "Grupo historial" },
  { key: "history_average_grade", label: "Promedio historial" },
  { key: "history_attendance_rate", label: "Asistencia historial" },
  { key: "history_absences", label: "Faltas historial" },
] as const;

function fullStudentName(student: Pick<Student, "first_name" | "last_name" | "paternal_last_name" | "maternal_last_name">) {
  return [student.first_name, student.paternal_last_name || student.last_name, student.maternal_last_name]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parentFullName(parent: ParentContact) {
  return [parent.first_name, parent.paternal_last_name, parent.maternal_last_name].filter(Boolean).join(" ").trim();
}

function birthDateFromParts(day: string, month: string, year: string) {
  if (!day || !month || !year) return "";
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function ageFromBirthDate(student: Student) {
  const raw = student.birth_date || birthDateFromParts(student.birth_day || "", student.birth_month || "", student.birth_year || "");
  if (!raw) return "Sin fecha";
  const birth = new Date(raw);
  if (Number.isNaN(birth.getTime())) return "Sin fecha";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return `${age} años`;
}

function splitBirthDate(date?: string) {
  if (!date) return { day: "", month: "", year: "" };
  const [year, month, day] = date.split("-");
  return { day: day || "", month: month || "", year: year || "" };
}

function normalizeStudents(response: any): Student[] {
  const raw = response?.data?.students || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeGroups(response: any): GroupOption[] {
  const raw = response?.data?.groups || response?.data || [];
  return Array.isArray(raw) && raw.length > 0 ? raw : fallbackGroups;
}

function normalizeSchoolYears(response: any): SchoolYear[] {
  const raw = response?.data?.school_years || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function getPrimaryParent(student: Student): ParentContact {
  const first = (student.parents || []).find((parent) => parent.is_primary) || (student.parents || [])[0];
  if (first) return first;
  const pieces = (student.parent_name || "").split(" ");
  return {
    first_name: pieces.slice(0, -1).join(" ") || student.parent_name || "",
    paternal_last_name: pieces.slice(-1).join(""),
    maternal_last_name: "",
    email: student.parent_email || "",
    phone: student.parent_phone || "",
    relationship: "guardian",
    is_primary: true,
    notes: "",
  };
}

function toForm(student: Student): StudentFormState {
  const birth = splitBirthDate(student.birth_date);
  const parents = student.parents?.length ? student.parents : [getPrimaryParent(student)];
  return {
    first_name: student.first_name || "",
    paternal_last_name: student.paternal_last_name || student.last_name || "",
    maternal_last_name: student.maternal_last_name || "",
    email: student.email || "",
    phone: student.phone || "",
    birth_day: student.birth_day || birth.day,
    birth_month: student.birth_month || birth.month,
    birth_year: student.birth_year || birth.year,
    address: student.address || "",
    group_id: student.group_id || "",
    enrollment_id: student.enrollment_id || "",
    status: student.status || "active",
    parents: parents.map((parent, index) => ({ ...emptyParent, ...parent, is_primary: index === 0 ? true : !!parent.is_primary })),
  };
}

function toPayload(form: StudentFormState) {
  const birth_date = birthDateFromParts(form.birth_day, form.birth_month, form.birth_year);
  const primary = form.parents.find((parent) => parent.is_primary) || form.parents[0];
  const last_name = [form.paternal_last_name, form.maternal_last_name].filter(Boolean).join(" ").trim();
  return {
    first_name: form.first_name.trim(),
    paternal_last_name: form.paternal_last_name.trim(),
    maternal_last_name: form.maternal_last_name.trim(),
    last_name,
    email: form.email.trim().toLowerCase(),
    phone: form.phone.trim(),
    birth_day: form.birth_day,
    birth_month: form.birth_month,
    birth_year: form.birth_year,
    birth_date,
    address: form.address.trim(),
    group_id: form.group_id,
    parent_name: primary ? parentFullName(primary) : "",
    parent_email: primary?.email.trim().toLowerCase() || "",
    parent_phone: primary?.phone.trim() || "",
    parents: form.parents.map((parent, index) => ({ ...parent, email: parent.email.trim().toLowerCase(), is_primary: parent.is_primary || index === 0 })),
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

function documentCategoryLabel(value: string) {
  const labels: Record<string, string> = {
    enrollment: "Inscripcion",
    identification: "Identificacion",
    medical: "Medico",
    academic_history: "Historial academico",
    report_card: "Boleta",
    other: "Otros",
  };
  return labels[value] || value;
}

function documentStorageLabel(value?: string) {
  const labels: Record<string, string> = {
    physical_only: "Solo fisico",
    digital_only: "Solo digital",
    both: "Fisico y digital",
  };
  return labels[value || "digital_only"] || "Solo digital";
}

function buildAcademicHistory(student: Student, years: SchoolYear[]): AcademicHistoryItem[] {
  if (student.academic_history?.length) return student.academic_history;
  const current = years.find((year) => year.is_current) || years[0];
  const previous = years.filter((year) => !year.is_current).slice(0, 2);
  const seedYears = [current, ...previous].filter(Boolean) as SchoolYear[];
  return seedYears.map((year, index) => ({
    id: `${student.id}-${year.id}`,
    school_year_id: year.id,
    school_year: year.name,
    grade_name: index === 0 ? student.grade_name || "Sin grado" : `Grado anterior ${index}`,
    group_name: index === 0 ? student.group_name || "Sin grupo" : "Historico",
    status: index === 0 ? statusLabel(student.status) : "Promovido",
    average_grade: Math.max(70, Number(student.average_grade || 88) - index * 2),
    attendance_rate: Math.max(80, Number(student.attendance_rate || 94) - index),
    absences: Number(student.total_absences || 1) + index,
    notes: index === 0 ? "Ciclo actual." : "Registro historico importado/demo.",
  }));
}

function SchoolStudentsContent() {
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>(fallbackGroups);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [historyYearFilter, setHistoryYearFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const [sheets, setSheets] = useState<Record<string, ImportPreviewRow[]>>({});
  const [activeSheet, setActiveSheet] = useState("");
  const [columnSearch, setColumnSearch] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const loadGroups = async () => {
    try {
      const response = await authFetch("/api/v1/school-admin/academic/groups");
      setGroups(normalizeGroups(response));
    } catch {
      setGroups(fallbackGroups);
    }
  };

  const loadSchoolYears = async () => {
    try {
      const response = await authFetch("/api/v1/school-admin/academic/school-years");
      setSchoolYears(normalizeSchoolYears(response));
    } catch {
      setSchoolYears([]);
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
    loadSchoolYears();
    loadStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !term ||
        `${fullStudentName(student)} ${student.enrollment_id} ${student.parent_name} ${student.parent_email}`
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
    const parents = students.reduce((sum, student) => sum + Math.max(1, student.parents?.length || 0), 0);
    return { total: students.length, active, inactive, attention, parents };
  }, [students]);

  const currentRows = sheets[activeSheet] || [];
  const columns = useMemo(() => Object.keys(currentRows[0] || {}), [currentRows]);
  const visibleColumns = useMemo(() => {
    const term = columnSearch.trim().toLowerCase();
    return columns.filter((column) => !term || column.toLowerCase().includes(term));
  }, [columns, columnSearch]);

  const mappedImportRows = useMemo(() => {
    return currentRows.slice(0, 250).map((row) => {
      const result: Record<string, string> = {};
      Object.entries(mapping).forEach(([field, column]) => {
        result[field] = row[column] || "";
      });
      return result;
    });
  }, [currentRows, mapping]);

  const importValidation = useMemo(() => {
    const required = importFields.filter((field) => field.required).map((field) => field.key);
    const missing = required.filter((field) => !mapping[field]);
    const validRows = mappedImportRows.filter((row) => required.every((field) => String(row[field] || "").trim())).length;
    return { missing, validRows, totalRows: currentRows.length };
  }, [currentRows.length, mappedImportRows, mapping]);

  const openCreate = () => {
    setEditingStudent(null);
    setForm({
      ...emptyForm,
      parents: [{ ...emptyParent }],
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
    const enriched = { ...student, academic_history: buildAcademicHistory(student, schoolYears) };
    setSelectedStudent(enriched);
    setHistoryYearFilter("all");
    setDetailOpen(true);

    try {
      const response = await authFetch(`/api/v1/school-admin/academic/students/${student.id}`);
      if (response?.success && response.data) {
        const [historyResponse, scheduleResponse, attendanceResponse, documentsResponse] = await Promise.all([
          authFetch(`/api/v1/school-admin/academic/students/${student.id}/history`).catch(() => null),
          authFetch(`/api/v1/school-admin/academic/students/${student.id}/schedule`).catch(() => null),
          authFetch(`/api/v1/school-admin/attendance/students/${student.id}/history`).catch(() => null),
          authFetch(`/api/v1/school-admin/documents/${student.id}`).catch(() => null),
        ]);
        setSelectedStudent({
          ...response.data,
          academic_history: historyResponse?.success ? historyResponse.data : buildAcademicHistory(response.data, schoolYears),
          schedule: scheduleResponse?.success ? scheduleResponse.data : [],
          recent_attendance: attendanceResponse?.success ? attendanceResponse.data?.records || [] : response.data.recent_attendance,
          documents: documentsResponse?.success ? documentsResponse.data : [],
        });
      }
    } catch {
      setSelectedStudent(enriched);
    }
  };

  const updateParent = (index: number, patch: Partial<ParentContact>) => {
    setForm((current) => {
      const parents = current.parents.map((parent, itemIndex) => {
        const next = itemIndex === index ? { ...parent, ...patch } : parent;
        if (patch.is_primary && itemIndex !== index) return { ...next, is_primary: false };
        return next;
      });
      return { ...current, parents };
    });
  };

  const addParent = () => {
    setForm((current) => ({
      ...current,
      parents: [...current.parents, { ...emptyParent, relationship: "father", is_primary: false }],
    }));
  };

  const removeParent = (index: number) => {
    setForm((current) => {
      const nextParents = current.parents.filter((_, itemIndex) => itemIndex !== index);
      if (!nextParents.some((parent) => parent.is_primary) && nextParents[0]) nextParents[0].is_primary = true;
      return { ...current, parents: nextParents.length ? nextParents : [{ ...emptyParent }] };
    });
  };

  const validateForm = () => {
    if (!form.first_name.trim()) return "El campo Nombre(s) es obligatorio.";
    if (!form.paternal_last_name.trim()) return "El apellido paterno es obligatorio.";
    if (!form.maternal_last_name.trim()) return "El apellido materno es obligatorio.";
    if (!form.birth_day || !form.birth_month || !form.birth_year) return "La fecha de nacimiento debe tener dia, mes y ano.";
    if (!form.enrollment_id.trim()) return "La matricula es obligatoria.";
    const primary = form.parents.find((parent) => parent.is_primary) || form.parents[0];
    if (!primary || !primary.first_name.trim()) return "Debes registrar al menos un papa/mama o tutor principal.";
    if (!primary.email.includes("@")) return "Ingresa un email valido del tutor principal.";
    if (!primary.phone.trim()) return "El telefono del tutor principal es obligatorio.";
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
        description: "Alumno, padres e historial base quedaron sincronizados.",
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
      toast({ title: "Estado actualizado", description: `${fullStudentName(student)} ahora esta ${statusLabel(status).toLowerCase()}.` });
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

  const readExcel = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const nextSheets: Record<string, ImportPreviewRow[]> = {};
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      nextSheets[sheetName] = rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([key, value]) => [String(key), String(value ?? "")]))
      );
    });
    setSheets(nextSheets);
    setActiveSheet(workbook.SheetNames[0] || "");
    setMapping({});
    toast({ title: "Excel leido", description: `${workbook.SheetNames.length} hoja(s) listas para mapear.` });
  };

  const autoMapColumns = () => {
    const guesses: Record<string, string[]> = {
      first_name: ["nombre", "nombres", "nombre(s)", "student name"],
      paternal_last_name: ["apellido paterno", "paterno", "primer apellido"],
      maternal_last_name: ["apellido materno", "materno", "segundo apellido"],
      enrollment_id: ["matricula", "matricula alumno", "enrollment", "folio"],
      birth_day: ["dia", "dia nacimiento", "birth day"],
      birth_month: ["mes", "mes nacimiento", "birth month"],
      birth_year: ["ano", "anio", "año", "ano nacimiento", "birth year"],
      group_name: ["grupo"],
      parent1_first_name: ["mama nombre", "padre nombre", "tutor nombre", "nombre tutor"],
      parent1_email: ["email tutor", "correo tutor", "correo padre", "email padre"],
      parent1_phone: ["telefono tutor", "celular tutor", "telefono padre"],
    };
    const next: Record<string, string> = {};
    Object.entries(guesses).forEach(([field, variants]) => {
      const column = columns.find((item) => variants.some((variant) => item.toLowerCase().includes(variant)));
      if (column) next[field] = column;
    });
    setMapping((current) => ({ ...current, ...next }));
  };

  const commitImport = async () => {
    if (importValidation.missing.length > 0) {
      toast({
        title: "Mapeo incompleto",
        description: "Completa los campos obligatorios antes de importar.",
        variant: "destructive",
      });
      return;
    }
    const rows = mappedImportRows.filter((row) => row.first_name && row.paternal_last_name && row.maternal_last_name && row.enrollment_id);
    try {
      setSaving(true);
      const response = await authFetch("/api/v1/school-admin/academic/imports/students/commit", {
        method: "POST",
        body: JSON.stringify({ rows, mapping, source_sheet: activeSheet }),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo importar.");
      toast({
        title: "Importacion completada",
        description: `${response.data?.imported || rows.length} alumnos procesados con padres e historial.`,
      });
      setImportOpen(false);
      await loadStudents();
    } catch (error) {
      toast({
        title: "No se pudo importar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedHistory = selectedStudent ? buildAcademicHistory(selectedStudent, schoolYears) : [];
  const filteredHistory = selectedHistory.filter((item) => historyYearFilter === "all" || item.school_year_id === historyYearFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estudiantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Expedientes completos: alumno, padres vinculados, ciclos, historial e importacion Excel.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setImportOpen(true)} className="w-full sm:w-auto">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importar Excel
          </Button>
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Matricular estudiante
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><GraduationCap className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Expedientes registrados</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Activos</CardTitle><CheckCircle2 className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.active}</div><p className="text-xs text-muted-foreground">Inscritos actualmente</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pausados</CardTitle><Users className="h-4 w-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.inactive}</div><p className="text-xs text-muted-foreground">Sin actividad actual</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Padres</CardTitle><UserPlus className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.parents}</div><p className="text-xs text-muted-foreground">Contactos vinculados</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Atencion</CardTitle><AlertCircle className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.attention}</div><p className="text-xs text-muted-foreground">Asistencia o promedio bajo</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <CardTitle>Directorio de estudiantes</CardTitle>
            <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_160px_160px_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar alumno, matricula o tutor" className="pl-9" />
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
              <div><p className="font-medium">No hay estudiantes con esos filtros</p><p className="text-sm text-muted-foreground">Ajusta la busqueda, importa Excel o matricula un estudiante.</p></div>
              <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Matricular estudiante</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Matricula</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Padres vinculados</TableHead>
                  <TableHead>Rendimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell><div className="font-medium">{fullStudentName(student)}</div><div className="text-xs text-muted-foreground">{student.email || "Sin email de alumno"}</div></TableCell>
                    <TableCell>{student.enrollment_id}</TableCell>
                    <TableCell><div>{student.grade_name || "Sin grado"}</div><div className="text-xs text-muted-foreground">{student.group_name || "Sin grupo"}</div></TableCell>
                    <TableCell><div>{student.parents?.length || 1} contacto(s)</div><div className="text-xs text-muted-foreground">{getPrimaryParent(student).email}</div></TableCell>
                    <TableCell><div className="text-sm">{student.average_grade || 0} promedio</div><div className="text-xs text-muted-foreground">{student.attendance_rate || 0}% asistencia</div></TableCell>
                    <TableCell><Badge variant={student.status === "active" ? "default" : "outline"}>{statusLabel(student.status)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" title="Ver detalle" onClick={() => openDetail(student)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(student)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" title={student.status === "active" ? "Pausar" : "Activar"} onClick={() => changeStatus(student, student.status === "active" ? "inactive" : "active")}><Users className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon-sm" title="Eliminar" onClick={() => { setSelectedStudent(student); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Editar estudiante" : "Matricular estudiante"}</DialogTitle>
            <DialogDescription>Captura datos separados del alumno, fecha por dia/mes/ano y padres vinculados.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveStudent} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label>Nombre(s)</Label><Input value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Apellido paterno</Label><Input value={form.paternal_last_name} onChange={(event) => setForm((current) => ({ ...current, paternal_last_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Apellido materno</Label><Input value={form.maternal_last_name} onChange={(event) => setForm((current) => ({ ...current, maternal_last_name: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Matricula</Label><Input value={form.enrollment_id} onChange={(event) => setForm((current) => ({ ...current, enrollment_id: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Dia nacimiento</Label><Input inputMode="numeric" maxLength={2} placeholder="DD" value={form.birth_day} onChange={(event) => setForm((current) => ({ ...current, birth_day: event.target.value.replace(/\D/g, "").slice(0, 2) }))} /></div>
              <div className="space-y-2"><Label>Mes nacimiento</Label><Input inputMode="numeric" maxLength={2} placeholder="MM" value={form.birth_month} onChange={(event) => setForm((current) => ({ ...current, birth_month: event.target.value.replace(/\D/g, "").slice(0, 2) }))} /></div>
              <div className="space-y-2"><Label>Ano nacimiento</Label><Input inputMode="numeric" maxLength={4} placeholder="AAAA" value={form.birth_year} onChange={(event) => setForm((current) => ({ ...current, birth_year: event.target.value.replace(/\D/g, "").slice(0, 4) }))} /></div>
              <div className="space-y-2"><Label>Email alumno</Label><Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Telefono alumno</Label><Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></div>
              <div className="space-y-2"><Label>Grupo</Label><Select value={form.group_id || "none"} onValueChange={(value) => setForm((current) => ({ ...current, group_id: value === "none" ? "" : value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin grupo</SelectItem>{groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.grade_name} {group.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Estado</Label><Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as StudentStatus }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Activo</SelectItem><SelectItem value="inactive">Pausado</SelectItem><SelectItem value="graduated">Egresado</SelectItem><SelectItem value="withdrawn">Baja</SelectItem></SelectContent></Select></div>
              <div className="space-y-2 md:col-span-3"><Label>Direccion / notas</Label><Textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div><p className="font-medium">Padres y tutores vinculados</p><p className="text-xs text-muted-foreground">El primer contacto principal queda enlazado al alumno inmediatamente.</p></div>
                <Button type="button" variant="outline" size="sm" onClick={addParent}><UserPlus className="mr-2 h-4 w-4" />Agregar</Button>
              </div>
              {form.parents.map((parent, index) => (
                <div key={index} className="grid gap-3 rounded-md border p-3 md:grid-cols-6">
                  <div className="space-y-2 md:col-span-2"><Label>Nombre(s)</Label><Input value={parent.first_name} onChange={(event) => updateParent(index, { first_name: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Ap. paterno</Label><Input value={parent.paternal_last_name} onChange={(event) => updateParent(index, { paternal_last_name: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Ap. materno</Label><Input value={parent.maternal_last_name} onChange={(event) => updateParent(index, { maternal_last_name: event.target.value })} /></div>
                  <div className="space-y-2"><Label>Parentesco</Label><Select value={parent.relationship} onValueChange={(value) => updateParent(index, { relationship: value as ParentRelationship })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mother">Madre</SelectItem><SelectItem value="father">Padre</SelectItem><SelectItem value="guardian">Tutor</SelectItem><SelectItem value="other">Otro</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Principal</Label><Button type="button" variant={parent.is_primary ? "default" : "outline"} className="w-full" onClick={() => updateParent(index, { is_primary: true })}>{parent.is_primary ? "Si" : "Marcar"}</Button></div>
                  <div className="space-y-2 md:col-span-2"><Label>Email</Label><Input type="email" value={parent.email} onChange={(event) => updateParent(index, { email: event.target.value })} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Telefono</Label><Input value={parent.phone} onChange={(event) => updateParent(index, { phone: event.target.value })} /></div>
                  <div className="space-y-2 md:col-span-2"><Label>Notas</Label><Input value={parent.notes || ""} onChange={(event) => updateParent(index, { notes: event.target.value })} /></div>
                  <div className="md:col-span-6 flex justify-end"><Button type="button" variant="ghost" size="sm" onClick={() => removeParent(index)} disabled={form.parents.length === 1}><Trash2 className="mr-2 h-4 w-4" />Quitar contacto</Button></div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedStudent ? fullStudentName(selectedStudent) : "Detalle del estudiante"}</DialogTitle>
            <DialogDescription>Perfil completo, padres, asistencia, horario, documentos e historial por ciclo escolar.</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <Tabs defaultValue="overview" className="space-y-4">
              <div>
                <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="academic">Academico</TabsTrigger>
                <TabsTrigger value="attendance">Asistencia</TabsTrigger>
                <TabsTrigger value="schedule">Horario</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
                <TabsTrigger value="observations">Observaciones</TabsTrigger>
              </TabsList>
              </div>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                  <div><p className="text-xs text-muted-foreground">Matricula</p><p className="font-medium">{selectedStudent.enrollment_id}</p></div>
                  <div><p className="text-xs text-muted-foreground">Nacimiento</p><p className="font-medium">{selectedStudent.birth_date || birthDateFromParts(selectedStudent.birth_day || "", selectedStudent.birth_month || "", selectedStudent.birth_year || "") || "Sin fecha"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Edad</p><p className="font-medium">{ageFromBirthDate(selectedStudent)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Grupo</p><p className="font-medium">{selectedStudent.grade_name} {selectedStudent.group_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">Estado</p><p className="font-medium">{statusLabel(selectedStudent.status)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Direccion</p><p className="font-medium">{selectedStudent.address || "Sin direccion"}</p></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Asistencia</p><p className="text-xl font-bold">{selectedStudent.attendance_rate || 0}%</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Promedio</p><p className="text-xl font-bold">{selectedStudent.average_grade || 0}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Faltas</p><p className="text-xl font-bold">{selectedStudent.total_absences || 0}</p></CardContent></Card>
                </div>
              </TabsContent>
              <TabsContent value="academic" className="space-y-4">
                <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                  <div><p className="text-xs text-muted-foreground">Grado actual</p><p className="font-medium">{selectedStudent.grade_name || "Sin grado"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Grupo</p><p className="font-medium">{selectedStudent.group_name || "Sin grupo"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Promedio</p><p className="font-medium">{selectedStudent.average_grade || 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Estado academico</p><p className="font-medium">{statusLabel(selectedStudent.status)}</p></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {(selectedStudent.parents?.length ? selectedStudent.parents : [getPrimaryParent(selectedStudent)]).map((parent, index) => (
                    <Card key={`${parent.email}-${index}`}>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="font-medium">{parentFullName(parent)}</p><p className="text-sm text-muted-foreground">{parent.email}</p></div>
                          {parent.is_primary && <Badge>Principal</Badge>}
                        </div>
                        <p className="text-sm">{parent.phone || "Sin telefono"}</p>
                        <p className="text-xs text-muted-foreground">{parent.relationship}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Evaluacion</TableHead><TableHead>Calificacion</TableHead><TableHead>Profesor</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(selectedStudent.recent_grades || []).map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell className="min-w-56">{grade.description}</TableCell>
                          <TableCell>{grade.score}/{grade.max_score}</TableCell>
                          <TableCell className="min-w-48">{grade.teacher_name}</TableCell>
                        </TableRow>
                      ))}
                      {(!selectedStudent.recent_grades || selectedStudent.recent_grades.length === 0) && (
                        <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Sin calificaciones recientes.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="attendance" className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Asistencia</p><p className="text-xl font-bold">{selectedStudent.attendance_rate || 0}%</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Faltas</p><p className="text-xl font-bold">{selectedStudent.total_absences || 0}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Registros</p><p className="text-xl font-bold">{selectedStudent.recent_attendance?.length || 0}</p></CardContent></Card>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(selectedStudent.recent_attendance || []).map((item) => (
                        <TableRow key={`${item.date}-${item.status}`}>
                          <TableCell className="whitespace-nowrap">{item.date}</TableCell>
                          <TableCell><Badge variant={item.status === "absent" ? "destructive" : "secondary"}>{item.status}</Badge></TableCell>
                          <TableCell className="min-w-52">{item.notes || "Sin notas"}</TableCell>
                        </TableRow>
                      ))}
                      {(!selectedStudent.recent_attendance || selectedStudent.recent_attendance.length === 0) && (
                        <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Sin asistencias registradas.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="schedule" className="space-y-4">
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Dia</TableHead><TableHead>Horario</TableHead><TableHead>Materia</TableHead><TableHead>Profesor</TableHead><TableHead>Aula</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {(selectedStudent.schedule || []).map((block) => (
                        <TableRow key={block.id}>
                          <TableCell className="whitespace-nowrap">{block.day}</TableCell>
                          <TableCell className="whitespace-nowrap">{block.start_time} - {block.end_time}</TableCell>
                          <TableCell>{block.subject}</TableCell>
                          <TableCell>{block.teacher_name || "Sin profesor"}</TableCell>
                          <TableCell>{block.room || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {(!selectedStudent.schedule || selectedStudent.schedule.length === 0) && (
                        <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Sin horario asignado.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="documents" className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {(selectedStudent.documents || []).map((doc) => (
                    <Card key={doc.id} className="min-w-0">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium" title={doc.title}>{doc.title}</p>
                            <p className="truncate text-sm text-muted-foreground">{doc.file_name || doc.mime_type || "Documento fisico"}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0">{documentCategoryLabel(doc.category)}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={doc.storage_status === "physical_only" ? "secondary" : "default"}>{documentStorageLabel(doc.storage_status)}</Badge>
                          {doc.is_verified && <Badge variant="outline">Verificado</Badge>}
                        </div>
                        {doc.description && <p className="line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>}
                        <Button variant="outline" size="sm" disabled={!doc.file_url} onClick={() => doc.file_url && window.open(doc.file_url, "_blank")}>
                          <Eye className="mr-2 h-4 w-4" />Preview
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  {(!selectedStudent.documents || selectedStudent.documents.length === 0) && (
                    <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Sin documentos digitales o fisicos registrados.</div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="history" className="space-y-4">
                <div className="flex justify-end">
                  <Select value={historyYearFilter} onValueChange={setHistoryYearFilter}>
                    <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los ciclos</SelectItem>
                      {schoolYears.map((year) => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Ciclo</TableHead><TableHead>Grado / grupo</TableHead><TableHead>Promedio</TableHead><TableHead>Asistencia</TableHead><TableHead>Faltas</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.school_year}</TableCell>
                          <TableCell><div>{item.grade_name}</div><div className="text-xs text-muted-foreground">{item.group_name}</div></TableCell>
                          <TableCell>{item.average_grade}</TableCell>
                          <TableCell>{item.attendance_rate}%</TableCell>
                          <TableCell>{item.absences}</TableCell>
                          <TableCell>{item.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              <TabsContent value="observations" className="space-y-3">
                <div className="rounded-lg border p-4">
                  <p className="font-medium">Observaciones</p>
                  <div className="mt-3 space-y-2">
                    {(selectedStudent.observations || []).map((item) => (
                      <div key={item.id} className="rounded-md bg-muted/40 p-3 text-sm">
                        <p className="font-medium">{item.type}</p>
                        <p className="text-muted-foreground">{item.note}</p>
                      </div>
                    ))}
                    {(!selectedStudent.observations || selectedStudent.observations.length === 0) && (
                      <p className="text-sm text-muted-foreground">Sin observaciones registradas.</p>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
            {selectedStudent && <Button onClick={() => { setDetailOpen(false); openEdit(selectedStudent); }}><Pencil className="mr-2 h-4 w-4" />Editar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Importacion masiva Excel</DialogTitle>
            <DialogDescription>Sube un .xlsx/.xls, filtra columnas y mapea cada columna al dato correcto de EduCore.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <Input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) readExcel(file); }} />
              <Select value={activeSheet || "none"} onValueChange={setActiveSheet}>
                <SelectTrigger><SelectValue placeholder="Hoja" /></SelectTrigger>
                <SelectContent>{Object.keys(sheets).length === 0 ? <SelectItem value="none">Sin archivo</SelectItem> : Object.keys(sheets).map((sheet) => <SelectItem key={sheet} value={sheet}>{sheet}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={autoMapColumns} disabled={columns.length === 0}>Automapear</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Filas detectadas</p><p className="text-2xl font-bold">{currentRows.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Filas validas</p><p className="text-2xl font-bold">{importValidation.validRows}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Columnas</p><p className="text-2xl font-bold">{columns.length}</p></CardContent></Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(260px,360px)_1fr]">
              <Card>
                <CardHeader><CardTitle className="text-base">Mapeo</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Filtrar columnas detectadas" value={columnSearch} onChange={(event) => setColumnSearch(event.target.value)} />
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {importFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label>{field.label}{field.required ? " *" : ""}</Label>
                        <Select value={mapping[field.key] || "none"} onValueChange={(value) => setMapping((current) => ({ ...current, [field.key]: value === "none" ? "" : value }))}>
                          <SelectTrigger><SelectValue placeholder="Seleccionar columna" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin mapear</SelectItem>
                            {visibleColumns.map((column) => <SelectItem key={column} value={column}>{column}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Preview validado</CardTitle></CardHeader>
                <CardContent>
                  {currentRows.length === 0 ? (
                    <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">Sube un archivo para ver la previsualizacion.</div>
                  ) : (
                    <div className="max-h-[520px] overflow-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Alumno</TableHead><TableHead>Matricula</TableHead><TableHead>Nacimiento</TableHead><TableHead>Tutor</TableHead><TableHead>Historial</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {mappedImportRows.slice(0, 25).map((row, index) => (
                            <TableRow key={index}>
                              <TableCell>{[row.first_name, row.paternal_last_name, row.maternal_last_name].filter(Boolean).join(" ") || "Sin nombre"}</TableCell>
                              <TableCell>{row.enrollment_id || "Sin matricula"}</TableCell>
                              <TableCell>{[row.birth_day, row.birth_month, row.birth_year].filter(Boolean).join("/") || "Sin fecha"}</TableCell>
                              <TableCell>{row.parent1_email || "Sin tutor"}</TableCell>
                              <TableCell>{row.school_year ? `${row.school_year} - ${row.history_grade_name || ""}` : "Sin historial"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={commitImport} disabled={saving || currentRows.length === 0 || importValidation.missing.length > 0}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Importar registros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Eliminar estudiante</DialogTitle><DialogDescription>Esta accion retira el expediente del directorio escolar.</DialogDescription></DialogHeader>
          <div className="rounded-lg border p-3 text-sm">{selectedStudent ? fullStudentName(selectedStudent) : "Estudiante seleccionado"}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteStudent} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SchoolStudentsPage() {
  return (
    <ModuleGuard moduleKey="students" moduleName="Estudiantes">
      <SchoolStudentsContent />
    </ModuleGuard>
  );
}
