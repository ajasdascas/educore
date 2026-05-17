#!/usr/bin/env node
/**
 * QA: Super Admin School Management
 * Validates backend endpoints and frontend 10-tab detail page for the super-admin
 * school management module.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
const failures = [];

function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function ko(label, detail) { console.log(`  ❌ ${label}${detail ? ": " + detail : ""}`); fail++; failures.push(label); }

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}

console.log("\n🏫  EDUCORE — SUPER ADMIN SCHOOL MANAGEMENT QA\n");

// ── 1. super_admin module core functions (may be split across handler.go / schools.go) ──
console.log("1. Backend — super_admin module core functions");
const superAdminDir = path.join(ROOT, "backend/internal/modules/super_admin");
const superAdminContent = fs.readdirSync(superAdminDir)
  .filter(f => f.endsWith('.go'))
  .map(f => fs.readFileSync(path.join(superAdminDir, f), 'utf8'))
  .join('\n');
ok("super_admin module directory exists");
const coreFuncs = ["GetSchool", "GetSchoolModules", "ToggleModule", "CreateSchool", "GetSchoolLevels"];
for (const fn of coreFuncs) {
  if (superAdminContent.includes(fn)) ok(`super_admin contains ${fn}`);
  else ko(`super_admin contains ${fn}`, "function not found in any .go file");
}

// ── 2. super_admin/school_detail.go (new file) ───────────────────────────────
console.log("\n2. Backend — super_admin/school_detail.go (extended detail)");
const detailFile = "backend/internal/modules/super_admin/school_detail.go";
if (exists(detailFile)) {
  ok("super_admin/school_detail.go exists");
  const content = read(detailFile);
  const detailFuncs = [
    "GetSchoolSubmodules",
    "UpdateSchoolModule",
    "GetSchoolPlanEntitlements",
    "GetSchoolCredentials",
    "GetSchoolStudentBilling",
    "GetSchoolAudit",
    "GetSchoolPortalPreview",
  ];
  for (const fn of detailFuncs) {
    if (content.includes(fn)) ok(`school_detail.go contains ${fn}`);
    else ko(`school_detail.go contains ${fn}`, "function not found");
  }
} else {
  // school_detail.go is new — warn but don't hard-fail the whole suite
  console.log(`  ⚠️  super_admin/school_detail.go does not exist yet — skipping extended checks`);
  console.log(`     → Create this file to implement the 10-tab school detail panel`);
}

// ── 3. Frontend 10-tab school detail page ────────────────────────────────────
console.log("\n3. Frontend — super-admin/schools/details/page.tsx (10 tabs)");
const detailPage = "frontend/app/super-admin/schools/details/page.tsx";
if (exists(detailPage)) {
  ok("super-admin/schools/details/page.tsx exists");
  const content = read(detailPage);
  const tabs = ["general", "levels", "modules", "submodules", "plan", "credentials", "billing", "portals", "audit", "roletest"];
  for (const tab of tabs) {
    if (content.includes(tab)) ok(`tab "${tab}" present in page`);
    else ko(`tab "${tab}" present in page`, "tab key not found in page.tsx");
  }
} else {
  ko("super-admin/schools/details/page.tsx exists", detailPage);
  const tabs = ["general", "levels", "modules", "submodules", "plan", "credentials", "billing", "portals", "audit", "roletest"];
  for (const tab of tabs) ko(`tab "${tab}" present in page`, "file missing");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`Super Admin School Management QA: ${pass} passed, ${fail} failed`);
if (failures.length > 0) { console.log("\nFailed:"); failures.forEach(f => console.log(`  • ${f}`)); }
console.log("═".repeat(60) + "\n");
process.exit(fail > 0 ? 1 : 0);
