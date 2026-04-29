"use client";

import { EnterpriseResourcePage } from "@/components/super-admin/EnterpriseResourcePage";

export default function AnalyticsPage() {
  return (
    <EnterpriseResourcePage
      title="Analytics"
      description="Usage scoring, churn risk, crecimiento y actividad agregada de EduCore."
      endpoint="/api/v1/super-admin/analytics/churn-risk"
      collectionKey="institutions"
      columns={[
        { key: "name", label: "Institucion" },
        { key: "status", label: "Estado", kind: "badge" },
        { key: "plan", label: "Plan" },
        { key: "last_activity_at", label: "Ultima actividad", kind: "date" },
        { key: "active_modules", label: "Modulos" },
        { key: "open_tickets", label: "Tickets" },
        { key: "risk_score", label: "Riesgo", kind: "score" },
      ]}
    />
  );
}
