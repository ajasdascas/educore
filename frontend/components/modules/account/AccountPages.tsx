"use client";

import { useState } from "react";
import { Bell, Calendar, CheckCircle, Key, Lock, Mail, Monitor, Shield, User } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
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

function saveDemo(message: string) {
  toast({ title: "Cambios guardados", description: message });
}

export function AccountProfilePage({ roleLabel, scopeLabel }: AccountPageProps) {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu informacion personal en {scopeLabel}.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Informacion personal</CardTitle>
            <CardDescription>Datos visibles para tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input id="account-email" value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-first-name">Nombre</Label>
                <Input id="account-first-name" defaultValue={user?.first_name || ""} placeholder="Nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-last-name">Apellido</Label>
                <Input id="account-last-name" defaultValue={user?.last_name || ""} placeholder="Apellido" />
              </div>
            </div>
            <Button onClick={() => saveDemo("Tu perfil quedo actualizado en modo demo.")}>Guardar Cambios</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Informacion de cuenta</CardTitle>
            <CardDescription>Rol, estado y ultimo acceso.</CardDescription>
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
                <p className="text-sm font-medium">Ultimo acceso</p>
                <p className="text-sm text-muted-foreground">Ahora</p>
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
        <h1 className="text-3xl font-bold tracking-tight">Configuracion</h1>
        <p className="text-muted-foreground">Preferencias propias para {roleLabel} en {scopeLabel}.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Preferencias de experiencia</CardTitle>
          <CardDescription>Estos ajustes se guardan localmente en modo demo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            ["Notificaciones por email", "Recibir avisos importantes en tu correo.", emailEnabled, setEmailEnabled],
            ["Notificaciones push", "Ver alertas dentro de EduCore.", pushEnabled, setPushEnabled],
            ["Vista compacta", "Reducir espacios para revisar mas informacion.", compactMode, setCompactMode],
          ].map(([title, description, checked, setChecked]) => (
            <div key={String(title)} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
              <Switch checked={Boolean(checked)} onCheckedChange={setChecked as (checked: boolean) => void} />
            </div>
          ))}
          <Button onClick={() => saveDemo("Tus preferencias quedaron guardadas.")}>Guardar Configuracion</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function AccountNotificationsPage({ roleLabel }: AccountPageProps) {
  const notifications = [
    { title: "Acceso reciente", description: `Sesion activa para ${roleLabel}.`, status: "info" },
    { title: "Preferencias actualizadas", description: "Tus cambios se aplicaron correctamente.", status: "success" },
    { title: "Recordatorio de seguridad", description: "Revisa tu contrasena cada 90 dias.", status: "warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        <p className="text-muted-foreground">Centro de alertas de tu cuenta.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Bandeja</CardTitle>
          <CardDescription>Alertas personales, nunca compartidas entre roles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.title} className="flex items-start justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.description}</p>
              </div>
              <Badge variant="outline">{notification.status}</Badge>
            </div>
          ))}
          <Button variant="outline" onClick={() => saveDemo("Todas las notificaciones se marcaron como leidas.")}>
            Marcar todas como leidas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function AccountSecurityPage({ roleLabel }: AccountPageProps) {
  const [loginAlerts, setLoginAlerts] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Seguridad</h1>
        <p className="text-muted-foreground">Controles de acceso para tu cuenta {roleLabel}.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Cambiar contrasena</CardTitle>
            <CardDescription>Actualiza tus credenciales personales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contrasena actual</Label>
              <Input id="current-password" type="password" placeholder="********" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contrasena</Label>
              <Input id="new-password" type="password" placeholder="********" />
            </div>
            <Button onClick={() => saveDemo("La contrasena fue validada en modo demo.")}>Actualizar Contrasena</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Sesiones</CardTitle>
            <CardDescription>Dispositivos y alertas de acceso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Alertas de inicio de sesion</p>
                <p className="text-sm text-muted-foreground">Avisar ante nuevos accesos.</p>
              </div>
              <Switch checked={loginAlerts} onCheckedChange={setLoginAlerts} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Navegador actual</p>
                  <p className="text-sm text-muted-foreground">Sesion activa ahora.</p>
                </div>
              </div>
              <Badge>Actual</Badge>
            </div>
            <Button variant="outline" onClick={() => saveDemo("Las otras sesiones fueron cerradas en modo demo.")}>
              Cerrar Otras Sesiones
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
