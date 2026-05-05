"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authFetch, setSupportContext } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Loader2,
  Building2,
} from "lucide-react";
import { API_URL } from "@/lib/api";

interface School {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  total_students?: number;
  total_teachers?: number;
}

type CheckStatus = "pending" | "running" | "ok" | "fail";

interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  trial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

const statusLabels: Record<string, string> = {
  active: "Activa",
  suspended: "Suspendida",
  pending: "Pendiente",
  trial: "En Prueba",
};

const SUPPORT_MODULES = [
  { label: "Dashboard", path: "/school-admin/dashboard" },
  { label: "Estudiantes", path: "/school-admin/students" },
  { label: "Profesores", path: "/school-admin/teachers" },
  { label: "Grupos", path: "/school-admin/groups" },
  { label: "Asistencias", path: "/school-admin/attendance" },
  { label: "Calificaciones", path: "/school-admin/grades" },
  { label: "Boletas", path: "/school-admin/report-cards" },
  { label: "Horarios", path: "/school-admin/schedule" },
  { label: "Comunicaciones", path: "/school-admin/communications" },
];

function makeChecks(school: School | null): Check[] {
  return [
    {
      id: "backend-health",
      label: "Backend Health",
      status: "pending",
      detail: "",
    },
    {
      id: "school-info",
      label: `School Info (${school?.slug || "—"})`,
      status: "pending",
      detail: "",
    },
  ];
}

