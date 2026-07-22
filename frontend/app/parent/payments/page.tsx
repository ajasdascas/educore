"use client";

import { useEffect, useState } from "react";
import { CreditCard, Download, ShieldAlert } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

type ParentPayment = {
  id: string;
  student_id: string;
  student_name: string;
  concept: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  currency: string;
  due_date: string;
  status: string;
  payment_method: string;
  receipt_number: string;
};

const money = (value: number, currency = "MXN") => `${currency} $${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ParentPaymentsPage() {
  const [data, setData] = useState<{ payments: ParentPayment[]; summary: Record<string, number | string> }>({ payments: [], summary: {} });
  const [filters, setFilters] = useState({ student_id: "", status: "all", concept: "", from: "", to: "" });
  const { toast } = useToast();

  useEffect(() => {
    authFetch("/api/v1/parent/payments").then((res) => {
      if (!res.success) throw new Error(res.error || res.message || "No se pudo consultar el estado de cuenta.");
      setData(res.data || { payments: [], summary: {} });
    }).catch((error) => toast({ title: "No se pudo cargar cobranza", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" }));
  }, [toast]);

  const payments = data.payments || [];
  const summary = data.summary || {};
  const children = Array.from(new Map(payments.map((payment) => [payment.student_id, payment.student_name])).entries());
  const visiblePayments = payments.filter((payment) => {
    const matchesStudent = !filters.student_id || payment.student_id === filters.student_id;
    const matchesStatus = filters.status === "all" || payment.status === filters.status;
    const matchesConcept = !filters.concept || String(payment.concept || "").toLowerCase().includes(filters.concept.toLowerCase());
    const matchesFrom = !filters.from || String(payment.due_date || "") >= filters.from;
    const matchesTo = !filters.to || String(payment.due_date || "") <= filters.to;
    return matchesStudent && matchesStatus && matchesConcept && matchesFrom && matchesTo;
  });

  const downloadReceipt = async (payment: ParentPayment) => {
    try {
      const response = await authFetch(`/api/v1/parent/payments/${payment.id}/receipt`);
      if (!response.success || !response.data?.transaction_id) throw new Error(response.error || response.message || "Recibo no disponible.");
      const url = URL.createObjectURL(new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${String(response.data.folio).replace(/[^a-zA-Z0-9_-]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Recibo no disponible", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight">Estado de cuenta</h1><p className="text-muted-foreground">Consulta cargos, abonos registrados, saldos y el último recibo de cada cargo.</p></div>
      <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20"><CardContent className="flex gap-3 p-4 text-sm"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-semibold">Pago en línea no disponible</p><p className="text-muted-foreground">La plataforma no solicitará datos de tarjeta hasta que la escuela configure un proveedor verificado. Los pagos que ves aquí fueron registrados manualmente por la escuela.</p></div></CardContent></Card>
      <div className="grid gap-4 sm:grid-cols-4"><Metric title="Saldo pendiente" value={money(Number(summary.total_due || 0), String(summary.currency || "MXN"))} /><Metric title="Abonos registrados" value={money(Number(summary.total_paid || 0), String(summary.currency || "MXN"))} /><Metric title="Vencidos" value={Number(summary.overdue_count || 0)} /><Metric title="Cargos abiertos" value={Number(summary.pending_count || 0)} /></div>
      <Card className="min-w-0 overflow-hidden"><CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Estado de cuenta</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid min-w-0 gap-3 md:grid-cols-5"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.student_id} onChange={(event) => setFilters({ ...filters, student_id: event.target.value })}><option value="">Todos mis hijos</option>{children.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><select className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">Todos los estados</option><option value="pending">Pendiente</option><option value="paid">Pagado</option><option value="overdue">Vencido</option><option value="partial">Parcial</option><option value="cancelled">Cancelado</option></select><Input placeholder="Concepto" value={filters.concept} onChange={(event) => setFilters({ ...filters, concept: event.target.value })} /><Input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /><Input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="text-left text-muted-foreground"><tr><th className="p-3">Concepto</th><th className="p-3">Alumno</th><th className="p-3">Vence</th><th className="p-3">Cargo</th><th className="p-3">Pagado</th><th className="p-3">Saldo</th><th className="p-3">Estado</th><th className="p-3">Recibo</th></tr></thead><tbody>{visiblePayments.map((payment) => <tr key={payment.id} className="border-t"><td className="p-3 font-medium">{payment.concept}</td><td className="p-3">{payment.student_name}</td><td className="p-3">{payment.due_date}</td><td className="p-3">{money(payment.amount, payment.currency)}</td><td className="p-3 text-emerald-700">{money(payment.paid_amount, payment.currency)}</td><td className="p-3 font-semibold">{money(payment.remaining_amount, payment.currency)}</td><td className="p-3"><Badge variant={payment.status === "paid" ? "secondary" : payment.status === "overdue" ? "destructive" : "outline"}>{payment.status}</Badge></td><td className="p-3">{payment.receipt_number ? <Button size="sm" variant="outline" onClick={() => void downloadReceipt(payment)}><Download className="mr-2 h-4 w-4" />JSON</Button> : "Sin abonos"}</td></tr>)}{!visiblePayments.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No hay cargos con estos filtros.</td></tr>}</tbody></table></div></CardContent></Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) { return <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>; }
