"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Baby, BookOpen, Calendar, ClipboardList, GraduationCap,
  Heart, Mail, Phone, Salad, UserRound, Users
} from "lucide-react";
import { authFetch, isSupportMode } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ChildSummary {
  id: string;
  first_name: string;
  last_name: string;
  enrollment_id?: string;
  grade_name?: string;
  group_name?: string;
  level_key?: string;
  status?: string;
  profile_photo?: string;
  attendance_rate?: number;
  current_gpa?: number;
  last_attendance?: string;
  recent_grade?: string;
  next_class?: string;
}

interface ChildDetail extends ChildSummary {
  birth_date?: string;
  teacher_name?: string;
  teacher_email?: string;
  address?: string;
  emergency_info?: { primary_phone?: string };
}

function detectLevel(child: ChildSummary): "kinder" | "preescolar" | "primaria" | "other" {
  const k = (child.level_key || "").toLowerCase();
  if (k === "kinder") return "kinder";
  if (k === "preescolar") return "preescolar";
  if (k === "primaria") return "primaria";
  // Fallback: guess from grade name
  const gn = (child.grade_name || "").toLowerCase();
  if (gn.includes("kinder") || gn.includes("kínder")) return "kinder";
  if (gn.includes("preescolar") || gn.includes("presc")) return "preescolar";
  if (gn.includes("primaria") || gn.includes("1°") || gn.includes("2°") || gn.includes("3°")) return "primaria";
  return "other";
}

