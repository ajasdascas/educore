"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Building2,
  Users,
  Calendar,
  ChevronLeft,
  Shield,
  Settings,
  Users2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Save,
  Loader2,
  AlertTriangle,
  Globe,
  Eye,
  LayoutGrid,
  CreditCard,
  KeyRound,
  Receipt,
  ClipboardList,
  UserCog,
  Layers,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authFetch, setSupportContext, type SupportRole } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ────────────────────────────────────────────────────────────────

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  trial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

const statusLabels = {
  active: "Activa",
  suspended: "Suspendida",
  pending: "Pendiente",
  trial: "En Prueba",
};

const severityColors: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  critical: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface School {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  logo_url: string;
  created_at: string;
  updated_at: string;
  total_students: number;
  total_teachers: number;
  total_parents: number;
}

interface Module {
  key: string;
  name: string;
  description: string;
  is_core: boolean;
  is_active: boolean;
  enabled?: boolean;
  level?: string;
  is_required?: boolean;
  source?: string;
  price_monthly_mxn: number;
}

interface SchoolUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

interface SchoolLevel {
  level_key: string;
  name: string;
  enabled: boolean;
  sort_order: number;
}

interface Submodule {
  module_key: string;
  submodule_key: string;
  enabled: boolean;
}

interface PlanEntitlements {
  plan_name: string;
  max_students: number;
  current_students: number;
  max_teachers: number;
  current_teachers: number;
  storage_gb: number;
  used_storage_gb: number;
}

interface Credentials {
  admin_email: string;
  admin_name: string;
  is_active: boolean;
}

interface BillingInfo {
  total_students: number;
  new_this_month: number;
  plan: string;
  estimated_monthly_mxn: number;
}

interface AuditEntry {
  created_at: string;
  action: string;
  severity: string;
  performed_by: string;
  resource: string;
}

