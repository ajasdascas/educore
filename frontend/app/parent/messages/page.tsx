"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Mail, MessageCircle, Send } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const recipients = [
  { id: "teacher-maria-lopez", name: "Maria Lopez - Matematicas" },
  { id: "teacher-carlos-rivera", name: "Carlos Rivera - Historia" },
  { id: "school-admin", name: "Direccion / Administracion" },
];

export default function ParentMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [form, setForm] = useState({ recipient_id: recipients[0].id, subject: "", content: "", priority: "normal" });
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const loadMessages = async () => {
    const res = await authFetch("/api/v1/parent/messages");
    if (res.success) setMessages(Array.isArray(res.data) ? res.data : res.data?.messages || []);
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const res = await authFetch("/api/v1/parent/messages", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res.success) {
        toast({ title: "Mensaje enviado", description: "Tu mensaje quedo registrado." });
        setForm({ recipient_id: recipients[0].id, subject: "", content: "", priority: "normal" });
        loadMessages();
      } else {
        toast({ variant: "destructive", title: "No se pudo enviar", description: res.message || "Intenta de nuevo." });
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mensajes</h1>
        <p className="text-muted-foreground">Comunicate con docentes y administracion escolar.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Nuevo mensaje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendMessage} className="space-y-4">
              <div className="grid gap-2">
                <Label>Destinatario</Label>
                <Select value={form.recipient_id} onValueChange={(value) => setForm({ ...form, recipient_id: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{recipients.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Asunto</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
              </div>
              <div className="grid gap-2">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Mensaje</Label>
                <Textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
              </div>
              <Button type="submit" disabled={sending} className="w-full">
                {sending ? "Enviando..." : "Enviar mensaje"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {messages.length === 0 && <p className="text-sm text-muted-foreground">Aun no hay mensajes.</p>}
            {messages.map((message) => (
              <div key={message.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{message.subject}</p>
                    <p className="text-sm text-muted-foreground">
                      {message.sender_name} para {message.recipient_name}
                    </p>
                  </div>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm">{message.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(message.created_at).toLocaleString("es-MX")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
