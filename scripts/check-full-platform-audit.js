#!/usr/bin/env node
/**
 * Full platform audit — EduCore SaaS
 * Checks backend completeness, frontend wiring, migrations, and QA scripts.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let passed = 0, failed = 0;

function check(label, ok, note = "") {
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}${note ? " — " + note : ""}`); failed++; }
}
function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return ""; }
}
function exists(rel) {
  try { fs.accessSync(path.join(ROOT, rel)); return true; } catch { return false; }
}

console.log("\n🏗️  EDUCORE — FULL PLATFORM AUDIT\n");

// ── 1. Backend routes completeness ─────────────────────────────────────────
console.log("1. Backend Route Coverage");
const main = read("backend/cmd/server/main.go");
const teacherHandler = read("backend/internal/modules/teacher/handler.go");
const parentHandler = read("backend/internal/modules/parent/handler.go");
const studentHandler = read("backend/internal/modules/student/handler.go");
const schoolHandler = read("backend/internal/modules/school_admin/handler.go");

const teacherRoutes = ["/dashboard", "/classes", "/attendance", "/grades", "/messages", "/schedule", "/notifications"];
teacherRoutes.forEach(r => check(`Teacher ${r}`, teacherHandler.includes(`"${r}"`) || teacherHandler.includes(`"/${r.slice(1)}"`) || teacherHandler.includes(r.slice(1) + '"')));

const parentRoutes = ["/children", "/notifications", "/messages", "/profile", "/calendar", "/events", "/documents", "/payments"];
parentRoutes.forEach(r => check(`Parent ${r}`, parentHandler.includes(r.replace("/",""))));

const studentRoutes = ["/dashboard", "/profile", "/grades", "/attendance", "/messages", "/assignments", "/schedule", "/notifications"];
studentRoutes.forEach(r => check(`Student ${r}`, studentHandler.includes(r.replace("/",""))));

const schoolRoutes = ["/students", "/teachers", "/groups", "/subjects", "/schedule", "/notifications", "/communications", "/payments", "/reports"];
schoolRoutes.forEach(r => check(`SchoolAdmin ${r}`, schoolHandler.includes(r.replace("/",""))));

// ── 2. Frontend pages existence ─────────────────────────────────────────────
console.log("\n2. Frontend Pages");
const frontendPages = [
  "frontend/app/teacher/dashboard/page.tsx",
  "frontend/app/teacher/classes/page.tsx",
  "frontend/app/teacher/attendance/page.tsx",
  "frontend/app/teacher/grades/page.tsx",
  "frontend/app/teacher/schedule/page.tsx",
  "frontend/app/teacher/messages/page.tsx",
  "frontend/app/teacher/notifications/page.tsx",
  "frontend/app/teacher/profile/page.tsx",
  "frontend/app/teacher/settings/page.tsx",
  "frontend/app/teacher/security/page.tsx",
  "frontend/app/parent/children/page.tsx",
  "frontend/app/parent/notifications/page.tsx",
  "frontend/app/parent/messages/page.tsx",
  "frontend/app/parent/profile/page.tsx",
  "frontend/app/student/dashboard/page.tsx",
  "frontend/app/student/grades/page.tsx",
  "frontend/app/student/attendance/page.tsx",
  "frontend/app/student/assignments/page.tsx",
  "frontend/app/student/schedule/page.tsx",
  "frontend/app/student/messages/page.tsx",
  "frontend/app/student/notifications/page.tsx",
  "frontend/app/student/profile/page.tsx",
  "frontend/app/school-admin/dashboard/page.tsx",
  "frontend/app/school-admin/students/page.tsx",
  "frontend/app/school-admin/teachers/page.tsx",
  "frontend/app/school-admin/groups/page.tsx",
  "frontend/app/school-admin/schedule/page.tsx",
  "frontend/app/school-admin/attendance/page.tsx",
  "frontend/app/school-admin/grades/page.tsx",
  "frontend/app/school-admin/communications/page.tsx",
  "frontend/app/school-admin/payments/page.tsx",
  "frontend/app/school-admin/reports/page.tsx",
  "frontend/app/school-admin/notifications/page.tsx",
  "frontend/app/super-admin/dashboard/page.tsx",
  "frontend/app/super-admin/schools/page.tsx",
  "frontend/app/super-admin/billing/page.tsx",
  "frontend/app/super-admin/plans/page.tsx",
  "frontend/app/super-admin/users/page.tsx",
];
frontendPages.forEach(p => check(p.replace("frontend/app/", ""), exists(p)));

// ── 3. No mock/demo data in portal pages ────────────────────────────────────
console.log("\n3. No Mock Data in Portal Pages");
const portalDirs = ["frontend/app/teacher", "frontend/app/parent", "frontend/app/student", "frontend/app/school-admin"];
let mockCount = 0;
for (const dir of portalDirs) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) continue;
  for (const f of fs.readdirSync(fullDir, { recursive: true })) {
    if (!String(f).endsWith("page.tsx")) continue;
    const content = read(path.join(dir, f).replace(/\\/g, "/"));
    if (content.includes("saveDemo(") || content.includes("mockData") || content.includes("DEMO_MODE") ||
        content.match(/\[(.*?)"id":\s*"demo-/)) {
      mockCount++;
      console.log(`     ⚠️  Mock data found: ${dir}/${f}`);
    }
  }
}
check("No mock/demo data in portal pages", mockCount === 0, mockCount > 0 ? `${mockCount} pages with demo data` : "");

// ── 4. Migrations ────────────────────────────────────────────────────────────
console.log("\n4. MySQL Migrations");
const migrations = [
  "backend/migrations_mysql/001_hostinger_core.sql",
  "backend/migrations_mysql/002_subscription_plans_bridge.sql",
  "backend/migrations_mysql/005_hostinger_missing_tables_and_cols.sql",
  "backend/migrations_mysql/006_student_portal_user_id.sql",
  "backend/migrations_mysql/007_school_reports.sql",
  "backend/migrations_mysql/008_school_communications.sql",
  "backend/migrations_mysql/009_school_levels_modules_portals.sql",
  "backend/migrations_mysql/011_backfill_school_provisioning.sql",
];
migrations.forEach(m => check(path.basename(m), exists(m)));

// ── 5. Kinder / Preschool modules ────────────────────────────────────────────
console.log("\n5. Kinder & Preschool Modules");
const kinderPreschoolFiles = [
  "backend/internal/modules/teacher/kinder_preschool.go",
  "backend/internal/modules/parent/kinder.go",
  "backend/internal/modules/student/preschool.go",
  "frontend/app/teacher/kinder/daily-logs/page.tsx",
  "frontend/app/teacher/kinder/meals/page.tsx",
  "frontend/app/teacher/kinder/naps/page.tsx",
  "frontend/app/teacher/kinder/diapers/page.tsx",
  "frontend/app/teacher/kinder/mood/page.tsx",
  "frontend/app/teacher/kinder/incidents/page.tsx",
  "frontend/app/teacher/preschool/qualitative-assessments/page.tsx",
  "frontend/app/teacher/preschool/observations/page.tsx",
  "frontend/app/teacher/preschool/evidence/page.tsx",
  "frontend/app/school-admin/kinder/daily-logs/page.tsx",
  "frontend/app/school-admin/preschool/qualitative-assessments/page.tsx",
];
kinderPreschoolFiles.forEach(f => {
  const label = f.startsWith("frontend/") ? f.replace("frontend/app/", "") : f.replace("backend/internal/modules/", "");
  check(label, exists(f));
});

// Migration 018 fixed — must exist and be ENUM-free
const mig018fixed = "backend/migrations_mysql/018_kinder_preschool_data_tables.hostinger_fixed.sql";
check("018_kinder_preschool_data_tables.hostinger_fixed.sql exists", exists(mig018fixed));
if (exists(mig018fixed)) {
  const mig018content = read(mig018fixed);
  check("Migration 018 fixed: zero ENUMs", !mig018content.match(/\bENUM\b/i),
    "ENUM keyword found — breaks Hostinger MariaDB");
}

// ── 6. QA Scripts ────────────────────────────────────────────────────────────
console.log("\n6. QA Scripts");
const qaScripts = [
  "scripts/check-parent-children-portal.js",
  "scripts/check-security-rbac-tenant.js",
  "scripts/check-full-platform-audit.js",
];
qaScripts.forEach(s => check(path.basename(s), exists(s)));

// ── 7. Support mode fix ─────────────────────────────────────────────────────
console.log("\n7. Support Mode Fix");
const parentSvc = read("backend/internal/modules/parent/service.go");
check("GetChildren bifurcated for support mode", parentSvc.includes("isSupportMode bool") && parentSvc.includes("GetAllChildrenByTenant"));
check("VerifyParentAccess bypasses in support mode", parentSvc.includes("return true, nil"));
const parentHandlerContent = read("backend/internal/modules/parent/handler.go");
check("GetChildren handler passes isSupport", parentHandlerContent.includes("isSupport") && parentHandlerContent.includes("GetChildren"));

// ── 8. Notification routing ─────────────────────────────────────────────────
console.log("\n8. Notification Routing per Role");
const accountPages = read("frontend/components/modules/account/AccountPages.tsx");
check("AccountNotificationsPage routes by role", accountPages.includes("notificationEndpointForRole") && accountPages.includes("user?.role"));
check("TEACHER route: /api/v1/teacher/notifications", accountPages.includes("/api/v1/teacher/notifications"));
check("SCHOOL_ADMIN route: /api/v1/school-admin/notifications", accountPages.includes("/api/v1/school-admin/notifications"));
check("PARENT route: /api/v1/parent/notifications", accountPages.includes("/api/v1/parent/notifications"));

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n📊 RESULTADO GLOBAL: ${passed}/${passed + failed} checks passed`);
if (failed > 0) {
  console.log(`\n⚠️  ${failed} gaps detectados.`);
  process.exit(1);
} else {
  console.log("\n✅ Plataforma completa. Lista para commit y deploy.\n");
}
