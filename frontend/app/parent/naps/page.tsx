"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Moon, Clock, BedDouble } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function minutesToHM(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export default function NapsPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [date, setDate] = useState(today());
  const [naps, setNaps] = useState<any[]>([]);
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
        const res = await authFetch(`/api/v1/parent/children/${childId}/naps?date=${date}`);
        if (!res.success || !res.data) {
          setNaps([]);
          setNotAvailable(true);
        } else {
          setNaps(res.data || []);
        }
      } catch {
        setNaps([]);
        setNotAvailable(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [childId, date]);

  const totalMinutes = naps.reduce((acc: number, n: any) => acc + (n.duration_minutes || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Siestas</h1>
          <p className="text-muted-foreground">Registro de descanso diario: horarios de inicio, fin y duración.</p>
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
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}

      {!loading && notAvailable && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <BedDouble className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">Tu escuela aún no tiene el módulo de siestas configurado</p>
            <p className="text-sm text-muted-foreground max-w-sm">Cuando la escuela active este módulo podrás ver aquí los horarios de descanso de tu hijo/a.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !notAvailable && (
        <>
          <SummaryCard totalMinutes={totalMinutes} napCount={naps.length} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Moon className="h-5 w-5 text-indigo-500" />
                Registros del día
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {naps.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin registros de siesta para este día.</p>
              )}
              {naps.map((nap: any, i: number) => (
                <div key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
                      <BedDouble className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Siesta {i + 1}</p>
                      {nap.start_time && nap.end_time && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {nap.start_time} – {nap.end_time}
                        </p>
                      )}
                      {nap.notes && <p className="text-xs text-muted-foreground mt-0.5">{nap.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-indigo-600">{minutesToHM(nap.duration_minutes)}</p>
                    <p className="text-xs text-muted-foreground">duración</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({ totalMinutes, napCount }: { totalMinutes: number; napCount: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">Descanso total</p>
            <p className="text-2xl font-bold">{minutesToHM(totalMinutes)}</p>
          </div>
          <Moon className="h-4 w-4 text-indigo-500" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">Siestas registradas</p>
            <p className="text-2xl font-bold">{napCount}</p>
          </div>
          <BedDouble className="h-4 w-4 text-indigo-500" />
        </CardContent>
      </Card>
    </div>
  );
}
