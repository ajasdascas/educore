"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Download, FileText, Plus, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Payment = {
  id: string;
  student_id: string;
  student_name: string;
  student_code: string;
  group_name: string;
  concept: string;
  description: string;
  amount: number;
  currency: string;
  due_date: string;
  paid_at?: string;
  payment_method: string;
  receipt_number: string;
  receipt_url: string;
  status: "pending" | "paid" | "overdue" | "cancelled" | "partial";
  notes: string;
};

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  enrollment_id: string;
  group_name: string;
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  overdue: "Vencido",
  cancelled: "Cancelado",
  partial: "Parcial",
};

const conceptOptions = [
  "Colegiatura",
  "Inscripcion",
  "Reinscripcion",
  "Uniformes",
  "Comida",
  "Transporte",
  "Talleres",
  "Gafetes",
  "Documentos",
  "Otros",
];

export default function SchoolAdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<any>({ currency: "MXN" });
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ student_id: "", status: "all", concept: "", from: "", to: "" });
  const [charge, setCharge] = useState({ student_id: "", concept: "Colegiatura", description: "", amount: "", due_date: "" });

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    const [paymentRes, studentRes] = await Promise.all([
      authFetch(`/api/v1/school-admin/payments${params.toString() ? `?${params}` : ""}`),
      authFetch("/api/v1/school-admin/academic/students?per_page=100"),
    ]);
    if (paymentRes.success) {
      setPayments(paymentRes.data?.payments || []);
      setSummary(paymentRes.data?.summary || { currency: "MXN" });
    }
    if (studentRes.success) {
      setStudents(Array.isArray(studentRes.data) ? studentRes.data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredStudents = useMemo(() => students.filter((student) => student.id), [students]);

  const createCharge = async () => {
    if (!charge.student_id || !charge.concept || !charge.amount || !charge.due_date) return;
    setSaving(true);
    const res = await authFetch("/api/v1/school-admin/payments/charges", {
      method: "POST",
      body: JSON.stringify({ ...charge, amount: Number(charge.amount) }),
    });
    setSaving(false);
    if (res.success) {
      setCharge({ student_id: "", concept: "Colegiatura", description: "", amount: "", due_date: "" });
      await loadData();
    }
  };

  const recordPayment = async (payment: Payment, method: "efectivo" | "transferencia") => {
    setSaving(true);
    await authFetch(`/api/v1/school-admin/payments/${payment.id}/record-payment`, {
      method: "POST",
      body: JSON.stringify({ method, amount: Number(payment.amount), notes: `Pago registrado por ${method}` }),
    });
    setSaving(false);
    await loadData();
  };

  const downloadReceipt = async (payment: Payment) => {
    const res = await authFetch(`/api/v1/school-admin/payments/${payment.id}/receipt`);
    const receipt = res.success ? res.data : payment;
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${payment.receipt_number || payment.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = [
      ["Alumno", "Codigo", "Grupo", "Concepto", "Monto", "Estado", "Vence", "Metodo", "Recibo"],
      ...payments.map((payment) => [
        payment.student_name,
        payment.student_code,
        payment.group_name,
        payment.concept,
        `${payment.currency} ${payment.amount}`,
        statusLabels[payment.status] || payment.status,
        payment.due_date,
        payment.payment_method,
        payment.receipt_number,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "educore-pagos-alumnos.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">Pagos y cobranza</h1>
          <p className="text-sm text-muted-foreground">Historial de pagos, adeudos y recibos por alumno.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={payments.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Falta pagar" value={`${summary.currency || "MXN"} $${Number(summary.total_due || 0).toLocaleString("es-MX")}`} />
        <Metric title="Ya pagado" value={`${summary.currency || "MXN"} $${Number(summary.total_paid || 0).toLocaleString("es-MX")}`} />
        <Metric title="Vencido" value={`${summary.currency || "MXN"} $${Number(summary.total_overdue || 0).toLocaleString("es-MX")}`} />
        <Metric title="Pendientes" value={Number(summary.pending_count || 0) + Number(summary.overdue_count || 0) + Number(summary.partial_count || 0)} />
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-5 w-5" />
            Generar cargo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm" value={charge.student_id} onChange={(event) => setCharge({ ...charge, student_id: event.target.value })}>
              <option value="">Alumno</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
              ))}
            </select>
            <select className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm" value={charge.concept} onChange={(event) => setCharge({ ...charge, concept: event.target.value })}>
              {conceptOptions.map((concept) => <option key={concept} value={concept}>{concept}</option>)}
            </select>
            <Input placeholder="Monto" type="number" min="0" value={charge.amount} onChange={(event) => setCharge({ ...charge, amount: event.target.value })} />
            <Input type="date" value={charge.due_date} onChange={(event) => setCharge({ ...charge, due_date: event.target.value })} />
            <Button onClick={createCharge} disabled={saving || !charge.student_id || !charge.amount || !charge.due_date}>Crear cargo</Button>
          </div>
          <Input className="mt-3" placeholder="Descripcion o notas del cargo" value={charge.description} onChange={(event) => setCharge({ ...charge, description: event.target.value })} />
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" />
            Estado de cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid min-w-0 gap-3 md:grid-cols-5">
            <select className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm" value={filters.student_id} onChange={(event) => setFilters({ ...filters, student_id: event.target.value })}>
              <option value="">Todos los alumnos</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
              ))}
            </select>
            <select className="h-9 min-w-0 rounded-md border bg-background px-3 text-sm" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="all">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <Input placeholder="Concepto" value={filters.concept} onChange={(event) => setFilters({ ...filters, concept: event.target.value })} />
            <Input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
            <Button variant="outline" onClick={loadData}>Filtrar</Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-3">Alumno</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Vence</th>
                  <th className="p-3">Monto</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Metodo</th>
                  <th className="p-3">Recibo</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t align-top">
                    <td className="p-3">
                      <p className="font-medium">{payment.student_name}</p>
                      <p className="text-xs text-muted-foreground">{payment.student_code || "Sin codigo"} · {payment.group_name || "Sin grupo"}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{payment.concept}</p>
                      <p className="max-w-[220px] truncate text-xs text-muted-foreground">{payment.description}</p>
                    </td>
                    <td className="p-3">{payment.due_date}</td>
                    <td className="p-3 font-medium">{payment.currency} ${Number(payment.amount).toLocaleString("es-MX")}</td>
                    <td className="p-3"><StatusBadge status={payment.status} /></td>
                    <td className="p-3">{payment.payment_method || "N/D"}</td>
                    <td className="p-3">{payment.receipt_number || "N/D"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {payment.status !== "paid" && payment.status !== "cancelled" ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => recordPayment(payment, "efectivo")} disabled={saving}>Efectivo</Button>
                            <Button size="sm" variant="outline" onClick={() => recordPayment(payment, "transferencia")} disabled={saving}>Transferencia</Button>
                          </>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => downloadReceipt(payment)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && payments.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No hay pagos con estos filtros.</td></tr>
                ) : null}
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Cargando pagos...</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="truncate text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Payment["status"] }) {
  const variant = status === "paid" ? "secondary" : status === "overdue" ? "destructive" : "outline";
  return <Badge variant={variant}>{statusLabels[status] || status}</Badge>;
}
