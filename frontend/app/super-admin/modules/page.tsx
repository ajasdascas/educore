"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function ModulesPage() {
  return (
    <EnterpriseResourcePage
      title="Modulos"
      description="Catalogo global, estado, version, dependencias y activacion general de la plataforma."
      endpoint="/api/v1/super-admin/modules"
      collectionKey="modules"
      columns={[
        { key: "name", label: "Modulo" },
        { key: "key", label: "Key" },
        { key: "status", label: "Estado", kind: "badge" },
        { key: "version", label: "Version" },
        { key: "required_level", label: "Nivel" },
        { key: "global_enabled", label: "Global" },
        { key: "price_monthly_mxn", label: "Precio", kind: "money" },
      ]}
    />
  );
}
