import { authFetch } from "@/lib/auth";

export type EducationLevel =
  | "kinder"
  | "primaria"
  | "secundaria_general"
  | "secundaria_tecnica"
  | "prepa_general"
  | "prepa_tecnica"
  | "universidad";

export type ModuleLayer = "core" | "extension" | "internal" | "level";

export type ModuleKey =
  | "auth"
  | "academic_core"
  | "users"
  | "grading"
  | "students"
  | "groups"
  | "schedules"
  | "attendance"
  | "grades"
  | "report_cards"
  | "documents"
  | "reports"
  | "communication"
  | "communications"
  | "payments"
  | "workshops"
  | "qr_access"
  | "credentials"
  | "parent_portal"
  | "teacher_portal"
  | "analytics"
  | "database_admin"
  | string;

export type EnabledModule = {
  key: ModuleKey;
  name: string;
  description?: string;
  layer: ModuleLayer;
  level?: EducationLevel | "";
  is_core: boolean;
  is_required: boolean;
  enabled: boolean;
  source?: "core" | "level" | "plan" | "manual" | string;
  price_monthly_mxn?: number;
};

export const CORE_MODULES: EnabledModule[] = [
  { key: "auth", name: "Auth + Tenant + RBAC", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "academic_core", name: "Academico Core", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "users", name: "Usuarios", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "grading", name: "Grading System", layer: "core", is_core: true, is_required: true, enabled: true },
];

export const DEFAULT_ENABLED_MODULES: EnabledModule[] = [
  ...CORE_MODULES,
  { key: "schedules", name: "Horarios", layer: "extension", is_core: false, is_required: false, enabled: true, source: "demo-default" },
  { key: "attendance", name: "Asistencias", layer: "extension", is_core: false, is_required: false, enabled: true, source: "demo-default" },
  { key: "documents", name: "Expedientes digitales", layer: "extension", is_core: false, is_required: false, enabled: true, source: "demo-default" },
  { key: "report_cards", name: "Boletas", layer: "extension", is_core: false, is_required: false, enabled: true, source: "demo-default" },
  { key: "reports", name: "Reportes", layer: "extension", is_core: false, is_required: false, enabled: true, source: "demo-default" },
  { key: "communications", name: "Comunicaciones", layer: "extension", is_core: false, is_required: false, enabled: true, source: "demo-default" },
  { key: "parent_portal", name: "Portal de Padres", layer: "extension", is_core: false, is_required: false, enabled: true, source: "demo-default" },
  { key: "teacher_portal", name: "Portal de Profesores", layer: "extension", is_core: false, is_required: false, enabled: true, source: "demo-default" },
];

export const MODULE_ALIASES: Record<string, string[]> = {
  auth: ["auth"],
  users: ["users"],
  students: ["users", "students"],
  groups: ["academic_core", "groups"],
  schedules: ["schedules"],
  attendance: ["attendance"],
  grading: ["grading", "grades"],
  grades: ["grading", "grades"],
  report_cards: ["report_cards", "grades"],
  documents: ["documents"],
  reports: ["reports", "analytics"],
  communications: ["communications", "communication"],
  communication: ["communication", "communications"],
  payments: ["payments", "billing"],
  billing: ["payments", "billing"],
  workshops: ["workshops"],
  qr_access: ["qr_access"],
  credentials: ["credentials"],
  parent_portal: ["parent_portal"],
  teacher_portal: ["teacher_portal"],
  analytics: ["analytics", "reports"],
  database_admin: ["database_admin"],
  academic_core: ["academic_core"],
};

export const MODULES_BY_LEVEL: Record<EducationLevel, ModuleKey[]> = {
  kinder: ["academic_core", "users", "students", "groups", "schedules", "attendance", "reports", "communications"],
  primaria: ["academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"],
  secundaria_general: ["academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"],
  secundaria_tecnica: ["academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"],
  prepa_general: ["academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"],
  prepa_tecnica: ["academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"],
  universidad: ["academic_core", "users", "students", "groups", "schedules", "attendance", "grades", "reports", "communications"],
};

export function normalizeEnabledModules(response: any): EnabledModule[] {
  const raw = response?.data?.modules || response?.modules || response?.data || [];
  return Array.isArray(raw) ? raw.filter((item) => item?.enabled !== false && item?.is_active !== false) : [];
}

export function moduleMatches(enabled: EnabledModule[], moduleKey: ModuleKey) {
  const acceptedKeys = MODULE_ALIASES[moduleKey] || [moduleKey];
  return enabled.some((module) => acceptedKeys.includes(module.key) && module.enabled !== false);
}

export async function fetchEnabledModules() {
  const response = await authFetch("/api/v1/school-admin/modules/enabled");
  const modules = normalizeEnabledModules(response);
  return modules.length > 0 ? modules : DEFAULT_ENABLED_MODULES;
}
