"use client";

import { useCallback, useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  ChevronLeft,
  Shield,
  Users2,
  CheckCircle2,
  ExternalLink,
  Save,
  Loader2,
  AlertTriangle,
  Globe,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authFetch, setSupportContext, type SupportRole } from "@/lib/auth";
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
import { errorMessage } from "@/lib/api-response";

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
  domain_provisioning_status?: "created" | "existing" | "pending" | "not_configured" | "unknown";
  domain_ready?: boolean;
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
  status: string;
  global_enabled: boolean;
  production_ready: boolean;
  selectable: boolean;
}

interface SchoolUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

function SchoolDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { toast } = useToast();
  const [school, setSchool] = useState<School | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [provisioningDomain, setProvisioningDomain] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsLogoURL, setSettingsLogoURL] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [schoolRes, modulesRes, usersRes] = await Promise.all([
        authFetch(`/api/v1/super-admin/schools/${id}`),
        authFetch(`/api/v1/super-admin/schools/${id}/modules`),
        authFetch(`/api/v1/super-admin/schools/${id}/users`)
      ]);

      if (schoolRes.success) {
        setSchool(schoolRes.data);
        setSettingsName(schoolRes.data?.name || "");
        setSettingsLogoURL(schoolRes.data?.logo_url || "");
      }
      if (modulesRes.success) setModules(Array.isArray(modulesRes.data?.modules) ? modulesRes.data.modules : []);
      if (usersRes.success) setUsers(Array.isArray(usersRes.data?.users) ? usersRes.data.users : []);
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la escuela",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData, id]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.success) {
        setSchool(prev => prev ? { ...prev, status: newStatus } : null);
        toast({
          title: "Éxito",
          description: "Estado actualizado correctamente",
        });
      } else {
        throw new Error(res.message);
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: errorMessage(error, "No se pudo actualizar el estado"),
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const provisionSchoolDomain = async () => {
    if (!id) return;
    setProvisioningDomain(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/domain/provision`, {
        method: "POST",
      });
      if (!res.success) {
        const message = typeof res.error === "string" ? res.error : res.error?.message;
        throw new Error(message || res.message || "No se pudo configurar el subdominio");
      }
      setSchool((previous) => previous ? {
        ...previous,
        domain_provisioning_status: res.data?.status || "existing",
        domain_ready: Boolean(res.data?.domain_ready),
      } : previous);
      toast({
        title: "Subdominio configurado",
        description: "Hostinger aceptó la configuración. DNS y SSL pueden tardar unos minutos en propagarse.",
      });
    } catch (error) {
      toast({
        title: "No se pudo configurar el subdominio",
        description: error instanceof Error ? error.message : "Revisa la configuración de Hostinger y vuelve a intentar.",
        variant: "destructive",
      });
    } finally {
      setProvisioningDomain(false);
    }
  };

  const enterSupportMode = (path: string) => {
    if (!school) return;
    setSupportContext(school.id, school.slug, school.name);
    router.push(path);
  };

  const enterSupportRoleMode = (role: SupportRole) => {
    if (!school) return;
    const paths: Record<SupportRole, string> = {
      school_admin: "/school-admin/dashboard",
      teacher:      "/teacher/dashboard",
      parent:       "/parent/dashboard",
      student:      "/student/dashboard",
    };
    setSupportContext(school.id, school.slug, school.name, role);
    // Pass params in URL so the destination layout can hydrate support context even on hard reload
    const dest = paths[role];
    const qp = new URLSearchParams({
      supportTenantId: school.id,
      supportSlug:     school.slug,
      supportName:     school.name,
      supportRole:     role,
    });
    router.push(`${dest}?${qp.toString()}`);
  };

  const toggleModule = async (moduleKey: string) => {
    try {
      const catalogModule = modules.find((item) => item.key === moduleKey);
      if (!catalogModule?.production_ready || !catalogModule.selectable || !catalogModule.global_enabled || catalogModule.status !== "active" || catalogModule.is_core || catalogModule.is_required) {
        toast({
          title: "Módulo protegido",
          description: "Este módulo no puede cambiarse hasta completar su contrato de producción o porque forma parte de la base obligatoria.",
          variant: "destructive",
        });
        return;
      }
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/modules/toggle`, {
        method: "POST",
        body: JSON.stringify({ module_key: moduleKey, is_active: !(catalogModule?.is_active ?? false) }),
      });

      if (!res.success) {
        throw new Error(res.message || res.error || "No se pudo actualizar el módulo");
      }
      if (res.success) {
        setModules(prev => prev.map(m => 
          m.key === moduleKey ? { ...m, is_active: !m.is_active, enabled: !m.is_active } : m
        ));
        toast({
          title: "Éxito",
          description: "Módulo actualizado",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar el módulo",
        variant: "destructive",
      });
    }
  };

  const saveSchoolSettings = async () => {
    const name = settingsName.trim();
    const logoURL = settingsLogoURL.trim();
    if (name.length < 2) {
      toast({ title: "Nombre inválido", description: "Escribe al menos 2 caracteres.", variant: "destructive" });
      return;
    }
    if (logoURL && !/^https:\/\/[^\s]+$/i.test(logoURL)) {
      toast({ title: "Logo inválido", description: "Usa una URL pública HTTPS o deja el campo vacío.", variant: "destructive" });
      return;
    }
    setSavingSettings(true);
    try {
      const result = await authFetch(`/api/v1/super-admin/schools/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, logo_url: logoURL }),
      });
      if (!result.success) throw new Error(result.message || result.error || "No se pudo guardar");
      setSchool((current) => current ? { ...current, name, logo_url: logoURL, updated_at: new Date().toISOString() } : current);
      toast({ title: "Escuela actualizada", description: "Nombre y logotipo quedaron guardados y auditados." });
    } catch (error) {
      toast({ title: "No se pudo guardar", description: error instanceof Error ? error.message : "Error desconocido", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            {school.logo_url ? (
              <Image src={school.logo_url} alt="Logo" width={48} height={48} unoptimized className="w-12 h-12 rounded-md object-contain bg-white border shadow-sm" />
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="portals">Portales</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
                    <Label className="text-muted-foreground">Última Actualización</Label>
                    <p className="font-medium">{new Date(school.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Uso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{school.total_students}</p><p className="text-xs text-muted-foreground">Alumnos</p></div>
                  <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{school.total_teachers}</p><p className="text-xs text-muted-foreground">Profesores</p></div>
                  <div className="rounded-lg border p-3"><p className="text-2xl font-bold">{school.total_parents}</p><p className="text-xs text-muted-foreground">Tutores</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Módulos</CardTitle>
              <CardDescription>Solo los contratos aprobados para producción pueden activarse. Núcleo y módulos por nivel son obligatorios.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {modules.map((mod) => (
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
                        {mod.production_ready ? (
                          <Badge className="h-4 bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">PRODUCCIÓN</Badge>
                        ) : (
                          <Badge variant="outline" className="h-4 border-amber-400/50 bg-amber-50 text-[10px] text-amber-800">BLOQUEADO · {mod.status || "auditoría"}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{mod.description}</p>
                      {!mod.production_ready && (
                        <p className="text-xs text-amber-700">No se expone a la escuela hasta completar persistencia, autorización y pruebas automatizadas.</p>
                      )}
                      {mod.production_ready && !mod.selectable && (
                        <p className="text-xs text-blue-700">Administrado automáticamente por el núcleo o el nivel escolar.</p>
                      )}
                      {!mod.is_core && (
                        <p className="text-xs font-semibold text-blue-600">${mod.price_monthly_mxn} MXN/mes</p>
                      )}
                    </div>
                    <Switch 
                      checked={Boolean(mod.is_active && mod.production_ready && mod.global_enabled)}
                      disabled={mod.is_core || Boolean(mod.is_required) || !mod.production_ready || !mod.selectable || !mod.global_enabled || mod.status !== "active"}
                      onCheckedChange={() => toggleModule(mod.key)}
                      aria-label={`${mod.is_active ? "Desactivar" : "Activar"} ${mod.name}`}
                    />
                  </div>
                ))}
                {modules.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No hay módulos registrados en el catálogo.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios de la Escuela</CardTitle>
              <CardDescription>Lista de administradores, profesores y personal registrado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left font-medium">Nombre</th>
                      <th className="h-12 px-4 text-left font-medium">Email</th>
                      <th className="h-12 px-4 text-left font-medium">Rol</th>
                      <th className="h-12 px-4 text-left font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4">{user.first_name} {user.last_name}</td>
                        <td className="p-4">{user.email}</td>
                        <td className="p-4">
                          <Badge variant="outline">{user.role}</Badge>
                        </td>
                        <td className="p-4">
                          {user.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Activo</Badge>
                          ) : (
                            <Badge variant="secondary">Inactivo</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Esta escuela todavía no tiene usuarios adicionales.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portals" className="space-y-4">
          <div className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
            school.domain_ready
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
              : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
          }`}>
            {school.domain_ready ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-semibold">
                  {school.domain_ready ? "Subdominio configurado en Hostinger" : "Subdominio pendiente de configuración"}
                </p>
                <p className="text-xs opacity-80">
                  <span className="font-mono">{school.slug}.onlineu.mx</span>
                  {school.domain_ready
                    ? " apunta al export de EduCore. DNS y SSL pueden tardar unos minutos en propagarse."
                    : ` todavía no fue confirmado por Hostinger (estado: ${school.domain_provisioning_status || "unknown"}).`}
                </p>
              </div>
              {!school.domain_ready && (
                <Button size="sm" variant="outline" onClick={provisionSchoolDomain} disabled={provisioningDomain}>
                  {provisioningDomain ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                  Reintentar configuración
                </Button>
              )}
            </div>
          </div>

          {/* Portales internos por rol */}
          <Card>
            <CardHeader>
              <CardTitle>Portales por Rol — Acceso Interno</CardTitle>
              <CardDescription>
                Rutas internas en <span className="font-mono">onlineu.mx/educore</span>. Solo se puede abrir un portal cuando su auditoría de producción está liberada.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    key: "school-admin",
                    label: "Administración Escolar",
                    desc: "Panel del director y coordinadores con el núcleo académico y los módulos liberados para la escuela.",
                    icon: "🏫",
                    roleBadge: "SCHOOL_ADMIN",
                    loginHref: `/login?slug=${school.slug}&role=school_admin`,
                    portalHref: `/escuela/?slug=${school.slug}&role=school_admin`,
                    available: true,
                  },
                  {
                    key: "teachers",
                    label: "Portal de Profesores",
                    desc: "La implementación está cerrada hasta completar pruebas PostgreSQL, aislamiento entre escuelas y E2E publicado.",
                    icon: "👨‍🏫",
                    roleBadge: "TEACHER",
                    loginHref: `/login?slug=${school.slug}&role=teacher`,
                    portalHref: `/escuela/?slug=${school.slug}&role=teacher`,
                    available: false,
                  },
                  {
                    key: "parents",
                    label: "Portal de Padres",
                    desc: "La implementación está cerrada hasta completar aislamiento padre-hijo y auditar sus dependencias externas.",
                    icon: "👨‍👩‍👧",
                    roleBadge: "PARENT",
                    loginHref: `/login?slug=${school.slug}&role=parent`,
                    portalHref: `/escuela/?slug=${school.slug}&role=parent`,
                    available: false,
                  },
                  {
                    key: "students",
                    label: "Portal de Alumnos",
                    desc: "La identidad ya se vincula al alumno, pero el portal permanece cerrado hasta la prueba PostgreSQL y E2E publicada.",
                    icon: "🎒",
                    roleBadge: "STUDENT",
                    loginHref: `/login?slug=${school.slug}&role=student`,
                    portalHref: `/escuela/?slug=${school.slug}&role=student`,
                    available: false,
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
                          {!portal.available && <Badge variant="outline" className="h-4 border-amber-400/50 bg-amber-50 text-[10px] text-amber-800">AUDITORÍA PENDIENTE</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{portal.desc}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="default" className="flex-1" disabled={!portal.available} onClick={() => router.push(portal.portalHref)}>
                        <Globe className="w-3.5 h-3.5 mr-1.5" />
                        Portal
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" disabled={!portal.available} onClick={() => router.push(portal.loginHref)}>
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Ir a Login
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Acceso público por subdominio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                Subdominio de la escuela
              </CardTitle>
              <CardDescription>
                Acceso público aislado por hostname, servido desde el mismo export estático de EduCore.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-muted/50 px-4 py-3 font-mono text-sm">
                https://{school.slug}.onlineu.mx/educore/escuela/
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Abrir portal", url: `https://${school.slug}.onlineu.mx/educore/escuela/`, available: true },
                  { label: "Login administración", url: `https://${school.slug}.onlineu.mx/educore/login/?role=school_admin`, available: true },
                  { label: "Login profesor", url: `https://${school.slug}.onlineu.mx/educore/login/?role=teacher`, available: false },
                  { label: "Login padre", url: `https://${school.slug}.onlineu.mx/educore/login/?role=parent`, available: false },
                  { label: "Login alumno", url: `https://${school.slug}.onlineu.mx/educore/login/?role=student`, available: false },
                ].map(({ label, url, available }) => (
                  school.domain_ready && available ? (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-1">
                        <ExternalLink className="w-3 h-3" /> {label}
                      </Button>
                    </a>
                  ) : (
                    <Button key={url} variant="outline" size="sm" className="gap-1" disabled>
                      <ExternalLink className="w-3 h-3" /> {label}
                    </Button>
                  )
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Si la propagación aún no termina, los portales internos de arriba siguen disponibles como respaldo.
              </p>
            </CardContent>
          </Card>

          {/* Modo soporte — Ver portales de rol */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" /> Modo Soporte — Ver portales de rol
              </CardTitle>
              <CardDescription>
                Previsualiza cada portal como lo vería el usuario final. Tu JWT no cambia — usas el header <span className="font-mono text-xs">X-Support-Tenant-ID</span>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {([
                  { role: "school_admin" as SupportRole, label: "Ver como Director / Coordinador", icon: "🏫", desc: "Panel escolar con los módulos liberados y habilitados.", available: true },
                  { role: "teacher" as SupportRole,      label: "Ver como Profesor",               icon: "👨‍🏫", desc: "Cerrado hasta completar auditoría PostgreSQL y E2E.", available: false },
                  { role: "parent" as SupportRole,       label: "Ver como Padre de familia",       icon: "👨‍👩‍👧", desc: "Cerrado hasta completar aislamiento padre-hijo y dependencias.", available: false },
                  { role: "student" as SupportRole,      label: "Ver como Estudiante",             icon: "🎒", desc: "Cerrado hasta completar auditoría PostgreSQL y E2E.", available: false },
                ] as const).map(({ role, label, icon, desc, available }) => (
                  <button
                    key={role}
                    onClick={() => enterSupportRoleMode(role)}
                    disabled={!available}
                    className="group flex items-start gap-3 rounded-xl border border-slate-700/60 bg-card p-4 text-left transition-colors enabled:hover:border-blue-500/50 enabled:hover:bg-blue-500/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold group-hover:text-blue-400 transition-colors">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Acceso directo a módulos de administración escolar:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Dashboard",       path: "/school-admin/dashboard" },
                    { label: "Estudiantes",     path: "/school-admin/students" },
                    { label: "Profesores",      path: "/school-admin/teachers" },
                    { label: "Grupos",          path: "/school-admin/groups" },
                    { label: "Asistencias",     path: "/school-admin/attendance" },
                    { label: "Calificaciones",  path: "/school-admin/grades" },
                    { label: "Horarios",        path: "/school-admin/schedule" },
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

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Tenant</CardTitle>
              <CardDescription>Edita los datos públicos. El slug no cambia para no romper DNS, sesiones ni enlaces existentes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la Institución</Label>
                  <Input value={settingsName} onChange={(event) => setSettingsName(event.target.value)} maxLength={255} disabled={savingSettings} />
                </div>
                <div className="space-y-2">
                  <Label>Subdominio (Slug)</Label>
                  <div className="flex items-center gap-2">
                    <Input defaultValue={school.slug} readOnly className="bg-muted flex-1" />
                    <span className="text-muted-foreground text-sm">.onlineu.mx</span>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>URL pública del logotipo</Label>
                  <Input value={settingsLogoURL} onChange={(event) => setSettingsLogoURL(event.target.value)} placeholder="https://…" inputMode="url" disabled={savingSettings} />
                  <p className="text-xs text-muted-foreground">Debe ser HTTPS. Déjalo vacío para usar la inicial de la escuela.</p>
                </div>
              </div>
              <div className="pt-4">
                <Button onClick={saveSchoolSettings} disabled={savingSettings || !settingsName.trim()}>
                  {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar cambios
                </Button>
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
