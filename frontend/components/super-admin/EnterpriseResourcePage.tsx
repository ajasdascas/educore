"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Loader2, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authFetch } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";

export type EnterpriseColumn = {
  key: string;
  label: string;
  kind?: "text" | "badge" | "money" | "date" | "percent" | "score";
};

export type EnterpriseAction = {
  label: string;
  endpoint: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  variant?: "default" | "outline" | "destructive";
};

type Props = {
  title: string;
  description: string;
  endpoint: string;
  collectionKey: string;
  columns: EnterpriseColumn[];
  actions?: EnterpriseAction[];
  emptyText?: string;
  metricKeys?: string[];
};

function formatValue(value: unknown, kind: EnterpriseColumn["kind"]) {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "money") {
    return Number(value).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  }
  if (kind === "date") {
    return new Date(String(value)).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  }
  if (kind === "percent") return `${Number(value).toFixed(1)}%`;
  return String(value);
}

function scoreTone(score: number) {
  if (score >= 75) return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
  if (score >= 45) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200";
  return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200";
}

export function EnterpriseResourcePage({
  title,
  description,
  endpoint,
  collectionKey,
  columns,
  actions = [],
  emptyText = "Sin registros por mostrar",
  metricKeys = [],
}: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [rawData, setRawData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(endpoint);
      if (!res.success) throw new Error(res.message || res.error || "Error al cargar datos");
      const data = res.data || {};
      setRawData(data);
      setRows(Array.isArray(data[collectionKey]) ? data[collectionKey] : []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar la informacion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [endpoint]);

  const filteredRows = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(value));
  }, [query, rows]);

  const runAction = async (action: EnterpriseAction) => {
    setActionLoading(action.label);
    try {
      const res = await authFetch(action.endpoint, {
        method: action.method || "POST",
        body: JSON.stringify(action.body || {}),
      });
      if (!res.success) throw new Error(res.message || res.error || "No se pudo completar la accion");
      toast({ title: "Listo", description: `${action.label} completado.` });
      await load();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo completar la accion",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const metrics = metricKeys
    .map((key) => ({ key, value: rawData[key] }))
    .filter((metric) => metric.value !== undefined && metric.value !== null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant || "outline"}
              onClick={() => runAction(action)}
              disabled={actionLoading === action.label}
            >
              {actionLoading === action.label ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {action.label}
            </Button>
          ))}
          <Button variant="outline" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric, index) => (
            <Card key={metric.key}>
              <CardContent className="flex items-center gap-3 p-5">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  {index === 0 ? <BarChart3 className="h-5 w-5" /> : index === 1 ? <Activity className="h-5 w-5" /> : index === 2 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{metric.key.replaceAll("_", " ")}</p>
                  <p className="text-2xl font-bold">{String(metric.value)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle>Registros</CardTitle>
            <CardDescription>{filteredRows.length} elementos visibles</CardDescription>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en esta vista"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column.key}>{column.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                        {emptyText}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row, index) => (
                      <TableRow key={String(row.id || row.key || index)}>
                        {columns.map((column) => {
                          const value = row[column.key];
                          if (column.kind === "badge") {
                            return (
                              <TableCell key={column.key}>
                                <Badge variant="outline">{formatValue(value, column.kind)}</Badge>
                              </TableCell>
                            );
                          }
                          if (column.kind === "score") {
                            const score = Number(value || 0);
                            return (
                              <TableCell key={column.key}>
                                <span className={`rounded px-2 py-1 text-xs font-semibold ${scoreTone(score)}`}>
                                  {score}
                                </span>
                              </TableCell>
                            );
                          }
                          return <TableCell key={column.key}>{formatValue(value, column.kind)}</TableCell>;
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
