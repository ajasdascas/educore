"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, Users, Calendar, MoreVertical, Eye, Edit, Trash2, Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

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

const planColors = {
  Starter: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  Pro: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

interface School {
  id: string;
  name: string;
  slug: string;
  status: string;
  total_students: number;
  total_users: number;
  plan: string;
  created_at: string;
  logo_url: string;
}

export default function SchoolsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    plan: "Starter",
    admin_email: "",
    admin_name: "",
    levels: [] as string[],
    phone: "",
    contact_email: "",
    address: "",
    timezone: "America/Mexico_City",
    premium_modules: [] as string[],
    rfc: "",
    razon_social: "",
    regimen: "",
    codigo_postal: "",
    school_year: "2026-2027",
    eval_scheme: "0-10",
    logo_url: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);

  const fetchSchools = async () => {
    try {
      const response = await authFetch("/api/v1/super-admin/schools");
      if (response.success) {
        setSchools(response.data.schools);
      } else {
        setError(response.message || "Error al cargar las escuelas");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleLevelToggle = (level: string) => {
    const newLevels = formData.levels.includes(level)
      ? formData.levels.filter(l => l !== level)
      : [...formData.levels, level];
    setFormData({ ...formData, levels: newLevels });
  };

  const handleModuleToggle = (mod: string) => {
    const newMods = formData.premium_modules.includes(mod)
      ? formData.premium_modules.filter(m => m !== mod)
      : [...formData.premium_modules, mod];
    setFormData({ ...formData, premium_modules: newMods });
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalLogoUrl = "";
      // 1. Upload Logo if present
      if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append("logo", logoFile);
        const uploadRes = await fetch(process.env.NEXT_PUBLIC_API_URL + "/api/v1/super-admin/upload", {
          method: "POST",
          body: logoFormData,
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("access_token")}`
          }
        }).then(res => res.json());

        if (uploadRes && uploadRes.success) {
          finalLogoUrl = uploadRes.data.url;
        }
      }

      const payload = { ...formData, logo_url: finalLogoUrl };

      const response = await authFetch("/api/v1/super-admin/schools", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.success) {
        toast({
          title: "Escuela creada",
          description: `La escuela ${formData.name} se ha registrado exitosamente.`,
        });
        setIsModalOpen(false);
        // Reset
        setFormData({
          name: "", slug: "", plan: "Starter", admin_email: "", admin_name: "",
          levels: [], phone: "", contact_email: "", address: "", timezone: "America/Mexico_City",
          premium_modules: [], rfc: "", razon_social: "", regimen: "", codigo_postal: "",
          school_year: "2026-2027", eval_scheme: "0-10", logo_url: ""
        });
        setLogoFile(null);
        fetchSchools();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: response.message || "No se pudo crear la escuela",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Escuelas</h1>
          <p className="text-muted-foreground">Administra todas las instituciones educativas registradas</p>
        </div>
        
        <Button className="w-fit" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Escuela
        </Button>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateSchool}>
              <DialogHeader>
                <DialogTitle>Registrar Nueva Escuela</DialogTitle>
                <DialogDescription>
                  Configura los detalles generales, suscripción y parámetros iniciales para el nuevo tenant.
                </DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6 py-4">
                
                {/* 1. Datos Generales */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary border-b pb-2">1. Datos Generales</h3>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nombre Oficial</Label>
                    <Input id="name" placeholder="Ej. Instituto Tecnológico Don Bosco" value={formData.name} onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                      setFormData({ ...formData, name, slug });
                    }} required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Logo Institucional</Label>
                    <div className="flex items-center gap-2">
                      <Input id="logo" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Niveles Educativos</Label>
                    <div className="flex flex-wrap gap-2">
                      {["Kínder", "Primaria", "Secundaria", "Preparatoria", "Universidad"].map(lvl => (
                        <Badge 
                          key={lvl} 
                          variant={formData.levels.includes(lvl) ? "default" : "outline"}
                          className="cursor-pointer" 
                          onClick={() => handleLevelToggle(lvl)}>
                          {lvl}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Teléfono Principal</Label>
                      <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="contact_email">Correo Atención</Label>
                      <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Dirección Física</Label>
                    <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-6">
                  {/* 2. Configuración Técnica */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b pb-2">2. Configuración Técnica</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="slug">Slug / Subdominio</Label>
                        <Input id="slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="timezone">Zona Horaria</Label>
                        <Input id="timezone" value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* 3. Cuenta Admin */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b pb-2">3. Admin Principal (Director)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="admin_name">Nombre Completo</Label>
                        <Input id="admin_name" value={formData.admin_name} onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="admin_email">Correo Electrónico</Label>
                        <Input id="admin_email" type="email" value={formData.admin_email} onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })} required />
                      </div>
                    </div>
                  </div>

                  {/* 4. Financiero */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b pb-2">4. Suscripción y Fiscal</h3>
                    <div className="grid gap-2">
                      <Label htmlFor="plan">Plan Base</Label>
                      <Select value={formData.plan} onValueChange={(val: string) => setFormData({ ...formData, plan: val })}>
                        <SelectTrigger><SelectValue placeholder="Selecciona un plan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Starter">Starter</SelectItem>
                          <SelectItem value="Pro">Pro</SelectItem>
                          <SelectItem value="Enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Módulos Premium Activos</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Transporte", "Cafetería", "Tienda de Uniformes"].map(mod => (
                          <Badge 
                            key={mod} 
                            variant={formData.premium_modules.includes(mod) ? "default" : "outline"}
                            className="cursor-pointer" 
                            onClick={() => handleModuleToggle(mod)}>
                            {mod}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Input placeholder="RFC" value={formData.rfc} onChange={(e) => setFormData({ ...formData, rfc: e.target.value })} />
                      <Input placeholder="Razón Social" value={formData.razon_social} onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })} />
                      <Input placeholder="Régimen Fiscal" value={formData.regimen} onChange={(e) => setFormData({ ...formData, regimen: e.target.value })} />
                      <Input placeholder="C.P." value={formData.codigo_postal} onChange={(e) => setFormData({ ...formData, codigo_postal: e.target.value })} />
                    </div>
                  </div>

                  {/* 5. Semilla Académica */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b pb-2">5. Configuración Académica Inicial</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Ciclo Escolar Vigente</Label>
                        <Input value={formData.school_year} onChange={(e) => setFormData({ ...formData, school_year: e.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Esquema de Evaluación</Label>
                        <Select value={formData.eval_scheme} onValueChange={(val: string) => setFormData({ ...formData, eval_scheme: val })}>
                          <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0-10">0 a 10</SelectItem>
                            <SelectItem value="0-100">0 a 100</SelectItem>
                            <SelectItem value="Letras">Letras (A, B, C...)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              <DialogFooter className="mt-6 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creando...</> : "Guardar e Inicializar Escuela"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="p-4 bg-red-500/10 text-red-500 rounded-lg animate-in fade-in">{error}</div>}

      {/* Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Escuelas</CardDescription>
              <Building2 className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{schools.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Escuelas Activas</CardDescription>
              <Building2 className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{schools.filter(s => s.status === 'active').length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Estudiantes</CardDescription>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">{schools.reduce((sum, school) => sum + school.total_students, 0).toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Total Usuarios</CardDescription>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-600">{schools.reduce((sum, school) => sum + school.total_users, 0).toLocaleString()}</div></CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar escuelas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
      </Card>

      {/* Schools List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSchools.map((school) => (
          <Card key={school.id} className="flex flex-col">
            <CardHeader className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {school.logo_url ? (
                    <img src={school.logo_url} alt="Logo" className="w-10 h-10 rounded-md object-contain bg-white" />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground font-bold">{school.name.charAt(0)}</div>
                  )}
                  <div>
                    <CardTitle className="text-lg line-clamp-1">{school.name}</CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">Slug: {school.slug}</div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 -mr-2 rounded-md hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Eye className="w-4 h-4 mr-2" />Ver detalles</DropdownMenuItem>
                    <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex gap-2 mt-4">
                <Badge className={statusColors[school.status as keyof typeof statusColors] || "bg-gray-100"}>
                  {statusLabels[school.status as keyof typeof statusLabels] || school.status}
                </Badge>
                <Badge variant="outline" className={planColors[school.plan as keyof typeof planColors] || ""}>
                  {school.plan}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="border-t pt-4 bg-muted/20">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-primary">{school.total_students}</div>
                  <div className="text-xs text-muted-foreground">Estudiantes</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-primary">{school.total_users}</div>
                  <div className="text-xs text-muted-foreground">Usuarios</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSchools.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron escuelas</h3>
            <p className="text-muted-foreground mb-4">No hay escuelas registradas que coincidan.</p>
            <Button variant="outline" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Crear primera escuela
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}