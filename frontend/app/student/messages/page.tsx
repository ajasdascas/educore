"use client";

import { useEffect, useState } from "react";
import { Bell, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

interface MessageItem {
  id: string;
  subject: string;
  sender_name: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function StudentMessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/messages")
      .then((res) => {
        if (res?.success) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.messages ?? [];
          setMessages(raw);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mensajes</h2>
        <p className="text-sm text-muted-foreground mt-1">Avisos y comunicados de tu institución</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Bandeja de entrada
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-14 rounded bg-muted animate-pulse" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Mail className="h-8 w-8 opacity-40" />
              <p className="text-sm">Sin mensajes por ahora.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {messages.map((msg) => (
                <div key={msg.id} className={`py-4 ${!msg.is_read ? "font-medium" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm">{msg.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{msg.sender_name}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {!msg.is_read && <Badge variant="default" className="text-xs">Nuevo</Badge>}
                      <p className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                  </div>
                  {msg.content && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{msg.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
