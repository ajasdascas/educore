"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bell, Building2, GraduationCap, Loader2, Lock, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

type SettingsState = {
  school: Record<string, any>;
  academic: Record<string, any>;
  notifications: Record<string, any>;
  security: Record<string, any>;
  updated_at?: string;
};

const fallbackSettings: SettingsState = {
  school: {
    name: "",
    legal_name: "",
    campus_code: "",
    logo_url: "",
    primary_color: "#4f46e5",
    timezone: "America/Mexico_City",
    language: "es-MX",
    phone: "",
    email: "",
    address: "",
  },
  academic: {
    school_year: "",
    attendance_mode: "daily",
    default_capacity: 30,
    periods: ["Primer trimestre", "Segundo trimestre", "Tercer trimestre"],
    grading_scale: { min: 0, max: 100, passing: 60 },
  },
  notifications: {
    email_enabled: true,
    push_enabled: true,
    absence_alerts: true,
    grade_alerts: true,
    weekly_summary: true,
  },
  security: {
    require_2fa_admins: false,
    session_timeout_minutes: 120,
    allow_parent_invites: true,
    audit_log_enabled: true,
  },
};

function mergeSettings(data: Partial<SettingsState>): SettingsState {
  return {
    ...fallbackSettings,
    ...data,
    school: { ...fallbackSettings.school, ...(data.school || {}) },
    academic: {
      ...fallbackSettings.academic,
      ...(data.academic || {}),
      grading_scale: { ...fallbackSettings.academic.grading_scale, ...(data.academic?.grading_scale || {}) },
    },
    notifications: { ...fallbackSettings.notifications, ...(data.notifications || {}) },
    security: { ...fallbackSettings.security, ...(data.security || {}) },
  };
}

