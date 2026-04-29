"use client";

import { FormEvent, useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function TeacherMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [form, setForm] = useState({ recipient_id: "", subject: "", content: "", priority: "normal" });
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [messagesRes, classesRes] = await Promise.all([authFetch("/api/v1/teacher/messages"), authFetch("/api/v1/teacher/classes")]);
    setMessages(messagesRes.success ? messagesRes.data || [] : []);
    const firstClass = classesRes.success ? classesRes.data?.[0] : null;
    if (firstClass) {
      const studentsRes = await authFetch(`/api/v1/teacher/classes/${firstClass.group_id}/students`);
      const list = studentsRes.success ? studentsRes.data || [] : [];
      setStudents(list);
      if (list[0] && !form.recipient_id) setForm((prev) => ({ ...prev, recipient_id: list[0].parent_id || `parent-${list[0].id}` }));
    }
  };

  useEffect(() => { load(); }, []);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const res = await authFetch("/api/v1/teacher/messages", { method: "POST", body: JSON.stringify(form) });
      toast({ title: res.success ? "Mensaje enviado" : "No se pudo enviar", description: res.message || "Conversacion registrada." });
      if (res.success) {
        setForm((prev) => ({ ...prev, subject: "", content: "" }));
        load();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mensajes</h1>
        <p className="text-muted-foreground">Comunicate con padres y administracion desde tu portal docente.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Nuevo mensaje</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={send} className="space-y-4">
              <div className="grid gap-2">
                <Label>Destinatario</Label>
                <Select value={form.recipient_id} onValueChange={(value) => setForm({ ...form, recipient_id: value })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona tutor" /></SelectTrigger>
                  <SelectContent>
                    {students.map((student) => <SelectItem key={student.id} value={student.parent_id || `parent-${student.id}`}>{student.parent_name || "Tutor"} de {student.first_name} {student.last_name}</SelectItem>)}
                    <SelectItem value="school-admin">Direccion escolar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Asunto</Label><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div className="grid gap-2">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="urgent">Urgente</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Mensaje</Label><Textarea rows={6} required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
              <Button type="submit" disabled={sending || !form.recipient_id} className="w-full">{sending ? "Enviando..." : "Enviar"}</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> Conversaciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {messages.length === 0 && <p className="text-sm text-muted-foreground">Sin conversaciones todavia.</p>}
            {messages.map((message) => (
              <div key={message.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div><p className="font-medium">{message.subject}</p><p className="text-sm text-muted-foreground">{message.sender_name} para {message.recipient_name}</p></div>
                  <span className="text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString("es-MX")}</span>
                </div>
                <p className="mt-3 text-sm">{message.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
