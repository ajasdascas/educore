import { authFetch } from "@/lib/auth";

export type EducationLevel =
  | "babies"
  | "daycare"
  | "preescolar"
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
  visible?: boolean;
  supported_now?: boolean;
  educational_level?: EducationLevel | "";
  plan_required?: string;
  dependencies?: ModuleKey[];
  source?: "core" | "level" | "plan" | "manual" | string;
  price_monthly_mxn?: number;
};

export const ACTIVE_EDUCATION_LEVELS: EducationLevel[] = ["babies", "daycare", "preescolar", "kinder", "primaria"];

export const EDUCATION_LEVEL_CATALOG: Record<EducationLevel, {
  label: string;
  enabled: boolean;
  visible: boolean;
  supported_now: boolean;
}> = {
  babies:             { label: "Bebés / Guardería", enabled: true,  visible: true,  supported_now: true  },
  daycare:            { label: "Guardería",          enabled: true,  visible: true,  supported_now: true  },
  preescolar:         { label: "Preescolar",         enabled: true,  visible: true,  supported_now: true  },
  kinder:             { label: "Kinder",             enabled: true,  visible: true,  supported_now: true  },
  primaria:           { label: "Primaria",           enabled: true,  visible: true,  supported_now: true  },
  secundaria_general: { label: "Secundaria",         enabled: false, visible: false, supported_now: false },
  secundaria_tecnica: { label: "Secundaria tecnica", enabled: false, visible: false, supported_now: false },
  prepa_general:      { label: "Preparatoria",       enabled: false, visible: false, supported_now: false },
  prepa_tecnica:      { label: "Preparatoria tecnica", enabled: false, visible: false, supported_now: false },
  universidad:        { label: "Universidad",        enabled: false, visible: false, supported_now: false },
};

export const CORE_MODULES: EnabledModule[] = [
  { key: "auth", name: "Auth + Tenant + RBAC", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "academic_core", name: "Academico Core", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "users", name: "Usuarios", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "grading", name: "Grading System", layer: "core", is_core: true, is_required: true, enabled: true },
];

export const PRODUCTION_READY_TENANT_MODULES = new Set<ModuleKey>([
  "auth",
  "users",
  "academic_core",
  "grading",
  "students",
  "groups",
  "grades",
  "schedules",
  "attendance",
]);

export const SELECTABLE_PRODUCTION_MODULES = new Set<ModuleKey>([
  "schedules",
  "attendance",
]);

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
  babies:             ["students", "groups", "schedules", "attendance"],
  daycare:            ["students", "groups", "schedules", "attendance"],
  preescolar:         ["students", "groups", "schedules", "attendance"],
  kinder:             ["students", "groups", "schedules", "attendance"],
  primaria:           ["students", "groups", "schedules", "attendance", "grades"],
  secundaria_general: ["students", "groups", "schedules", "attendance", "grades"],
  secundaria_tecnica: ["students", "groups", "schedules", "attendance", "grades"],
  prepa_general:      ["students", "groups", "schedules", "attendance", "grades"],
  prepa_tecnica:      ["students", "groups", "schedules", "attendance", "grades"],
  universidad:        ["students", "groups", "schedules", "attendance", "grades"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readModuleArray(response: unknown): unknown[] {
  if (!isRecord(response)) return [];
  if (isRecord(response.data) && Array.isArray(response.data.modules)) {
    return response.data.modules;
  }
  if (Array.isArray(response.modules)) return response.modules;
  return Array.isArray(response.data) ? response.data : [];
}

function normalizeModule(item: unknown): EnabledModule | null {
  if (!isRecord(item) || typeof item.key !== "string") return null;
  if (item.enabled === false || item.is_active === false) return null;
  if (!PRODUCTION_READY_TENANT_MODULES.has(item.key)) return null;

  const layer: ModuleLayer =
    item.layer === "core" || item.layer === "internal" || item.layer === "level"
      ? item.layer
      : "extension";
  const dependencies = Array.isArray(item.dependencies)
    ? item.dependencies.filter((value): value is string => typeof value === "string")
    : undefined;

  return {
    key: item.key,
    name: typeof item.name === "string" ? item.name : item.key,
    description: typeof item.description === "string" ? item.description : undefined,
    layer,
    level: typeof item.level === "string" ? item.level as EducationLevel : undefined,
    is_core: item.is_core === true,
    is_required: item.is_required === true,
    enabled: true,
    visible: typeof item.visible === "boolean" ? item.visible : undefined,
    supported_now: typeof item.supported_now === "boolean" ? item.supported_now : undefined,
    educational_level:
      typeof item.educational_level === "string"
        ? item.educational_level as EducationLevel
        : undefined,
    plan_required: typeof item.plan_required === "string" ? item.plan_required : undefined,
    dependencies,
    source: typeof item.source === "string" ? item.source : undefined,
    price_monthly_mxn:
      typeof item.price_monthly_mxn === "number" ? item.price_monthly_mxn : undefined,
  };
}

export function normalizeEnabledModules(response: unknown): EnabledModule[] {
  return readModuleArray(response)
    .map(normalizeModule)
    .filter((module): module is EnabledModule => module !== null);
}

export function moduleMatches(enabled: EnabledModule[], moduleKey: ModuleKey) {
  const acceptedKeys = MODULE_ALIASES[moduleKey] || [moduleKey];
  return enabled.some((module) => acceptedKeys.includes(module.key) && module.enabled !== false);
}

export async function fetchEnabledModules() {
  const response = await authFetch("/api/v1/school-admin/modules/enabled");
  const modules = normalizeEnabledModules(response);
  if (modules.length > 0) return modules;
  if (process.env.NEXT_PUBLIC_ENABLE_DEMO_MODULES === "true") {
    return DEFAULT_ENABLED_MODULES;
  }
  throw new Error("La escuela no tiene una configuración modular válida.");
}
