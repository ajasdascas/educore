import { notFound } from "next/navigation";
import { GeneratedModulePage } from "@/components/modules/GeneratedModulePage";

// Allowed module keys — extend as new modules are implemented
const ALLOWED_MODULES = [
  "health_checks","child_status","pickup_authorizations","milestones","photos_evidence",
  "development_areas","activities","behavior_notes","preschool_report_cards","socioemotional",
  "subjects","assignments","exams","discipline","classroom","primary_report_cards","primary_grades",
  "cafeteria_service","transport_service",
];

export function generateStaticParams() {
  return ALLOWED_MODULES.map((moduleKey) => ({ moduleKey }));
}

interface Props {
  params: { moduleKey: string };
}

export default function Page({ params }: Props) {
  const { moduleKey } = params;
  if (!ALLOWED_MODULES.includes(moduleKey)) return notFound();
  return (
    <GeneratedModulePage
      role="school_admin"
      level="modules"
      moduleKey={moduleKey}
      mode="manage"
    />
  );
}
