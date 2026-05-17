"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
  id: string;
  title: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

function formatDate(val?: string) {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const { toast } = useToast();

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

  const markRead = async (id: string) => {
    setMarkingId(id);
    try {
      const res = await authFetch(`/api/v1/student/notifications/${id}/read`, { method: "PUT" });
      if (res?.success) {
        setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      }
    } finally {
      setMarkingId(null);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    await Promise.allSettled(unread.map((n) => authFetch(`/api/v1/student/notifications/${n.id}/read`, { method: "PUT" })));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast({ title: "Todas marcadas como leídas" });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notificaciones</h2>
          <p className="text-sm text-muted-foreground mt-1">Avisos y comunicados de tu institución.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todo como leído
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Mis notificaciones
            {unreadCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Bell className="h-8 w-8 opacity-40" />
              <p className="text-sm">No tienes notificaciones por ahora.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div key={n.id} className={`flex items-start justify-between gap-3 py-4 ${n.is_read ? "opacity-70" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!n.is_read && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Nueva</Badge>
                    )}
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={markingId === n.id}
                        onClick={() => markRead(n.id)}
                      >
                        {markingId === n.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
