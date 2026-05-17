"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Loader2, Megaphone, Plus, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
  id: string;
  title: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  status: string;
  created_at: string;
}

type Tab = "received" | "sent" | "create";

function formatDate(val?: string) {
  if (!val) return "-";
  return new Date(val).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const priorityClass: Record<string, string> = {
  urgent: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  high: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-200",
  normal: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  low: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

export default function TeacherNotificationsPage() {
  const [tab, setTab] = useState<Tab>("received");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", priority: "normal" });
  const { toast } = useToast();

  const loadNotifications = () => {
    setLoadingNotif(true);
    authFetch("/api/v1/teacher/notifications")
      .then((res) => {
        if (res?.success) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.notifications ?? [];
          setNotifications(raw);
        }
      })
      .finally(() => setLoadingNotif(false));
  };

  const loadAnnouncements = () => {
    setLoadingAnn(true);
    authFetch("/api/v1/teacher/announcements?per_page=50")
      .then((res) => {
        if (res?.success) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.announcements ?? [];
          setAnnouncements(raw);
        }
      })
      .finally(() => setLoadingAnn(false));
  };

  useEffect(() => {
    loadNotifications();
    loadAnnouncements();
  }, []);

  const markRead = async (id: string) => {
    setMarkingId(id);
    try {
      const res = await authFetch(`/api/v1/teacher/notifications/${id}/read`, { method: "PUT" });
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
    await Promise.allSettled(unread.map((n) => authFetch(`/api/v1/teacher/notifications/${n.id}/read`, { method: "PUT" })));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast({ title: "Todas marcadas como leídas" });
  };

  const submitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch("/api/v1/teacher/announcements", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res?.success) {
        toast({ title: "Aviso publicado", description: form.title });
        setForm({ title: "", content: "", priority: "normal" });
        loadAnnouncements();
        setTab("sent");
      } else {
        toast({ title: "Error", description: res?.error || "No se pudo publicar el aviso", variant: "destructive" });
      }
    } finally {
      setCreating(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "received", label: "Recibidas", icon: Bell, badge: unreadCount || undefined },
    { id: "sent", label: "Avisos enviados", icon: Megaphone },
    { id: "create", label: "Crear aviso", icon: Plus },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Avisos y Notificaciones</h1>
          <p className="text-muted-foreground">Comunicados recibidos y avisos enviados a tu institución.</p>
        </div>
        {tab === "received" && unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todo como leído
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.badge ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "received" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notificaciones recibidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingNotif ? (
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
      )}

      {tab === "sent" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" />
              Avisos publicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAnn ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Megaphone className="h-8 w-8 opacity-40" />
                <p className="text-sm">Aún no has publicado ningún aviso.</p>
                <Button variant="outline" size="sm" onClick={() => setTab("create")}>
                  <Plus className="mr-2 h-4 w-4" /> Crear primer aviso
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {announcements.map((a) => (
                  <div key={a.id} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{a.content}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
                      </div>
                      <Badge variant="outline" className={priorityClass[a.priority] || priorityClass.normal}>
                        {a.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4" />
              Publicar nuevo aviso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitAnnouncement} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ann-title">Título *</Label>
                <Input
                  id="ann-title"
                  placeholder="Ej. Reunión de padres el viernes"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-content">Contenido *</Label>
                <Textarea
                  id="ann-content"
                  placeholder="Detalla el aviso para los padres y estudiantes…"
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ann-priority">Prioridad</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger id="ann-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={creating || !form.title.trim() || !form.content.trim()}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Publicar aviso
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
