"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function VersionPage() {
  return (
    <EnterpriseResourcePage
      title="Versioning"
      description="Version actual, changelog y eventos protegidos de deploy o rollback."
      endpoint="/api/v1/super-admin/version"
      collectionKey="versions"
      columns={[
        { key: "version", label: "Version" },
        { key: "status", label: "Estado", kind: "badge" },
        { key: "changelog", label: "Changelog" },
        { key: "deployed_at", label: "Deploy", kind: "date" },
      ]}
      actions={[
        {
          label: "Registrar deploy",
          endpoint: "/api/v1/super-admin/version/deploy",
          body: { confirmation_text: "DEPLOY" },
        },
      ]}
    />
  );
}
