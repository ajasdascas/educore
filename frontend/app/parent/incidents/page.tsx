"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Heart, Shield } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const typeLabels: Record<string, string> = {
  caida: "Caída",
  accidente: "Accidente",
  enfermedad: "Enfermedad",
  conducta: "Conducta",
};

const typeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  caida: "outline",
  accidente: "outline",
  enfermedad: "destructive",
  conducta: "secondary",
};

function typeIcon(type: string) {
  const key = (type || "").toLowerCase();
  if (key === "enfermedad") return <Heart className="h-4 w-4 text-red-500" />;
  if (key === "caida" || key === "accidente") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Shield className="h-4 w-4 text-muted-foreground" />;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function IncidentsPage() {
  const [children, setChildren] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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
      setError(false);
      try {
        const res = await authFetch(`/api/v1/parent/children/${childId}/incidents`);
        if (!res.success || !res.data) {
          setIncidents([]);
          setError(true);
        } else {
          setIncidents(res.data || []);
        }
      } catch {
        setIncidents([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [childId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incidentes</h1>
          <p className="text-muted-foreground">Historial de reportes: caídas, accidentes, enfermedades y notas de conducta.</p>
        </div>
        {children.length > 1 && (
          <Select value={childId} onValueChange={setChildId}>
            <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Hijo/a" /></SelectTrigger>
            <SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Shield className="h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">No se pudo cargar el historial de incidentes</p>
            <p className="text-sm text-muted-foreground max-w-sm">Verifica tu conexión o contacta a la escuela si el problema persiste.</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && incidents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Heart className="h-10 w-10 text-green-500" />
            <p className="text-lg font-medium">No hay incidentes registrados — ¡todo va bien!</p>
            <p className="text-sm text-muted-foreground max-w-sm">Cuando la escuela registre algún incidente aparecerá aquí con todos los detalles.</p>
          </CardContent>
        </Card>
      )}

      {!loading && incidents.length > 0 && (
        <div className="space-y-4">
          {incidents.map((incident: any, i: number) => {
            const key = (incident.type || "").toLowerCase();
            return (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {typeIcon(incident.type)}
                      {typeLabels[key] || incident.type || "Incidente"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={typeVariant[key] || "secondary"}>
                        {typeLabels[key] || incident.type || "—"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(incident.date)}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {incident.description && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descripción</p>
                      <p className="text-sm">{incident.description}</p>
                    </div>
                  )}
                  {incident.action_taken && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Acción tomada</p>
                      <p className="text-sm">{incident.action_taken}</p>
                    </div>
                  )}
                  {incident.reported_by && (
                    <p className="text-xs text-muted-foreground">Reportado por: {incident.reported_by}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