export default function ParentChildrenPage() {
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [selected, setSelected] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupport, setIsSupport] = useState(false);

  useEffect(() => {
    setIsSupport(isSupportMode());
    const load = async () => {
      try {
        const res = await authFetch("/api/v1/parent/children");
        const list: ChildSummary[] = res.success ? (res.data ?? []) : [];
        setChildren(list);
        if (list[0]) {
          const detail = await authFetch(`/api/v1/parent/children/${list[0].id}`);
          setSelected(detail.success ? detail.data : list[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const selectChild = async (child: ChildSummary) => {
    setSelected(child as ChildDetail);
    const detail = await authFetch(`/api/v1/parent/children/${child.id}`);
    if (detail.success) setSelected(detail.data);
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground p-6">Cargando hijos...</div>;
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Hijos</h1>
          <p className="text-muted-foreground">Expediente académico de tus hijos vinculados.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/40" />
            {isSupport ? (
              <>
                <p className="font-medium">Sin alumnos en esta escuela</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Esta escuela aún no tiene alumnos registrados. Añade un alumno desde{" "}
                  <a href="/school-admin/students" className="underline text-primary">
                    Administración → Alumnos
                  </a>{" "}
                  para ver cómo funciona el portal de padres.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">No hay alumnos vinculados</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Pide al administrador de tu escuela que vincule a tus hijos a tu cuenta de acceso.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const level = selected ? detectLevel(selected) : detectLevel(children[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Hijos</h1>
        <p className="text-muted-foreground">Consulta el expediente de tus hijos vinculados.</p>
        {isSupport && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 border border-amber-200">
            Modo Soporte — viendo como padre de familia
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Child list */}
        <div className="space-y-3">
          {children.map((child) => {
            const lv = detectLevel(child);
            const Icon = lv === "kinder" ? Baby : lv === "preescolar" ? Heart : GraduationCap;
            return (
              <button
                key={child.id}
                onClick={() => selectChild(child)}
                className={`w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                  selected?.id === child.id ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{child.first_name} {child.last_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {child.grade_name || "Sin grado"}{child.group_name ? ` · ${child.group_name}` : ""}
                    </p>
                    {lv !== "other" && (
                      <Badge variant="outline" className="mt-1 text-xs capitalize">{lv}</Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selected ? `${selected.first_name} ${selected.last_name}` : "Selecciona un alumno"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selected && <ChildDetailPanel child={selected} level={level} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChildDetailPanel({ child, level }: { child: ChildDetail; level: string }) {
  if (level === "kinder") return <KinderPanel child={child} />;
  if (level === "preescolar") return <PreescolarPanel child={child} />;
  return <PrimariaPanel child={child} />;
}

// ── Kinder panel ──────────────────────────────────────────────────────────────
function KinderPanel({ child }: { child: ChildDetail }) {
  return (
    <Tabs defaultValue="daily">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="daily">Diario</TabsTrigger>
        <TabsTrigger value="meals">Comidas</TabsTrigger>
        <TabsTrigger value="naps">Siestas</TabsTrigger>
        <TabsTrigger value="contact">Contacto</TabsTrigger>
      </TabsList>

      <TabsContent value="daily" className="space-y-4 pt-4">
        <SummaryStats child={child} showGpa={false} />
        <QuickLinks links={[
          { href: `/parent/daily-logs`, label: "Registros Diarios", icon: <ClipboardList className="h-4 w-4" /> },
          { href: `/parent/mood`,       label: "Estado de ánimo",   icon: <Heart className="h-4 w-4" /> },
          { href: `/parent/incidents`,  label: "Incidentes",        icon: <UserRound className="h-4 w-4" /> },
        ]} />
      </TabsContent>

      <TabsContent value="meals" className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground mb-2">
          Consulta las comidas y estados de alimentación del día.
        </p>
        <QuickLinks links={[
          { href: `/parent/meals`,    label: "Ver comidas",   icon: <Salad className="h-4 w-4" /> },
          { href: `/parent/diapers`,  label: "Ver pañales",   icon: <Baby className="h-4 w-4" /> },
        ]} />
      </TabsContent>

      <TabsContent value="naps" className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground mb-2">
          Registro de siestas y descanso diario.
        </p>
        <QuickLinks links={[
          { href: `/parent/naps`, label: "Ver siestas", icon: <Calendar className="h-4 w-4" /> },
        ]} />
      </TabsContent>

      <TabsContent value="contact" className="pt-4">
        <ContactTab child={child} />
      </TabsContent>
    </Tabs>
  );
}

// ── Preescolar panel ──────────────────────────────────────────────────────────
function PreescolarPanel({ child }: { child: ChildDetail }) {
  return (
    <Tabs defaultValue="development">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="development">Desarrollo</TabsTrigger>
        <TabsTrigger value="assessments">Evaluaciones</TabsTrigger>
        <TabsTrigger value="contact">Contacto</TabsTrigger>
      </TabsList>

      <TabsContent value="development" className="space-y-4 pt-4">
        <SummaryStats child={child} showGpa={false} />
        <QuickLinks links={[
          { href: `/student/development-areas`,       label: "Áreas de Desarrollo",     icon: <BookOpen className="h-4 w-4" /> },
          { href: `/student/qualitative-assessments`, label: "Evaluaciones Cualitativas",icon: <Heart className="h-4 w-4" /> },
          { href: `/student/observations`,            label: "Observaciones",            icon: <ClipboardList className="h-4 w-4" /> },
        ]} />
      </TabsContent>

      <TabsContent value="assessments" className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          En preescolar las evaluaciones son cualitativas: <strong>Logrado</strong>, <strong>En proceso</strong> o <strong>Iniciando</strong>.
        </p>
        <QuickLinks links={[
          { href: `/student/qualitative-assessments`, label: "Ver evaluaciones",  icon: <BookOpen className="h-4 w-4" /> },
          { href: `/student/evidence`,                label: "Ver evidencias",    icon: <Calendar className="h-4 w-4" /> },
        ]} />
      </TabsContent>

      <TabsContent value="contact" className="pt-4">
        <ContactTab child={child} />
      </TabsContent>
    </Tabs>
  );
}

// ── Primaria panel (default) ──────────────────────────────────────────────────
function PrimariaPanel({ child }: { child: ChildDetail }) {
  return (
    <Tabs defaultValue="summary">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="summary">Resumen</TabsTrigger>
        <TabsTrigger value="academic">Académico</TabsTrigger>
        <TabsTrigger value="contact">Contacto</TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="space-y-4 pt-4">
        <SummaryStats child={child} showGpa />
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium">Última calificación</p>
          <p className="text-sm text-muted-foreground">{child.recent_grade || "Sin registros recientes"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm font-medium">Siguiente clase</p>
          <p className="text-sm text-muted-foreground">{child.next_class || "No disponible"}</p>
        </div>
      </TabsContent>

      <TabsContent value="academic" className="space-y-4 pt-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Matrícula: {child.enrollment_id || "N/D"}</Badge>
          <Badge variant="secondary">{child.grade_name || "Grado N/D"}</Badge>
          <Badge variant="secondary">Grupo {child.group_name || "N/D"}</Badge>
        </div>
        <QuickLinks links={[
          { href: "/parent/grades",     label: "Ver calificaciones", icon: <BookOpen className="h-4 w-4" /> },
          { href: "/parent/attendance", label: "Ver asistencia",     icon: <Calendar className="h-4 w-4" /> },
        ]} />
      </TabsContent>

      <TabsContent value="contact" className="pt-4">
        <ContactTab child={child} />
      </TabsContent>
    </Tabs>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function SummaryStats({ child, showGpa }: { child: ChildDetail; showGpa: boolean }) {
  return (
    <div className={`grid gap-3 ${showGpa ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {showGpa && (
        <InfoCard label="Promedio" value={child.current_gpa ?? 0} icon={<BookOpen className="h-4 w-4" />} />
      )}
      <InfoCard label="Asistencia" value={`${child.attendance_rate ?? 0}%`} icon={<Calendar className="h-4 w-4" />} />
      <InfoCard label="Estado" value={child.status ?? "Activo"} icon={<UserRound className="h-4 w-4" />} />
    </div>
  );
}

function InfoCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ContactTab({ child }: { child: ChildDetail }) {
  return (
    <div className="space-y-3 pt-1">
      <p className="flex items-center gap-2 text-sm">
        <Mail className="h-4 w-4 text-muted-foreground" />
        Docente: {child.teacher_email || "No disponible"}
      </p>
      <p className="flex items-center gap-2 text-sm">
        <Phone className="h-4 w-4 text-muted-foreground" />
        Emergencia: {child.emergency_info?.primary_phone || "No disponible"}
      </p>
      <p className="text-sm text-muted-foreground">{child.address || "Sin notas de expediente."}</p>
    </div>
  );
}

function QuickLinks({ links }: { links: { href: string; label: string; icon: ReactNode }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start gap-2")}
        >
          {l.icon}{l.label}
        </a>
      ))}
    </div>
  );
}
