"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2, Users, GraduationCap, TrendingUp, DollarSign,
  AlertTriangle, Activity, RefreshCw, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { authFetch } from "@/lib/auth";

/* ─── types ─────────────────────────────────────────── */
interface KPIs {
  total_institutions: number;
  active_institutions: number;
  total_users: number;
  total_students: number;
  active_sessions: number;
  mrr: number;
  arr: number;
  open_tickets: number;
}

interface GrowthPoint { month: string; institutions: number }

interface ChurnRow {
  id: string; name: string; status: string; plan: string;
  last_activity_at: string; active_modules: number;
  open_tickets: number; risk_score: number;
}

interface ModuleRow {
  key: string; name: string; active_tenants: number; events: number; errors: number;
}

/* ─── helpers ────────────────────────────────────────── */
function fmt(n: number, currency?: boolean) {
  if (currency) return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  return n.toLocaleString("es-MX");
}

function riskColor(score: number) {
  if (score >= 75) return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  if (score >= 45) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
}

function riskLabel(score: number) {
  if (score >= 75) return "Alto";
  if (score >= 45) return "Medio";
  return "Bajo";
}

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "active") return "default";
  if (s === "trial") return "secondary";
  return "destructive";
}

function planLabel(p: string) {
  const map: Record<string, string> = { basic: "Básico", professional: "Pro", enterprise: "Enterprise" };
  return map[p] ?? p;
}

/* ─── SVG bar chart ─────────────────────────────────── */
function GrowthChart({ data }: { data: GrowthPoint[] }) {
  if (!data.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sin datos de crecimiento</p>;
  }
  const reversed = [...data].reverse();
  const max = Math.max(...reversed.map(d => d.institutions), 1);
  const W = 600; const H = 140; const BAR = 32; const GAP = 8;
  const totalW = reversed.length * (BAR + GAP) - GAP;
  const offsetX = (W - totalW) / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H + 26}`} className="w-full" style={{ maxHeight: 180 }}>
      {reversed.map((d, i) => {
        const barH = Math.max(4, Math.round((d.institutions / max) * H));
        const x = offsetX + i * (BAR + GAP);
        const y = H - barH;
        return (
          <g key={d.month}>
            <rect x={x} y={y} width={BAR} height={barH} rx={4} fill="hsl(var(--primary))" opacity={0.8} />
            <text x={x + BAR / 2} y={H + 15} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={9}>
              {d.month.slice(5)}
            </text>
            {d.institutions > 0 && (
              <text x={x + BAR / 2} y={y - 4} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={10} fontWeight="600">
                {d.institutions}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ─── KPI card ──────────────────────────────────────── */
function KpiCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="flex items-start gap-3 pt-5 pb-4">
        <div className={`rounded-lg p-2 shrink-0 ${accent ? "bg-primary/15" : "bg-muted"}`}>
          <Icon className={`h-5 w-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── page ──────────────────────────────────────────── */
