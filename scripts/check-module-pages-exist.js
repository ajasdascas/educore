#!/usr/bin/env node
/**
 * check-module-pages-exist.js
 *
 * Audits that every route declared in MODULE_ROLE_ROUTES has a physical page.tsx file
 * and that no active page is missing.
 *
 * Run from repo root:
 *   node scripts/check-module-pages-exist.js
 *   node scripts/check-module-pages-exist.js --strict   (exit 1 on any missing page)
 */

const fs   = require("fs");
const path = require("path");

const FRONTEND  = path.join(__dirname, "..", "frontend", "app");
const IS_STRICT = process.argv.includes("--strict");

// ─── Route registry (mirrors frontend/lib/modules/role-routes.ts) ─────────────
const MODULE_ROLE_ROUTES = {
  school_admin: {
    daily_logs:              "/school-admin/daily-logs",
    child_status:            "/school-admin/kinder/child-status",
    meals:                   "/school-admin/meals",
    naps:                    "/school-admin/naps",
    diapers:                 "/school-admin/kinder/diapers",
    mood:                    "/school-admin/kinder/mood",
    health_checks:           "/school-admin/health",
    incidents:               "/school-admin/incidents",
    pickup_authorizations:   "/school-admin/pickup",
    milestones:              "/school-admin/milestones",
    photos_evidence:         "/school-admin/photos",
    qualitative_assessments: "/school-admin/qualitative",
    development_areas:       "/school-admin/development",
    observations:            "/school-admin/observations",
    activities:              "/school-admin/activities",
    behavior_notes:          "/school-admin/preschool/behavior-notes",
    preschool_report_cards:  "/school-admin/preschool-report-cards",
    socioemotional:          "/school-admin/preschool/socioemotional",
    subjects:                "/school-admin/primary/subjects",
    assignments:             "/school-admin/primary/assignments",
    exams:                   "/school-admin/primary/exams",
    discipline:              "/school-admin/primary/discipline",
    classroom:               "/school-admin/primary/classroom",
    primary_report_cards:    "/school-admin/primary/report-cards",
    primary_grades:          "/school-admin/primary/grades",
    cafeteria_service:       "/school-admin/services/cafeteria",
    transport_service:       "/school-admin/services/transport",
  },
  teacher: {
    daily_logs:              "/teacher/kinder/daily-logs",
    child_status:            "/teacher/kinder/child-status",
    meals:                   "/teacher/kinder/meals",
    naps:                    "/teacher/kinder/naps",
    diapers:                 "/teacher/kinder/diapers",
    mood:                    "/teacher/kinder/mood",
    health_checks:           "/teacher/kinder/health-checks",
    incidents:               "/teacher/kinder/incidents",
    pickup_authorizations:   "/teacher/kinder/pickup-authorizations",
    milestones:              "/teacher/kinder/milestones",
    photos_evidence:         "/teacher/kinder/photos-evidence",
    qualitative_assessments: "/teacher/preschool/qualitative-assessments",
    development_areas:       "/teacher/preschool/development-areas",
    observations:            "/teacher/preschool/observations",
    activities:              "/teacher/preschool/activities",
    behavior_notes:          "/teacher/preschool/behavior-notes",
    preschool_report_cards:  "/teacher/preschool/report-cards",
    socioemotional:          "/teacher/preschool/socioemotional",
    subjects:                "/teacher/primary/subjects",
    assignments:             "/teacher/primary/assignments",
    exams:                   "/teacher/primary/exams",
    discipline:              "/teacher/primary/discipline",
    classroom:               "/teacher/primary/classroom",
    primary_report_cards:    "/teacher/primary/report-cards",
    primary_grades:          "/teacher/primary/grades",
    cafeteria_service:       "/teacher/services/cafeteria",
    transport_service:       "/teacher/services/transport",
  },
  parent: {
    daily_logs:              "/parent/daily-logs",
    meals:                   "/parent/meals",
    naps:                    "/parent/naps",
    diapers:                 "/parent/diapers",
    mood:                    "/parent/mood",
    incidents:               "/parent/incidents",
    child_status:            "/parent/kinder/child-status",
    health_checks:           "/parent/kinder/health-checks",
    pickup_authorizations:   "/parent/kinder/pickup-authorizations",
    milestones:              "/parent/kinder/milestones",
    photos_evidence:         "/parent/kinder/photos-evidence",
    qualitative_assessments: "/parent/preschool/qualitative-assessments",
    development_areas:       "/parent/preschool/development-areas",
    observations:            "/parent/preschool/observations",
    activities:              "/parent/preschool/activities",
    behavior_notes:          "/parent/preschool/behavior-notes",
    preschool_report_cards:  "/parent/preschool/report-cards",
    socioemotional:          "/parent/preschool/socioemotional",
    evidence:                "/parent/preschool/evidence",
    subjects:                "/parent/primary/subjects",
    assignments:             "/parent/primary/assignments",
    exams:                   "/parent/primary/exams",
    primary_report_cards:    "/parent/primary/report-cards",
    primary_grades:          "/parent/primary/grades",
    cafeteria_service:       "/parent/services/cafeteria",
    transport_service:       "/parent/services/transport",
  },
  student: {
    qualitative_assessments: "/student/qualitative-assessments",
    development_areas:       "/student/development-areas",
    observations:            "/student/observations",
    evidence:                "/student/evidence",
    assignments:             "/student/assignments",
    activities:              "/student/preschool/activities",
    primary_assignments:     "/student/primary/assignments",
    exams:                   "/student/primary/exams",
    subjects:                "/student/primary/subjects",
    primary_grades:          "/student/primary/grades",
    cafeteria_service:       "/student/services/cafeteria",
    transport_service:       "/student/services/transport",
  },
};

// ─── Audit ────────────────────────────────────────────────────────────────────

let missing = 0;
let ok      = 0;

for (const [role, routes] of Object.entries(MODULE_ROLE_ROUTES)) {
  const errors = [];

  for (const [moduleKey, route] of Object.entries(routes)) {
    // Convert /parent/kinder/child-status → frontend/app/parent/kinder/child-status/page.tsx
    const relDir  = route.replace(/^\//, "");
    const absPage = path.join(FRONTEND, relDir, "page.tsx");

    if (fs.existsSync(absPage)) {
      ok++;
    } else {
      errors.push(`  ❌ MISSING  ${route}  (moduleKey: ${moduleKey})`);
      missing++;
    }
  }

  if (errors.length === 0) {
    console.log(`✅ ${role.padEnd(12)} — all ${Object.keys(routes).length} routes OK`);
  } else {
    console.log(`\n⚠️  ${role}:`);
    errors.forEach(e => console.log(e));
  }
}

// Summary
console.log(`
────────────────────────────────────────────────────
  ✅ OK      : ${ok}
  ❌ Missing : ${missing}
  📁 Total   : ${ok + missing}
────────────────────────────────────────────────────`);

if (missing > 0) {
  console.log("\nRun 'node scripts/generate-module-pages.js' to create missing pages.\n");
  if (IS_STRICT) process.exit(1);
} else {
  console.log("\nAll module routes are covered. No 404s expected.\n");
}
