"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bell, Calendar, CheckCircle, Key, Lock, Loader2, Mail, Monitor, Shield, User } from "lucide-react";
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

export function AccountProfilePage({ roleLabel, scopeLabel }: AccountPageProps) {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal en {scopeLabel}.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Información personal</CardTitle>
            <CardDescription>Datos asociados a tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input id="account-email" value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={user?.first_name || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input value={user?.last_name || ""} disabled className="bg-muted" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Para modificar tu nombre o correo, contacta al administrador de tu escuela.
            </p>
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
              <Badge>{user?.role}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Estado</p>
                <p className="text-sm text-green-600">Activo</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
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

export function AccountSettingsPage({ roleLabel, scopeLabel }: AccountPageProps) {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Preferencias de tu cuenta como {roleLabel} en {scopeLabel}.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Preferencias de experiencia</CardTitle>
          <CardDescription>Estos ajustes se guardan en tu navegador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {([
            ["Notificaciones por email", "Recibir avisos importantes en tu correo.", emailEnabled, setEmailEnabled],
            ["Notificaciones push", "Ver alertas dentro de EduCore.", pushEnabled, setPushEnabled],
            ["Vista compacta", "Reducir espacios para revisar más información.", compactMode, setCompactMode],
          ] as Array<[string, string, boolean, (checked: boolean) => void]>).map(([title, description, checked, setChecked]) => (
            <div key={String(title)} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Switch checked={Boolean(checked)} onCheckedChange={setChecked as (checked: boolean) => void} />
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

export function AccountNotificationsPage({ roleLabel }: AccountPageProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/notifications")
      .then((res) => {
        if (res?.success) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.notifications ?? [];
          setNotifications(raw);
        }
      })
      .finally(() => setLoading(false));
  }, []);

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

export function AccountSecurityPage({ roleLabel }: AccountPageProps) {
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) {
      toast({ title: "Contraseña muy corta", description: "Debe tener al menos 8 caracteres.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      if (res?.success) {
        toast({ title: "Contraseña actualizada", description: "Tu nueva contraseña ya está activa." });
        setCurrentPw("");
        setNewPw("");
      } else {
        toast({ title: "Error", description: res?.error?.message || "No se pudo cambiar la contraseña.", variant: "destructive" });
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
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Sesiones</CardTitle>
            <CardDescription>Configuración de acceso y alertas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Alertas de inicio de sesión</p>
                <p className="text-sm text-muted-foreground">Avisar ante nuevos accesos.</p>
              </div>
              <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Navegador actual</p>
                  <p className="text-sm text-muted-foreground">Sesión activa ahora.</p>
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
