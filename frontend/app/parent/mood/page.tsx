"use client";

import { useEffect, useState } from "react";
import { Smile, Heart, Clock } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const moodEmoji: Record<string, string> = {
  feliz: "😊",
  tranquilo: "😌",
  lloroso: "😢",
  irritable: "😤",
  cansado: "😴",
};

const moodVariant: Record<string, "default" | "secondary" | "destructive"> = {
  feliz: "default",
  tranquilo: "secondary",
  lloroso: "secondary",
  irritable: "destructive",
  cansado: "secondary",
};

const moodColor: Record<string, string> = {
  feliz: "text-yellow-500",
  tranquilo: "text-green-500",
  lloroso: "text-blue-500",
  irritable: "text-red-500",
  cansado: "text-slate-500",
};

export default function MoodPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notAvailable, setNotAvailable] = useState(false);

  useEffect(() => {
    authFetch("/api/v1/parent/children").then((res) => {
      const list = res.success ? res.data || [] : [];
      setChildren(list);
      setChildId(list[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    if (!childId) return;
    const load = async () => {
      setLoading(true);
      setNotAvailable(false);
      try {
        const res = await authFetch(`/api/v1/parent/children/${childId}/mood?date=${date}`);
        if (!res.success || !res.data) {
          setEntries([]);
          setNotAvailable(true);
        } else {
          setEntries(res.data || []);
        }
      } catch {
        setEntries([]);
        setNotAvailable(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [childId, date]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estado emocional</h1>
          <p className="text-muted-foreground">Seguimiento del estado de ánimo de tu hijo/a durante el día.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {children.length > 1 && (
            <Select value={childId} onValueChange={setChildId}>
              <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Hijo/a" /></SelectTrigger>
              <SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-[160px]"
          />
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && notAvailable && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Smile className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Tu escuela aún no tiene el módulo de estado emocional configurado</p>
            <p className="text-sm text-muted-foreground max-w-sm">Cuando la escuela active este módulo podrás ver aquí cómo se sintió tu hijo/a durante el día.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !notAvailable && entries.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Sin registros para este día</p>
            <p className="text-sm text-muted-foreground">Selecciona otro día o espera a que la maestra registre el estado emocional.</p>
          </CardContent>
        </Card>
      )}

      {!loading && entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smile className="h-5 w-5 text-yellow-500" />
              Línea del tiempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {entries.map((entry: any, i: number) => {
                const key = (entry.mood || "").toLowerCase();
                const emoji = moodEmoji[key] || "😶";
                const color = moodColor[key] || "text-muted-foreground";
                return (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl shrink-0 ${color}`}>
                        {emoji}
                      </div>
                      {i < entries.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                    </div>
                    <div className={`pb-6 ${i === entries.length - 1 ? "pb-0" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={moodVariant[key] || "secondary"} className="capitalize">
                          {entry.mood || "—"}
                        </Badge>
                        {entry.time && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {entry.time}
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
