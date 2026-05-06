"use client";

import { useEffect, useState } from "react";
import { Droplets, Clock } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const typeLabels: Record<string, string> = {
  wet: "Mojado",
  dirty: "Sucio",
  both: "Mojado y sucio",
  dry: "Seco",
};

const typeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  wet: "secondary",
  dirty: "default",
  both: "destructive",
  dry: "secondary",
};

export default function DiapersPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [date, setDate] = useState(today());
  const [diapers, setDiapers] = useState<any[]>([]);
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
        const res = await authFetch(`/api/v1/parent/children/${childId}/diapers?date=${date}`);
        if (!res.success || !res.data) {
          setDiapers([]);
          setNotAvailable(true);
        } else {
          setDiapers(res.data || []);
        }
      } catch {
        setDiapers([]);
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
          <h1 className="text-3xl font-bold tracking-tight">Higiene</h1>
          <p className="text-muted-foreground">Registro de cambios de pañal: hora y tipo por día.</p>
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
          <Skeleton className="h-20 w-full rounded-xl" />
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && notAvailable && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Droplets className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Tu escuela aún no tiene el módulo de higiene configurado</p>
            <p className="text-sm text-muted-foreground max-w-sm">Cuando la escuela active este módulo podrás ver aquí el registro de cambios de pañal de tu hijo/a.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !notAvailable && (
        <>
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">Cambios registrados hoy</p>
                <p className="text-2xl font-bold">{diapers.length}</p>
              </div>
              <Droplets className="h-5 w-5 text-blue-500" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Droplets className="h-5 w-5 text-blue-500" />
                Registro del día
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {diapers.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin registros de higiene para este día.</p>
              )}
              {diapers.map((d: any, i: number) => {
                const key = (d.type || "").toLowerCase();
                return (
                  <div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/10">
                        <Droplets className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Cambio #{i + 1}</p>
                        {d.time && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {d.time}
                          </p>
                        )}
                        {d.notes && <p className="text-xs text-muted-foreground mt-0.5">{d.notes}</p>}
                      </div>
                    </div>
                    <Badge variant={typeVariant[key] || "secondary"}>
                      {typeLabels[key] || d.type || "—"}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
