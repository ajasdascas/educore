"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

type SettingsMap = Record<string, Record<string, unknown>>;

const defaultSettings: SettingsMap = {
  general: {
    platform_name: "EduCore",
    default_language: "es-MX",
    timezone: "America/Mexico_City",
    maintenance_mode: false,
  },
  email: {
    provider: "manual",
    from_email: "soporte@educore.mx",
    templates_enabled: true,
  },
  api: {
    rate_limit_per_minute: 120,
    api_keys_enabled: false,
  },
  integrations: {
    stripe: false,
    twilio: false,
    sendgrid: false,
  },
};

function mergeSettings(items: any[]): SettingsMap {
  const next: SettingsMap = { ...defaultSettings };
  for (const item of items) {
    if (!item?.key || typeof item.value !== "object") continue;
    next[item.key] = {
      ...(next[item.key] || {}),
      ...item.value,
    };
  }
  return next;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsMap>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/v1/super-admin/system/settings");
      if (!res.success) throw new Error(res.error || res.message || "No se pudo cargar configuracion");
      setSettings(mergeSettings(Array.isArray(res.data?.settings) ? res.data.settings : []));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo cargar configuracion", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateValue = (key: string, field: string, value: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  const save = async (key: string, category = key) => {
    setSavingKey(key);
    try {
      const res = await authFetch("/api/v1/super-admin/system/settings", {
        method: "PUT",
        body: JSON.stringify({
          key,
          category,
          value: settings[key] || {},
          is_sensitive: false,
        }),
      });
      if (!res.success) throw new Error(res.error || res.message || "No se pudo guardar configuracion");
      toast({ title: "Listo", description: `Configuracion ${key} guardada.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo guardar configuracion", variant: "destructive" });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Settings className="h-8 w-8 text-primary" />
            Configuracion
          </h1>
          <p className="text-muted-foreground">Ajustes reales de plataforma guardados en platform_settings.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando configuracion
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informacion de plataforma</CardTitle>
              <CardDescription>Nombre, idioma y zona horaria global.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform-name">Nombre de plataforma</Label>
                <Input id="platform-name" value={String(settings.general.platform_name || "")} onChange={(event) => updateValue("general", "platform_name", event.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-language">Idioma default</Label>
                  <Input id="default-language" value={String(settings.general.default_language || "")} onChange={(event) => updateValue("general", "default_language", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona horaria</Label>
                  <Input id="timezone" value={String(settings.general.timezone || "")} onChange={(event) => updateValue("general", "timezone", event.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Modo mantenimiento</p>
                  <p className="text-xs text-muted-foreground">No se activa automaticamente; queda como bandera operativa.</p>
                </div>
                <Switch checked={Boolean(settings.general.maintenance_mode)} onCheckedChange={(checked) => updateValue("general", "maintenance_mode", checked)} />
              </div>
              <Button onClick={() => save("general")} disabled={savingKey === "general"}>
                {savingKey === "general" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar general
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email operativo</CardTitle>
              <CardDescription>Configuracion visible para soporte y plantillas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-provider">Proveedor</Label>
                <Input id="email-provider" value={String(settings.email.provider || "")} onChange={(event) => updateValue("email", "provider", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from-email">Email remitente</Label>
                <Input id="from-email" type="email" value={String(settings.email.from_email || "")} onChange={(event) => updateValue("email", "from_email", event.target.value)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Plantillas activas</p>
                  <p className="text-xs text-muted-foreground">Controla el uso de templates transaccionales.</p>
                </div>
                <Switch checked={Boolean(settings.email.templates_enabled)} onCheckedChange={(checked) => updateValue("email", "templates_enabled", checked)} />
              </div>
              <Button onClick={() => save("email")} disabled={savingKey === "email"}>
                {savingKey === "email" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar email
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API</CardTitle>
              <CardDescription>Limites y banderas internas de integracion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rate-limit">Rate limit por minuto</Label>
                <Input id="rate-limit" type="number" min={10} max={2000} value={Number(settings.api.rate_limit_per_minute || 120)} onChange={(event) => updateValue("api", "rate_limit_per_minute", Number(event.target.value || 120))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">API keys</p>
                  <p className="text-xs text-muted-foreground">Preparado para integraciones externas.</p>
                </div>
                <Switch checked={Boolean(settings.api.api_keys_enabled)} onCheckedChange={(checked) => updateValue("api", "api_keys_enabled", checked)} />
              </div>
              <Button onClick={() => save("api")} disabled={savingKey === "api"}>
                {savingKey === "api" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar API
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integraciones</CardTitle>
              <CardDescription>Estado de conectores externos sin exponer secretos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {["stripe", "twilio", "sendgrid"].map((field) => (
                <div key={field} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{field}</p>
                    <p className="text-xs text-muted-foreground">Solo bandera publica, las credenciales siguen en secretos.</p>
                  </div>
                  <Switch checked={Boolean(settings.integrations[field])} onCheckedChange={(checked) => updateValue("integrations", field, checked)} />
                </div>
              ))}
              <Button onClick={() => save("integrations")} disabled={savingKey === "integrations"}>
                {savingKey === "integrations" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar integraciones
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
