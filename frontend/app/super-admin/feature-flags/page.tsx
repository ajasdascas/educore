"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function FeatureFlagsPage() {
  return (
    <EnterpriseResourcePage
      title="Feature Flags"
      description="Activacion de funciones por plataforma, institucion, nivel educativo y plan."
      endpoint="/api/v1/super-admin/feature-flags"
      collectionKey="flags"
      columns={[
        { key: "name", label: "Feature" },
        { key: "key", label: "Key" },
        { key: "enabled", label: "Activa" },
        { key: "rollout_percentage", label: "Rollout", kind: "percent" },
        { key: "updated_at", label: "Actualizada", kind: "date" },
      ]}
    />
  );
}