export default function SchoolAdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsState>(fallbackSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/v1/school-admin/settings");
      if (!response?.success) throw new Error(response?.message || "No se pudo cargar configuracion.");
      setSettings(mergeSettings(response.data || {}));
    } catch (error) {
      toast({ title: "No se pudo cargar configuracion", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSection = (section: keyof SettingsState, key: string, value: any) => {
    setSettings((current) => ({
      ...current,
      [section]: { ...(current[section] as Record<string, any>), [key]: value },
    }));
  };

  const updateGrading = (key: string, value: number) => {
    setSettings((current) => ({
      ...current,
      academic: {
        ...current.academic,
        grading_scale: { ...current.academic.grading_scale, [key]: value },
      },
    }));
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await authFetch("/api/v1/school-admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo guardar configuracion.");
      setSettings(mergeSettings(response.data || settings));
      toast({ title: "Configuracion guardada", description: "Los ajustes de la escuela quedaron sincronizados." });
    } catch (error) {
      toast({ title: "No se pudo guardar", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-80 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando configuracion</div>;
  }

  return (
    <form onSubmit={saveSettings} className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuracion</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ajustes institucionales, academicos, notificaciones y seguridad.</p>
        </div>
        <Button type="submit" disabled={saving} className="w-full md:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar configuracion
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Escuela</CardTitle><Building2 className="h-4 w-4 text-primary" /></CardHeader><CardContent><div className="text-lg font-bold">{settings.school.name || "Sin nombre"}</div><p className="text-xs text-muted-foreground">{settings.school.campus_code || "Codigo no definido"}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ciclo</CardTitle><GraduationCap className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-lg font-bold">{settings.academic.school_year || "No definido"}</div><p className="text-xs text-muted-foreground">Modo {settings.academic.attendance_mode === "daily" ? "diario" : "por clase"}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Alertas</CardTitle><Bell className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{Object.values(settings.notifications).filter(Boolean).length}</div><p className="text-xs text-muted-foreground">Canales activos</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Seguridad</CardTitle><Lock className="h-4 w-4 text-amber-600" /></CardHeader><CardContent><div className="text-lg font-bold">{settings.security.session_timeout_minutes} min</div><p className="text-xs text-muted-foreground">Tiempo de sesion</p></CardContent></Card>
      </div>

      <Tabs defaultValue="school" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="school">Institucion</TabsTrigger>
          <TabsTrigger value="academic">Academico</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="school">
          <Card>
            <CardHeader><CardTitle>Datos institucionales</CardTitle><CardDescription>Informacion base que identifica a la escuela en EduCore.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Nombre comercial</Label><Input value={settings.school.name || ""} onChange={(event) => updateSection("school", "name", event.target.value)} /></div>
              <div className="space-y-2"><Label>Razon social</Label><Input value={settings.school.legal_name || ""} onChange={(event) => updateSection("school", "legal_name", event.target.value)} /></div>
              <div className="space-y-2"><Label>Codigo campus</Label><Input value={settings.school.campus_code || ""} onChange={(event) => updateSection("school", "campus_code", event.target.value.toUpperCase())} /></div>
              <div className="space-y-2"><Label>Color principal</Label><Input type="color" value={settings.school.primary_color || "#4f46e5"} onChange={(event) => updateSection("school", "primary_color", event.target.value)} /></div>
              <div className="space-y-2"><Label>Email institucional</Label><Input type="email" value={settings.school.email || ""} onChange={(event) => updateSection("school", "email", event.target.value)} /></div>
              <div className="space-y-2"><Label>Telefono</Label><Input value={settings.school.phone || ""} onChange={(event) => updateSection("school", "phone", event.target.value)} /></div>
              <div className="space-y-2"><Label>Zona horaria</Label><Select value={settings.school.timezone || "America/Mexico_City"} onValueChange={(value) => updateSection("school", "timezone", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="America/Mexico_City">Mexico centro</SelectItem><SelectItem value="America/Cancun">Mexico sureste</SelectItem><SelectItem value="America/Tijuana">Mexico noroeste</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Idioma</Label><Select value={settings.school.language || "es-MX"} onValueChange={(value) => updateSection("school", "language", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="es-MX">Espanol Mexico</SelectItem><SelectItem value="en-US">English US</SelectItem></SelectContent></Select></div>
              <div className="space-y-2 md:col-span-2"><Label>Direccion</Label><Textarea value={settings.school.address || ""} onChange={(event) => updateSection("school", "address", event.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card>
            <CardHeader><CardTitle>Reglas academicas</CardTitle><CardDescription>Configura evaluacion, asistencia y parametros base.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Ciclo escolar visible</Label><Input value={settings.academic.school_year || ""} onChange={(event) => updateSection("academic", "school_year", event.target.value)} /></div>
              <div className="space-y-2"><Label>Cupo default por grupo</Label><Input type="number" min="1" value={settings.academic.default_capacity || 30} onChange={(event) => updateSection("academic", "default_capacity", Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Modo asistencia</Label><Select value={settings.academic.attendance_mode || "daily"} onValueChange={(value) => updateSection("academic", "attendance_mode", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Diaria</SelectItem><SelectItem value="class">Por clase</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Periodos</Label><Input value={(settings.academic.periods || []).join(", ")} onChange={(event) => updateSection("academic", "periods", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></div>
              <div className="space-y-2"><Label>Calificacion minima</Label><Input type="number" value={settings.academic.grading_scale?.min ?? 0} onChange={(event) => updateGrading("min", Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Calificacion maxima</Label><Input type="number" value={settings.academic.grading_scale?.max ?? 100} onChange={(event) => updateGrading("max", Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Minima aprobatoria</Label><Input type="number" value={settings.academic.grading_scale?.passing ?? 60} onChange={(event) => updateGrading("passing", Number(event.target.value))} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Notificaciones escolares</CardTitle><CardDescription>Controla los canales y eventos automaticos.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {[
                ["email_enabled", "Email habilitado", "Permite enviar avisos y reportes por correo."],
                ["push_enabled", "Notificaciones internas", "Muestra alertas dentro del panel."],
                ["absence_alerts", "Alertas por ausencia", "Avisa a padres cuando un alumno falte."],
                ["grade_alerts", "Alertas de calificaciones", "Notifica cuando se publiquen evaluaciones."],
                ["weekly_summary", "Resumen semanal", "Genera un resumen operativo para direccion."],
              ].map(([key, title, description]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                  <div><p className="text-sm font-medium">{title}</p><p className="text-sm text-muted-foreground">{description}</p></div>
                  <Switch checked={!!settings.notifications[key]} onCheckedChange={(checked) => updateSection("notifications", key, checked)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader><CardTitle>Seguridad operativa</CardTitle><CardDescription>Políticas para administracion escolar y auditoria.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Tiempo de sesion inactiva (minutos)</Label><Input type="number" min="15" max="480" value={settings.security.session_timeout_minutes || 120} onChange={(event) => updateSection("security", "session_timeout_minutes", Number(event.target.value))} /></div>
              {[
                ["require_2fa_admins", "2FA para administradores", "Solicitar doble factor a usuarios administrativos."],
                ["allow_parent_invites", "Invitaciones a padres", "Permitir crear accesos de padres desde alumnos."],
                ["audit_log_enabled", "Audit log activo", "Registrar acciones sensibles del panel escuela."],
              ].map(([key, title, description]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-4">
                  <div><p className="text-sm font-medium">{title}</p><p className="text-sm text-muted-foreground">{description}</p></div>
                  <Switch checked={!!settings.security[key]} onCheckedChange={(checked) => updateSection("security", key, checked)} />
                </div>
              ))}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-medium">Estado de seguridad</p><p className="text-sm text-muted-foreground">Audit log y sesiones protegidas.</p></div>
                  <Badge variant={settings.security.audit_log_enabled ? "default" : "outline"}>{settings.security.audit_log_enabled ? "Activo" : "Revisar"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
