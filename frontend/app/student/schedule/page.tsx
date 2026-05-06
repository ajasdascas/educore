"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { authFetch } from "@/lib/auth";

interface ScheduleBlock {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_name: string;
  room?: string;
}

const DAY_LABELS: Record<string, string> = {
  monday:    "Lunes",
  tuesday:   "Martes",
  wednesday: "Miércoles",
  thursday:  "Jueves",
  friday:    "Viernes",
  saturday:  "Sábado",
};

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const DAY_COLORS: Record<string, string> = {
  monday:    "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
  tuesday:   "bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300",
  wednesday: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300",
  thursday:  "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
  friday:    "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300",
  saturday:  "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950/30 dark:border-slate-800 dark:text-slate-300",
};

export default function StudentSchedulePage() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/schedule")
      .then((res) => {
        if (res?.success) {
          const raw = Array.isArray(res.data) ? res.data : res.data?.schedule ?? [];
          setBlocks(raw);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const byDay = DAY_ORDER.reduce<Record<string, ScheduleBlock[]>>((acc, day) => {
    acc[day] = blocks.filter((b) => b.day === day);
    return acc;
  }, {});

  const activeDays = DAY_ORDER.filter((d) => byDay[d].length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mi Horario</h2>
        <p className="text-sm text-muted-foreground mt-1">Horario semanal de clases</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Horario semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando...
            </div>
          ) : activeDays.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="h-8 w-8 opacity-40" />
              <p className="text-sm">No hay clases registradas en tu horario.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeDays.map((day) => (
                <div key={day}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    {DAY_LABELS[day]}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {byDay[day].map((b) => (
                      <div
                        key={b.id}
                        className={`rounded-lg border p-3 ${DAY_COLORS[day] ?? "bg-muted/40 border-border"}`}
                      >
                        <p className="text-sm font-semibold leading-tight">{b.subject_name || "Materia"}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-80">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {b.start_time} – {b.end_time}
                          </span>
                          {b.teacher_name && <span>{b.teacher_name}</span>}
                          {b.room && <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{b.room}</Badge>}
                        </div>
                      </div>
                    ))}
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
