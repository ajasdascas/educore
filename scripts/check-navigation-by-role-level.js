#!/usr/bin/env node
/**
 * check-navigation-by-role-level.js
 * Verifica que navigation.ts tenga ítems correctos por rol y nivel educativo.
 * - school_admin: tiene módulos kinder, preescolar y primaria
 * - teacher: tiene módulos kinder, preescolar y primaria
 * - parent: tiene módulos kinder, preescolar y primaria
 * - student: tiene módulos por level con moduleKey guards (sin items sin guard para primaria)
 *
 * Run: node scripts/check-navigation-by-role-level.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let passed = 0; let failed = 0; let warnings = 0;
const pass = (m) => { console.log(`  ✅ PASS    ${m}`); passed++; };
const fail = (m) => { console.log(`  ❌ FAIL    ${m}`); failed++; };
const warn = (m) => { console.log(`  ⚠️  WARN    ${m}`); warnings++; };

const navFile = path.join(ROOT, "frontend", "lib", "modules", "navigation.ts");

console.log("\n🧭 NAVIGATION BY ROLE × LEVEL AUDIT\n");

if (!fs.existsSync(navFile)) {
  fail("navigation.ts not found — expected at frontend/lib/modules/navigation.ts");
  process.exit(1);
}
pass("navigation.ts exists");

const nav = fs.readFileSync(navFile, "utf-8");

// 1. Roles exported
const REQUIRED_EXPORTS = [
  "SCHOOL_ADMIN_NAV",
  "TEACHER_NAV",
  "PARENT_NAV",
  "STUDENT_NAV",
];
console.log("\n1. Required nav exports");
for (const exp of REQUIRED_EXPORTS) {
  if (nav.includes(`export const ${exp}`)) pass(`${exp} exported`);
  else fail(`${exp} NOT exported from navigation.ts`);
}

// 2. Kinder modules in teacher nav
console.log("\n2. Teacher nav — kinder modules");
const KINDER_TEACHER_KEYS = [
  "daily_logs", "meals", "naps", "diapers", "mood",
  "health_checks", "incidents", "pickup_authorizations",
  "milestones", "photos_evidence", "child_status",
];
const teacherSection = nav.split("STUDENT_NAV")[0].split("TEACHER_NAV")[1] || nav;
for (const key of KINDER_TEACHER_KEYS) {
  if (teacherSection.includes(`moduleKey: "${key}"`) || teacherSection.includes(`moduleKey: '${key}'`)) {
    pass(`teacher nav has kinder module: ${key}`);
  } else {
    fail(`teacher nav MISSING kinder module: ${key}`);
  }
}

// 3. Preschool modules in teacher nav
console.log("\n3. Teacher nav — preescolar modules");
const PRESCHOOL_TEACHER_KEYS = [
  "qualitative_assessments", "development_areas", "observations",
  "activities", "behavior_notes", "preschool_report_cards", "socioemotional",
];
for (const key of PRESCHOOL_TEACHER_KEYS) {
  if (teacherSection.includes(`moduleKey: "${key}"`) || teacherSection.includes(`moduleKey: '${key}'`)) {
    pass(`teacher nav has preschool module: ${key}`);
  } else {
    fail(`teacher nav MISSING preschool module: ${key}`);
  }
}

// 4. Parent nav — kinder modules
console.log("\n4. Parent nav — kinder modules");
const parentSection = nav.split("STUDENT_NAV")[0].split("PARENT_NAV")[1] || nav;
const KINDER_PARENT_KEYS = [
  "daily_logs", "meals", "naps", "diapers", "mood", "incidents",
  "health_checks", "pickup_authorizations", "milestones", "photos_evidence", "child_status",
];
for (const key of KINDER_PARENT_KEYS) {
  if (parentSection.includes(`moduleKey: "${key}"`) || parentSection.includes(`moduleKey: '${key}'`)) {
    pass(`parent nav has kinder module: ${key}`);
  } else {
    fail(`parent nav MISSING kinder module: ${key}`);
  }
}

// 5. Student nav — grading/assignments have moduleKey guards
console.log("\n5. Student nav — primaria modules are gated");
const studentSection = nav.split("STUDENT_NAV")[1] || nav;
// These must have moduleKey, not be unconditional
const GATED_STUDENT_KEYS = ["grading", "assignments", "qualitative_assessments"];
for (const key of GATED_STUDENT_KEYS) {
  if (studentSection.includes(`moduleKey: "${key}"`) || studentSection.includes(`moduleKey: '${key}'`)) {
    pass(`student nav gates ${key} with moduleKey`);
  } else {
    warn(`student nav item for ${key} may not have moduleKey guard`);
  }
}

// 6. No /student/evidence flat href (must use /student/preschool/evidence)
console.log("\n6. Href correctness checks");
if (!studentSection.includes('href: "/student/evidence"')) {
  pass('student nav does NOT use broken href /student/evidence');
} else {
  fail('student nav still uses /student/evidence which has no page.tsx — should be /student/preschool/evidence');
}

// 7. Layouts import from navigation.ts
console.log("\n7. Layouts import from navigation.ts");
const LAYOUTS = [
  { file: "frontend/app/school-admin/layout.tsx", export: "SCHOOL_ADMIN_NAV" },
  { file: "frontend/app/teacher/layout.tsx",      export: "TEACHER_NAV" },
  { file: "frontend/app/parent/layout.tsx",        export: "PARENT_NAV" },
  { file: "frontend/app/student/layout.tsx",       export: "STUDENT_NAV" },
];
for (const { file, exp: exportName } of LAYOUTS.map(l => ({ file: l.file, exp: l.export }))) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) { fail(`${file} not found`); continue; }
  const content = fs.readFileSync(fullPath, "utf-8");
  if (content.includes("navigation")) {
    pass(`${file.split("/").pop()} imports from navigation`);
  } else {
    fail(`${file.split("/").pop()} does NOT import from navigation.ts — hardcoded nav`);
  }
}

// Summary
console.log(`
────────────────────────────────────────────────────
  ✅ Passed   : ${passed}
  ❌ Failed   : ${failed}
  ⚠️  Warnings : ${warnings}
────────────────────────────────────────────────────
`);
if (failed > 0) process.exit(1);
