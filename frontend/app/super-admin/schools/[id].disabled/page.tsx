"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authFetch } from "@/lib/auth";
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

export default function SchoolDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [school, setSchool] = useState<School | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schoolRes, modulesRes, usersRes] = await Promise.all([
        authFetch(`/api/v1/super-admin/schools/${id}`),
        authFetch(`/api/v1/super-admin/schools/${id}/modules`),
        authFetch(`/api/v1/super-admin/schools/${id}/users`)
      ]);

      if (schoolRes.success) setSchool(schoolRes.data);
      if (modulesRes.success) setModules(modulesRes.data);
      if (usersRes.success) setUsers(usersRes.data.users);
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

  const toggleModule = async (moduleKey: string) => {
    try {
      const res = await authFetch(`/api/v1/super-admin/schools/${id}/modules/toggle`, {
        method: "POST",
        body: JSON.stringify({ module_key: moduleKey }),
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
          <Button variant="outline" asChild>
            <a href={`https://${school.slug}.educore.mx`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Visitar
            </a>
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
                    <p className="font-medium">{school.slug}.educore.mx</p>
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
              <div className="space-y-6">
                {modules.map((mod) => (
                  <div key={mod.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{mod.name}</span>
                        {mod.is_core && (
                          <Badge variant="secondary" className="text-[10px] h-4">CORE</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{mod.description}</p>
                      {!mod.is_core && (
                        <p className="text-xs font-semibold text-blue-600">${mod.price_monthly_mxn} MXN/mes</p>
                      )}
                    </div>
                    <Switch 
                      checked={mod.is_active} 
                      disabled={mod.is_core}
                      onCheckedChange={() => toggleModule(mod.key)}
                    />
                  </div>
                ))}
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
                  </tbody>
                </table>
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
                    <span className="text-muted-foreground text-sm">.educore.mx</span>
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
