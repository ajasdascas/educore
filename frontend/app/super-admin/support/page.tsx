"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function SupportPage() {
  return (
    <EnterpriseResourcePage
      title="Soporte"
      description="Tickets internos, escalaciones y tiempos de respuesta por institucion."
      endpoint="/api/v1/super-admin/support/tickets"
      collectionKey="tickets"
      columns={[
        { key: "title", label: "Ticket" },
        { key: "tenant_name", label: "Institucion" },
        { key: "status", label: "Estado", kind: "badge" },
        { key: "priority", label: "Prioridad", kind: "badge" },
        { key: "module_key", label: "Modulo" },
        { key: "created_at", label: "Creado", kind: "date" },
        { key: "resolved_at", label: "Resuelto", kind: "date" },
      ]}
      actions={[
        {
          label: "Crear ticket demo",
          endpoint: "/api/v1/super-admin/support/tickets",
          body: { title: "Revision operativa demo", description: "Ticket interno creado desde SuperAdmin.", priority: "medium", status: "open", module_key: "school-admin" },
        },
      ]}
    />
  );
}
