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

function SchoolDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { toast } = useToast();
  const [school, setSchool] = useState<School | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [schoolLevels, setSchoolLevels] = useState<{level_key: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [id]);

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
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la escuela",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
      const module = modules.find((item) => item.key === moduleKey);
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/modules/toggle`, {
        method: "POST",
        body: JSON.stringify({ module_key: moduleKey, is_active: !(module?.is_active ?? false) }),
      });

      if (res.success) {
        setModules(prev => prev.map(m => 
          m.key === moduleKey ? { ...m, is_active: !m.is_active } : m
        ));
        toast({
          title: "Éxito",
          description: "Módulo actualizado",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el módulo",
        variant: "destructive",
      });
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
                  {schoolLevels.length > 0 && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Niveles Educativos</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {schoolLevels.map((lvl) => (
                          <Badge key={lvl.level_key} variant="secondary">{lvl.name || lvl.level_key}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Uso</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Aquí irían gráficas o métricas más detalladas */}
                <p className="text-muted-foreground text-sm">Próximamente: Gráficas de actividad y consumo de recursos.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Módulos</CardTitle>
              <CardDescription>Activa o desactiva funcionalidades específicas para esta escuela.</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const coreModules = modules.filter(m => m.is_core || m.source === 'core' || !m.level);
                const levelModules = modules.filter(m => !m.is_core && m.source !== 'core' && m.level);
                const levelGroups: Record<string, typeof modules> = {};
                for (const m of levelModules) {
                  const key = m.level || 'otro';
                  if (!levelGroups[key]) levelGroups[key] = [];
                  levelGroups[key].push(m);
                }
                const levelLabels: Record<string, string> = {
                  kinder: 'Kinder / Estancia',
                  preescolar: 'Preescolar',
                  primaria: 'Primaria',
                  secundaria: 'Secundaria',
                  preparatoria: 'Preparatoria',
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
                        <div className="space-y-3">
                          {coreModules.map(renderModuleRow)}
                        </div>
                      </div>
                    )}
                    {Object.entries(levelGroups).map(([levelKey, mods]) => (
                      <div key={levelKey} className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          {levelLabels[levelKey] || levelKey}
                        </h3>
                        <div className="space-y-3">
                          {mods.map(renderModuleRow)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                    available: true,
                  },
                  {
                    key: "teachers",
                    label: "Portal de Profesores",
                    desc: "Registro de asistencias, captura de calificaciones y comunicación con padres.",
                    icon: "👨‍🏫",
                    roleBadge: "TEACHER",
                    loginHref: `/login?slug=${school.slug}&role=teacher`,
                    portalHref: `/escuela/?slug=${school.slug}&role=teacher`,
                    available: true,
                  },
                  {
                    key: "parents",
                    label: "Portal de Padres",
                    desc: "Calificaciones, asistencia, pagos, mensajes y consentimientos de sus hijos.",
                    icon: "👨‍👩‍👧",
                    roleBadge: "PARENT",
                    loginHref: `/login?slug=${school.slug}&role=parent`,
                    portalHref: `/escuela/?slug=${school.slug}&role=parent`,
                    available: true,
                  },
                  {
                    key: "students",
                    label: "Portal de Alumnos",
                    desc: "Requiere usuario con role=STUDENT vinculado al alumno en la tabla students (columna user_id).",
                    icon: "🎒",
                    roleBadge: "STUDENT",
                    loginHref: `/login?slug=${school.slug}&role=student`,
                    portalHref: `/escuela/?slug=${school.slug}&role=student`,
                    available: true,
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

          {/* Subdominio experimental — separado y con advertencia clara */}
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
                  { label: "Probar subdominio",     url: `https://${school.slug}.onlineu.mx` },
                  { label: "Probar login externo",  url: `https://${school.slug}.onlineu.mx/login?role=school_admin` },
                  { label: "Probar login profesor", url: `https://${school.slug}.onlineu.mx/login?role=teacher` },
                  { label: "Probar login padre",    url: `https://${school.slug}.onlineu.mx/login?role=parent` },
                  { label: "Probar login alumno",   url: `https://${school.slug}.onlineu.mx/login?role=student` },
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
                  { role: "school_admin" as SupportRole, label: "Ver como Director / Coordinador", icon: "🏫", desc: "Panel completo de school admin con todos sus módulos activos." },
                  { role: "teacher" as SupportRole,      label: "Ver como Profesor",               icon: "👨‍🏫", desc: "Dashboard docente: grupos, asistencias, calificaciones." },
                  { role: "parent" as SupportRole,       label: "Ver como Padre de familia",       icon: "👨‍👩‍👧", desc: "Portal de padres: hijos, calificaciones, mensajes, pagos." },
                  { role: "student" as SupportRole,      label: "Ver como Estudiante",             icon: "🎒", desc: "Portal de alumnos: calificaciones, asistencia, horario." },
                ] as const).map(({ role, label, icon, desc }) => (
                  <button
                    key={role}
                    onClick={() => enterSupportRoleMode(role)}
                    className="flex items-start gap-3 rounded-xl border border-slate-700/60 bg-card p-4 text-left hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors group"
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
                    { label: "Boletas",         path: "/school-admin/report-cards" },
                    { label: "Horarios",        path: "/school-admin/schedule" },
                    { label: "Comunicaciones",  path: "/school-admin/communications" },
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
              <CardDescription>Parámetros técnicos y personalización de la escuela.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre de la Institución</Label>
                  <Input defaultValue={school.name} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Subdominio (Slug)</Label>
                  <div className="flex items-center gap-2">
                    <Input defaultValue={school.slug} readOnly className="bg-muted flex-1" />
                    <span className="text-muted-foreground text-sm">.onlineu.mx</span>
                  </div>
                </div>
              </div>
              <div className="pt-4">
                <Button disabled>Guardar Cambios (Próximamente)</Button>
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
