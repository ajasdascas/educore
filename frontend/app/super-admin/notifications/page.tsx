"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bell, Check, CheckCircle, Info, Loader2, RefreshCw, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";
import { errorMessage } from "@/lib/api-response";

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  type: "success" | "error" | "warning" | "info";
  severity: string;
  read: boolean;
  created_at: string;
  user?: string;
};

type NotificationPayload = {
  notifications: NotificationItem[];
  total: number;
  unread: number;
  read: number;
};

const toneByType = {
  success: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  error: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
};

function NotificationIcon({ type }: { type: NotificationItem["type"] }) {
  if (type === "success") return <CheckCircle className="h-5 w-5 text-green-600" />;
  if (type === "error") return <AlertCircle className="h-5 w-5 text-red-600" />;
  if (type === "warning") return <AlertCircle className="h-5 w-5 text-yellow-600" />;
  return <Info className="h-5 w-5 text-blue-600" />;
}

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationPayload>({ notifications: [], total: 0, unread: 0, read: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/v1/super-admin/system/notifications");
      if (!res.success) throw new Error(res.error || res.message || "No se pudieron cargar las notificaciones");
      setData({
        notifications: Array.isArray(res.data?.notifications) ? res.data.notifications : [],
        total: Number(res.data?.total || 0),
        unread: Number(res.data?.unread || 0),
        read: Number(res.data?.read || 0),
      });
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error, "No se pudieron cargar las notificaciones"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/super-admin/system/notifications/mark-all-read", { method: "PUT" });
      if (!res.success) throw new Error(res.error || res.message || "No se pudo actualizar el estado");
      toast({ title: "Listo", description: "Notificaciones marcadas como leidas." });
      await load();
    } catch (error: unknown) {
      toast({ title: "Error", description: errorMessage(error, "No se pudo actualizar el estado"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const statCards: Array<{ label: string; value: number; Icon: LucideIcon; tone: string }> = [
    { label: "No leidas", value: data.unread, Icon: AlertCircle, tone: "text-red-600" },
    { label: "Leidas", value: data.read, Icon: CheckCircle, tone: "text-green-600" },
    { label: "Total", value: data.total, Icon: Bell, tone: "text-blue-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Bell className="h-8 w-8 text-primary" />
            Notificaciones
          </h1>
          <p className="text-muted-foreground">Eventos reales del sistema derivados de auditoria.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button onClick={markAllRead} disabled={saving || data.unread === 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Marcar todo leido
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map(({ label, value, Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-primary/10 p-2">
                <Icon className={`h-6 w-6 ${tone}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Centro de eventos</CardTitle>
          <CardDescription>Ultimos eventos auditados en la plataforma.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando notificaciones
            </div>
          ) : data.notifications.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No hay eventos auditados todavia.
            </div>
          ) : (
            <div className="space-y-3">
              {data.notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                    notification.read ? "bg-background" : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div className="rounded-lg bg-muted p-2">
                    <NotificationIcon type={notification.type} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <p className="font-medium">{notification.title}</p>
                      <Badge variant="outline" className={toneByType[notification.type]}>
                        {notification.severity || notification.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
                  </div>
                  {!notification.read ? <span className="mt-2 h-2 w-2 rounded-full bg-primary" /> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
