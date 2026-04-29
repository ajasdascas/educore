"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CreditCard, Download, FileSpreadsheet, Loader2, RefreshCw, Send } from "lucide-react";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type Subscription = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  price_monthly: number;
  current_period_end: string;
};

type Invoice = {
  id: string;
  tenant_id?: string;
  tenant_name: string;
  folio?: string;
  status: string;
  total: number;
  due_date: string;
  paid_at?: string | null;
  created_at: string;
};

type MonthlyReport = {
  month: string;
  invoices: number;
  total: number;
  paid: number;
  pending: number;
};

function money(value: number) {
  return Number(value || 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function dateLabel(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function exportBillingWorkbook(subscriptions: Subscription[], invoices: Invoice[], reports: MonthlyReport[]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(subscriptions), "subscriptions");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(invoices), "invoices");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reports), "monthly_report");
  XLSX.writeFile(workbook, "educore-billing-report.xlsx");
}

export default function BillingPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const totals = useMemo(() => {
    const pending = invoices.filter((invoice) => invoice.status !== "paid").reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const paid = invoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const mrr = subscriptions.filter((sub) => sub.status === "active").reduce((sum, sub) => sum + Number(sub.price_monthly || 0), 0);
    return { pending, paid, mrr };
  }, [subscriptions, invoices]);

  const load = async () => {
    setLoading(true);
    try {
      const [subsRes, invoicesRes, reportsRes] = await Promise.all([
        authFetch("/api/v1/super-admin/billing/subscriptions"),
        authFetch("/api/v1/super-admin/billing/invoices"),
        authFetch("/api/v1/super-admin/billing/reports/monthly"),
      ]);
      if (!subsRes.success) throw new Error(subsRes.message || subsRes.error || "No se pudieron cargar suscripciones");
      if (!invoicesRes.success) throw new Error(invoicesRes.message || invoicesRes.error || "No se pudieron cargar invoices");
      setSubscriptions(subsRes.data?.subscriptions || []);
      setInvoices(invoicesRes.data?.invoices || []);
      setReports(reportsRes.success ? reportsRes.data?.reports || [] : []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo cargar cobranza", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runAction = async (key: string, endpoint: string, body: Record<string, unknown> = {}) => {
    setActionLoading(key);
    try {
      const res = await authFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
      if (!res.success) throw new Error(res.message || res.error || "No se pudo completar la accion");
      toast({ title: "Listo", description: res.message || "Accion completada." });
      await load();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "No se pudo completar la accion", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const firstSubscription = subscriptions[0];
  const firstPendingInvoice = invoices.find((invoice) => invoice.status !== "paid");

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Cobranza</h1>
          <p className="text-muted-foreground">Estado financiero por institucion, invoices, pagos, recordatorios y reportes descargables.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={() => exportBillingWorkbook(subscriptions, invoices, reports)}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button
            onClick={() => firstSubscription && runAction("invoice", "/api/v1/super-admin/billing/invoices/generate", {
              tenant_id: firstSubscription.tenant_id,
              total: firstSubscription.price_monthly,
              due_date: "2026-05-05",
              notes: "Invoice mensual generado desde SuperAdmin",
            })}
            disabled={!firstSubscription || actionLoading === "invoice"}
          >
            {actionLoading === "invoice" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Generar invoice
          </Button>
          <Button
            variant="outline"
            onClick={() => runAction("reminders", "/api/v1/super-admin/billing/reminders", { scope: "pending" })}
            disabled={actionLoading === "reminders"}
          >
            {actionLoading === "reminders" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            Enviar recordatorios
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">MRR</p>
              <p className="text-2xl font-bold">{money(totals.mrr)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Cobrado</p>
              <p className="text-2xl font-bold">{money(totals.paid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <Send className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Pendiente</p>
              <p className="text-2xl font-bold">{money(totals.pending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Cargando cobranza
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Instituciones</CardTitle>
              <CardDescription>Suscripcion, renovacion y estado de cobro por escuela.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Institucion</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Mensualidad</TableHead>
                      <TableHead>Renovacion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.tenant_name}</TableCell>
                        <TableCell>{sub.plan_id}</TableCell>
                        <TableCell><Badge variant="outline">{sub.status}</Badge></TableCell>
                        <TableCell>{money(sub.price_monthly)}</TableCell>
                        <TableCell>{dateLabel(sub.current_period_end)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>Historial, pendientes y marcado manual de pago.</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => firstPendingInvoice && runAction("paid", `/api/v1/super-admin/billing/invoices/${firstPendingInvoice.id}/mark-paid`)}
                disabled={!firstPendingInvoice || actionLoading === "paid"}
              >
                {actionLoading === "paid" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Marcar pendiente pagado
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>Institucion</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Vence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.folio || invoice.id}</TableCell>
                        <TableCell className="font-medium">{invoice.tenant_name}</TableCell>
                        <TableCell><Badge variant="outline">{invoice.status}</Badge></TableCell>
                        <TableCell>{money(invoice.total)}</TableCell>
                        <TableCell>{dateLabel(invoice.due_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Reporte mensual</CardTitle>
              <CardDescription>Resumen descargable para control interno y seguimiento de cobranza.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Invoices</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Pagado</TableHead>
                      <TableHead>Pendiente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.month}>
                        <TableCell className="font-medium">{report.month}</TableCell>
                        <TableCell>{report.invoices}</TableCell>
                        <TableCell>{money(report.total)}</TableCell>
                        <TableCell>{money(report.paid)}</TableCell>
                        <TableCell>{money(report.pending)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
