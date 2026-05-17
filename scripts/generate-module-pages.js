#!/usr/bin/env node
/**
 * generate-module-pages.js
 *
 * Creates all missing page.tsx files for educational modules.
 * Uses two strategies:
 *   A) Re-export from an existing nested implementation (DRY)
 *   B) Thin wrapper around GeneratedModulePage factory
 *
 * Run from repo root:
 *   node scripts/generate-module-pages.js
 *   node scripts/generate-module-pages.js --dry-run
 */

const fs = require("fs");
const path = require("path");

const FRONTEND = path.join(__dirname, "..", "frontend", "app");
const DRY_RUN = process.argv.includes("--dry-run");

let created = 0;
let skipped = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function write(relPath, content) {
  const abs = path.join(FRONTEND, relPath);
  if (fs.existsSync(abs)) {
    console.log(`  ⬜ SKIP   ${relPath}`);
    skipped++;
    return;
  }
  ensureDir(path.dirname(abs));
  if (!DRY_RUN) fs.writeFileSync(abs, content, "utf8");
  console.log(`  ✅ CREATE ${relPath}${DRY_RUN ? " (dry-run)" : ""}`);
  created++;
}

/** Template A: re-export an existing nested page */
function reexport(targetImport) {
  return `"use client";
// Re-export from the dedicated module implementation.
// eslint-disable-next-line
import Page from "${targetImport}";
export default Page;
`;
}

/** Template B: GeneratedModulePage factory */
function factory(role, level, moduleKey, mode = "manage") {
  return `"use client";
import { GeneratedModulePage } from "@/components/modules/GeneratedModulePage";

export default function Page() {
  return (
    <GeneratedModulePage
      role="${role}"
      level="${level}"
      moduleKey="${moduleKey}"
      mode="${mode}"
    />
  );
}
`;
}

// ─── School-Admin flat routes (sidebar already links here — URGENT 404 fixes) ──

console.log("\n── school-admin flat routes ────────────────────────────────────");

// Re-exports from existing kinder sub-pages
write("school-admin/daily-logs/page.tsx",  reexport("@/app/school-admin/kinder/daily-logs/page"));
write("school-admin/meals/page.tsx",        reexport("@/app/school-admin/kinder/meals/page"));
write("school-admin/naps/page.tsx",         reexport("@/app/school-admin/kinder/naps/page"));
write("school-admin/incidents/page.tsx",    reexport("@/app/school-admin/kinder/incidents/page"));

// Re-exports from existing preschool sub-pages
write("school-admin/qualitative/page.tsx",  reexport("@/app/school-admin/preschool/qualitative-assessments/page"));
write("school-admin/observations/page.tsx", reexport("@/app/school-admin/preschool/observations/page"));

// New pages via factory
write("school-admin/health/page.tsx",                    factory("school-admin", "kinder",    "health_checks"));
write("school-admin/pickup/page.tsx",                    factory("school-admin", "kinder",    "pickup_authorizations"));
write("school-admin/milestones/page.tsx",                factory("school-admin", "kinder",    "milestones"));
write("school-admin/photos/page.tsx",                    factory("school-admin", "kinder",    "photos_evidence"));
write("school-admin/development/page.tsx",               factory("school-admin", "preschool", "development_areas"));
write("school-admin/activities/page.tsx",                factory("school-admin", "preschool", "activities"));
write("school-admin/preschool-report-cards/page.tsx",    factory("school-admin", "preschool", "preschool_report_cards"));

// ─── School-Admin kinder sub-pages ─────────────────────────────────────────────

console.log("\n── school-admin/kinder ─────────────────────────────────────────");
write("school-admin/kinder/child-status/page.tsx",            factory("school-admin", "kinder", "child_status"));
write("school-admin/kinder/health-checks/page.tsx",           factory("school-admin", "kinder", "health_checks"));
write("school-admin/kinder/pickup-authorizations/page.tsx",   factory("school-admin", "kinder", "pickup_authorizations"));
write("school-admin/kinder/milestones/page.tsx",              factory("school-admin", "kinder", "milestones"));
write("school-admin/kinder/photos-evidence/page.tsx",         factory("school-admin", "kinder", "photos_evidence"));

// ─── School-Admin preschool sub-pages ──────────────────────────────────────────

console.log("\n── school-admin/preschool ──────────────────────────────────────");
write("school-admin/preschool/development-areas/page.tsx",    factory("school-admin", "preschool", "development_areas"));
write("school-admin/preschool/activities/page.tsx",           factory("school-admin", "preschool", "activities"));
write("school-admin/preschool/behavior-notes/page.tsx",       factory("school-admin", "preschool", "behavior_notes"));
write("school-admin/preschool/report-cards/page.tsx",         factory("school-admin", "preschool", "preschool_report_cards"));
write("school-admin/preschool/socioemotional/page.tsx",       factory("school-admin", "preschool", "socioemotional"));

// ─── School-Admin primary sub-pages ────────────────────────────────────────────

