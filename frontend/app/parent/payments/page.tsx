"use client";

import { useEffect, useState } from "react";
import { CreditCard, Download } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ParentPaymentsPage() {
  const [data, setData] = useState<any>({ payments: [], summary: {} });

  useEffect(() => {
    authFetch("/api/v1/parent/payments").then((res) => setData(res.success ? res.data : { payments: [], summary: {} }));
  }, []);

  const payments = data.payments || [];
  const summary = data.summary || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
        <p className="text-muted-foreground">Consulta adeudos, pagos registrados y recibos escolares.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric title="Pendiente" value={`${summary.currency || "MXN"} $${Number(summary.total_due || 0).toLocaleString("es-MX")}`} />
        <Metric title="Pagado" value={`${summary.currency || "MXN"} $${Number(summary.total_paid || 0).toLocaleString("es-MX")}`} />
        <Metric title="Vencidos" value={summary.overdue_count || 0} />
        <Metric title="Pendientes" value={summary.pending_count || 0} />
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Estado de cuenta</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="p-3">Concepto</th><th className="p-3">Alumno</th><th className="p-3">Vence</th><th className="p-3">Monto</th><th className="p-3">Estado</th><th className="p-3">Recibo</th></tr></thead>
            <tbody>
              {payments.map((payment: any) => (
                <tr key={payment.id} className="border-t">
                  <td className="p-3 font-medium">{payment.concept}</td>
                  <td className="p-3">{payment.student_name}</td>
                  <td className="p-3">{payment.due_date}</td>
                  <td className="p-3">{payment.currency} ${Number(payment.amount).toLocaleString("es-MX")}</td>
                  <td className="p-3"><Badge variant={payment.status === "paid" ? "secondary" : payment.status === "overdue" ? "destructive" : "outline"}>{payment.status}</Badge></td>
                  <td className="p-3">{payment.receipt_url ? <Button asChild size="sm" variant="outline"><a href={payment.receipt_url}><Download className="h-4 w-4" /></a></Button> : "N/D"}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No hay pagos registrados.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></CardContent></Card>;
}
