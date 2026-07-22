"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, Download, FileText, Plus, RefreshCw, ShieldAlert, WalletCards } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { ModuleGuard } from "@/components/providers/ModuleGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

type Payment = {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  group_name: string;
  concept: string;
  description: string;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  currency: string;
  due_date: string;
  paid_at?: string;
  payment_method: string;
  receipt_number: string;
  status: "pending" | "paid" | "overdue" | "cancelled" | "partial";
  notes: string;
};

type Student = { id: string; first_name: string; last_name: string; enrollment_id: string; group_name: string };
type Settlement = { payment_id: string; amount: string; method: "cash" | "transfer"; reference: string; notes: string; idempotency_key: string };
type PaymentSummary = {
  currency: string;
  total_due: number;
  total_paid: number;
  total_overdue: number;
  overdue_count: number;
  pending_count: number;
  partial_count: number;
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente", paid: "Pagado", overdue: "Vencido", cancelled: "Cancelado", partial: "Parcial",
};
const conceptOptions = ["Colegiatura", "Inscripcion", "Reinscripcion", "Uniformes", "Comida", "Transporte", "Talleres", "Gafetes", "Documentos", "Otros"];
const newIdempotencyKey = () => globalThis.crypto?.randomUUID?.() || `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const money = (value: number, currency = "MXN") => `${currency} $${Number(value || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SchoolAdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    currency: "MXN",
    total_due: 0,
    total_paid: 0,
    total_overdue: 0,
    overdue_count: 0,
    pending_count: 0,
    partial_count: 0,
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ student_id: "", status: "all", concept: "", from: "", to: "" });
  const [charge, setCharge] = useState({ student_id: "", concept: "Colegiatura", description: "", amount: "", due_date: "" });
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value && value !== "all") params.set(key, value); });
      const [paymentRes, studentRes] = await Promise.all([
        authFetch(`/api/v1/school-admin/payments${params.toString() ? `?${params}` : ""}`),
        authFetch("/api/v1/school-admin/academic/students?per_page=100"),
      ]);
      if (!paymentRes.success) throw new Error(paymentRes.error || paymentRes.message || "No se pudo consultar cobranza.");
      setPayments(paymentRes.data?.payments || []);
      setSummary(paymentRes.data?.summary || {
        currency: "MXN",
        total_due: 0,
        total_paid: 0,
        total_overdue: 0,
        overdue_count: 0,
        pending_count: 0,
        partial_count: 0,
      });
      if (studentRes.success) setStudents(Array.isArray(studentRes.data) ? studentRes.data : studentRes.data?.items || []);
    } catch (error) {
      toast({ title: "No se pudo cargar cobranza", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => { void loadData(); }, [loadData]);
  const filteredStudents = useMemo(() => students.filter((student) => student.id), [students]);

  const createCharge = async () => {
    const amount = Number(charge.amount);
    if (!charge.student_id || !charge.concept || !charge.due_date || !Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Completa los datos del cargo", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch("/api/v1/school-admin/payments/charges", {
        method: "POST",
        body: JSON.stringify({ ...charge, amount, currency: "MXN" }),
      });
      if (!res.success) throw new Error(res.error || res.message || "No se pudo crear el cargo.");
      setCharge({ student_id: "", concept: "Colegiatura", description: "", amount: "", due_date: "" });
      toast({ title: "Cargo creado" });
      await loadData();
    } catch (error) {
      toast({ title: "No se pudo crear el cargo", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const beginSettlement = (payment: Payment) => {
    const remaining = Number(payment.remaining_amount ?? Math.max(payment.amount - (payment.paid_amount || 0), 0));
    setSettlement({ payment_id: payment.id, amount: remaining.toFixed(2), method: "cash", reference: "", notes: "", idempotency_key: newIdempotencyKey() });
  };

  const recordPayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!settlement) return;
    const payment = payments.find((item) => item.id === settlement.payment_id);
    const amount = Number(settlement.amount);
    const remaining = Number(payment?.remaining_amount || 0);
    if (!payment || !Number.isFinite(amount) || amount <= 0 || amount > remaining) {
      toast({ title: "Monto invalido", description: `El abono debe ser mayor a cero y no superar ${money(remaining, payment?.currency)}.`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const response = await authFetch(`/api/v1/school-admin/payments/${payment.id}/record-payment`, {
        method: "POST",
        headers: { "Idempotency-Key": settlement.idempotency_key },
        body: JSON.stringify({ ...settlement, amount }),
      });
      if (!response.success) throw new Error(response.error || response.message || "No se pudo registrar el abono.");
      toast({ title: "Abono registrado", description: "El movimiento y su folio quedaron guardados en el ledger." });
      setSettlement(null);
      await loadData();
    } catch (error) {
      toast({ title: "No se pudo registrar el abono", description: error instanceof Error ? error.message : "Puedes reintentar sin duplicar el movimiento.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const downloadReceipt = async (payment: Payment) => {
    try {
      const res = await authFetch(`/api/v1/school-admin/payments/${payment.id}/receipt`);
      if (!res.success || !res.data?.transaction_id) throw new Error(res.error || res.message || "Este cargo todavía no tiene recibo.");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${String(res.data.folio).replace(/[^a-zA-Z0-9_-]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Recibo no disponible", description: error instanceof Error ? error.message : "Intenta de nuevo.", variant: "destructive" });
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Alumno", "Codigo", "Grupo", "Concepto", "Cargo", "Pagado", "Saldo", "Estado", "Vence", "Metodo", "Ultimo folio"],
      ...payments.map((payment) => [payment.student_name, payment.student_code, payment.group_name, payment.concept, payment.amount, payment.paid_amount, payment.remaining_amount, statusLabels[payment.status] || payment.status, payment.due_date, payment.payment_method, payment.receipt_number]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "educore-cobranza.csv"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  };

  return (
    <ModuleGuard moduleKey="payments">
      <div className="min-w-0 space-y-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-3xl font-bold tracking-tight">Cobranza manual</h1><p className="text-sm text-muted-foreground">Cargos, abonos en efectivo o transferencia, saldos y recibos verificables.</p></div>
          <div className="flex gap-2"><Button variant="outline" onClick={loadData} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button><Button variant="outline" onClick={exportCsv} disabled={!payments.length}><Download className="mr-2 h-4 w-4" />CSV</Button></div>
        </div>

        <Card className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20"><CardContent className="flex gap-3 p-4 text-sm"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-semibold">Cobro con tarjeta deshabilitado</p><p className="text-muted-foreground">No se ofrecerá checkout hasta configurar un proveedor, webhook firmado, conciliación e idempotencia del proveedor. El ledger manual sí registra movimientos reales.</p></div></CardContent></Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Saldo pendiente" value={money(summary.total_due, summary.currency)} />
          <Metric title="Abonos registrados" value={money(summary.total_paid, summary.currency)} />
          <Metric title="Saldo vencido" value={money(summary.total_overdue, summary.currency)} />
          <Metric title="Cargos abiertos" value={Number(summary.pending_count || 0) + Number(summary.overdue_count || 0) + Number(summary.partial_count || 0)} />
        </div>

        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plus className="h-5 w-5" />Generar cargo</CardTitle></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={charge.student_id} onChange={(event) => setCharge({ ...charge, student_id: event.target.value })}><option value="">Alumno</option>{filteredStudents.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}</select><select className="h-9 rounded-md border bg-background px-3 text-sm" value={charge.concept} onChange={(event) => setCharge({ ...charge, concept: event.target.value })}>{conceptOptions.map((concept) => <option key={concept}>{concept}</option>)}</select><Input placeholder="Monto MXN" type="number" min="0.01" step="0.01" value={charge.amount} onChange={(event) => setCharge({ ...charge, amount: event.target.value })} /><Input type="date" value={charge.due_date} onChange={(event) => setCharge({ ...charge, due_date: event.target.value })} /><Button onClick={createCharge} disabled={saving}>Crear cargo</Button></div><Input className="mt-3" placeholder="Descripcion del cargo" value={charge.description} onChange={(event) => setCharge({ ...charge, description: event.target.value })} /></CardContent></Card>

        {settlement && <Card className="border-primary/40"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><WalletCards className="h-5 w-5" />Registrar abono</CardTitle><CardDescription>{payments.find((item) => item.id === settlement.payment_id)?.student_name} · la misma clave se conserva si necesitas reintentar.</CardDescription></CardHeader><CardContent><form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={recordPayment}><Input type="number" min="0.01" step="0.01" value={settlement.amount} onChange={(event) => setSettlement({ ...settlement, amount: event.target.value })} /><select className="h-9 rounded-md border bg-background px-3 text-sm" value={settlement.method} onChange={(event) => setSettlement({ ...settlement, method: event.target.value as Settlement["method"] })}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option></select><Input placeholder="Referencia (opcional)" value={settlement.reference} onChange={(event) => setSettlement({ ...settlement, reference: event.target.value })} /><Input placeholder="Notas (opcional)" value={settlement.notes} onChange={(event) => setSettlement({ ...settlement, notes: event.target.value })} /><div className="flex gap-2"><Button type="submit" disabled={saving}>Confirmar</Button><Button type="button" variant="outline" onClick={() => setSettlement(null)}>Cancelar</Button></div></form></CardContent></Card>}

        <Card className="overflow-hidden"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-5 w-5" />Estado de cuenta</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-5"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.student_id} onChange={(event) => setFilters({ ...filters, student_id: event.target.value })}><option value="">Todos los alumnos</option>{filteredStudents.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}</select><select className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Input placeholder="Concepto" value={filters.concept} onChange={(event) => setFilters({ ...filters, concept: event.target.value })} /><Input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /><Button variant="outline" onClick={loadData}>Filtrar</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-sm"><thead className="text-left text-muted-foreground"><tr><th className="p-3">Alumno</th><th className="p-3">Concepto</th><th className="p-3">Vence</th><th className="p-3">Cargo</th><th className="p-3">Pagado</th><th className="p-3">Saldo</th><th className="p-3">Estado</th><th className="p-3">Ultimo folio</th><th className="p-3">Acciones</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-t align-top"><td className="p-3"><p className="font-medium">{payment.student_name}</p><p className="text-xs text-muted-foreground">{payment.student_code || "Sin codigo"} · {payment.group_name || "Sin grupo"}</p></td><td className="p-3"><p className="font-medium">{payment.concept}</p><p className="max-w-[220px] truncate text-xs text-muted-foreground">{payment.description}</p></td><td className="p-3">{payment.due_date}</td><td className="p-3">{money(payment.amount, payment.currency)}</td><td className="p-3 text-emerald-700">{money(payment.paid_amount, payment.currency)}</td><td className="p-3 font-semibold">{money(payment.remaining_amount, payment.currency)}</td><td className="p-3"><StatusBadge status={payment.status} /></td><td className="p-3">{payment.receipt_number || "Sin abonos"}</td><td className="p-3"><div className="flex gap-2">{payment.status !== "paid" && payment.status !== "cancelled" && <Button size="sm" variant="outline" onClick={() => beginSettlement(payment)}>Registrar abono</Button>}<Button size="sm" variant="ghost" title="Descargar ultimo recibo JSON" disabled={!payment.receipt_number} onClick={() => void downloadReceipt(payment)}><FileText className="h-4 w-4" /></Button></div></td></tr>)}{!loading && !payments.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No hay cargos con estos filtros.</td></tr>}{loading && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Cargando cobranza...</td></tr>}</tbody></table></div></CardContent></Card>
      </div>
    </ModuleGuard>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) { return <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{title}</p><p className="truncate text-2xl font-bold">{value}</p></CardContent></Card>; }
function StatusBadge({ status }: { status: Payment["status"] }) { const variant = status === "paid" ? "secondary" : status === "overdue" ? "destructive" : "outline"; return <Badge variant={variant}>{statusLabels[status] || status}</Badge>; }
