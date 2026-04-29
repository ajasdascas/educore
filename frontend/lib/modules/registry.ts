import { authFetch } from "@/lib/auth";

export type EducationLevel =
  | "kinder"
  | "primaria"
  | "secundaria_general"
  | "secundaria_tecnica"
  | "prepa_general"
  | "prepa_tecnica"
  | "universidad";

export type ModuleLayer = "core" | "level";

export type ModuleKey =
  | "academic_core"
  | "users"
  | "students"
  | "groups"
  | "schedules"
  | "attendance"
  | "grades"
  | "reports"
  | "communication"
  | "communications"
  | "parent_portal"
  | "teacher_portal"
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
  { key: "academic_core", name: "Academico Core", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "users", name: "Usuarios", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "students", name: "Alumnos", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "groups", name: "Grupos", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "schedules", name: "Horarios", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "attendance", name: "Asistencias", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "grades", name: "Calificaciones", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "reports", name: "Reportes", layer: "core", is_core: true, is_required: true, enabled: true },
  { key: "communications", name: "Comunicaciones", layer: "core", is_core: true, is_required: true, enabled: true },
];

export const MODULE_ALIASES: Record<string, string[]> = {
  users: ["users", "students"],
  students: ["students", "users"],
  groups: ["groups", "academic_core"],
  schedules: ["schedules", "academic_core"],
  attendance: ["attendance", "academic_core"],
  grades: ["grades", "academic_core"],
  reports: ["reports"],
  communications: ["communications", "communication"],
  communication: ["communication", "communications"],
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
  return modules.length > 0 ? modules : CORE_MODULES;
}
