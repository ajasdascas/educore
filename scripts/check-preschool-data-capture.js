#!/usr/bin/env node
/**
 * QA: Preschool (Preescolar) Data Capture Module
 * Validates qualitative assessments, observations, and evidence endpoints
 * exist in both the teacher backend and the student/parent portals.
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

console.log("\n🎨  EDUCORE — PRESCHOOL DATA CAPTURE QA\n");

// ── 1. Teacher kinder_preschool.go — preschool tables ────────────────────────
console.log("1. Backend — teacher kinder_preschool.go (preschool tables)");
const kinderPreschool = "backend/internal/modules/teacher/kinder_preschool.go";
if (exists(kinderPreschool)) {
  ok("kinder_preschool.go exists");
  const content = read(kinderPreschool);
  const preschoolTables = [
    "preschool_qualitative_assessments",
    "preschool_observations",
    "preschool_evidence",
  ];
  for (const table of preschoolTables) {
    if (content.includes(table)) ok(`references table: ${table}`);
    else ko(`references table: ${table}`, "not found in kinder_preschool.go");
  }
} else {
  ko("kinder_preschool.go exists", kinderPreschool);
  const tables = ["preschool_qualitative_assessments", "preschool_observations", "preschool_evidence"];
  for (const t of tables) ko(`references table: ${t}`, "file missing");
}

// ── 2. Student preschool module ───────────────────────────────────────────────
console.log("\n2. Backend — student/preschool.go");
const studentPreschool = "backend/internal/modules/student/preschool.go";
if (exists(studentPreschool)) {
  ok("student/preschool.go exists");
  const content = read(studentPreschool);
  const funcs = [
    "GetQualitativeAssessments",
    "GetDevelopmentAreas",
    "GetObservations",
    "GetEvidence",
  ];
  for (const fn of funcs) {
    if (content.includes(fn)) ok(`student/preschool.go contains ${fn}`);
    else ko(`student/preschool.go contains ${fn}`, "function not found");
  }
} else {
  ko("student/preschool.go exists", studentPreschool);
  const funcs = ["GetQualitativeAssessments", "GetDevelopmentAreas", "GetObservations", "GetEvidence"];
  for (const fn of funcs) ko(`student/preschool.go contains ${fn}`, "file missing");
}

// ── 3. Frontend teacher preschool pages ───────────────────────────────────────
console.log("\n3. Frontend — teacher preschool pages");
const teacherPreschoolPages = [
  "frontend/app/teacher/preschool/qualitative-assessments/page.tsx",
  "frontend/app/teacher/preschool/observations/page.tsx",
  "frontend/app/teacher/preschool/evidence/page.tsx",
];
for (const p of teacherPreschoolPages) {
  const label = p.replace("frontend/app/", "");
  if (exists(p)) ok(label);
  else ko(label, "page.tsx missing");
}

// ── 4. Frontend school-admin preschool pages ──────────────────────────────────
console.log("\n4. Frontend — school-admin preschool pages");
const adminPreschoolPages = [
  "frontend/app/school-admin/preschool/qualitative-assessments/page.tsx",
];
for (const p of adminPreschoolPages) {
  const label = p.replace("frontend/app/", "");
  if (exists(p)) ok(label);
  else ko(label, "page.tsx missing");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`Preschool Data Capture QA: ${pass} passed, ${fail} failed`);
if (failures.length > 0) { console.log("\nFailed:"); failures.forEach(f => console.log(`  • ${f}`)); }
console.log("═".repeat(60) + "\n");
process.exit(fail > 0 ? 1 : 0);
