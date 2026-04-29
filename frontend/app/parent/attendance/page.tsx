"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CalendarCheck, Clock, FileCheck, XCircle } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Retardo",
  excused: "Justificado",
};

export default function ParentAttendancePage() {
  const [children, setChildren] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [range, setRange] = useState("30");
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChildren = async () => {
      const res = await authFetch("/api/v1/parent/children");
      const list = res.success ? res.data || [] : [];
      setChildren(list);
      setChildId(list[0]?.id || "");
    };
    loadChildren();
  }, []);

  useEffect(() => {
    if (!childId) return;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - Number(range));
    const loadAttendance = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/v1/parent/children/${childId}/attendance?start_date=${start.toISOString().slice(0, 10)}&end_date=${end.toISOString().slice(0, 10)}`);
        if (res.success) setAttendance(res.data);
      } finally {
        setLoading(false);
      }
    };
    loadAttendance();
  }, [childId, range]);

  const summary = attendance?.summary || {};
  const records = attendance?.records || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asistencia</h1>
          <p className="text-muted-foreground">Consulta asistencia diaria, retardos y justificantes.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={childId} onValueChange={setChildId}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Alumno" /></SelectTrigger>
            <SelectContent>{children.map((child) => <SelectItem key={child.id} value={child.id}>{child.first_name} {child.last_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Rango" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Metric title="Asistencia" value={`${summary.rate || 0}%`} icon={<CalendarCheck className="h-4 w-4 text-green-600" />} />
        <Metric title="Presentes" value={summary.present_days || 0} icon={<FileCheck className="h-4 w-4 text-blue-600" />} />
        <Metric title="Retardos" value={summary.late_days || 0} icon={<Clock className="h-4 w-4 text-amber-600" />} />
        <Metric title="Ausencias" value={summary.absent_days || 0} icon={<XCircle className="h-4 w-4 text-red-600" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro diario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="animate-pulse text-sm text-muted-foreground">Cargando asistencia...</p>}
          {!loading && records.length === 0 && <p className="text-sm text-muted-foreground">Sin registros para el rango seleccionado.</p>}
          {records.map((record: any) => (
            <div key={`${record.date}-${record.status}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{record.date}</p>
                <p className="text-xs text-muted-foreground">{record.notes || "Sin notas"}</p>
              </div>
              <Badge variant={record.status === "absent" ? "destructive" : "secondary"}>{statusLabels[record.status] || record.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
