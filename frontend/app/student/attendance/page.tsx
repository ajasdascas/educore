"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authFetch } from "@/lib/auth";

interface AttendanceSummary {
  total_days: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

export default function StudentAttendancePage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/api/v1/student/attendance")
      .then((res) => { if (res?.success) setSummary(res.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Mi Asistencia</h2>
        <p className="text-sm text-muted-foreground mt-1">Resumen del ciclo escolar</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" /> Resumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : !summary ? (
            <p className="text-sm text-muted-foreground">No hay registros de asistencia.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total días", value: summary.total_days },
                { label: "Presentes", value: summary.present },
                { label: "Ausentes", value: summary.absent },
                { label: "Tardanzas", value: summary.late },
              ].map((item) => (
                <div key={item.label} className="text-center p-4 bg-muted/50 rounded-xl">
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-4 text-center p-4 bg-emerald-500/10 rounded-xl">
                <p className="text-3xl font-bold text-emerald-500">{summary.rate?.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">Porcentaje de asistencia</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
