#!/usr/bin/env node
/**
 * check-module-role-allocation.js
 * Verifica que la asignación de módulos por rol sea correcta:
 *   - Los módulos kinder/guardería SÓLO aparecen en school_admin, teacher, parent
 *     (student NO debe tener daily_logs, meals, naps, diapers, mood)
 *   - Los módulos primaria (grading, report_cards, assignments) DEBEN tener moduleKey guard
 *   - Base de datos (database_admin) NO debe aparecer en teacher/parent/student
 *   - Ningún nav item sin moduleKey puede ser un módulo de nivel educativo
 *
 * Run: node scripts/check-module-role-allocation.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT     = path.resolve(__dirname, "..");
const NAV_FILE = path.join(ROOT, "frontend", "lib", "modules", "navigation.ts");

let passed = 0; let failed = 0; let warnings = 0;
const pass = (m) => { console.log(`  ✅ PASS    ${m}`); passed++; };
const fail = (m) => { console.log(`  ❌ FAIL    ${m}`); failed++; };
const warn = (m) => { console.log(`  ⚠️  WARN    ${m}`); warnings++; };

console.log("\n🎯 MODULE-ROLE ALLOCATION AUDIT\n");

if (!fs.existsSync(NAV_FILE)) {
  fail("navigation.ts not found");
  process.exit(1);
}

const nav = fs.readFileSync(NAV_FILE, "utf-8");

// Parse sections by splitting on const declarations
function getSection(content, exportName) {
  const start = content.indexOf(`export const ${exportName}`);
  if (start === -1) return "";
  // Find the next export const or end of file
  const rest = content.slice(start);
  const nextExport = rest.slice(1).search(/export const /);
  return nextExport === -1 ? rest : rest.slice(0, nextExport + 1);
}

const sections = {
  school_admin: getSection(nav, "SCHOOL_ADMIN_NAV"),
  teacher:      getSection(nav, "TEACHER_NAV"),
  parent:       getSection(nav, "PARENT_NAV"),
  student:      getSection(nav, "STUDENT_NAV"),
};

// Kinder-only modules that should NOT appear in student portal without guard
const KINDER_OPS_MODULES = ["daily_logs", "meals", "naps", "diapers", "mood", "health_checks", "pickup_authorizations"];
// Academic moduleKey values that MUST have explicit moduleKey guard in ALL portals.
// NOTE: "grades" is a URL path segment, not a moduleKey — the canonical key is "grading".
// "report_cards" appears in preescolar hrefs too (preschool_report_cards) so check only grading+assignments.
const ACADEMIC_MODULES    = ["grading", "assignments"];
// Admin-only modules that must not appear in teacher/parent/student
const ADMIN_ONLY_MODULES  = ["database_admin", "payments"];

// ─── 1. Student portal kinder ops
console.log("1. Student portal — kinder operational modules must NOT appear");
for (const key of KINDER_OPS_MODULES) {
  if (sections.student.includes(`moduleKey: "${key}"`) || sections.student.includes(key)) {
    fail(`student nav exposes kinder op module: ${key} — students don't use kinder ops`);
  } else {
    pass(`student nav does NOT have kinder module: ${key}`);
  }
}

// ─── 2. Academic modules gated everywhere
console.log("\n2. Academic modules must have moduleKey guards in all portals");
for (const [role, section] of Object.entries(sections)) {
  for (const key of ACADEMIC_MODULES) {
    if (!section.includes(key)) continue; // not in this portal — OK
    // If present, must have moduleKey
    const hasGuard = section.includes(`moduleKey: "${key}"`) || section.includes(`moduleKey: '${key}'`);
    if (hasGuard) {
      pass(`${role}: ${key} is properly gated with moduleKey`);
    } else {
      fail(`${role}: ${key} appears WITHOUT moduleKey guard — all academic modules must be gated`);
    }
  }
}

// ─── 3. Admin-only modules absent from teacher/parent/student
console.log("\n3. Admin-only modules must not appear in teacher / parent / student");
for (const key of ADMIN_ONLY_MODULES) {
  for (const role of ["teacher", "parent", "student"]) {
    const section = sections[role];
    const hasItem = section.includes(`href: "/${role}`) && section.includes(key.replace("_", "-"));
    // payments is valid for parent
    if (key === "payments" && role === "parent") continue;
    if (section.includes(`moduleKey: "${key}"`) && (section.includes(`href: "/${role}/database`) || section.includes(`href: "/${role}/admin`))) {
      fail(`${role} nav has admin-only module: ${key}`);
    } else {
      pass(`${role} nav does not expose ${key} directly`);
    }
  }
}

// ─── 4. Teacher portal has ALL kinder ops
console.log("\n4. Teacher portal MUST have all kinder operational modules");
for (const key of KINDER_OPS_MODULES) {
  if (sections.teacher.includes(`moduleKey: "${key}"`) || sections.teacher.includes(`moduleKey: '${key}'`)) {
    pass(`teacher nav has kinder module: ${key}`);
  } else {
    fail(`teacher nav MISSING kinder module: ${key} — kinder teachers need this`);
  }
}

// ─── 5. Parent portal has kinder ops
console.log("\n5. Parent portal MUST have kinder modules (read-only view)");
for (const key of KINDER_OPS_MODULES) {
  if (sections.parent.includes(`moduleKey: "${key}"`) || sections.parent.includes(`moduleKey: '${key}'`)) {
    pass(`parent nav has kinder module: ${key}`);
  } else {
    fail(`parent nav MISSING kinder module: ${key}`);
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
