#!/usr/bin/env node
/**
 * QA: Kinder Data Capture Module
 * Validates that all 6 kinder capture endpoints and their frontend pages exist
 * and that the parent kinder portal is wired up correctly.
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

console.log("\n🍼  EDUCORE — KINDER DATA CAPTURE QA\n");

// ── 1. Backend teacher kinder handler ─────────────────────────────────────────
console.log("1. Backend — teacher kinder_preschool.go");
const kinderPreschool = "backend/internal/modules/teacher/kinder_preschool.go";
if (exists(kinderPreschool)) {
  ok("kinder_preschool.go exists");
  const content = read(kinderPreschool);
  const tables = ["kinder_daily_logs", "kinder_meals", "kinder_naps", "kinder_diapers", "kinder_mood", "kinder_incidents"];
  for (const table of tables) {
    if (content.includes(table)) ok(`references table: ${table}`);
    else ko(`references table: ${table}`, "not found in kinder_preschool.go");
  }
} else {
  ko("kinder_preschool.go exists", kinderPreschool);
  // still count table checks as failed
  const tables = ["kinder_daily_logs", "kinder_meals", "kinder_naps", "kinder_diapers", "kinder_mood", "kinder_incidents"];
  for (const table of tables) ko(`references table: ${table}`, "file missing");
}

// ── 2. Frontend teacher kinder pages ──────────────────────────────────────────
console.log("\n2. Frontend — teacher kinder pages");
const teacherKinderPages = [
  "frontend/app/teacher/kinder/daily-logs/page.tsx",
  "frontend/app/teacher/kinder/meals/page.tsx",
  "frontend/app/teacher/kinder/naps/page.tsx",
  "frontend/app/teacher/kinder/diapers/page.tsx",
  "frontend/app/teacher/kinder/mood/page.tsx",
  "frontend/app/teacher/kinder/incidents/page.tsx",
];
for (const p of teacherKinderPages) {
  const label = p.replace("frontend/app/", "");
  if (exists(p)) ok(label);
  else ko(label, "page.tsx missing");
}

// ── 3. Frontend school-admin kinder pages ────────────────────────────────────
console.log("\n3. Frontend — school-admin kinder pages");
const adminKinderPages = [
  "frontend/app/school-admin/kinder/daily-logs/page.tsx",
];
for (const p of adminKinderPages) {
  const label = p.replace("frontend/app/", "");
  if (exists(p)) ok(label);
  else ko(label, "page.tsx missing");
}

// ── 4. Backend parent kinder handler ─────────────────────────────────────────
console.log("\n4. Backend — parent/kinder.go");
const parentKinder = "backend/internal/modules/parent/kinder.go";
if (exists(parentKinder)) {
  ok("parent/kinder.go exists");
  const content = read(parentKinder);
  const funcs = [
    "GetChildDailyLogs",
    "GetChildMeals",
    "GetChildNaps",
    "GetChildDiapers",
    "GetChildMood",
    "GetChildIncidents",
  ];
  for (const fn of funcs) {
    if (content.includes(fn)) ok(`parent/kinder.go contains ${fn}`);
    else ko(`parent/kinder.go contains ${fn}`, "function not found");
  }
} else {
  ko("parent/kinder.go exists", parentKinder);
  const funcs = ["GetChildDailyLogs", "GetChildMeals", "GetChildNaps", "GetChildDiapers", "GetChildMood", "GetChildIncidents"];
  for (const fn of funcs) ko(`parent/kinder.go contains ${fn}`, "file missing");
}

// ── 5. Migration 018 fixed file ───────────────────────────────────────────────
console.log("\n5. MySQL migration 018 (hostinger_fixed)");
const mig018 = "backend/migrations_mysql/018_kinder_preschool_data_tables.hostinger_fixed.sql";
if (exists(mig018)) {
  ok("018_kinder_preschool_data_tables.hostinger_fixed.sql exists");
  const content = read(mig018);
  const nonCommentLines = content.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  if (nonCommentLines.match(/\bENUM\s*\(/i)) ko("Migration 018 fixed: zero ENUMs", "ENUM( keyword found — breaks MariaDB in some contexts");
  else ok("Migration 018 fixed: zero ENUMs");
} else {
  ko("018_kinder_preschool_data_tables.hostinger_fixed.sql exists", mig018);
  ko("Migration 018 fixed: zero ENUMs", "file missing");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`Kinder Data Capture QA: ${pass} passed, ${fail} failed`);
if (failures.length > 0) { console.log("\nFailed:"); failures.forEach(f => console.log(`  • ${f}`)); }
console.log("═".repeat(60) + "\n");
process.exit(fail > 0 ? 1 : 0);
