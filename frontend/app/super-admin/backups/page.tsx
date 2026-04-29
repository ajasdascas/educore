"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function BackupsPage() {
  return (
    <EnterpriseResourcePage
      title="Backups"
      description="Historial de respaldos y solicitudes protegidas de restore."
      endpoint="/api/v1/super-admin/backups"
      collectionKey="backups"
      columns={[
        { key: "created_at", label: "Fecha", kind: "date" },
        { key: "tenant_name", label: "Scope" },
        { key: "type", label: "Tipo", kind: "badge" },
        { key: "status", label: "Estado", kind: "badge" },
        { key: "size_mb", label: "Tamano MB" },
        { key: "completed_at", label: "Completado", kind: "date" },
      ]}
      actions={[
        {
          label: "Crear backup demo",
          endpoint: "/api/v1/super-admin/backups",
          body: { type: "full" },
        },
      ]}
    />
  );
}
