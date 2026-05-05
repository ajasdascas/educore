"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function StoragePage() {
  return (
    <EnterpriseResourcePage
      title="Storage"
      description="Uso de almacenamiento por institucion, limites y acciones de archivado."
      endpoint="/api/v1/super-admin/storage/usage"
      collectionKey="usage"
      columns={[
        { key: "tenant_name", label: "Institucion" },
        { key: "used_mb", label: "Usado MB" },
        { key: "storage_limit_mb", label: "Limite MB" },
        { key: "file_count", label: "Archivos" },
      ]}
      actions={[
        {
          label: "Solicitar archivado",
          endpoint: "/api/v1/super-admin/storage/archive",
          body: { confirmation_text: "ARCHIVE" },
          confirmMessage: "Se registrara una solicitud de archivado. No borra archivos automaticamente.",
        },
      ]}
    />
  );
}
