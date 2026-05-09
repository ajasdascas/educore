"use client";

/**
 * GeneratedModulePage — Factory component for educational module pages.
 *
 * Usage (each page.tsx is a thin wrapper):
 *   export default function Page() {
 *     return <GeneratedModulePage role="school_admin" level="kinder" moduleKey="health_checks" mode="manage" />;
 *   }
 */

import { useEffect, useState, useCallback } from "react";
import {
  Heart, Brain, Camera, Star, LogIn, BookOpen, Zap, ClipboardList, BookMarked,
  Smile, ClipboardCheck, FileText, AlertTriangle, Monitor, FileCheck2, NotebookPen,
  Utensils, Bus, Loader2, PlusCircle, RefreshCw, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";
import { ModuleGuard } from "@/components/providers/ModuleGuard";

// ─── Module metadata ──────────────────────────────────────────────────────────

interface ModuleMeta {
  title: string;
  description: string;
  Icon: LucideIcon;
  moduleKey: string;
  apiSuffix: string;
  levelLabel: string;
}

const MODULE_META: Record<string, ModuleMeta> = {
  // Kinder / Guardería
  health_checks: {
    title: "Salud",
    description: "Chequeos de salud, temperatura, síntomas y medicamentos del día.",
    Icon: Heart,
    moduleKey: "health_checks",
    apiSuffix: "health-checks",
    levelLabel: "Kinder",
  },
  child_status: {
    title: "Estado del Niño",
    description: "Estado emocional, físico y ánimo al llegar y al salir.",
    Icon: Heart,
    moduleKey: "child_status",
    apiSuffix: "child-status",
    levelLabel: "Kinder",
  },
  pickup_authorizations: {
    title: "Autorizaciones de Entrega",
    description: "Personas autorizadas para recoger al alumno, registro de entradas y salidas.",
    Icon: LogIn,
    moduleKey: "pickup_authorizations",
    apiSuffix: "pickup-authorizations",
    levelLabel: "Kinder",
  },
  milestones: {
    title: "Hitos de Desarrollo",
    description: "Logros y avances del desarrollo físico, cognitivo y social del alumno.",
    Icon: Star,
    moduleKey: "milestones",
    apiSuffix: "milestones",
    levelLabel: "Kinder",
  },
  photos_evidence: {
    title: "Evidencias y Fotos",
    description: "Archivo fotográfico y evidencias del día en el aula.",
    Icon: Camera,
    moduleKey: "photos_evidence",
    apiSuffix: "photos-evidence",
    levelLabel: "Kinder",
  },
  // Preescolar
  development_areas: {
    title: "Áreas de Desarrollo",
    description: "Lenguaje, motricidad gruesa/fina, autonomía y área socioemocional.",
    Icon: Brain,
    moduleKey: "development_areas",
    apiSuffix: "development-areas",
    levelLabel: "Preescolar",
  },
  activities: {
    title: "Actividades y Evidencias",
    description: "Actividades realizadas en clase con sus evidencias y materiales.",
    Icon: Zap,
    moduleKey: "activities",
    apiSuffix: "activities",
    levelLabel: "Preescolar",
  },
  behavior_notes: {
    title: "Notas de Conducta",
    description: "Observaciones de comportamiento, convivencia y disciplina.",
    Icon: ClipboardList,
    moduleKey: "behavior_notes",
    apiSuffix: "behavior-notes",
    levelLabel: "Preescolar",
  },
  preschool_report_cards: {
    title: "Boletas Preescolar",
    description: "Reportes cualitativos por periodo: logrado, en proceso, requiere apoyo.",
    Icon: BookMarked,
    moduleKey: "preschool_report_cards",
    apiSuffix: "preschool-report-cards",
    levelLabel: "Preescolar",
  },
  socioemotional: {
    title: "Desarrollo Socioemocional",
    description: "Integración al grupo, manejo emocional, participación y convivencia.",
    Icon: Smile,
    moduleKey: "socioemotional",
    apiSuffix: "socioemotional",
    levelLabel: "Preescolar",
  },
  // Primaria
  subjects: {
    title: "Materias",
    description: "Catálogo de materias por grado y grupo.",
    Icon: BookOpen,
    moduleKey: "subjects",
    apiSuffix: "subjects",
    levelLabel: "Primaria",
  },
  assignments: {
    title: "Tareas",
    description: "Crear, asignar y revisar tareas escolares por materia.",
    Icon: ClipboardCheck,
    moduleKey: "assignments",
    apiSuffix: "assignments",
    levelLabel: "Primaria",
  },
  exams: {
    title: "Evaluaciones",
    description: "Exámenes, quizzes, rúbricas y evaluaciones formativas.",
    Icon: FileText,
    moduleKey: "exams",
    apiSuffix: "exams",
    levelLabel: "Primaria",
  },
  discipline: {
    title: "Conducta y Disciplina",
    description: "Reportes de conducta, reconocimientos y amonestaciones.",
    Icon: AlertTriangle,
    moduleKey: "discipline",
    apiSuffix: "discipline",
    levelLabel: "Primaria",
  },
  classroom: {
    title: "Aula Virtual",
    description: "Materiales, recursos didácticos y comunicación del aula.",
    Icon: Monitor,
    moduleKey: "classroom",
    apiSuffix: "classroom",
    levelLabel: "Primaria",
  },
  primary_report_cards: {
    title: "Boletas",
    description: "Boletas de calificaciones por periodo y materia.",
    Icon: FileCheck2,
    moduleKey: "report_cards",
    apiSuffix: "primary-report-cards",
    levelLabel: "Primaria",
  },
  primary_grades: {
    title: "Calificaciones",
    description: "Captura y consulta de calificaciones por materia y periodo.",
    Icon: NotebookPen,
    moduleKey: "grading",
    apiSuffix: "primary-grades",
    levelLabel: "Primaria",
  },
  // Servicios
  cafeteria_service: {
    title: "Comedor Escolar",
    description: "Menú semanal, inscripciones y pagos del servicio de comedor.",
    Icon: Utensils,
    moduleKey: "cafeteria_service",
    apiSuffix: "cafeteria",
    levelLabel: "Servicios",
  },
  transport_service: {
    title: "Transporte Escolar",
    description: "Rutas, chofer, unidad asignada y lista de abordaje.",
    Icon: Bus,
    moduleKey: "transport_service",
    apiSuffix: "transport",
    levelLabel: "Servicios",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  role: string;
  level: string;
  moduleKey: string;
  mode?: "manage" | "capture" | "view" | "read";
}

interface InnerProps extends Props {
  meta: ModuleMeta;
}

type Student = { id: string; first_name: string; last_name: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DataRecord = { id: string; [key: string]: any };

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Inner content (no guard) ─────────────────────────────────────────────────

function GeneratedModuleContent({ role, level, moduleKey, mode = "manage", meta }: InnerProps) {
  const { toast } = useToast();
  const isReadOnly = mode === "view" || mode === "read" || role === "parent" || role === "student";

  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending");

  const apiBase = `/api/v1/${role.replace("_", "-")}/${level}`;

  const loadStudents = useCallback(async () => {
    try {
      const res = await authFetch(`${apiBase}/students`);
      const raw = res?.data?.students ?? res?.data ?? [];
      const list: Student[] = Array.isArray(raw) ? raw : [];
      setStudents(list);
      if (list.length > 0) setStudentId(list[0].id);
    } catch {
      // Non-blocking — students list is optional
    }
  }, [apiBase]);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${apiBase}/${meta.apiSuffix}`);
      const raw = res?.data?.items ?? res?.data?.records ?? res?.data ?? [];
      setRecords(Array.isArray(raw) ? raw : []);
    } catch {
      toast({ title: `Error al cargar ${meta.title.toLowerCase()}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [apiBase, meta.apiSuffix, meta.title, toast]);

  useEffect(() => {
    if (!isReadOnly) loadStudents();
    loadRecords();
  }, [isReadOnly, loadStudents, loadRecords]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await authFetch(`${apiBase}/${meta.apiSuffix}`, {
        method: "POST",
        body: JSON.stringify({
          student_id: studentId || undefined,
          date,
          notes,
          status,
        }),
      });
      if (!res?.success) throw new Error(res?.error ?? "No se pudo guardar.");
      toast({ title: `${meta.title} guardado` });
      setNotes("");
      await loadRecords();
    } catch (err) {
      toast({
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const studentName = (id: string) => {
    const s = students.find((s) => s.id === id);
    return s ? `${s.first_name} ${s.last_name}` : id;
  };

  const { Icon } = meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{meta.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{meta.levelLabel}</Badge>
          <Button variant="ghost" size="icon" onClick={loadRecords} title="Actualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New record form — only for manage/capture and non-parent/non-student roles */}
      {!isReadOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="h-4 w-4" />
              Nuevo registro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {students.length > 0 && (
                <div className="space-y-2">
                  <Label>Alumno</Label>
                  <Select value={studentId || "none"} onValueChange={(v) => setStudentId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.first_name} {s.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in_progress">En proceso</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="observed">Observado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas u observaciones</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Observaciones de ${meta.title.toLowerCase()}…`}
                rows={3}
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando…</>
                : <><PlusCircle className="mr-2 h-4 w-4" />Guardar registro</>
              }
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Records table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4" />
            Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando…
            </div>
          ) : records.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-muted p-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Aún no hay registros</p>
                <p className="text-sm text-muted-foreground">
                  {isReadOnly
                    ? "No hay información disponible todavía."
                    : `Crea el primer registro de ${meta.title.toLowerCase()}.`}
                </p>
              </div>
              {!isReadOnly && (
                <Button variant="outline" size="sm" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Crear primer registro
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {students.length > 0 && <TableHead>Alumno</TableHead>}
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((rec) => (
                    <TableRow key={rec.id}>
                      {students.length > 0 && (
                        <TableCell className="font-medium">
                          {rec.student_name ?? (rec.student_id ? studentName(rec.student_id) : "—")}
                        </TableCell>
                      )}
                      <TableCell className="whitespace-nowrap text-sm">
                        {rec.date
                          ? new Date(rec.date).toLocaleDateString("es-MX")
                          : rec.created_at
                          ? new Date(rec.created_at).toLocaleDateString("es-MX")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {rec.status ? (
                          <Badge
                            variant={
                              rec.status === "completed" ? "default"
                              : rec.status === "in_progress" ? "secondary"
                              : "outline"
                            }
                            className="text-xs"
                          >
                            {rec.status === "completed" ? "Completado"
                              : rec.status === "in_progress" ? "En proceso"
                              : rec.status === "observed" ? "Observado"
                              : "Pendiente"}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                        {rec.notes ?? rec.content ?? rec.description ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Public export (with ModuleGuard) ────────────────────────────────────────

export function GeneratedModulePage({ role, level, moduleKey, mode = "manage" }: Props) {
  const meta: ModuleMeta = MODULE_META[moduleKey] ?? {
    title: moduleKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "Módulo en desarrollo.",
    Icon: BookOpen,
    moduleKey,
    apiSuffix: moduleKey.replace(/_/g, "-"),
    levelLabel: level.charAt(0).toUpperCase() + level.slice(1),
  };

  return (
    <ModuleGuard moduleKey={meta.moduleKey} moduleName={meta.title}>
      <GeneratedModuleContent role={role} level={level} moduleKey={moduleKey} mode={mode} meta={meta} />
    </ModuleGuard>
  );
}

export default GeneratedModulePage;
