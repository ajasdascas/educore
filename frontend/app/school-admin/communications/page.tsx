"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, CalendarClock, Copy, Eye, Loader2, Mail, MessageSquare, Plus, RefreshCw, Search, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { authFetch } from "@/lib/auth";

type CommunicationStatus = "sent" | "scheduled" | "draft";
type CommunicationPriority = "low" | "normal" | "high" | "urgent";

type SchoolCommunication = {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: CommunicationPriority;
  status: CommunicationStatus;
  recipient_type: "role" | "group";
  recipient_id: string;
  recipient_label: string;
  channels: string[];
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  created_at: string;
  scheduled_for?: string;
  sent_at?: string;
};

type SchoolGroup = {
  id: string;
  name: string;
  grade_name: string;
  status: string;
};

type CommunicationStats = {
  total_messages: number;
  sent_messages: number;
  scheduled_messages: number;
  draft_messages: number;
  delivered_count: number;
  read_count: number;
};

type FormMode = "send" | "schedule" | "draft";

type CommunicationForm = {
  title: string;
  content: string;
  type: string;
  priority: CommunicationPriority;
  recipient_type: "role" | "group";
  recipient_id: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  scheduled_for: string;
};

const emptyForm: CommunicationForm = {
  title: "",
  content: "",
  type: "announcement",
  priority: "normal",
  recipient_type: "role",
  recipient_id: "parents",
  email: true,
  push: true,
  sms: false,
  scheduled_for: "",
};

const communicationTypes = [
  { value: "announcement", label: "Comunicado" },
  { value: "message", label: "Mensaje" },
  { value: "notification", label: "Notificacion" },
  { value: "alert", label: "Alerta" },
];

