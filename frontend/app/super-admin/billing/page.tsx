"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function BillingPage() {
  return (
    <EnterpriseResourcePage
      title="Billing"
      description="Planes, suscripciones, invoices y pagos manuales para operacion SaaS interna."
      endpoint="/api/v1/super-admin/billing/subscriptions"
      collectionKey="subscriptions"
      columns={[
        { key: "tenant_name", label: "Institucion" },
        { key: "plan_id", label: "Plan" },
        { key: "status", label: "Estado", kind: "badge" },
        { key: "billing_cycle", label: "Ciclo" },
        { key: "price_monthly", label: "Mensualidad", kind: "money" },
        { key: "discount_percent", label: "Descuento", kind: "percent" },
        { key: "current_period_end", label: "Renovacion", kind: "date" },
      ]}
      actions={[
        {
          label: "Registrar pago demo",
          endpoint: "/api/v1/super-admin/billing/payments/manual",
          body: { tenant_id: "school-don-bosco", amount: 1899, method: "transfer", reference: "DEMO" },
        },
      ]}
    />
  );
}
