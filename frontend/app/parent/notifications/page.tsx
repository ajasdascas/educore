"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

interface Notification {
  id: string;
  title: string;
  message?: string;
  body?: string;
  is_read: boolean;
  created_at: string;
}

export default function ParentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/parent/notifications")
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
        <h2 className="text-2xl font-bold">Notificaciones</h2>
        <p className="text-sm text-muted-foreground mt-1">Avisos y comunicados de la escuela.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Mis notificaciones
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
                <div key={n.id} className={`py-4 ${n.is_read ? "opacity-70" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {(n.message || n.body) && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message || n.body}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 text-[10px]">Nueva</Badge>
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
