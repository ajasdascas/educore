#!/usr/bin/env node
/**
 * QA: Education Level Module Templates
 * Verifies that level-aware module provisioning is correctly implemented.
 */

const fs = require("fs");
const path = require("path");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`);
    failed++;
    failures.push(name);
  }
}

function readFile(relPath) {
  const abs = path.join(__dirname, "..", relPath);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, "utf8");
}

// ─── 1. Migration 017 ────────────────────────────────────────────────────────
console.log("\n1. Migration 017 — level_module_catalog_expansion");

const mig017 = readFile("backend/migrations_mysql/017_level_module_catalog_expansion.sql");
check("Migration 017 exists", mig017 !== null);
if (mig017) {
  const kinderModules = ["daily_logs","meals","naps","diapers","mood","health_checks","incidents","pickup_authorizations","milestones","photos_evidence"];
  const preescolarModules = ["qualitative_assessments","development_areas","observations","activities","behavior_notes","preschool_report_cards"];
  const primariaModules = ["subjects","assignments","exams","classroom","library","extracurriculars","school_store"];

  for (const mod of kinderModules) {
    check(`Migration seeds kinder module: ${mod}`, mig017.includes(`'${mod}'`));
  }
  for (const mod of preescolarModules) {
    check(`Migration seeds preescolar module: ${mod}`, mig017.includes(`'${mod}'`));
  }
  for (const mod of primariaModules) {
    check(`Migration seeds primaria module: ${mod}`, mig017.includes(`'${mod}'`));
  }
  check("Creates submodule_catalog table", mig017.includes("CREATE TABLE IF NOT EXISTS submodule_catalog") || mig017.includes("CREATE TABLE IF NOT EXISTS `submodule_catalog`"));
  check("Creates level_module_templates table", mig017.includes("CREATE TABLE IF NOT EXISTS level_module_templates") || mig017.includes("CREATE TABLE IF NOT EXISTS `level_module_templates`"));
  check("Seeds KINDER level templates", mig017.includes("KINDER") || mig017.includes("kinder"));
  check("Seeds PREESCOLAR level templates", mig017.includes("PREESCOLAR") || mig017.includes("preescolar"));
  check("Seeds PRIMARIA level templates", mig017.includes("PRIMARIA") || mig017.includes("primaria"));
  check("Kinder has NO formal exams", !mig017.includes("'KINDER', 'exams'") && !mig017.includes("\"KINDER\", \"exams\""));
  check("Preescolar has campos formativos (qualitative_assessments)", mig017.includes("qualitative_assessments"));
  check("Primaria has exams module", mig017.includes("'exams'"));
  check("Primaria has subjects module", mig017.includes("'subjects'"));
  check("Uses ON DUPLICATE KEY UPDATE (idempotent inserts)", mig017.includes("ON DUPLICATE KEY UPDATE"));
}

// ─── 2. Backend — modulesByEducationLevel ────────────────────────────────────
console.log("\n2. Backend — modulesByEducationLevel in super_admin handler");

const saHandler = readFile("backend/internal/modules/super_admin/handler.go");
check("super_admin/handler.go exists", saHandler !== null);
if (saHandler) {
  check("Has modulesByEducationLevel map", saHandler.includes("modulesByEducationLevel"));
  check("Has kinder key", saHandler.includes('"kinder"'));
  check("Has preescolar key", saHandler.includes('"preescolar"'));
  check("Has primaria key", saHandler.includes('"primaria"'));
  check("Kinder includes daily_logs", saHandler.includes('"daily_logs"'));
  check("Kinder includes meals", saHandler.includes('"meals"'));
  check("Kinder includes pickup_authorizations", saHandler.includes('"pickup_authorizations"'));
  check("Preescolar includes qualitative_assessments", saHandler.includes('"qualitative_assessments"'));
  check("Primaria includes exams", saHandler.includes('"exams"'));
  check("Primaria includes subjects", saHandler.includes('"subjects"'));
  check("Has GET /education-levels route", saHandler.includes("GetEducationLevels") || saHandler.includes("/education-levels"));
  check("Has POST /schools/:id/apply-module-template route", saHandler.includes("ApplyModuleTemplate") || saHandler.includes("apply-module-template"));
  check("Seeds school_levels during CreateSchool", saHandler.includes("school_levels"));
  check("Seeds school_periods during CreateSchool", saHandler.includes("school_periods"));
}

// ─── 3. Backend — /modules endpoints for role portals ────────────────────────
console.log("\n3. Backend — /modules endpoints for teacher/student/parent");

const teacherHandler = readFile("backend/internal/modules/teacher/handler.go");
check("teacher/handler.go exists", teacherHandler !== null);
if (teacherHandler) {
  check("Teacher has GET /modules route", teacherHandler.includes('"/modules"') || teacherHandler.includes("GetEnabledModules"));
  check("Teacher GetEnabledModules uses tenant_id", teacherHandler.includes("tenant_id"));
}

const studentHandler = readFile("backend/internal/modules/student/handler.go");
check("student/handler.go exists", studentHandler !== null);
if (studentHandler) {
  check("Student has GET /modules route", studentHandler.includes('"/modules"') || studentHandler.includes("GetEnabledModules"));
  check("Student GetEnabledModules uses tenant_id", studentHandler.includes("tenant_id"));
}

const parentHandler = readFile("backend/internal/modules/parent/handler.go");
check("parent/handler.go exists", parentHandler !== null);
if (parentHandler) {
  check("Parent has GET /modules route", parentHandler.includes('"/modules"') || parentHandler.includes("GetEnabledModules"));
  check("Parent GetEnabledModules uses tenant_id", parentHandler.includes("tenant_id"));
}

// ─── 4. Backend — GetEnabledModules in repositories ─────────────────────────
console.log("\n4. Backend — GetEnabledModules in repositories");

const teacherRepo = readFile("backend/internal/modules/teacher/repository.go");
check("teacher/repository.go exists", teacherRepo !== null);
if (teacherRepo) {
  check("Teacher repo has GetEnabledModules", teacherRepo.includes("GetEnabledModules"));
  check("Teacher repo queries modules_catalog", teacherRepo.includes("modules_catalog"));
}

const studentRepo = readFile("backend/internal/modules/student/repository.go");
check("student/repository.go exists", studentRepo !== null);
if (studentRepo) {
  check("Student repo has GetEnabledModules", studentRepo.includes("GetEnabledModules"));
  check("Student repo queries modules_catalog", studentRepo.includes("modules_catalog") || studentRepo.includes("tenant_modules"));
}

const parentRepo = readFile("backend/internal/modules/parent/repository.go");
check("parent/repository.go exists", parentRepo !== null);
if (parentRepo) {
  check("Parent repo has GetEnabledModules", parentRepo.includes("GetEnabledModules"));
}

// ─── 5. Frontend — dynamic sidebar filtering ─────────────────────────────────
console.log("\n5. Frontend — dynamic sidebar module filtering");

const teacherLayout = readFile("frontend/app/teacher/layout.tsx");
check("teacher/layout.tsx exists", teacherLayout !== null);
if (teacherLayout) {
  check("Teacher layout imports authFetch", teacherLayout.includes("authFetch"));
  check("Teacher layout has enabledModuleKeys state", teacherLayout.includes("enabledModuleKeys"));
  check("Teacher layout fetches /api/v1/teacher/modules", teacherLayout.includes("/api/v1/teacher/modules"));
  check("Teacher layout filters navItems by moduleKey", teacherLayout.includes("moduleKey"));
  check("Teacher classes → academic_core", teacherLayout.includes("academic_core"));
  check("Teacher grades → grading", teacherLayout.includes('"grading"'));
  check("Teacher attendance → attendance", teacherLayout.includes('"attendance"'));
  check("Teacher schedule → schedules", teacherLayout.includes('"schedules"'));
  check("Teacher messages → communications", teacherLayout.includes('"communications"'));
}

const studentLayout = readFile("frontend/app/student/layout.tsx");
check("student/layout.tsx exists", studentLayout !== null);
if (studentLayout) {
  check("Student layout imports authFetch", studentLayout.includes("authFetch"));
  check("Student layout has enabledModuleKeys state", studentLayout.includes("enabledModuleKeys"));
  check("Student layout fetches /api/v1/student/modules", studentLayout.includes("/api/v1/student/modules"));
  check("Student layout filters navItems by moduleKey", studentLayout.includes("moduleKey"));
  check("Student grades → grading", studentLayout.includes('"grading"'));
  check("Student assignments → assignments", studentLayout.includes('"assignments"'));
}

const parentLayout = readFile("frontend/app/parent/layout.tsx");
check("parent/layout.tsx exists", parentLayout !== null);
if (parentLayout) {
  check("Parent layout imports authFetch", parentLayout.includes("authFetch"));
  check("Parent layout has enabledModuleKeys state", parentLayout.includes("enabledModuleKeys"));
  check("Parent layout fetches /api/v1/parent/modules", parentLayout.includes("/api/v1/parent/modules"));
  check("Parent layout filters navItems by moduleKey", parentLayout.includes("moduleKey"));
  check("Parent grades → grading", parentLayout.includes('"grading"'));
  check("Parent attendance → attendance", parentLayout.includes('"attendance"'));
  check("Parent messages → communications", parentLayout.includes('"communications"'));
  check("Parent documents → documents", parentLayout.includes('"documents"'));
  check("Parent payments → payments", parentLayout.includes('"payments"'));
}

// ─── 6. Backfill script ───────────────────────────────────────────────────────
console.log("\n6. Backfill script for existing schools");

const backfill = readFile("scripts/backfill-school-module-templates.js");
check("backfill-school-module-templates.js exists", backfill !== null);
if (backfill) {
  check("Backfill queries existing schools", backfill.includes("schools") || backfill.includes("tenants"));
  check("Backfill applies module templates per level", backfill.includes("modulesByEducationLevel") || backfill.includes("level") || backfill.includes("modules"));
}

// ─── 7. Docs ──────────────────────────────────────────────────────────────────
console.log("\n7. Documentation");

const eduLevelDoc = readFile("docs/EDUCATION_LEVEL_MODULES.md");
check("docs/EDUCATION_LEVEL_MODULES.md exists", eduLevelDoc !== null);
if (eduLevelDoc) {
  check("Doc covers KINDER level", eduLevelDoc.toLowerCase().includes("kinder"));
  check("Doc covers PREESCOLAR level", eduLevelDoc.toLowerCase().includes("preescolar"));
  check("Doc covers PRIMARIA level", eduLevelDoc.toLowerCase().includes("primaria"));
  check("Doc mentions submodule_catalog", eduLevelDoc.includes("submodule_catalog") || eduLevelDoc.includes("submódulos") || eduLevelDoc.includes("submodulos"));
  check("Doc mentions level_module_templates", eduLevelDoc.includes("level_module_templates") || eduLevelDoc.includes("templates"));
}

const gapMatrix = readFile("docs/FEATURE_GAP_MATRIX_GLOBAL.md");
check("docs/FEATURE_GAP_MATRIX_GLOBAL.md exists", gapMatrix !== null);

const roleSpec = readFile("docs/ROLE_PORTALS_SPEC.md");
check("docs/ROLE_PORTALS_SPEC.md exists", roleSpec !== null);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`Education Level Modules QA: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log("\nFailed checks:");
  failures.forEach((f) => console.log(`  • ${f}`));
}
console.log("═".repeat(60) + "\n");
process.exit(failed > 0 ? 1 : 0);
