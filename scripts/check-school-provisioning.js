#!/usr/bin/env node

/**
 * Static release contract for creating a school.
 *
 * This intentionally verifies fail-closed provisioning. A new tenant must not
 * receive unfinished level modules merely because they still exist in an old
 * catalog or migration.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let passed = 0;
let failed = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function check(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`PASS ${message}`);
  } else {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

const handler = read("backend/internal/modules/super_admin/handler.go");
for (const marker of [
  "INSERT INTO tenants",
  "tenant_roles",
  "school_years",
  "school_settings",
  "grade_levels",
  "subjects",
  "INSERT INTO groups",
]) {
  check(handler.includes(marker), `school transaction includes ${marker}`);
}

check(
  handler.includes("productionReadyTenantModules") &&
    handler.includes("classifyRequestedAddons") &&
    handler.includes("invalidRequestedAddons"),
  "new schools reject add-ons outside the production allowlist"
);
check(
  handler.includes("schooldomain.NewFromEnv") &&
    handler.includes("recordDomainProvisioningStatus") &&
    handler.includes("domain_provisioning_status"),
  "school creation provisions Hostinger and persists a retryable status"
);
check(
  handler.includes("generateSchoolAdminPassword") &&
    handler.includes('"password_must_change"') &&
    handler.includes("HeaderCacheControl"),
  "initial administrator receives a non-cacheable one-time credential"
);

const unfinishedModules = [
  "daily_logs", "meals", "naps", "diapers", "mood", "health_checks",
  "incidents", "pickup_authorizations", "milestones", "photos_evidence",
  "qualitative_assessments", "development_areas", "observations", "activities",
  "behavior_notes", "preschool_report_cards", "report_cards", "assignments", "exams",
];
const levelMap = handler.slice(
  handler.indexOf("var modulesByEducationLevel"),
  handler.indexOf("var productionReadyTenantModules")
);
for (const moduleKey of unfinishedModules) {
  check(!levelMap.includes(`"${moduleKey}"`), `new schools do not auto-enable unfinished ${moduleKey}`);
}

for (const level of ["babies", "preescolar", "kinder", "primaria"]) {
  check(levelMap.includes(`"${level}"`), `education level ${level} has a safe provisioning contract`);
}

const portalAccess = read("backend/internal/modules/school_admin/portal_access.go");
for (const marker of [
  "CreateTeacherPortalAccess",
  "CreateStudentPortalAccess",
  "CreateParentPortalAccess",
  "generatePortalPassword",
  "password_must_change",
]) {
  check(portalAccess.includes(marker), `portal access enforces ${marker}`);
}
check(
  portalAccess.includes("user_id") && portalAccess.includes("STUDENT"),
  "student portal identity is linked to the student record"
);

const schoolsPage = read("frontend/app/super-admin/schools/page.tsx");
for (const level of ["babies", "preescolar", "kinder", "primaria"]) {
  check(schoolsPage.includes(level), `school form supports ${level}`);
}
check(
  schoolsPage.includes("domain_ready") && schoolsPage.includes("createdCredential"),
  "school form exposes domain state and the one-time credential result"
);

const registry = read("frontend/lib/modules/registry.ts");
check(
  registry.includes('NEXT_PUBLIC_ENABLE_DEMO_MODULES === "true"'),
  "unfinished demo modules require an explicit non-production build flag"
);

for (const migration of [
  "backend/migrations/020_production_module_readiness_gate.sql",
  "backend/migrations/021_global_user_management_rbac.sql",
  "backend/migrations/022_student_portal_identity.sql",
  "backend/migrations/024_password_recovery_hardening.sql",
]) {
  check(fs.existsSync(path.join(ROOT, migration)), `${migration} exists`);
}

console.log(`\nSchool provisioning readiness: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