const priorityOptions = [
  { value: "low", label: "Baja" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

function normalizeCommunications(response: any): SchoolCommunication[] {
  const raw = response?.data?.communications || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeGroups(response: any): SchoolGroup[] {
  const raw = response?.data?.groups || response?.data || [];
  return Array.isArray(raw) ? raw : [];
}

function normalizeStats(response: any): CommunicationStats {
  const data = response?.data || {};
  return {
    total_messages: Number(data.total_messages || 0),
    sent_messages: Number(data.sent_messages || 0),
    scheduled_messages: Number(data.scheduled_messages || 0),
    draft_messages: Number(data.draft_messages || 0),
    delivered_count: Number(data.delivered_count || 0),
    read_count: Number(data.read_count || 0),
  };
}

function typeLabel(type: string) {
  return communicationTypes.find((item) => item.value === type)?.label || type;
}

function priorityLabel(priority: string) {
  return priorityOptions.find((item) => item.value === priority)?.label || priority;
}

function statusLabel(status: CommunicationStatus) {
  return {
    sent: "Enviado",
    scheduled: "Programado",
    draft: "Borrador",
  }[status];
}

function statusVariant(status: CommunicationStatus) {
  return status === "sent" ? "default" : status === "scheduled" ? "secondary" : "outline";
}

function priorityVariant(priority: CommunicationPriority) {
  return priority === "urgent" || priority === "high" ? "destructive" : priority === "normal" ? "secondary" : "outline";
}

function formatDate(value?: string) {
  if (!value) return "No disponible";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toLocalDateTimeInput(value?: string) {
  const date = value ? new Date(value) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formToPayload(form: CommunicationForm, forceScheduled = false) {
  const channels = [
    form.email ? "email" : "",
    form.push ? "push" : "",
    form.sms ? "sms" : "",
  ].filter(Boolean);

  const parsedScheduledDate = form.scheduled_for ? new Date(form.scheduled_for) : null;
  const scheduledDate = parsedScheduledDate && !Number.isNaN(parsedScheduledDate.getTime())
    ? parsedScheduledDate
    : new Date(Date.now() + 60 * 60 * 1000);

  return {
    title: form.title.trim(),
    content: form.content.trim(),
    type: form.type,
    priority: form.priority,
    recipient_type: form.recipient_type,
    recipient_id: form.recipient_id,
    channels: channels.length ? channels : ["email"],
    scheduled_for: forceScheduled ? scheduledDate.toISOString() : "",
  };
}

export default function SchoolAdminCommunicationsPage() {
  const { toast } = useToast();
  const [communications, setCommunications] = useState<SchoolCommunication[]>([]);
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [stats, setStats] = useState<CommunicationStats>(normalizeStats({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("send");
  const [selectedCommunication, setSelectedCommunication] = useState<SchoolCommunication | null>(null);
  const [form, setForm] = useState<CommunicationForm>(emptyForm);

  const loadData = async () => {
    try {
      setLoading(true);
      const [communicationsResponse, statsResponse, groupsResponse] = await Promise.all([
        authFetch("/api/v1/school-admin/communications"),
        authFetch("/api/v1/school-admin/communications/stats"),
        authFetch("/api/v1/school-admin/academic/groups"),
      ]);
      setCommunications(normalizeCommunications(communicationsResponse));
      setStats(normalizeStats(statsResponse));
      setGroups(normalizeGroups(groupsResponse));
    } catch (error) {
      toast({
        title: "No se pudieron cargar comunicaciones",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCommunications = useMemo(() => {
    const term = search.trim().toLowerCase();
    return communications.filter((item) => {
      const matchesSearch = !term || `${item.title} ${item.content} ${item.recipient_label}`.toLowerCase().includes(term);
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      return matchesSearch && matchesType && matchesStatus && matchesPriority;
    });
  }, [communications, priorityFilter, search, statusFilter, typeFilter]);

  const readRate = stats.delivered_count ? Math.round((stats.read_count / stats.delivered_count) * 100) : 0;
  const deliveryRate = useMemo(() => {
    const sent = communications.filter((item) => item.status === "sent");
    const recipients = sent.reduce((sum, item) => sum + item.total_recipients, 0);
    const delivered = sent.reduce((sum, item) => sum + item.delivered_count, 0);
    return recipients ? Math.round((delivered / recipients) * 100) : 0;
  }, [communications]);

  const openComposer = (mode: FormMode, source?: SchoolCommunication) => {
    setFormMode(mode);
    setSelectedCommunication(source || null);
    if (source) {
      setForm({
        title: mode === "draft" ? `Copia - ${source.title}` : source.title,
        content: source.content,
        type: source.type,
        priority: source.priority,
        recipient_type: source.recipient_type,
        recipient_id: source.recipient_id,
        email: source.channels.includes("email"),
        push: source.channels.includes("push"),
        sms: source.channels.includes("sms"),
        scheduled_for: toLocalDateTimeInput(source.scheduled_for),
      });
    } else {
      setForm({
        ...emptyForm,
        scheduled_for: mode === "schedule" ? toLocalDateTimeInput() : "",
      });
    }
    setFormOpen(true);
  };

  const submitCommunication = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Faltan datos", description: "Titulo y contenido son obligatorios.", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const endpoint = formMode === "draft" ? "/api/v1/school-admin/communications" : "/api/v1/school-admin/communications/send";
      const body = formMode === "draft" ? { ...formToPayload(form), scheduled_for: "" } : formToPayload(form, formMode === "schedule");
      const response = await authFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo guardar el comunicado.");
      toast({
        title: formMode === "draft" ? "Borrador guardado" : formMode === "schedule" ? "Comunicado programado" : "Comunicado enviado",
        description: response.message || "Cambios aplicados en modo demo.",
      });
      setFormOpen(false);
      await loadData();
    } catch (error) {
      toast({
        title: "No se pudo completar la accion",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (communication: SchoolCommunication) => {
    setSelectedCommunication(communication);
    setDetailOpen(true);
    try {
      const response = await authFetch(`/api/v1/school-admin/communications/${communication.id}`);
      if (response?.success && response.data) setSelectedCommunication(response.data);
    } catch {
      setSelectedCommunication(communication);
    }
  };

  const resendCommunication = async (communication: SchoolCommunication) => {
    try {
      setSaving(true);
      const payload = {
        title: `Reenvio - ${communication.title}`,
        content: communication.content,
        type: communication.type,
        priority: communication.priority,
        recipient_type: communication.recipient_type,
        recipient_id: communication.recipient_id,
        channels: communication.channels,
        scheduled_for: "",
      };
      const response = await authFetch("/api/v1/school-admin/communications/send", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo reenviar.");
      toast({ title: "Comunicado reenviado", description: "Se creo un nuevo envio en modo demo." });
      await loadData();
    } catch (error) {
      toast({
        title: "No se pudo reenviar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const markDeliveredAsRead = async (communication: SchoolCommunication) => {
    try {
      const response = await authFetch(`/api/v1/school-admin/communications/${communication.id}`, {
        method: "PUT",
        body: JSON.stringify({ read_count: communication.delivered_count }),
      });
      if (!response?.success) throw new Error(response?.message || "No se pudo actualizar.");
      toast({ title: "Lecturas actualizadas", description: "El comunicado quedo marcado como leido en modo demo." });
      await loadData();
    } catch (error) {
      toast({
        title: "No se pudo actualizar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const deleteCommunication = async () => {
    if (!selectedCommunication) return;
    try {
      setSaving(true);
      const response = await authFetch(`/api/v1/school-admin/communications/${selectedCommunication.id}`, { method: "DELETE" });
      if (!response?.success) throw new Error(response?.message || "No se pudo eliminar.");
      toast({ title: "Comunicado eliminado", description: "El listado fue actualizado." });
      setCommunications((current) => current.filter((item) => item.id !== selectedCommunication.id));
      setDeleteOpen(false);
      setSelectedCommunication(null);
      await loadData();
    } catch (error) {
      toast({
        title: "No se pudo eliminar",
        description: error instanceof Error ? error.message : "Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comunicaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">Envia avisos, programa mensajes y da seguimiento a la lectura.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={() => openComposer("send")}><Send className="mr-2 h-4 w-4" />Enviar</Button>
          <Button variant="outline" onClick={() => openComposer("schedule")}><CalendarClock className="mr-2 h-4 w-4" />Programar</Button>
          <Button variant="outline" onClick={() => openComposer("draft")}><Plus className="mr-2 h-4 w-4" />Borrador</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Comunicados</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total_messages}</div><p className="text-xs text-muted-foreground">{stats.sent_messages} enviados, {stats.draft_messages} borradores</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Programados</CardTitle><CalendarClock className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.scheduled_messages}</div><p className="text-xs text-muted-foreground">Pendientes por enviar</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Entrega</CardTitle><Mail className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{deliveryRate}%</div><p className="text-xs text-muted-foreground">{stats.delivered_count} entregas registradas</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Lectura</CardTitle><Bell className="h-4 w-4 text-amber-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{readRate}%</div><p className="text-xs text-muted-foreground">{stats.read_count} lecturas confirmadas</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <CardTitle>Historial de comunicados</CardTitle>
            <div className="grid gap-2 sm:grid-cols-[minmax(210px,1fr)_150px_150px_150px_auto]">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar comunicado" className="pl-9" /></div>
              <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los tipos</SelectItem>{communicationTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="sent">Enviados</SelectItem><SelectItem value="scheduled">Programados</SelectItem><SelectItem value="draft">Borradores</SelectItem></SelectContent></Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Prioridad</SelectItem>{priorityOptions.map((priority) => <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>)}</SelectContent></Select>
              <Button variant="outline" onClick={() => { setSearch(""); setTypeFilter("all"); setStatusFilter("all"); setPriorityFilter("all"); }}>Limpiar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando comunicados</div>
          ) : filteredCommunications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><MessageSquare className="h-10 w-10 text-muted-foreground" /><div><p className="font-medium">No hay comunicados con esos filtros</p><p className="text-sm text-muted-foreground">Crea un comunicado o programa un aviso para iniciar el historial.</p></div><Button onClick={() => openComposer("send")}><Send className="mr-2 h-4 w-4" />Enviar comunicado</Button></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Comunicado</TableHead><TableHead>Destinatarios</TableHead><TableHead>Estado</TableHead><TableHead>Prioridad</TableHead><TableHead>Lectura</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredCommunications.map((communication) => {
                  const itemReadRate = communication.delivered_count ? Math.round((communication.read_count / communication.delivered_count) * 100) : 0;
                  return (
                    <TableRow key={communication.id}>
                      <TableCell><div className="font-medium">{communication.title}</div><div className="line-clamp-1 max-w-md text-xs text-muted-foreground">{typeLabel(communication.type)} - {communication.content}</div></TableCell>
                      <TableCell><div>{communication.recipient_label}</div><div className="text-xs text-muted-foreground">{communication.total_recipients} destinatarios</div></TableCell>
                      <TableCell><Badge variant={statusVariant(communication.status)}>{statusLabel(communication.status)}</Badge></TableCell>
                      <TableCell><Badge variant={priorityVariant(communication.priority)}>{priorityLabel(communication.priority)}</Badge></TableCell>
                      <TableCell><div className="font-medium">{itemReadRate}%</div><div className="text-xs text-muted-foreground">{communication.read_count}/{communication.delivered_count}</div></TableCell>
                      <TableCell>{communication.status === "scheduled" ? formatDate(communication.scheduled_for) : formatDate(communication.sent_at || communication.created_at)}</TableCell>
                      <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" title="Ver detalle" onClick={() => openDetail(communication)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Duplicar" onClick={() => openComposer("draft", communication)}><Copy className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Reenviar" onClick={() => resendCommunication(communication)} disabled={saving}><RefreshCw className="h-4 w-4" /></Button><Button variant="ghost" size="icon-sm" title="Eliminar" onClick={() => { setSelectedCommunication(communication); setDeleteOpen(true); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formMode === "send" ? "Enviar comunicado" : formMode === "schedule" ? "Programar comunicado" : "Guardar borrador"}</DialogTitle>
            <DialogDescription>Modo demo con persistencia local para validar el flujo completo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitCommunication} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2"><Label htmlFor="comm-title">Titulo</Label><Input id="comm-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ej. Junta informativa de padres" /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="comm-content">Mensaje</Label><Textarea id="comm-content" value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="Escribe el comunicado..." rows={5} /></div>
              <div className="space-y-2"><Label>Tipo</Label><Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{communicationTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Prioridad</Label><Select value={form.priority} onValueChange={(value) => setForm((current) => ({ ...current, priority: value as CommunicationPriority }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorityOptions.map((priority) => <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Alcance</Label><Select value={form.recipient_type} onValueChange={(value) => setForm((current) => ({ ...current, recipient_type: value as "role" | "group", recipient_id: value === "group" ? groups[0]?.id || "group-1a" : "parents" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="role">Por rol</SelectItem><SelectItem value="group">Por grupo</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Destinatarios</Label><Select value={form.recipient_id} onValueChange={(value) => setForm((current) => ({ ...current, recipient_id: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{form.recipient_type === "role" ? <><SelectItem value="parents">Padres de familia</SelectItem><SelectItem value="teachers">Profesores</SelectItem><SelectItem value="students">Estudiantes</SelectItem></> : groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.grade_name} {group.name}</SelectItem>)}</SelectContent></Select></div>
              {formMode === "schedule" && <div className="space-y-2 md:col-span-2"><Label htmlFor="scheduled-for">Fecha y hora de envio</Label><Input id="scheduled-for" type="datetime-local" value={form.scheduled_for} onChange={(event) => setForm((current) => ({ ...current, scheduled_for: event.target.value }))} /></div>}
              <div className="space-y-3 rounded-lg border p-4 md:col-span-2">
                <p className="text-sm font-medium">Canales</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Email</span><Switch checked={form.email} onCheckedChange={(checked) => setForm((current) => ({ ...current, email: checked }))} /></div>
                  <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">Push</span><Switch checked={form.push} onCheckedChange={(checked) => setForm((current) => ({ ...current, push: checked }))} /></div>
                  <div className="flex items-center justify-between rounded-md border p-3"><span className="text-sm">SMS</span><Switch checked={form.sms} onCheckedChange={(checked) => setForm((current) => ({ ...current, sms: checked }))} /></div>
                </div>
              </div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button><Button type="button" onClick={() => void submitCommunication()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{formMode === "send" ? "Enviar ahora" : formMode === "schedule" ? "Programar" : "Guardar borrador"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{selectedCommunication?.title || "Detalle del comunicado"}</DialogTitle><DialogDescription>Seguimiento de entrega, lectura y destinatarios.</DialogDescription></DialogHeader>
          {selectedCommunication && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-sm leading-6">{selectedCommunication.content}</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Destinatarios</p><p className="text-xl font-bold">{selectedCommunication.total_recipients}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Entregados</p><p className="text-xl font-bold">{selectedCommunication.delivered_count}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Leidos</p><p className="text-xl font-bold">{selectedCommunication.read_count}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Canales</p><p className="text-xl font-bold">{selectedCommunication.channels.length}</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Estado</p><Badge variant={statusVariant(selectedCommunication.status)}>{statusLabel(selectedCommunication.status)}</Badge></div><div><p className="text-xs text-muted-foreground">Destinatario</p><p className="text-sm">{selectedCommunication.recipient_label}</p></div></div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
            {selectedCommunication && <Button variant="outline" onClick={() => openComposer("draft", selectedCommunication)}><Copy className="mr-2 h-4 w-4" />Duplicar</Button>}
            {selectedCommunication && <Button variant="outline" onClick={() => markDeliveredAsRead(selectedCommunication)}>Marcar leido</Button>}
            {selectedCommunication && <Button onClick={() => resendCommunication(selectedCommunication)}><Send className="mr-2 h-4 w-4" />Reenviar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Eliminar comunicado</DialogTitle><DialogDescription>Esta accion retira el comunicado del historial demo.</DialogDescription></DialogHeader>
          <div className="rounded-lg border p-3 text-sm">{selectedCommunication?.title || "Comunicado seleccionado"}</div>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>Cancelar</Button><Button variant="destructive" onClick={deleteCommunication} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