console.log("\n── school-admin/primary ────────────────────────────────────────");
write("school-admin/primary/subjects/page.tsx",       factory("school-admin", "primary", "subjects"));
write("school-admin/primary/assignments/page.tsx",    factory("school-admin", "primary", "assignments"));
write("school-admin/primary/exams/page.tsx",          factory("school-admin", "primary", "exams"));
write("school-admin/primary/discipline/page.tsx",     factory("school-admin", "primary", "discipline"));
write("school-admin/primary/classroom/page.tsx",      factory("school-admin", "primary", "classroom"));
write("school-admin/primary/report-cards/page.tsx",   factory("school-admin", "primary", "primary_report_cards"));
write("school-admin/primary/grades/page.tsx",         factory("school-admin", "primary", "primary_grades"));

// ─── School-Admin services ──────────────────────────────────────────────────────

console.log("\n── school-admin/services ───────────────────────────────────────");
write("school-admin/services/cafeteria/page.tsx",  factory("school-admin", "services", "cafeteria_service"));
write("school-admin/services/transport/page.tsx",  factory("school-admin", "services", "transport_service"));

// ─── Teacher kinder sub-pages ───────────────────────────────────────────────────

console.log("\n── teacher/kinder ──────────────────────────────────────────────");
write("teacher/kinder/child-status/page.tsx",            factory("teacher", "kinder", "child_status", "capture"));
write("teacher/kinder/health-checks/page.tsx",           factory("teacher", "kinder", "health_checks", "capture"));
write("teacher/kinder/pickup-authorizations/page.tsx",   factory("teacher", "kinder", "pickup_authorizations", "capture"));
write("teacher/kinder/milestones/page.tsx",              factory("teacher", "kinder", "milestones", "capture"));
write("teacher/kinder/photos-evidence/page.tsx",         factory("teacher", "kinder", "photos_evidence", "capture"));

// ─── Teacher preschool sub-pages ────────────────────────────────────────────────

console.log("\n── teacher/preschool ───────────────────────────────────────────");
write("teacher/preschool/development-areas/page.tsx",    factory("teacher", "preschool", "development_areas", "capture"));
write("teacher/preschool/activities/page.tsx",           factory("teacher", "preschool", "activities", "capture"));
write("teacher/preschool/behavior-notes/page.tsx",       factory("teacher", "preschool", "behavior_notes", "capture"));
write("teacher/preschool/report-cards/page.tsx",         factory("teacher", "preschool", "preschool_report_cards", "view"));
write("teacher/preschool/socioemotional/page.tsx",       factory("teacher", "preschool", "socioemotional", "capture"));

// ─── Teacher primary sub-pages ──────────────────────────────────────────────────

console.log("\n── teacher/primary ─────────────────────────────────────────────");
write("teacher/primary/subjects/page.tsx",       factory("teacher", "primary", "subjects", "view"));
write("teacher/primary/assignments/page.tsx",    factory("teacher", "primary", "assignments", "capture"));
write("teacher/primary/exams/page.tsx",          factory("teacher", "primary", "exams", "capture"));
write("teacher/primary/discipline/page.tsx",     factory("teacher", "primary", "discipline", "capture"));
write("teacher/primary/classroom/page.tsx",      factory("teacher", "primary", "classroom", "manage"));
write("teacher/primary/report-cards/page.tsx",   factory("teacher", "primary", "primary_report_cards", "view"));
write("teacher/primary/grades/page.tsx",         factory("teacher", "primary", "primary_grades", "capture"));

// ─── Teacher services ────────────────────────────────────────────────────────────

console.log("\n── teacher/services ────────────────────────────────────────────");
write("teacher/services/cafeteria/page.tsx",  factory("teacher", "services", "cafeteria_service", "view"));
write("teacher/services/transport/page.tsx",  factory("teacher", "services", "transport_service", "view"));

// ─── Parent kinder sub-pages (nested, in addition to existing flat routes) ────────

console.log("\n── parent/kinder ───────────────────────────────────────────────");
write("parent/kinder/child-status/page.tsx",           factory("parent", "kinder", "child_status", "read"));
write("parent/kinder/health-checks/page.tsx",          factory("parent", "kinder", "health_checks", "read"));
write("parent/kinder/pickup-authorizations/page.tsx",  factory("parent", "kinder", "pickup_authorizations", "read"));
write("parent/kinder/milestones/page.tsx",             factory("parent", "kinder", "milestones", "read"));
write("parent/kinder/photos-evidence/page.tsx",        factory("parent", "kinder", "photos_evidence", "read"));

// ─── Parent preschool sub-pages ────────────────────────────────────────────────

console.log("\n── parent/preschool ────────────────────────────────────────────");
write("parent/preschool/qualitative-assessments/page.tsx",  factory("parent", "preschool", "qualitative_assessments", "read"));
write("parent/preschool/development-areas/page.tsx",        factory("parent", "preschool", "development_areas", "read"));
write("parent/preschool/observations/page.tsx",             factory("parent", "preschool", "observations", "read"));
write("parent/preschool/activities/page.tsx",               factory("parent", "preschool", "activities", "read"));
write("parent/preschool/behavior-notes/page.tsx",           factory("parent", "preschool", "behavior_notes", "read"));
write("parent/preschool/report-cards/page.tsx",             factory("parent", "preschool", "preschool_report_cards", "read"));
write("parent/preschool/socioemotional/page.tsx",           factory("parent", "preschool", "socioemotional", "read"));
write("parent/preschool/evidence/page.tsx",                 factory("parent", "preschool", "photos_evidence", "read"));

