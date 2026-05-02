"use client";

import { useEffect, useState } from "react";
import { CreditCard, Download } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ParentPaymentsPage() {
  const [data, setData] = useState<any>({ payments: [], summary: {} });
  const [filters, setFilters] = useState({ student_id: "", status: "all", concept: "", from: "", to: "" });

  useEffect(() => {
    authFetch("/api/v1/parent/payments").then((res) => setData(res.success ? res.data : { payments: [], summary: {} }));
  }, []);

  const payments = data.payments || [];
  const summary = data.summary || {};
  const children = Array.from(new Map(payments.map((payment: any) => [payment.student_id, payment.student_name])).entries());
  const visiblePayments = payments.filter((payment: any) => {
    const matchesStudent = !filters.student_id || payment.student_id === filters.student_id;
    const matchesStatus = filters.status === "all" || payment.status === filters.status;
    const matchesConcept = !filters.concept || String(payment.concept || "").toLowerCase().includes(filters.concept.toLowerCase());
    const matchesFrom = !filters.from || String(payment.due_date || "") >= filters.from;
    const matchesTo = !filters.to || String(payment.due_date || "") <= filters.to;
    return matchesStudent && matchesStatus && matchesConcept && matchesFrom && matchesTo;
  });

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
        <p className="text-muted-foreground">Consulta adeudos, pagos registrados, vencimientos y recibos escolares por hijo.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric title="Pendiente" value={`${summary.currency || "MXN"} $${Number(summary.total_due || 0).toLocaleString("es-MX")}`} />
        <Metric title="Pagado" value={`${summary.currency || "MXN"} $${Number(summary.total_paid || 0).toLocaleString("es-MX")}`} />
        <Metric title="Vencidos" value={summary.overdue_count || 0} />
        <Metric title="Pendientes" value={summary.pending_count || 0} />
      </div>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Estado de cuenta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid min-w-0 gap-3 md:grid-cols-5">
            <select className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm" value={filters.student_id} onChange={(event) => setFilters({ ...filters, student_id: event.target.value })}>
              <option value="">Todos mis hijos</option>
              {children.map(([id, name]) => <option key={String(id)} value={String(id)}>{String(name)}</option>)}
            </select>
            <select className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
              <option value="overdue">Vencido</option>
              <option value="partial">Parcial</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <Input placeholder="Concepto" value={filters.concept} onChange={(event) => setFilters({ ...filters, concept: event.target.value })} />
            <Input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
            <Input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="p-3">Concepto</th><th className="p-3">Alumno</th><th className="p-3">Vence</th><th className="p-3">Monto</th><th className="p-3">Estado</th><th className="p-3">Metodo</th><th className="p-3">Recibo</th></tr></thead>
            <tbody>
              {visiblePayments.map((payment: any) => (
                <tr key={payment.id} className="border-t">
                  <td className="p-3 font-medium">{payment.concept}</td>
                  <td className="p-3">{payment.student_name}</td>
                  <td className="p-3">{payment.due_date}</td>
                  <td className="p-3">{payment.currency} ${Number(payment.amount).toLocaleString("es-MX")}</td>
                  <td className="p-3"><Badge variant={payment.status === "paid" ? "secondary" : payment.status === "overdue" ? "destructive" : "outline"}>{payment.status}</Badge></td>
                  <td className="p-3">{payment.payment_method || "N/D"}</td>
                  <td className="p-3">{payment.receipt_url ? <Button asChild size="sm" variant="outline"><a href={payment.receipt_url}><Download className="h-4 w-4" /></a></Button> : "N/D"}</td>
                </tr>
              ))}
              {visiblePayments.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No hay pagos con estos filtros.</td></tr>}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>;
}
