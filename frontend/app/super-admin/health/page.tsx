"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function HealthPage() {
  return (
    <EnterpriseResourcePage
      title="Health Monitor"
      description="Eventos de salud, severidad, latencia y error rate por modulo."
      endpoint="/api/v1/super-admin/health/modules"
      collectionKey="modules"
      columns={[
        { key: "module_key", label: "Modulo" },
        { key: "tenant_name", label: "Tenant" },
        { key: "status", label: "Estado", kind: "badge" },
        { key: "severity", label: "Severidad", kind: "badge" },
        { key: "error_rate", label: "Error rate", kind: "percent" },
        { key: "latency_ms", label: "Latencia ms" },
        { key: "message", label: "Mensaje" },
        { key: "created_at", label: "Fecha", kind: "date" },
      ]}
      actions={[
        {
          label: "Registrar evento demo",
          endpoint: "/api/v1/super-admin/health/events",
          body: { module_key: "reports", severity: "warning", status: "degraded", message: "Export demo lento", error_rate: 2.5, latency_ms: 680 },
        },
      ]}
    />
  );
}