// ─── Parent primary sub-pages ──────────────────────────────────────────────────

console.log("\n── parent/primary ──────────────────────────────────────────────");
write("parent/primary/subjects/page.tsx",       factory("parent", "primary", "subjects", "read"));
write("parent/primary/assignments/page.tsx",    factory("parent", "primary", "assignments", "read"));
write("parent/primary/exams/page.tsx",          factory("parent", "primary", "exams", "read"));
write("parent/primary/report-cards/page.tsx",   factory("parent", "primary", "primary_report_cards", "read"));
write("parent/primary/grades/page.tsx",         factory("parent", "primary", "primary_grades", "read"));

// ─── Parent services ────────────────────────────────────────────────────────────

console.log("\n── parent/services ─────────────────────────────────────────────");
write("parent/services/cafeteria/page.tsx",  factory("parent", "services", "cafeteria_service", "read"));
write("parent/services/transport/page.tsx",  factory("parent", "services", "transport_service", "read"));

// ─── Student preschool sub-pages ───────────────────────────────────────────────

console.log("\n── student/preschool ───────────────────────────────────────────");
write("student/preschool/qualitative-assessments/page.tsx",  factory("student", "preschool", "qualitative_assessments", "read"));
write("student/preschool/activities/page.tsx",               factory("student", "preschool", "activities", "read"));
write("student/preschool/evidence/page.tsx",                 factory("student", "preschool", "photos_evidence", "read"));
write("student/preschool/resources/page.tsx",                factory("student", "preschool", "activities", "read"));

// ─── Student kinder sub-pages ──────────────────────────────────────────────────

console.log("\n── student/kinder ──────────────────────────────────────────────");
write("student/kinder/activities/page.tsx",  factory("student", "kinder", "activities", "read"));
write("student/kinder/resources/page.tsx",   factory("student", "kinder", "activities", "read"));

// ─── Student primary sub-pages ─────────────────────────────────────────────────

console.log("\n── student/primary ─────────────────────────────────────────────");
write("student/primary/subjects/page.tsx",       factory("student", "primary", "subjects", "read"));
write("student/primary/assignments/page.tsx",    factory("student", "primary", "assignments", "read"));
write("student/primary/exams/page.tsx",          factory("student", "primary", "exams", "read"));
write("student/primary/report-cards/page.tsx",   factory("student", "primary", "primary_report_cards", "read"));
write("student/primary/grades/page.tsx",         factory("student", "primary", "primary_grades", "read"));

// ─── Student services ────────────────────────────────────────────────────────────

console.log("\n── student/services ────────────────────────────────────────────");
write("student/services/cafeteria/page.tsx",  factory("student", "services", "cafeteria_service", "read"));
write("student/services/transport/page.tsx",  factory("student", "services", "transport_service", "read"));

// ─── Dynamic fallback routes (for future modules) ──────────────────────────────

console.log("\n── dynamic fallback [moduleKey] ────────────────────────────────");

const dynamicFallback = (role) => `"use client";
import { notFound } from "next/navigation";
import { GeneratedModulePage } from "@/components/modules/GeneratedModulePage";

// Allowed module keys — extend as new modules are implemented
const ALLOWED_MODULES = new Set([
  "health_checks","child_status","pickup_authorizations","milestones","photos_evidence",
  "development_areas","activities","behavior_notes","preschool_report_cards","socioemotional",
  "subjects","assignments","exams","discipline","classroom","primary_report_cards","primary_grades",
  "cafeteria_service","transport_service",
]);

interface Props {
  params: { moduleKey: string };
}

export default function Page({ params }: Props) {
  const { moduleKey } = params;
  if (!ALLOWED_MODULES.has(moduleKey)) return notFound();
  return (
    <GeneratedModulePage
      role="${role}"
      level="modules"
      moduleKey={moduleKey}
      mode="${role === "parent" || role === "student" ? "read" : "manage"}"
    />
  );
}
`;

write("school-admin/modules/[moduleKey]/page.tsx", dynamicFallback("school_admin"));
write("teacher/modules/[moduleKey]/page.tsx",       dynamicFallback("teacher"));
write("parent/modules/[moduleKey]/page.tsx",        dynamicFallback("parent"));
write("student/modules/[moduleKey]/page.tsx",       dynamicFallback("student"));

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`
────────────────────────────────────────────────────
  ✅ Created : ${created}
  ⬜ Skipped : ${skipped} (already exist)
  📁 Total   : ${created + skipped}
  Mode       : ${DRY_RUN ? "DRY-RUN" : "REAL"}
────────────────────────────────────────────────────
`);

if (created > 0 && !DRY_RUN) {
  console.log("Run 'cd frontend && npm run build' to verify no TypeScript errors.\n");
}
