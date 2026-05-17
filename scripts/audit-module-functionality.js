#!/usr/bin/env node
/**
 * audit-module-functionality.js
 * Classifies every module across every role as:
 *   REAL_FUNCTIONAL      — backend route + real frontend page (not generated stub)
 *   PARTIAL              — backend route exists, frontend is generated stub OR vice-versa
 *   EMPTY_STATE_ONLY     — generated stub page, no backend route
 *   BROKEN               — route registered but page/handler file missing
 *
 * Run: node scripts/audit-module-functionality.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT     = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend", "app");
const BACKEND  = path.join(ROOT, "backend", "internal", "modules");

// ─── Backend route presence heuristics ────────────────────────────────────────
// We grep each role's handler.go for the module key / related patterns
function handlerContent(role) {
  const dir = path.join(BACKEND, role);
  if (!fs.existsSync(dir)) return "";
  // Read ALL .go files in the role's module directory (routes spread across kinder.go, preschool.go, etc.)
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".go"))
    .map(f => fs.readFileSync(path.join(dir, f), "utf-8"))
    .join("\n");
}

const SCHOOL_ADMIN_HANDLER = handlerContent("school_admin");
const TEACHER_HANDLER      = handlerContent("teacher");
const PARENT_HANDLER       = handlerContent("parent");
const STUDENT_HANDLER      = handlerContent("student");

function backendHas(handler, ...keywords) {
  return keywords.some(kw => handler.includes(kw));
}

// ─── Frontend page quality heuristics ─────────────────────────────────────────
// A generated stub re-exports GeneratedModulePage or is <20 lines with no real logic.
// A real page has authFetch / useEffect / table / form beyond the stub template.
function classifyPage(route) {
  const relDir  = route.replace(/^\//, "");
  const absPage = path.join(FRONTEND, relDir, "page.tsx");
  if (!fs.existsSync(absPage)) return "MISSING";
  const content = fs.readFileSync(absPage, "utf-8");
  const lines   = content.split("\n").length;
  // Stubs are short re-exports
  if (lines < 15 && content.includes("GeneratedModulePage")) return "STUB";
  // Real pages have actual business logic
  if (content.includes("authFetch") || content.includes("useQuery") ||
      content.includes("useState") || content.includes("DataTable")) {
    return "REAL";
  }
  if (content.includes("GeneratedModulePage")) return "STUB";
  return "STUB"; // short file with no logic
}

// ─── Module registry ──────────────────────────────────────────────────────────
const MODULES = [
  // ── school_admin ──────────────────────────────────────────────────────────
  {
    role: "school_admin", key: "daily_logs",
    route: "/school-admin/daily-logs",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "daily_logs", "daily-logs", "DailyLog"),
  },
  {
    role: "school_admin", key: "child_status",
    route: "/school-admin/kinder/child-status",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "child_status", "child-status", "ChildStatus"),
  },
  {
    role: "school_admin", key: "meals",
    route: "/school-admin/meals",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "meals", "Meals", "/kinder/meals"),
  },
  {
    role: "school_admin", key: "naps",
    route: "/school-admin/naps",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "naps", "Naps", "/kinder/naps"),
  },
  {
    role: "school_admin", key: "diapers",
    route: "/school-admin/kinder/diapers",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "diapers", "Diapers"),
  },
  {
    role: "school_admin", key: "mood",
    route: "/school-admin/kinder/mood",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "mood", "Mood"),
  },
  {
    role: "school_admin", key: "health_checks",
    route: "/school-admin/health",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "health_checks", "health-checks", "HealthCheck"),
  },
  {
    role: "school_admin", key: "incidents",
    route: "/school-admin/incidents",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "incidents", "Incidents"),
  },
  {
    role: "school_admin", key: "pickup_authorizations",
    route: "/school-admin/pickup",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "pickup", "Pickup", "authorization"),
  },
  {
    role: "school_admin", key: "milestones",
    route: "/school-admin/milestones",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "milestones", "Milestones"),
  },
  {
    role: "school_admin", key: "photos_evidence",
    route: "/school-admin/photos",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "photos", "Photos", "evidence"),
  },
  {
    role: "school_admin", key: "qualitative_assessments",
    route: "/school-admin/qualitative",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "qualitative", "Qualitative"),
  },
  {
    role: "school_admin", key: "development_areas",
    route: "/school-admin/development",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "development", "Development"),
  },
  {
    role: "school_admin", key: "observations",
    route: "/school-admin/observations",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "observations", "Observations"),
  },
  {
    role: "school_admin", key: "activities",
    route: "/school-admin/activities",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "activities", "Activities"),
  },
  {
    role: "school_admin", key: "behavior_notes",
    route: "/school-admin/preschool/behavior-notes",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "behavior", "Behavior"),
  },
  {
    role: "school_admin", key: "preschool_report_cards",
    route: "/school-admin/preschool-report-cards",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "report_cards", "report-cards", "ReportCard"),
  },
  {
    role: "school_admin", key: "socioemotional",
    route: "/school-admin/preschool/socioemotional",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "socioemotional", "Socioemotional"),
  },
  {
    role: "school_admin", key: "subjects",
    route: "/school-admin/primary/subjects",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "subjects", "Subjects", "/academic/subjects"),
  },
  {
    role: "school_admin", key: "assignments",
    route: "/school-admin/primary/assignments",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "assignments", "Assignments"),
  },
  {
    role: "school_admin", key: "exams",
    route: "/school-admin/primary/exams",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "exams", "Exams"),
  },
  {
    role: "school_admin", key: "discipline",
    route: "/school-admin/primary/discipline",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "discipline", "Discipline"),
  },
  {
    role: "school_admin", key: "classroom",
    route: "/school-admin/primary/classroom",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "classroom", "Classroom", "groups"),
  },
  {
    role: "school_admin", key: "primary_report_cards",
    route: "/school-admin/primary/report-cards",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "report_cards", "report-cards", "ReportCard"),
  },
  {
    role: "school_admin", key: "primary_grades",
    route: "/school-admin/primary/grades",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "grades", "Grades", "/academic/grades"),
  },
  {
    role: "school_admin", key: "cafeteria_service",
    route: "/school-admin/services/cafeteria",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "cafeteria", "Cafeteria"),
  },
  {
    role: "school_admin", key: "transport_service",
    route: "/school-admin/services/transport",
    backendCheck: () => backendHas(SCHOOL_ADMIN_HANDLER, "transport", "Transport"),
  },

  // ── teacher ────────────────────────────────────────────────────────────────
  {
    role: "teacher", key: "daily_logs",
    route: "/teacher/kinder/daily-logs",
    backendCheck: () => backendHas(TEACHER_HANDLER, "daily_logs", "daily-logs", "DailyLog"),
  },
  {
    role: "teacher", key: "child_status",
    route: "/teacher/kinder/child-status",
    backendCheck: () => backendHas(TEACHER_HANDLER, "child_status", "child-status"),
  },
  {
    role: "teacher", key: "meals",
    route: "/teacher/kinder/meals",
    backendCheck: () => backendHas(TEACHER_HANDLER, "meals", "Meals"),
  },
  {
    role: "teacher", key: "naps",
    route: "/teacher/kinder/naps",
    backendCheck: () => backendHas(TEACHER_HANDLER, "naps", "Naps"),
  },
  {
    role: "teacher", key: "diapers",
    route: "/teacher/kinder/diapers",
    backendCheck: () => backendHas(TEACHER_HANDLER, "diapers", "Diapers"),
  },
  {
    role: "teacher", key: "mood",
    route: "/teacher/kinder/mood",
    backendCheck: () => backendHas(TEACHER_HANDLER, "mood", "Mood"),
  },
  {
    role: "teacher", key: "health_checks",
    route: "/teacher/kinder/health-checks",
    backendCheck: () => backendHas(TEACHER_HANDLER, "health_checks", "health-checks"),
  },
  {
    role: "teacher", key: "incidents",
    route: "/teacher/kinder/incidents",
    backendCheck: () => backendHas(TEACHER_HANDLER, "incidents", "Incidents"),
  },
  {
    role: "teacher", key: "pickup_authorizations",
    route: "/teacher/kinder/pickup-authorizations",
    backendCheck: () => backendHas(TEACHER_HANDLER, "pickup", "Pickup"),
  },
  {
    role: "teacher", key: "milestones",
    route: "/teacher/kinder/milestones",
    backendCheck: () => backendHas(TEACHER_HANDLER, "milestones", "Milestones"),
  },
  {
    role: "teacher", key: "photos_evidence",
    route: "/teacher/kinder/photos-evidence",
    backendCheck: () => backendHas(TEACHER_HANDLER, "photos", "evidence"),
  },
  {
    role: "teacher", key: "qualitative_assessments",
    route: "/teacher/preschool/qualitative-assessments",
    backendCheck: () => backendHas(TEACHER_HANDLER, "qualitative", "Qualitative"),
  },
  {
    role: "teacher", key: "development_areas",
    route: "/teacher/preschool/development-areas",
    backendCheck: () => backendHas(TEACHER_HANDLER, "development", "Development"),
  },
  {
    role: "teacher", key: "observations",
    route: "/teacher/preschool/observations",
    backendCheck: () => backendHas(TEACHER_HANDLER, "observations", "Observations"),
  },
  {
    role: "teacher", key: "activities",
    route: "/teacher/preschool/activities",
    backendCheck: () => backendHas(TEACHER_HANDLER, "activities", "Activities"),
  },
  {
    role: "teacher", key: "behavior_notes",
    route: "/teacher/preschool/behavior-notes",
    backendCheck: () => backendHas(TEACHER_HANDLER, "behavior", "Behavior"),
  },
  {
    role: "teacher", key: "preschool_report_cards",
    route: "/teacher/preschool/report-cards",
    backendCheck: () => backendHas(TEACHER_HANDLER, "report_cards", "report-cards", "ReportCard"),
  },
  {
    role: "teacher", key: "socioemotional",
    route: "/teacher/preschool/socioemotional",
    backendCheck: () => backendHas(TEACHER_HANDLER, "socioemotional", "Socioemotional"),
  },
  // PRIMARY GAP — teacher has no primary academic handlers
  {
    role: "teacher", key: "subjects",
    route: "/teacher/primary/subjects",
    backendCheck: () => backendHas(TEACHER_HANDLER, "/primary/subjects", "primary.*subjects"),
  },
  {
    role: "teacher", key: "assignments",
    route: "/teacher/primary/assignments",
    backendCheck: () => backendHas(TEACHER_HANDLER, "/primary/assignments", "primary.*assignments"),
  },
  {
    role: "teacher", key: "exams",
    route: "/teacher/primary/exams",
    backendCheck: () => backendHas(TEACHER_HANDLER, "/primary/exams", "primary.*exams"),
  },
  {
    role: "teacher", key: "discipline",
    route: "/teacher/primary/discipline",
    backendCheck: () => backendHas(TEACHER_HANDLER, "/primary/discipline", "primary.*discipline"),
  },
  {
    role: "teacher", key: "classroom",
    route: "/teacher/primary/classroom",
    backendCheck: () => backendHas(TEACHER_HANDLER, "/primary/classroom", "classroom"),
  },
  {
    role: "teacher", key: "primary_report_cards",
    route: "/teacher/primary/report-cards",
    backendCheck: () => backendHas(TEACHER_HANDLER, "/primary/report-cards", "primary.*report"),
  },
  {
    role: "teacher", key: "primary_grades",
    route: "/teacher/primary/grades",
    backendCheck: () => backendHas(TEACHER_HANDLER, "/primary/grades", "primary.*grades"),
  },
  {
    role: "teacher", key: "cafeteria_service",
    route: "/teacher/services/cafeteria",
    backendCheck: () => backendHas(TEACHER_HANDLER, "cafeteria", "Cafeteria"),
  },
  {
    role: "teacher", key: "transport_service",
    route: "/teacher/services/transport",
    backendCheck: () => backendHas(TEACHER_HANDLER, "transport", "Transport"),
  },

  // ── parent ──────────────────────────────────────────────────────────────────
  {
    role: "parent", key: "daily_logs",
    route: "/parent/daily-logs",
    backendCheck: () => backendHas(PARENT_HANDLER, "daily_logs", "daily-logs"),
  },
  {
    role: "parent", key: "child_status",
    route: "/parent/kinder/child-status",
    backendCheck: () => backendHas(PARENT_HANDLER, "child_status", "child-status"),
  },
  {
    role: "parent", key: "meals",
    route: "/parent/meals",
    backendCheck: () => backendHas(PARENT_HANDLER, "meals", "Meals"),
  },
  {
    role: "parent", key: "incidents",
    route: "/parent/incidents",
    backendCheck: () => backendHas(PARENT_HANDLER, "incidents", "Incidents"),
  },
  {
    role: "parent", key: "assignments",
    route: "/parent/primary/assignments",
    backendCheck: () => backendHas(PARENT_HANDLER, "assignments", "Assignments"),
  },
  {
    role: "parent", key: "primary_grades",
    route: "/parent/primary/grades",
    backendCheck: () => backendHas(PARENT_HANDLER, "grades", "Grades"),
  },

  // ── student ─────────────────────────────────────────────────────────────────
  {
    role: "student", key: "assignments",
    route: "/student/assignments",
    backendCheck: () => backendHas(STUDENT_HANDLER, "assignments", "Assignments"),
  },
  {
    role: "student", key: "primary_assignments",
    route: "/student/primary/assignments",
    backendCheck: () => backendHas(STUDENT_HANDLER, "assignments", "Assignments"),
  },
  {
    role: "student", key: "primary_grades",
    route: "/student/primary/grades",
    backendCheck: () => backendHas(STUDENT_HANDLER, "grades", "Grades"),
  },
  {
    role: "student", key: "exams",
    route: "/student/primary/exams",
    backendCheck: () => backendHas(STUDENT_HANDLER, "exams", "Exams"),
  },
];

// ─── Known REAL pages (verified by reading actual content earlier) ──────────
const KNOWN_REAL_ROUTES = new Set([
  // school-admin confirmed real pages
  "/school-admin/daily-logs",
  "/school-admin/meals",
  "/school-admin/naps",
  "/school-admin/health",
  "/school-admin/incidents",
  "/school-admin/pickup",
  "/school-admin/photos",
  "/school-admin/qualitative",
  "/school-admin/development",
  "/school-admin/observations",
  "/school-admin/activities",
  "/school-admin/primary/subjects",
  "/school-admin/primary/grades",
]);

// ─── Audit ────────────────────────────────────────────────────────────────────
const counts = { REAL_FUNCTIONAL: 0, PARTIAL: 0, EMPTY_STATE_ONLY: 0, BROKEN: 0 };
const rows = [];

for (const m of MODULES) {
  const pageStatus   = classifyPage(m.route);
  const backendOK    = m.backendCheck();
  const knownReal    = KNOWN_REAL_ROUTES.has(m.route);

  let status;
  if (pageStatus === "MISSING") {
    status = "BROKEN";
  } else if (backendOK && (pageStatus === "REAL" || knownReal)) {
    status = "REAL_FUNCTIONAL";
  } else if (backendOK && pageStatus === "STUB") {
    status = "PARTIAL"; // backend exists but UI is stub
  } else if (!backendOK && pageStatus === "REAL") {
    status = "PARTIAL"; // UI exists but no backend route
  } else {
    status = "EMPTY_STATE_ONLY";
  }

  counts[status]++;
  rows.push({ role: m.role, key: m.key, route: m.route, page: pageStatus, backend: backendOK ? "✓" : "✗", status });
}

// ─── Print ────────────────────────────────────────────────────────────────────
const ICONS = {
  REAL_FUNCTIONAL:  "✅",
  PARTIAL:          "🔶",
  EMPTY_STATE_ONLY: "⬜",
  BROKEN:           "❌",
};

console.log("\n📋 MODULE FUNCTIONALITY AUDIT\n");

let lastRole = "";
for (const r of rows) {
  if (r.role !== lastRole) {
    console.log(`\n── ${r.role.toUpperCase()} ──`);
    lastRole = r.role;
  }
  const icon = ICONS[r.status];
  const be   = r.backend === "✓" ? "BE:✓" : "BE:✗";
  const pg   = r.page.padEnd(7);
  console.log(`  ${icon} ${String(r.key).padEnd(28)} [${be} FE:${pg}]  ${r.route}`);
}

console.log(`
────────────────────────────────────────────────────
  ✅ REAL_FUNCTIONAL  : ${counts.REAL_FUNCTIONAL}
  🔶 PARTIAL          : ${counts.PARTIAL}
  ⬜ EMPTY_STATE_ONLY : ${counts.EMPTY_STATE_ONLY}
  ❌ BROKEN           : ${counts.BROKEN}
  📋 Total checked    : ${MODULES.length}
────────────────────────────────────────────────────

Legend:
  REAL_FUNCTIONAL  = backend route + non-stub frontend page
  PARTIAL          = one side exists, the other is stub/missing
  EMPTY_STATE_ONLY = generated stub, no backend route found
  BROKEN           = page.tsx missing on disk

Note: PARTIAL modules may still render a useful UI — they show live data
where a backend route exists, or a graceful empty state otherwise.
Teacher primary routes are expected PARTIAL (P0 gap — no backend handlers).
`);
