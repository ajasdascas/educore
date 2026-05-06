"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Utensils, Moon, Smile, Droplets } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyLogsPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [date, setDate] = useState(today());
  const [log, setLog] = useState<any>(null);
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
        const res = await authFetch(`/api/v1/parent/children/${childId}/daily-logs?date=${date}`);
        if (!res.success || !res.data) {
          setLog(null);
          setNotAvailable(true);
        } else {
          setLog(res.data);
        }
      } catch {
        setLog(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Registro diario</h1>
          <p className="text-muted-foreground">Actividades del día: alimentación, siesta, higiene y estado emocional.</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && notAvailable && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <p className="text-lg font-medium">Tu escuela aún no tiene registros diarios configurados</p>
            <p className="text-sm text-muted-foreground max-w-sm">Cuando la escuela active este módulo, podrás ver aquí el resumen diario de tu hijo/a.</p>
          </CardContent>
        </Card>
      )}

      {!loading && log && (
        <div className="grid gap-4 sm:grid-cols-2">
          <LogCard
            title="Alimentación"
            icon={<Utensils className="h-5 w-5 text-orange-500" />}
            items={log.meals}
            emptyText="Sin registros de alimentación"
          />
          <LogCard
            title="Siesta"
            icon={<Moon className="h-5 w-5 text-indigo-500" />}
            items={log.naps}
            emptyText="Sin registros de siesta"
          />
          <LogCard
            title="Estado emocional"
            icon={<Smile className="h-5 w-5 text-yellow-500" />}
            items={log.mood}
            emptyText="Sin registros de humor"
          />
          <LogCard
            title="Higiene"
            icon={<Droplets className="h-5 w-5 text-blue-500" />}
            items={log.diapers}
            emptyText="Sin registros de higiene"
          />
        </div>
      )}
    </div>
  );
}

function LogCard({ title, icon, items, emptyText }: { title: string; icon: ReactNode; items: any[]; emptyText: string }) {
  const list = items || [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
        {list.map((item: any, i: number) => (
          <div key={i} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">{item.label || item.type || item.mood || "—"}</p>
              {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
              {item.time && <p className="text-xs text-muted-foreground">{item.time}</p>}
            </div>
            {item.value && <Badge variant="secondary">{item.value}</Badge>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