export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [churn, setChurn] = useState<ChurnRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisRes, growthRes, churnRes, modRes] = await Promise.all([
        authFetch("/api/v1/super-admin/analytics/kpis"),
        authFetch("/api/v1/super-admin/analytics/growth"),
        authFetch("/api/v1/super-admin/analytics/churn-risk"),
        authFetch("/api/v1/super-admin/analytics/module-usage"),
      ]);
      if (kpisRes.success) setKpis(kpisRes.data?.kpis ?? kpisRes.data);
      if (growthRes.success) setGrowth(growthRes.data?.growth ?? []);
      if (churnRes.success) setChurn(churnRes.data?.institutions ?? []);
      if (modRes.success) setModules(modRes.data?.modules ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeRate = kpis && kpis.total_institutions > 0
    ? Math.round((kpis.active_institutions / kpis.total_institutions) * 100)
    : 0;

  const highRisk = churn.filter(r => r.risk_score >= 75).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Métricas agregadas de la plataforma EduCore</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Instituciones" value={fmt(kpis?.total_institutions ?? 0)}
          sub={`${activeRate}% activas`} accent />
        <KpiCard icon={DollarSign} label="MRR" value={fmt(kpis?.mrr ?? 0, true)}
          sub={`ARR ${fmt(kpis?.arr ?? 0, true)}`} accent />
        <KpiCard icon={GraduationCap} label="Alumnos" value={fmt(kpis?.total_students ?? 0)} />
        <KpiCard icon={Users} label="Usuarios" value={fmt(kpis?.total_users ?? 0)}
          sub={`${fmt(kpis?.active_sessions ?? 0)} sesiones activas`} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={TrendingUp} label="Inst. activas" value={fmt(kpis?.active_institutions ?? 0)} />
        <KpiCard icon={DollarSign} label="ARR" value={fmt(kpis?.arr ?? 0, true)} />
        <KpiCard icon={Activity} label="Sesiones activas" value={fmt(kpis?.active_sessions ?? 0)} />
        <KpiCard icon={AlertTriangle} label="Tickets abiertos" value={fmt(kpis?.open_tickets ?? 0)}
          accent={!!(kpis?.open_tickets && kpis.open_tickets > 0)} />
      </div>

      {/* Growth + Churn summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Crecimiento mensual</CardTitle>
            <CardDescription>Nuevas instituciones por mes (últimos 12 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <GrowthChart data={growth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Riesgo de churn</CardTitle>
            <CardDescription>Distribución por nivel de riesgo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            {[
              { label: "Alto riesgo (≥75)", count: churn.filter(r => r.risk_score >= 75).length, cls: "bg-red-500" },
              { label: "Riesgo medio (45–74)", count: churn.filter(r => r.risk_score >= 45 && r.risk_score < 75).length, cls: "bg-yellow-500" },
              { label: "Riesgo bajo (<45)", count: churn.filter(r => r.risk_score < 45).length, cls: "bg-green-500" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.cls}`} />
                  <span className="text-sm text-muted-foreground truncate">{item.label}</span>
                </div>
                <span className="font-semibold text-sm tabular-nums">{item.count}</span>
              </div>
            ))}
            {highRisk > 0 && (
              <div className="mt-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2">
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                  ⚠ {highRisk} institución{highRisk > 1 ? "es" : ""} en riesgo alto
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Churn risk table */}
      {churn.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Instituciones por riesgo de abandono</CardTitle>
            <CardDescription>Ordenadas por menor actividad reciente</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Institución", "Estado", "Plan", "Última actividad", "Módulos", "Tickets", "Riesgo"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {churn.map((row, i) => (
                    <tr key={row.id} className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-2.5 font-medium max-w-[180px] truncate">{row.name}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={statusVariant(row.status)} className="capitalize text-xs">
                          {row.status === "active" ? "Activa" : row.status === "trial" ? "Trial" : row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{planLabel(row.plan)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {new Date(row.last_activity_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{row.active_modules}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{row.open_tickets}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${riskColor(row.risk_score)}`}>
                          {row.risk_score} — {riskLabel(row.risk_score)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module usage */}
      {modules.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Uso de módulos</CardTitle>
            <CardDescription>Actividad en los últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["Módulo", "Clave", "Tenants activos", "Eventos (30d)", "Errores (30d)"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modules.map((m, i) => (
                    <tr key={m.key} className={`border-b last:border-0 transition-colors hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-2.5 font-medium">{m.name}</td>
                      <td className="px-4 py-2.5">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{m.key}</code>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{m.active_tenants}</td>
                      <td className="px-4 py-2.5 tabular-nums">{m.events.toLocaleString("es-MX")}</td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {m.errors > 0
                          ? <span className="text-red-600 dark:text-red-400 font-medium">{m.errors}</span>
                          : <span className="text-green-600 dark:text-green-400">0</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
