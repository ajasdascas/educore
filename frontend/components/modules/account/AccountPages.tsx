"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bell, Calendar, CheckCircle, Key, Lock, Loader2, Monitor, Pencil, Shield, User, X } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

type AccountPageProps = {
  roleLabel: string;
  scopeLabel: string;
};

interface ProfileData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string | null;
  is_active: boolean;
}

export function AccountProfilePage({ roleLabel, scopeLabel }: AccountPageProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch("/api/v1/account/profile").then((res) => {
      if (res?.success) {
        const p = res.data as ProfileData;
        setProfile(p);
        setFirstName(p.first_name);
        setLastName(p.last_name);
      }
    });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/account/profile", {
        method: "PUT",
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });
      if (res?.success) {
        setProfile((prev) => prev ? { ...prev, first_name: firstName, last_name: lastName } : prev);
        setEditing(false);
        toast({ title: "Perfil actualizado" });
      } else {
        toast({ title: "Error", description: res?.error || "No se pudo actualizar.", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  const displayProfile = profile ?? { email: user?.email ?? "", first_name: user?.first_name ?? "", last_name: user?.last_name ?? "", role: user?.role ?? "", is_active: true };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal en {scopeLabel}.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Información personal</CardTitle>
              {!editing && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
            </div>
            <CardDescription>Datos asociados a tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent>
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={displayProfile.email} disabled className="bg-muted" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fn">Nombre</Label>
                    <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required minLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ln">Apellido</Label>
                    <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required minLength={2} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving} size="sm">
                    {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setFirstName(displayProfile.first_name); setLastName(displayProfile.last_name); }}>
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={displayProfile.email} disabled className="bg-muted" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={displayProfile.first_name} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input value={displayProfile.last_name} disabled className="bg-muted" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Información de cuenta</CardTitle>
            <CardDescription>Rol, estado y acceso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Rol</p>
                <p className="text-sm text-muted-foreground">{roleLabel}</p>
              </div>
              <Badge>{displayProfile.role}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estado</p>
                <p className={`text-sm ${displayProfile.is_active ? "text-green-600" : "text-red-500"}`}>
                  {displayProfile.is_active ? "Activo" : "Inactivo"}
                </p>
              </div>
              <CheckCircle className={`h-5 w-5 ${displayProfile.is_active ? "text-green-600" : "text-muted-foreground"}`} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Último acceso</p>
                <p className="text-sm text-muted-foreground">Sesión activa</p>
              </div>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface Settings {
  email_notifications: boolean;
  push_notifications: boolean;
  compact_mode: boolean;
}

export function AccountSettingsPage({ roleLabel, scopeLabel }: AccountPageProps) {
  const [settings, setSettings] = useState<Settings>({ email_notifications: true, push_notifications: true, compact_mode: false });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch("/api/v1/account/settings").then((res) => {
      if (res?.success) setSettings(res.data as Settings);
    }).finally(() => setLoaded(true));
  }, []);

  const handleToggle = async (key: keyof Settings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSaving(true);
    try {
      await authFetch("/api/v1/account/settings", {
        method: "PUT",
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      setSettings(settings);
      toast({ title: "Error", description: "No se pudo guardar la preferencia.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const rows: Array<[string, string, keyof Settings]> = [
    ["Notificaciones por email", "Recibir avisos importantes en tu correo.", "email_notifications"],
    ["Notificaciones push", "Ver alertas dentro de EduCore.", "push_notifications"],
    ["Vista compacta", "Reducir espacios para revisar más información.", "compact_mode"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Preferencias de tu cuenta como {roleLabel} en {scopeLabel}.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Preferencias de experiencia</CardTitle>
          <CardDescription>
            {loaded ? "Cambios guardados automáticamente." : "Cargando preferencias..."}
            {saving && <span className="ml-2 text-xs text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> Guardando</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {rows.map(([title, description, key]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => handleToggle(key, v)}
                disabled={!loaded}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Para cambiar tu contraseña usa la sección de Seguridad.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface Notification {
  id: string;
  title: string;
  body?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

function notificationEndpointForRole(role?: string): string {
  switch (role) {
    case "TEACHER": return "/api/v1/teacher/notifications";
    case "SCHOOL_ADMIN": return "/api/v1/school-admin/notifications";
    case "PARENT": return "/api/v1/parent/notifications";
    default: return "/api/v1/student/notifications";
  }
}

export function AccountNotificationsPage({ roleLabel }: AccountPageProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = notificationEndpointForRole(user?.role);
    authFetch(endpoint)
      .then((res) => {
        if (res?.success) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.notifications ?? [];
          setNotifications(raw);
        }
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        <p className="text-muted-foreground">Centro de alertas de tu cuenta como {roleLabel}.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Mis notificaciones</CardTitle>
          <CardDescription>Avisos del sistema y de tu institución.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Bell className="h-8 w-8 opacity-40" />
              <p className="text-sm">No tienes notificaciones por ahora.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className={`flex items-start justify-between rounded-lg border p-4 ${n.is_read ? "opacity-70" : ""}`}>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{n.title}</p>
                    {(n.body || n.message) && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body || n.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  {!n.is_read && <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 text-[10px]">Nueva</Badge>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SecurityData {
  last_login_at?: string | null;
  email_verified: boolean;
  has_password: boolean;
}

export function AccountSecurityPage({ roleLabel }: AccountPageProps) {
  const [security, setSecurity] = useState<SecurityData | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authFetch("/api/v1/account/security").then((res) => {
      if (res?.success) setSecurity(res.data as SecurityData);
    });
  }, []);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      toast({ title: "Contraseña muy corta", description: "Debe tener al menos 8 caracteres.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/account/password", {
        method: "PUT",
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      if (res?.success) {
        toast({ title: "Contraseña actualizada", description: "Tu nueva contraseña ya está activa." });
        setCurrentPw("");
        setNewPw("");
      } else {
        toast({ title: "Error", description: res?.error || "No se pudo cambiar la contraseña.", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seguridad</h1>
        <p className="text-muted-foreground">Controles de acceso para tu cuenta como {roleLabel}.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Cambiar contraseña</CardTitle>
            <CardDescription>Actualiza tus credenciales de acceso.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña actual</Label>
                <Input id="current-password" type="password" placeholder="********" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input id="new-password" type="password" placeholder="Mín. 8 caracteres" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Actualizando...</> : "Actualizar Contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Estado de cuenta</CardTitle>
            <CardDescription>Información de acceso y verificación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Email verificado</p>
                <p className="text-sm text-muted-foreground">Estado de verificación del correo.</p>
              </div>
              {security ? (
                <Badge variant={security.email_verified ? "default" : "secondary"}>
                  {security.email_verified ? "Verificado" : "Pendiente"}
                </Badge>
              ) : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Último inicio de sesión</p>
                  <p className="text-sm text-muted-foreground">
                    {security?.last_login_at
                      ? new Date(security.last_login_at).toLocaleString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "Sesión activa ahora"}
                  </p>
                </div>
              </div>
              <Badge>Actual</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
