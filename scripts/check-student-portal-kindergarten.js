#!/usr/bin/env node
/**
 * check-student-portal-kindergarten.js
 * Auditoría específica del portal de estudiantes para escuelas Kinder/Guardería.
 *
 * Reglas para alumnos de nivel Kinder:
 *   ✅ Debe ver: evaluaciones cualitativas, áreas de desarrollo, observaciones, evidencias
 *   ❌ No debe ver: calificaciones numéricas, tareas, exámenes (sin moduleKey guard = visible para todos)
 *   ✅ Calificaciones / Tareas DEBEN tener moduleKey guard para que se oculten si el módulo no está habilitado
 *   ✅ El href /student/evidence DEBE apuntar a /student/preschool/evidence (no una ruta inexistente)
 *
 * Run: node scripts/check-student-portal-kindergarten.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT    = path.resolve(__dirname, "..");
const APPDIR  = path.join(ROOT, "frontend", "app");
const NAV_FILE = path.join(ROOT, "frontend", "lib", "modules", "navigation.ts");

let passed = 0; let failed = 0; let warnings = 0;
const pass = (m) => { console.log(`  ✅ PASS    ${m}`); passed++; };
const fail = (m) => { console.log(`  ❌ FAIL    ${m}`); failed++; };
const warn = (m) => { console.log(`  ⚠️  WARN    ${m}`); warnings++; };

console.log("\n🎒 STUDENT PORTAL — KINDERGARTEN AUDIT\n");

if (!fs.existsSync(NAV_FILE)) {
  fail("navigation.ts not found");
  process.exit(1);
}

const nav = fs.readFileSync(NAV_FILE, "utf-8");

// Get STUDENT_NAV section
const studentStart = nav.indexOf("export const STUDENT_NAV");
const studentSection = studentStart === -1 ? "" : nav.slice(studentStart);

// ─── 1. Kinder-appropriate modules present with moduleKey
console.log("1. Kinder-appropriate modules are present with moduleKey guards");
const KINDER_STUDENT_MODULES = [
  { key: "qualitative_assessments", label: "Evaluaciones cualitativas" },
  { key: "development_areas",       label: "Áreas de desarrollo" },
  { key: "observations",            label: "Observaciones" },
  { key: "photos_evidence",         label: "Evidencias/Fotos" },
];
for (const { key, label } of KINDER_STUDENT_MODULES) {
  const hasGuard = studentSection.includes(`moduleKey: "${key}"`) || studentSection.includes(`moduleKey: '${key}'`);
  if (hasGuard) {
    pass(`Student nav has kinder module (gated): ${key} — ${label}`);
  } else {
    warn(`Student nav may be missing kinder module or guard: ${key} — ${label}`);
  }
}

// ─── 2. Academic modules are gated (not unconditional)
console.log("\n2. Primaria academic modules MUST be gated (not always visible)");
const ACADEMIC_MUST_BE_GATED = [
  { key: "grading",      label: "Calificaciones numéricas" },
  { key: "assignments",  label: "Tareas" },
];
for (const { key, label } of ACADEMIC_MUST_BE_GATED) {
  if (!studentSection.includes(key)) {
    warn(`Student nav does not include ${key} at all — if school is primaria this is a problem`);
    continue;
  }
  const hasGuard = studentSection.includes(`moduleKey: "${key}"`) || studentSection.includes(`moduleKey: '${key}'`);
  if (hasGuard) {
    pass(`${label} (${key}) is properly gated — kinder students won't see it`);
  } else {
    fail(`${label} (${key}) appears WITHOUT moduleKey guard — kinder students will see academic modules`);
  }
}

// ─── 3. No broken flat href /student/evidence
console.log("\n3. href /student/evidence must NOT exist (no page.tsx there)");
const hasEvidenceFlatHref = studentSection.includes('href: "/student/evidence"') ||
                            studentSection.includes("href: '/student/evidence'");
const evidenceFlatPage = path.join(APPDIR, "student", "evidence", "page.tsx");
if (hasEvidenceFlatHref && !fs.existsSync(evidenceFlatPage)) {
  fail('/student/evidence href in student nav but no page.tsx exists — 404 in static export');
} else if (!hasEvidenceFlatHref) {
  pass('Student nav does NOT use /student/evidence (correct — page does not exist)');
} else {
  pass('/student/evidence has corresponding page.tsx');
}

// ─── 4. Check /student/preschool/evidence exists if used
console.log("\n4. /student/preschool/evidence page.tsx exists");
const preschoolEvidence = path.join(APPDIR, "student", "preschool", "evidence", "page.tsx");
if (fs.existsSync(preschoolEvidence)) {
  pass('/student/preschool/evidence/page.tsx exists');
} else {
  fail('/student/preschool/evidence/page.tsx NOT found — if nav points here it will 404');
}

// ─── 5. Check kinder page files exist for student
console.log("\n5. Student kinder/preschool page.tsx files exist");
const STUDENT_KINDER_PAGES = [
  "student/qualitative-assessments/page.tsx",
  "student/development-areas/page.tsx",
  "student/observations/page.tsx",
  "student/preschool/evidence/page.tsx",
  "student/preschool/qualitative-assessments/page.tsx",
];
for (const rel of STUDENT_KINDER_PAGES) {
  const full = path.join(APPDIR, ...rel.split("/"));
  if (fs.existsSync(full)) pass(`${rel} exists`);
  else fail(`${rel} NOT found`);
}

// ─── 6. Student layout uses STUDENT_NAV from navigation.ts
console.log("\n6. Student layout uses navigation.ts");
const studentLayout = path.join(APPDIR, "student", "layout.tsx");
if (fs.existsSync(studentLayout)) {
  const content = fs.readFileSync(studentLayout, "utf-8");
  if (content.includes("STUDENT_NAV") && content.includes("navigation")) {
    pass("student/layout.tsx uses STUDENT_NAV from navigation.ts");
  } else {
    fail("student/layout.tsx does NOT use STUDENT_NAV — nav may still be hardcoded");
  }
} else {
  fail("student/layout.tsx not found");
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
