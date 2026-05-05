"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, Loader2, Lock, Monitor, RefreshCw, Shield, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

type PlatformSetting = {
  key: string;
  category: string;
  value: Record<string, unknown>;
};

type SessionItem = {
  id: string;
  device: string;
  location: string;
  ip_address: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
};

const defaultSecurity = {
  password_min_length: 8,
  session_timeout_minutes: 120,
  require_2fa: false,
  max_sessions: 5,
};

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function SecurityPage() {
  const [settings, setSettings] = useState(defaultSecurity);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.is_active && new Date(session.expires_at).getTime() > Date.now()).length,
    [sessions]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [settingsRes, sessionsRes] = await Promise.all([
        authFetch("/api/v1/super-admin/system/security"),
        authFetch("/api/v1/super-admin/system/security/sessions"),
      ]);

      if (!settingsRes.success) throw new Error(settingsRes.error || settingsRes.message || "No se pudo cargar seguridad");
      const items: PlatformSetting[] = Array.isArray(settingsRes.data?.settings) ? settingsRes.data.settings : [];
      const security = items.find((item) => item.key === "security");
      setSettings({
        ...defaultSecurity,
        ...(security?.value || {}),
      } as typeof defaultSecurity);

      if (sessionsRes.success) {
        setSessions(Array.isArray(sessionsRes.data?.sessions) ? sessionsRes.data.sessions : []);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo cargar seguridad", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/super-admin/system/security", {
        method: "PUT",
        body: JSON.stringify({
          key: "security",
          category: "security",
          value: settings,
          is_sensitive: false,
        }),
      });
      if (!res.success) throw new Error(res.error || res.message || "No se pudo guardar seguridad");
      toast({ title: "Listo", description: "Configuracion de seguridad guardada." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo guardar seguridad", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const revokeSessions = async () => {
    const confirmed = confirm("Esto cerrara las sesiones activas registradas para tu usuario. Tendras que iniciar sesion de nuevo si tu token queda invalidado.");
    if (!confirmed) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/super-admin/system/security/sessions/revoke-others", { method: "POST" });
      if (!res.success) throw new Error(res.error || res.message || "No se pudieron cerrar sesiones");
      toast({ title: "Listo", description: `${res.data?.affected || 0} sesiones cerradas.` });
      await load();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudieron cerrar sesiones", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Shield className="h-8 w-8 text-primary" />
            Seguridad
          </h1>
          <p className="text-muted-foreground">Configuracion real de acceso y sesiones del Manager Maestro.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sesiones activas</p>
              <p className="text-2xl font-bold">{activeSessions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Timeout</p>
              <p className="text-2xl font-bold">{settings.session_timeout_minutes} min</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">2FA requerido</p>
              <p className="text-2xl font-bold">{settings.require_2fa ? "Si" : "No"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Politicas de acceso
            </CardTitle>
            <CardDescription>Estos valores se guardan en platform_settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password-min">Longitud minima de password</Label>
                <Input
                  id="password-min"
                  type="number"
                  min={8}
                  max={64}
                  value={settings.password_min_length}
                  onChange={(event) => setSettings((prev) => ({ ...prev, password_min_length: Number(event.target.value || 8) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-timeout">Inactividad maxima (minutos)</Label>
                <Input
                  id="session-timeout"
                  type="number"
                  min={15}
                  max={480}
                  value={settings.session_timeout_minutes}
                  onChange={(event) => setSettings((prev) => ({ ...prev, session_timeout_minutes: Number(event.target.value || 120) }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max-sessions">Maximo de sesiones</Label>
                <Input
                  id="max-sessions"
                  type="number"
                  min={1}
                  max={20}
                  value={settings.max_sessions}
                  onChange={(event) => setSettings((prev) => ({ ...prev, max_sessions: Number(event.target.value || 5) }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Exigir 2FA</p>
                  <p className="text-xs text-muted-foreground">Preparado para activacion global.</p>
                </div>
                <Switch checked={settings.require_2fa} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, require_2fa: checked }))} />
              </div>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar seguridad
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acciones seguras</CardTitle>
            <CardDescription>Operaciones auditadas, sin simulaciones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="font-medium">Reset de password de usuarios globales</p>
              <p className="text-sm text-muted-foreground">Usa Usuarios Globales &gt; tres puntos &gt; Reset password para una cuenta concreta.</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="font-medium">Cerrar sesiones registradas</p>
              <p className="text-sm text-muted-foreground">Cierra sesiones activas asociadas a tu cuenta SuperAdmin.</p>
              <Button variant="outline" className="mt-3 text-destructive" onClick={revokeSessions} disabled={saving || activeSessions === 0}>
                Cerrar sesiones activas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sesiones registradas</CardTitle>
          <CardDescription>Lectura directa de user_sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando sesiones
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No hay sesiones registradas para este usuario.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Monitor className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{session.device}</p>
                      <p className="text-sm text-muted-foreground">Creada: {formatDate(session.created_at)}</p>
                      <p className="text-sm text-muted-foreground">Expira: {formatDate(session.expires_at)}</p>
                    </div>
                  </div>
                  <Badge variant={session.is_active ? "default" : "secondary"} className={session.is_active ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : ""}>
                    {session.is_active ? <CheckCircle className="mr-1 h-3 w-3" /> : null}
                    {session.is_active ? "Activa" : "Cerrada"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