interface PortalPreview {
  role: string;
  label: string;
  url: string;
  icon: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function UsageBar({ current, max, label }: { current: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{current} / {max === 0 ? "∞" : max} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type TabId =
  | "general"
  | "levels"
  | "modules"
  | "submodules"
  | "plan"
  | "credentials"
  | "billing"
  | "portals"
  | "audit"
  | "roletest";

function SchoolDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { toast } = useToast();

  // ── Core state (loaded on mount) ──
  const [school, setSchool] = useState<School | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [schoolLevels, setSchoolLevels] = useState<SchoolLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // ── Lazy-loaded state (one per new tab) ──
  const [submodules, setSubmodules] = useState<Submodule[] | null>(null);
  const [submodulesLoading, setSubmodulesLoading] = useState(false);

  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [entitlementsLoading, setEntitlementsLoading] = useState(false);

  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);

  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const [auditLog, setAuditLog] = useState<AuditEntry[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const [portalLinks, setPortalLinks] = useState<PortalPreview[] | null>(null);
  const [portalLinksLoading, setPortalLinksLoading] = useState(false);

  // ── Active tab ──
  const [tabActive, setTabActive] = useState<TabId>("general");

  // ── Initial load ──
  useEffect(() => {
    if (id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [id]);

  // ── Lazy loaders ──
  const loadSubmodules = async () => {
    if (submodules !== null || submodulesLoading) return;
    setSubmodulesLoading(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/submodules`);
      if (res.success) {
        setSubmodules(Array.isArray(res.data?.submodules) ? res.data.submodules : []);
      } else {
        setSubmodules([]);
      }
    } catch {
      setSubmodules([]);
    } finally {
      setSubmodulesLoading(false);
    }
  };

  const loadEntitlements = async () => {
    if (entitlements !== null || entitlementsLoading) return;
    setEntitlementsLoading(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/plan-entitlements`);
      if (res.success) setEntitlements(res.data);
      else setEntitlements(null);
    } catch {
      setEntitlements(null);
    } finally {
      setEntitlementsLoading(false);
    }
  };

  const loadCredentials = async () => {
    if (credentials !== null || credentialsLoading) return;
    setCredentialsLoading(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/credentials`);
      if (res.success) setCredentials(res.data);
      else setCredentials(null);
    } catch {
      setCredentials(null);
    } finally {
      setCredentialsLoading(false);
    }
  };

  const loadBilling = async () => {
    if (billing !== null || billingLoading) return;
    setBillingLoading(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/student-billing`);
      if (res.success) setBilling(res.data);
      else setBilling(null);
    } catch {
      setBilling(null);
    } finally {
      setBillingLoading(false);
    }
  };

  const loadAuditLog = async () => {
    if (auditLog !== null || auditLoading) return;
    setAuditLoading(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/audit`);
      if (res.success) {
        setAuditLog(Array.isArray(res.data?.entries) ? res.data.entries : []);
      } else {
        setAuditLog([]);
      }
    } catch {
      setAuditLog([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const loadPortalLinks = async () => {
    if (portalLinks !== null || portalLinksLoading) return;
    setPortalLinksLoading(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/portal-preview`);
      if (res.success) {
        setPortalLinks(Array.isArray(res.data?.portals) ? res.data.portals : []);
      } else {
        setPortalLinks([]);
      }
    } catch {
      setPortalLinks([]);
    } finally {
      setPortalLinksLoading(false);
    }
  };

  // ── Tab change handler ──
  const handleTabChange = (value: string) => {
    const tab = value as TabId;
    setTabActive(tab);
    if (tab === "submodules") loadSubmodules();
    if (tab === "plan") loadEntitlements();
    if (tab === "credentials") loadCredentials();
    if (tab === "billing") loadBilling();
    if (tab === "audit") loadAuditLog();
    if (tab === "portals") loadPortalLinks();
  };

  // ── Core fetch (modules + users + levels loaded upfront) ──
  const fetchData = async () => {
    setLoading(true);
    try {
      const [schoolRes, modulesRes, usersRes, levelsRes] = await Promise.all([
        authFetch(`/api/v1/super-admin/schools/${id}`),
        authFetch(`/api/v1/super-admin/schools/${id}/modules`),
        authFetch(`/api/v1/super-admin/schools/${id}/users`),
        authFetch(`/api/v1/super-admin/schools/${id}/levels`),
      ]);

      if (schoolRes.success) setSchool(schoolRes.data);
      if (modulesRes.success) setModules(Array.isArray(modulesRes.data?.modules) ? modulesRes.data.modules : []);
      if (usersRes.success) setUsers(Array.isArray(usersRes.data?.users) ? usersRes.data.users : []);
      if (levelsRes.success) setSchoolLevels(Array.isArray(levelsRes.data?.levels) ? levelsRes.data.levels : []);
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la escuela",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Status change ──
  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.success) {
        setSchool(prev => prev ? { ...prev, status: newStatus } : null);
        toast({ title: "Éxito", description: "Estado actualizado correctamente" });
      } else {
        throw new Error(res.message);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Support mode helpers ──
  const enterSupportMode = (path: string) => {
    if (!school) return;
    setSupportContext(school.id, school.slug, school.name);
    router.push(path);
  };

  const enterSupportRoleMode = (role: SupportRole) => {
    if (!school) return;
    const paths: Record<SupportRole, string> = {
      school_admin: "/school-admin/dashboard",
      teacher: "/teacher/dashboard",
      parent: "/parent/dashboard",
      student: "/student/dashboard",
    };
    setSupportContext(school.id, school.slug, school.name, role);
    const dest = paths[role];
    const qp = new URLSearchParams({
      supportTenantId: school.id,
      supportSlug: school.slug,
      supportName: school.name,
      supportRole: role,
    });
    router.push(`${dest}?${qp.toString()}`);
  };

  // ── Module toggle ──
  const toggleModule = async (moduleKey: string) => {
    try {
      const module = modules.find((item) => item.key === moduleKey);
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/modules/toggle`, {
        method: "POST",
        body: JSON.stringify({ module_key: moduleKey, is_active: !(module?.is_active ?? false) }),
      });

      if (res.success) {
        setModules(prev => prev.map(m =>
          m.key === moduleKey ? { ...m, is_active: !m.is_active } : m
        ));
        toast({ title: "Éxito", description: "Módulo actualizado" });
      }
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el módulo", variant: "destructive" });
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!school) return <div>Escuela no encontrada</div>;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            {school.logo_url ? (
              <img src={school.logo_url} alt="Logo" className="w-12 h-12 rounded-md object-contain bg-white border shadow-sm" />
            ) : (
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
                {school.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{school.name}</h1>
                <Badge className={statusColors[school.status as keyof typeof statusColors] || "bg-gray-100"}>
                  {statusLabels[school.status as keyof typeof statusLabels] || school.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">ID: {school.id} • Slug: {school.slug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={school.status}
            onValueChange={handleStatusChange}
            disabled={updatingStatus}
          >
            <SelectTrigger className="w-[180px]">
              {updatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              <SelectValue placeholder="Cambiar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="trial">En Prueba</SelectItem>
              <SelectItem value="suspended">Suspendida</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => router.push(`/escuela/?slug=${school.slug}`)}>
            <Globe className="mr-2 h-4 w-4" />
            Portal interno
          </Button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Plan Actual</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{school.plan}</div>
            <p className="text-xs text-muted-foreground">Suscripción activa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Alumnos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{school.total_students}</div>
            <p className="text-xs text-muted-foreground">Inscritos actualmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Profesores</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{school.total_teachers}</div>
            <p className="text-xs text-muted-foreground">En plantilla</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Fecha Registro</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(school.created_at).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">Sistema operativo</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={tabActive} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="levels">Niveles</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="submodules">Submódulos</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="credentials">Credenciales</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
          <TabsTrigger value="portals">Portales</TabsTrigger>
          <TabsTrigger value="audit">Auditoría</TabsTrigger>
          <TabsTrigger value="roletest">Pruebas por Rol</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: General ── */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Institución</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nombre</Label>
                    <p className="font-medium">{school.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Subdominio</Label>
                    <p className="font-medium">{school.slug}.onlineu.mx</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Plan</Label>
                    <p className="font-medium capitalize">{school.plan}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={statusColors[school.status as keyof typeof statusColors] || "bg-gray-100"}>
                        {statusLabels[school.status as keyof typeof statusLabels] || school.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">(editable arriba)</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Última Actualización</Label>
                    <p className="font-medium">{new Date(school.updated_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Fecha de Registro</Label>
                    <p className="font-medium">{new Date(school.created_at).toLocaleString()}</p>
                  </div>
                  {schoolLevels.length > 0 && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Niveles Educativos</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {schoolLevels.map((lvl) => (
                          <Badge key={lvl.level_key} variant="secondary">
                            {lvl.name || lvl.level_key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Resumen de Población</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Alumnos</span>
                  </div>
                  <span className="font-bold text-lg">{school.total_students}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Profesores</span>
                  </div>
                  <span className="font-bold text-lg">{school.total_teachers}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Padres de familia</span>
                  </div>
                  <span className="font-bold text-lg">{school.total_parents}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 2: Niveles ── */}
        <TabsContent value="levels">
          <Card>
            <CardHeader>
              <CardTitle>Niveles Educativos</CardTitle>
              <CardDescription>Niveles configurados para este tenant. Solo lectura.</CardDescription>
            </CardHeader>
            <CardContent>
              {schoolLevels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay niveles configurados para esta escuela.</p>
              ) : (
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left font-medium">Clave</th>
                        <th className="h-12 px-4 text-left font-medium">Nombre</th>
                        <th className="h-12 px-4 text-left font-medium">Habilitado</th>
                        <th className="h-12 px-4 text-left font-medium">Orden</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolLevels.map((lvl) => (
                        <tr key={lvl.level_key} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 font-mono text-xs">{lvl.level_key}</td>
                          <td className="p-4">{lvl.name || lvl.level_key}</td>
                          <td className="p-4">
                            {lvl.enabled ? (
                              <Badge className="bg-green-100 text-green-800">Activo</Badge>
                            ) : (
                              <Badge variant="secondary">Inactivo</Badge>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground">{lvl.sort_order ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Módulos ── */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Módulos</CardTitle>
              <CardDescription>Activa o desactiva funcionalidades específicas para esta escuela.</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const coreModules = modules.filter(m => m.is_core || m.source === "core" || !m.level);
                const levelModules = modules.filter(m => !m.is_core && m.source !== "core" && m.level);
                const levelGroups: Record<string, typeof modules> = {};
                for (const m of levelModules) {
                  const key = m.level || "otro";
                  if (!levelGroups[key]) levelGroups[key] = [];
                  levelGroups[key].push(m);
                }
                const levelLabels: Record<string, string> = {
                  kinder: "Kinder / Estancia",
                  preescolar: "Preescolar",
                  primaria: "Primaria",
                  secundaria: "Secundaria",
                  preparatoria: "Preparatoria",
                };

                const renderModuleRow = (mod: Module) => (
                  <div key={mod.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{mod.name}</span>
                        {(mod.is_core || mod.is_required) && (
                          <Badge variant="secondary" className="text-[10px] h-4">CORE</Badge>
                        )}
                        {mod.level && (
                          <Badge variant="outline" className="text-[10px] h-4">{mod.level}</Badge>
                        )}
                        {mod.source && (
                          <Badge variant="outline" className="text-[10px] h-4">{mod.source}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{mod.description}</p>
                      {!mod.is_core && (
                        <p className="text-xs font-semibold text-blue-600">${mod.price_monthly_mxn} MXN/mes</p>
                      )}
                    </div>
                    <Switch
                      checked={mod.is_active}
                      disabled={mod.is_core || mod.is_required}
                      onCheckedChange={() => toggleModule(mod.key)}
                    />
                  </div>
                );

                return (
                  <div className="space-y-8">
                    {coreModules.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Módulos Core</h3>
                        <div className="space-y-3">{coreModules.map(renderModuleRow)}</div>
                      </div>
                    )}
                    {Object.entries(levelGroups).map(([levelKey, mods]) => (
                      <div key={levelKey} className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          {levelLabels[levelKey] || levelKey}
                        </h3>
                        <div className="space-y-3">{mods.map(renderModuleRow)}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Submódulos ── */}
        <TabsContent value="submodules">
          <Card>
            <CardHeader>
              <CardTitle>Submódulos</CardTitle>
              <CardDescription>Submódulos habilitados por módulo principal. Solo lectura.</CardDescription>
            </CardHeader>
            <CardContent>
              {submodulesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : submodules === null ? (
                <p className="text-sm text-muted-foreground">Haz click en el tab para cargar los submódulos.</p>
              ) : submodules.length === 0 ? (
                <p className="text-sm text-muted-foreground">No se encontraron submódulos para esta escuela.</p>
              ) : (
                <div className="border rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left font-medium">Módulo</th>
                        <th className="h-12 px-4 text-left font-medium">Submódulo</th>
                        <th className="h-12 px-4 text-left font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submodules.map((sm, i) => (
                        <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 font-mono text-xs">{sm.module_key}</td>
                          <td className="p-4 font-mono text-xs">{sm.submodule_key}</td>
                          <td className="p-4">
                            {sm.enabled ? (
                              <Badge className="bg-green-100 text-green-800">Habilitado</Badge>
                            ) : (
                              <Badge variant="secondary">Deshabilitado</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 5: Plan ── */}
        <TabsContent value="plan">
          <Card>
            <CardHeader>
              <CardTitle>Derechos del Plan</CardTitle>
              <CardDescription>Límites de uso y consumo actual del tenant según su plan contratado.</CardDescription>
            </CardHeader>
            <CardContent>
              {entitlementsLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : entitlements === null ? (
                <p className="text-sm text-muted-foreground">No se pudo cargar la información del plan.</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan</p>
                      <p className="text-2xl font-bold mt-1 capitalize">{entitlements.plan_name}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Alumnos actuales</p>
                      <p className="text-2xl font-bold mt-1">{entitlements.current_students}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Profesores actuales</p>
                      <p className="text-2xl font-bold mt-1">{entitlements.current_teachers}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <UsageBar
                      current={entitlements.current_students}
                      max={entitlements.max_students}
                      label="Alumnos"
                    />
                    <UsageBar
                      current={entitlements.current_teachers}
                      max={entitlements.max_teachers}
                      label="Profesores"
                    />
                    <UsageBar
                      current={entitlements.used_storage_gb}
                      max={entitlements.storage_gb}
                      label="Almacenamiento (GB)"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 6: Credenciales ── */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>Credenciales de Administrador</CardTitle>
              <CardDescription>Datos del administrador principal del tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              {credentialsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : credentials === null ? (
                <p className="text-sm text-muted-foreground">No se encontraron credenciales para esta escuela.</p>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Nombre</p>
                      <p className="font-semibold mt-1">{credentials.admin_name || "—"}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                      <p className="font-semibold mt-1">{credentials.admin_email || "—"}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Estado</p>
                      <div className="mt-1">
                        {credentials.is_active ? (
                          <Badge className="bg-green-100 text-green-800">Activo</Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-3">Acceso rápido por portal:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {([
                        { role: "school_admin" as SupportRole, label: "Admin Escolar", icon: "🏫" },
                        { role: "teacher" as SupportRole, label: "Profesor", icon: "👨‍🏫" },
                        { role: "parent" as SupportRole, label: "Padre", icon: "👨‍👩‍👧" },
                        { role: "student" as SupportRole, label: "Alumno", icon: "🎒" },
                      ] as const).map(({ role, label, icon }) => (
                        <Button
                          key={role}
                          variant="outline"
                          className="flex flex-col h-auto py-3 gap-1"
                          onClick={() => router.push(`/login?slug=${school.slug}&role=${role}`)}
                        >
                          <span className="text-xl">{icon}</span>
                          <span className="text-xs">{label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 7: Facturación ── */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Facturación Estimada</CardTitle>
              <CardDescription>Resumen del ciclo de facturación actual basado en alumnos activos.</CardDescription>
            </CardHeader>
            <CardContent>
              {billingLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : billing === null ? (
                <p className="text-sm text-muted-foreground">No se pudo cargar la información de facturación.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border bg-muted/30 p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan</p>
                    <p className="text-2xl font-bold mt-1 capitalize">{billing.plan}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Alumnos</p>
                    <p className="text-2xl font-bold mt-1">{billing.total_students}</p>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Nuevos este mes</p>
                    <p className="text-2xl font-bold mt-1 text-green-600">+{billing.new_this_month}</p>
                  </div>
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Cobro estimado</p>
                    <p className="text-2xl font-bold mt-1">
                      ${billing.estimated_monthly_mxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      <span className="text-sm font-normal text-muted-foreground ml-1">MXN/mes</span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 8: Portales ── */}
        <TabsContent value="portals" className="space-y-4">
          {/* DNS warning banner */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold">El subdominio <span className="font-mono">{school.slug}.onlineu.mx</span> puede no estar activo en DNS.</p>
              <p className="text-amber-300/80">
                Para que funcione, necesitas un wildcard A record <span className="font-mono">*.onlineu.mx</span> apuntando al servidor, o un subdominio individual.
                Mientras tanto, usa los <strong>portales internos</strong> de abajo — funcionan sin DNS.
                Ver <span className="font-mono">docs/SCHOOL_PORTALS_AND_DNS.md</span> para instrucciones completas.
              </p>
            </div>
          </div>

          {/* Portal preview from API */}
          {portalLinksLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : portalLinks && portalLinks.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Vista previa de portales</CardTitle>
                <CardDescription>URLs disponibles para cada rol, servidas desde el backend.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portalLinks.map((p) => (
                    <div
                      key={p.role}
                      className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-card p-5 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{p.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm">{p.label}</span>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono break-all">{p.url}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="default" onClick={() => router.push(p.url)}>
                        <Globe className="w-3.5 h-3.5 mr-1.5" />
                        Ingresar como {p.label}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Portales internos por rol */}
          <Card>
            <CardHeader>
              <CardTitle>Portales por Rol — Acceso Interno</CardTitle>
              <CardDescription>
                Rutas internas en <span className="font-mono">onlineu.mx/educore</span> — funcionan sin subdominio DNS.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    key: "school-admin",
                    label: "Administración Escolar",
                    desc: "Panel del director y coordinadores. Gestión de profesores, alumnos, grupos, horarios y reportes.",
                    icon: "🏫",
                    roleBadge: "SCHOOL_ADMIN",
                    loginHref: `/login?slug=${school.slug}&role=school_admin`,
                    portalHref: `/escuela/?slug=${school.slug}&role=school_admin`,
                  },
                  {
                    key: "teachers",
                    label: "Portal de Profesores",
                    desc: "Registro de asistencias, captura de calificaciones y comunicación con padres.",
                    icon: "👨‍🏫",
                    roleBadge: "TEACHER",
                    loginHref: `/login?slug=${school.slug}&role=teacher`,
                    portalHref: `/escuela/?slug=${school.slug}&role=teacher`,
                  },
                  {
                    key: "parents",
                    label: "Portal de Padres",
                    desc: "Calificaciones, asistencia, pagos, mensajes y consentimientos de sus hijos.",
                    icon: "👨‍👩‍👧",
                    roleBadge: "PARENT",
                    loginHref: `/login?slug=${school.slug}&role=parent`,
                    portalHref: `/escuela/?slug=${school.slug}&role=parent`,
                  },
                  {
                    key: "students",
                    label: "Portal de Alumnos",
                    desc: "Requiere usuario con role=STUDENT vinculado al alumno en la tabla students (columna user_id).",
                    icon: "🎒",
                    roleBadge: "STUDENT",
                    loginHref: `/login?slug=${school.slug}&role=student`,
                    portalHref: `/escuela/?slug=${school.slug}&role=student`,
                  },
                ].map((portal) => (
                  <div
                    key={portal.key}
                    className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-card p-5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{portal.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{portal.label}</span>
                          <Badge variant="outline" className="text-[10px] h-4">{portal.roleBadge}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{portal.desc}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" className="flex-1" onClick={() => router.push(portal.portalHref)}>
                        <Globe className="w-3.5 h-3.5 mr-1.5" />
                        Portal
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => router.push(portal.loginHref)}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Ir a Login
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Subdominio experimental */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Subdominio experimental
              </CardTitle>
              <CardDescription>
                Solo usar para pruebas técnicas. <strong>No es el flujo principal de acceso.</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                <div className="space-y-1 text-xs text-orange-200">
                  <p className="font-semibold text-orange-100">El DNS wildcard existe, pero Hostinger shared hosting no sirve correctamente la app desde la raíz del subdominio.</p>
                  <p className="text-orange-300/80">El build de Next.js usa <span className="font-mono">basePath /educore</span>, por lo que <span className="font-mono">{school.slug}.onlineu.mx</span> carga pantalla en blanco. Usa los <strong>portales internos de arriba</strong> como flujo principal hasta migrar a un VPS.</p>
                </div>
              </div>
              <div className="rounded-md bg-muted/50 px-4 py-3 font-mono text-sm">
                https://{school.slug}.onlineu.mx
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Probar subdominio", url: `https://${school.slug}.onlineu.mx` },
                  { label: "Probar login externo", url: `https://${school.slug}.onlineu.mx/login?role=school_admin` },
                  { label: "Probar login profesor", url: `https://${school.slug}.onlineu.mx/login?role=teacher` },
                  { label: "Probar login padre", url: `https://${school.slug}.onlineu.mx/login?role=parent` },
                  { label: "Probar login alumno", url: `https://${school.slug}.onlineu.mx/login?role=student` },
                ].map(({ label, url }) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="gap-1 border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/60">
                      <ExternalLink className="w-3 h-3" /> {label}
                    </Button>
                  </a>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Estos botones son secundarios y solo para pruebas técnicas. No confundirlos con el acceso real.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 9: Auditoría ── */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Auditoría</CardTitle>
              <CardDescription>Últimas 50 acciones registradas en este tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : auditLog === null ? (
                <p className="text-sm text-muted-foreground">Haz click en el tab para cargar el registro.</p>
              ) : auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay entradas de auditoría para esta escuela.</p>
              ) : (
                <div className="border rounded-md overflow-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left font-medium whitespace-nowrap">Fecha</th>
                        <th className="h-12 px-4 text-left font-medium">Acción</th>
                        <th className="h-12 px-4 text-left font-medium">Severidad</th>
                        <th className="h-12 px-4 text-left font-medium whitespace-nowrap">Realizado por</th>
                        <th className="h-12 px-4 text-left font-medium">Recurso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.slice(0, 50).map((entry, i) => (
                        <tr key={i} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="p-4 font-mono text-xs">{entry.action}</td>
                          <td className="p-4">
                            <Badge className={severityColors[entry.severity?.toLowerCase()] || "bg-gray-100 text-gray-800"}>
                              {entry.severity}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs">{entry.performed_by || "—"}</td>
                          <td className="p-4 text-xs text-muted-foreground">{entry.resource || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 10: Pruebas por Rol ── */}
        <TabsContent value="roletest">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-500" />
                Pruebas por Rol — Modo Soporte
              </CardTitle>
              <CardDescription>
                Entra al sistema como si fueras un usuario de esta escuela. Tu JWT de Super Admin no cambia —
                el header <span className="font-mono text-xs">X-Support-Tenant-ID</span> activa el modo soporte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  {
                    role: "school_admin" as SupportRole,
                    label: "Ingresar como Admin",
                    sublabel: "SCHOOL_ADMIN",
                    desc: "Panel completo de school admin: profesores, alumnos, grupos, horarios y reportes.",
                    icon: "🏫",
                    color: "hover:border-blue-500/50 hover:bg-blue-500/5",
                    badge: "bg-blue-100 text-blue-800",
                  },
                  {
                    role: "teacher" as SupportRole,
                    label: "Ingresar como Maestro",
                    sublabel: "TEACHER",
                    desc: "Dashboard docente: grupos asignados, asistencias, calificaciones y comunicaciones.",
                    icon: "👨‍🏫",
                    color: "hover:border-green-500/50 hover:bg-green-500/5",
                    badge: "bg-green-100 text-green-800",
                  },
                  {
                    role: "parent" as SupportRole,
                    label: "Ingresar como Padre",
                    sublabel: "PARENT",
                    desc: "Portal de padres: calificaciones, asistencia, mensajes y pagos de sus hijos.",
                    icon: "👨‍👩‍👧",
                    color: "hover:border-orange-500/50 hover:bg-orange-500/5",
                    badge: "bg-orange-100 text-orange-800",
                  },
                  {
                    role: "student" as SupportRole,
                    label: "Ingresar como Alumno",
                    sublabel: "STUDENT",
                    desc: "Portal de alumnos: calificaciones, asistencia, horario y tareas.",
                    icon: "🎒",
                    color: "hover:border-purple-500/50 hover:bg-purple-500/5",
                    badge: "bg-purple-100 text-purple-800",
                  },
                ] as const).map(({ role, label, sublabel, desc, icon, color, badge }) => (
                  <button
                    key={role}
                    onClick={() => enterSupportRoleMode(role)}
                    className={`flex items-start gap-4 rounded-xl border border-slate-700/60 bg-card p-5 text-left transition-colors group ${color}`}
                  >
                    <span className="text-3xl shrink-0">{icon}</span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold">{label}</p>
                        <Badge className={`text-[10px] h-4 ${badge}`}>{sublabel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Módulos directos de school admin */}
              <div className="border-t border-border pt-5">
                <p className="text-xs text-muted-foreground mb-3 font-medium">Acceso directo a módulos de administración escolar:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Dashboard", path: "/school-admin/dashboard" },
                    { label: "Estudiantes", path: "/school-admin/students" },
                    { label: "Profesores", path: "/school-admin/teachers" },
                    { label: "Grupos", path: "/school-admin/groups" },
                    { label: "Asistencias", path: "/school-admin/attendance" },
                    { label: "Calificaciones", path: "/school-admin/grades" },
                    { label: "Boletas", path: "/school-admin/report-cards" },
                    { label: "Horarios", path: "/school-admin/schedule" },
                    { label: "Comunicaciones", path: "/school-admin/communications" },
                  ].map(({ label, path }) => (
                    <Button key={path} variant="outline" size="sm" onClick={() => enterSupportMode(path)}>
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SchoolDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <SchoolDetailContent />
    </Suspense>
  );
}
