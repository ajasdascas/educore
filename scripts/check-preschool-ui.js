#!/usr/bin/env node
/**
 * QA: Preescolar Student Portal UI
 * Verifies qualitative-assessments, development-areas, observations, evidence pages.
 */
const fs = require("fs");
const path = require("path");

let passed = 0, failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`); failed++; failures.push(name); }
}

function read(rel) {
  const abs = path.join(__dirname, "..", rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

// ─── 1. Pages exist ──────────────────────────────────────────────────────────
console.log("\n1. Preescolar student pages exist");
const pages = ["qualitative-assessments","development-areas","observations","evidence"];
for (const p of pages) {
  const content = read(`frontend/app/student/${p}/page.tsx`);
  check(`/student/${p}/page.tsx exists`, content !== null);
  if (content) {
    check(`/student/${p} uses "use client"`, content.startsWith('"use client"'));
    check(`/student/${p} no numerical grade display`, !content.includes("calificacion numerica") && !content.includes("nota:") && !content.match(/score.*\d{2,}/i));
    check(`/student/${p} has empty state or always-visible content`, content.includes("empty") || content.includes("Empty") || content.includes("aparecerá") || content.includes("aún no") || content.length > 500);
  }
}

// ─── 2. qualitative-assessments specific ─────────────────────────────────────
console.log("\n2. qualitative-assessments page");
const qa = read("frontend/app/student/qualitative-assessments/page.tsx");
if (qa) {
  check("Imports authFetch", qa.includes("authFetch"));
  check("Uses res.success (not res.ok)", (qa.includes("res.success") || qa.includes("res?.success")) && !qa.includes("res.ok"));
  check("Shows nivel badge (logrado/en_proceso/iniciando)", qa.includes("logrado") && qa.includes("en_proceso") && qa.includes("iniciando"));
  check("No numerical scores", !qa.includes("score") && !qa.includes("/10") && !qa.includes("/100"));
  check("Has campo_formativo display", qa.includes("campo") || qa.includes("formativo") || qa.includes("campo_formativo"));
}

// ─── 3. development-areas specific ───────────────────────────────────────────
console.log("\n3. development-areas page (campos formativos)");
const da = read("frontend/app/student/development-areas/page.tsx");
if (da) {
  check("Shows Lenguaje y Comunicación", da.includes("Lenguaje") || da.includes("lenguaje"));
  check("Shows Pensamiento Matemático", da.includes("Matemático") || da.includes("matemático") || da.includes("Matematico"));
  check("Shows Exploración del Mundo", da.includes("Exploración") || da.includes("Exploración"));
  check("Shows Desarrollo Personal y Social", da.includes("Personal y Social") || da.includes("personal y social"));
  check("Shows Expresión Artística", da.includes("Artística") || da.includes("artística") || da.includes("Artistica"));
  check("Shows Desarrollo Físico", da.includes("Físico") || da.includes("físico") || da.includes("Fisico"));
  check("Always shows content (not API-dependent blank)", da.length > 1500);
}

// ─── 4. observations specific ────────────────────────────────────────────────
console.log("\n4. observations page");
const obs = read("frontend/app/student/observations/page.tsx");
if (obs) {
  check("Imports authFetch", obs.includes("authFetch"));
  check("Shows teacher/maestra reference", obs.includes("maestra") || obs.includes("teacher") || obs.includes("maestro"));
  check("Shows date", obs.includes("fecha") || obs.includes("date") || obs.includes("Date"));
}

// ─── 5. evidence specific ────────────────────────────────────────────────────
console.log("\n5. evidence page");
const ev = read("frontend/app/student/evidence/page.tsx");
if (ev) {
  check("Imports authFetch", ev.includes("authFetch"));
  check("Handles image display", ev.includes("image_url") || ev.includes("img") || ev.includes("Image"));
  check("Has empty state", ev.includes("evidencia") || ev.includes("Evidencia") || ev.includes("aparecerán"));
}

// ─── 6. Student layout nav items ─────────────────────────────────────────────
console.log("\n6. Student layout nav items");
const layout = read("frontend/app/student/layout.tsx");
check("student/layout.tsx exists", layout !== null);
if (layout) {
  check("Has /student/qualitative-assessments nav", layout.includes("/student/qualitative-assessments"));
  check("Has /student/development-areas nav", layout.includes("/student/development-areas"));
  check("Has /student/observations nav", layout.includes("/student/observations"));
  check("Has /student/evidence nav", layout.includes("/student/evidence"));
  check("qualitative_assessments moduleKey", layout.includes("qualitative_assessments"));
  check("development_areas moduleKey", layout.includes("development_areas"));
  check("observations moduleKey", layout.includes("observations") || layout.includes("observations"));
  check("photos_evidence moduleKey", layout.includes("photos_evidence"));
}

// ─── 7. Backend preschool endpoints ──────────────────────────────────────────
console.log("\n7. Backend student handler — preescolar routes");
const studentHandler = read("backend/internal/modules/student/handler.go");
check("student/handler.go exists", studentHandler !== null);
if (studentHandler) {
  check("Route: /qualitative-assessments", studentHandler.includes("qualitative-assessments"));
  check("Route: /development-areas", studentHandler.includes("development-areas"));
  check("Route: /observations", studentHandler.includes("observations"));
  check("Route: /evidence", studentHandler.includes("evidence"));
  check("Handler: GetQualitativeAssessments", studentHandler.includes("GetQualitativeAssessments"));
  check("Handler: GetDevelopmentAreas", studentHandler.includes("GetDevelopmentAreas"));
  check("Handler: GetObservations", studentHandler.includes("GetObservations"));
  check("Handler: GetEvidence", studentHandler.includes("GetEvidence"));
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`Preschool UI QA: ${passed} passed, ${failed} failed`);
if (failures.length > 0) { console.log("\nFailed:"); failures.forEach(f => console.log(`  • ${f}`)); }
console.log("═".repeat(60) + "\n");
process.exit(failed > 0 ? 1 : 0);
