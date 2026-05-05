"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Loader2, Mail, Save, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/AuthProvider";
import { authFetch, getAccessToken, setAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

export default function ProfilePage() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setFirstName(user?.first_name || "");
    setLastName(user?.last_name || "");
  }, [user?.first_name, user?.last_name]);

  const displayName = useMemo(() => {
    const full = `${firstName} ${lastName}`.trim();
    return full || user?.email || "Super Admin";
  }, [firstName, lastName, user?.email]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/v1/super-admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      });
      if (!res.success) throw new Error(res.error || res.message || "No se pudo guardar el perfil");
      const updatedUser = {
        ...user,
        first_name: res.data?.first_name || firstName.trim(),
        last_name: res.data?.last_name || lastName.trim(),
      };
      const token = getAccessToken();
      if (token) setAuth(token, updatedUser);
      toast({ title: "Listo", description: "Perfil actualizado correctamente." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo guardar el perfil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Datos reales de tu cuenta SuperAdmin.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informacion personal
            </CardTitle>
            <CardDescription>Actualiza el nombre visible de tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" type="email" value={user?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">Nombre</Label>
                <Input id="first-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Apellido</Label>
                <Input id="last-name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Apellido" />
              </div>
            </div>
            <Button onClick={save} disabled={saving || !user?.id}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Guardar cambios
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Informacion de cuenta
            </CardTitle>
            <CardDescription>Resumen del contexto autenticado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {(firstName || "S").charAt(0)}
                {(lastName || "A").charAt(0)}
              </div>
              <div>
                <p className="font-medium">{displayName}</p>
                <p className="text-sm text-muted-foreground">{user?.role || "SUPER_ADMIN"}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <Mail className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="break-all font-medium">{user?.email || "No disponible"}</p>
              </div>
              <div className="rounded-lg border p-4">
                <Calendar className="mb-2 h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium text-green-600">Activo</p>
              </div>
            </div>
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Para cambiar password o cerrar sesiones usa las paginas Seguridad y Usuarios Globales; ambas acciones quedan auditadas.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
