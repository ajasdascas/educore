"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function AuditPage() {
  return (
    <EnterpriseResourcePage
      title="Logs y Auditoria"
      description="Registro de acciones sensibles, cambios administrativos e impersonation."
      endpoint="/api/v1/super-admin/logs/audit"
      collectionKey="logs"
      columns={[
        { key: "created_at", label: "Fecha", kind: "date" },
        { key: "user", label: "Usuario" },
        { key: "action", label: "Accion", kind: "badge" },
        { key: "resource", label: "Recurso" },
        { key: "severity", label: "Severidad", kind: "badge" },
        { key: "ip_address", label: "IP" },
      ]}
    />
  );
}