export default function LabPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("");
  const [checks, setChecks] = useState<Check[]>(makeChecks(null));
  const [runningChecks, setRunningChecks] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  const selectedSchool = schools.find((s) => s.id === selectedId) || null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next) setNextPath(next);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingSchools(true);
      try {
        const res = await authFetch("/api/v1/super-admin/schools?per_page=50");
        const raw = res?.data?.schools || res?.data || [];
        setSchools(Array.isArray(raw) ? raw : []);
      } catch {
        setSchools([]);
      } finally {
        setLoadingSchools(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setChecks(makeChecks(selectedSchool));
  }, [selectedId]);

  const enterSupportMode = (path: string) => {
    if (!selectedSchool) return;
    setSupportContext(selectedSchool.id, selectedSchool.slug, selectedSchool.name);
    router.push(path);
  };

  const runChecks = async () => {
    if (!selectedSchool) return;
    setRunningChecks(true);

    setChecks((prev) => prev.map((c) => ({ ...c, status: "running" as CheckStatus, detail: "" })));

    // Check 1: Backend Health
    try {
      const res = await fetch(`${API_URL}/api/v1/health`);
      const data = await res.json().catch(() => ({}));
      setChecks((prev) =>
        prev.map((c) =>
          c.id === "backend-health"
            ? {
                ...c,
                status: res.ok ? "ok" : "fail",
                detail: res.ok ? `HTTP ${res.status} — ${data?.status || "ok"}` : `HTTP ${res.status}`,
              }
            : c
        )
      );
    } catch (err: any) {
      setChecks((prev) =>
        prev.map((c) =>
          c.id === "backend-health"
            ? { ...c, status: "fail", detail: err?.message || "Error de red" }
            : c
        )
      );
    }

    // Check 2: School Info
    try {
      const res = await fetch(`${API_URL}/api/v1/public/school-info?slug=${selectedSchool.slug}`);
      const data = await res.json().catch(() => ({}));
      setChecks((prev) =>
        prev.map((c) =>
          c.id === "school-info"
            ? {
                ...c,
                status: res.ok ? "ok" : "fail",
                detail: res.ok
                  ? `HTTP ${res.status} — ${data?.data?.name || selectedSchool.name}`
                  : `HTTP ${res.status} — ${data?.error || "Sin datos"}`,
              }
            : c
        )
      );
    } catch (err: any) {
      setChecks((prev) =>
        prev.map((c) =>
          c.id === "school-info"
            ? { ...c, status: "fail", detail: err?.message || "Error de red" }
            : c
        )
      );
    }

    setRunningChecks(false);
  };

  const CheckIcon = ({ status }: { status: CheckStatus }) => {
    if (status === "running") return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (status === "ok") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === "fail") return <XCircle className="w-4 h-4 text-red-500" />;
    return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40" />;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <FlaskConical className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laboratorio</h1>
          <p className="text-sm text-muted-foreground">Herramientas de soporte técnico para Super Admin</p>
        </div>
      </div>

      <Separator />

      {/* Banner cuando viene desde school-admin sin contexto */}
      {nextPath && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">Selecciona una escuela para continuar</p>
            <p className="text-sm text-muted-foreground">
              Intentaste acceder a <code className="font-mono text-xs">{nextPath}</code> sin modo soporte activo.
              Selecciona una escuela y haz clic en "Continuar".
            </p>
          </div>
          {selectedSchool && (
            <Button
              className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => enterSupportMode(nextPath)}
            >
              Continuar a {nextPath.split("/").pop()}
            </Button>
          )}
        </div>
      )}

      {/* Selector de escuela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Seleccionar Escuela
          </CardTitle>
          <CardDescription>Elige una escuela para inspeccionar o entrar en modo soporte</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSchools ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando escuelas...
            </div>
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecciona una escuela" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Info de la escuela seleccionada */}
      {selectedSchool && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos de la Escuela</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="font-medium">{selectedSchool.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Slug</p>
                  <p className="font-mono font-medium">{selectedSchool.slug}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tenant ID</p>
                  <p className="font-mono text-xs break-all">{selectedSchool.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado</p>
                  <Badge className={statusColors[selectedSchool.status] || "bg-gray-100 text-gray-800"}>
                    {statusLabels[selectedSchool.status] || selectedSchool.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-medium">{selectedSchool.plan}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Alumnos / Profesores</p>
                  <p className="font-medium">
                    {selectedSchool.total_students ?? "—"} / {selectedSchool.total_teachers ?? "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acceso en modo soporte */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" /> Modo Soporte — Acceso Directo
              </CardTitle>
              <CardDescription>
                Activa el modo soporte y navega a cualquier módulo de la escuela seleccionada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Módulos internos</p>
                <div className="flex flex-wrap gap-2">
                  {SUPPORT_MODULES.map(({ label, path }) => (
                    <Button key={path} variant="outline" size="sm" onClick={() => enterSupportMode(path)}>
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase mb-2">Portales externos</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Portal Escuela", url: `https://${selectedSchool.slug}.onlineu.mx` },
                    { label: "Login Director", url: `https://${selectedSchool.slug}.onlineu.mx/login?role=school_admin` },
                    { label: "Login Profesor", url: `https://${selectedSchool.slug}.onlineu.mx/login?role=teacher` },
                    { label: "Login Padre", url: `https://${selectedSchool.slug}.onlineu.mx/login?role=parent` },
                    { label: "Login Estudiante", url: `https://${selectedSchool.slug}.onlineu.mx/login?role=student` },
                  ].map(({ label, url }) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <Button variant="secondary" size="sm" className="gap-1">
                        <ExternalLink className="w-3 h-3" /> {label}
                      </Button>
                    </a>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Checks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Health Checks
                  </CardTitle>
                  <CardDescription>Verifica la conectividad del backend y datos de la escuela</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runChecks}
                  disabled={runningChecks || !selectedSchool}
                >
                  {runningChecks ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Ejecutar checks
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20"
                  >
                    <CheckIcon status={check.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{check.label}</p>
                      {check.detail && (
                        <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        check.status === "ok"
                          ? "border-green-500 text-green-600"
                          : check.status === "fail"
                          ? "border-red-500 text-red-600"
                          : check.status === "running"
                          ? "border-blue-500 text-blue-600"
                          : "border-muted-foreground/40 text-muted-foreground"
                      }
                    >
                      {check.status === "pending"
                        ? "pendiente"
                        : check.status === "running"
                        ? "ejecutando..."
                        : check.status === "ok"
                        ? "ok"
                        : "falla"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedSchool && !loadingSchools && (
        <div className="text-center py-12 text-muted-foreground">
          <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Selecciona una escuela para comenzar</p>
        </div>
      )}
    </div>
  );
}
