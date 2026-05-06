#!/usr/bin/env node
/**
 * check-school-modules-by-level.js
 * QA: Verifica que cada nivel escolar activa los módulos correctos
 * y que el sidebar de school-admin los respeta.
 *
 * Uso:
 *   node scripts/check-school-modules-by-level.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function ok(msg)      { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg)    { console.error(`  ❌ ${msg}`); failed++; }
function info(msg)    { console.log(`  ℹ️  ${msg}`); }
function section(msg) { console.log(`\n── ${msg} ──`); }

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

// ─── Backend: módulos por nivel ──────────────────────────────────────────────
section("Backend: modulesByEducationLevel");
{
  const src = read("backend/internal/modules/super_admin/handler.go");
  if (!src) { fail("super_admin/handler.go no encontrado"); }
  else {
    // Bebés / Guardería
    const babySection = src.includes('"babies"') && src.includes('"daily_logs"');
    babySection ? ok('babies → incluye "daily_logs"') : fail('babies NO incluye "daily_logs"');
    src.includes('"meals"')    ? ok('babies → incluye "meals"')    : fail('babies FALTA "meals"');
    src.includes('"naps"')     ? ok('babies → incluye "naps"')     : fail('babies FALTA "naps"');
    src.includes('"diapers"')  ? ok('babies → incluye "diapers"')  : fail('babies FALTA "diapers"');
    src.includes('"milestones"') ? ok('babies → incluye "milestones"') : fail('babies FALTA "milestones"');
    src.includes('"photos_evidence"') ? ok('babies → incluye "photos_evidence"') : fail('babies FALTA "photos_evidence"');
    src.includes('"incidents"') ? ok('babies → incluye "incidents"') : fail('babies FALTA "incidents"');
    src.includes('"pickup_authorizations"') ? ok('babies → incluye "pickup_authorizations"') : fail('babies FALTA "pickup_authorizations"');

    // Preescolar / Kinder
    src.includes('"qualitative_assessments"') ? ok('preescolar/kinder → incluye "qualitative_assessments"') : fail('preescolar/kinder FALTA "qualitative_assessments"');
    src.includes('"development_areas"')        ? ok('preescolar/kinder → incluye "development_areas"')       : fail('preescolar/kinder FALTA "development_areas"');
    src.includes('"observations"')             ? ok('preescolar/kinder → incluye "observations"')            : fail('preescolar/kinder FALTA "observations"');
    src.includes('"activities"')               ? ok('preescolar/kinder → incluye "activities"')              : fail('preescolar/kinder FALTA "activities"');
    src.includes('"behavior_notes"')           ? ok('preescolar/kinder → incluye "behavior_notes"')          : fail('preescolar/kinder FALTA "behavior_notes"');
    src.includes('"preschool_report_cards"')   ? ok('preescolar/kinder → incluye "preschool_report_cards"')  : fail('preescolar/kinder FALTA "preschool_report_cards"');

    // Primaria
    src.includes('"grading"')      ? ok('primaria → incluye "grading"')     : fail('primaria FALTA "grading"');
    src.includes('"report_cards"') ? ok('primaria → incluye "report_cards"') : fail('primaria FALTA "report_cards"');
    src.includes('"subjects"')     ? ok('primaria → incluye "subjects"')     : fail('primaria FALTA "subjects"');
    src.includes('"assignments"')  ? ok('primaria → incluye "assignments"')  : fail('primaria FALTA "assignments"');
    src.includes('"exams"')        ? ok('primaria → incluye "exams"')        : fail('primaria FALTA "exams"');
  }
}

// ─── Frontend: sidebar school-admin ──────────────────────────────────────────
section("Frontend: sidebar school-admin adaptativo");
{
  const src = read("frontend/app/school-admin/layout.tsx");
  if (!src) { fail("school-admin/layout.tsx no encontrado"); }
  else {
    // Módulos bebés en navItems
    const babyModules = [
      ["daily_logs",             "daily-logs"],
      ["meals",                  "meals"],
      ["naps",                   "naps"],
      ["health_checks",          "health"],
      ["incidents",              "incidents"],
      ["pickup_authorizations",  "pickup"],
      ["milestones",             "milestones"],
      ["photos_evidence",        "photos"],
    ];
    for (const [key, href] of babyModules) {
      if (src.includes(key) && src.includes(href)) {
        ok(`Sidebar: bebés — "${key}" → /${href}`);
      } else {
        fail(`Sidebar: bebés — FALTA "${key}" (href /${href})`);
      }
    }

    // Módulos preescolar/kinder en navItems
    const preschoolModules = [
      ["qualitative_assessments", "qualitative"],
      ["development_areas",       "development"],
      ["observations",            "observations"],
      ["activities",              "activities"],
      ["preschool_report_cards",  "preschool-report-cards"],
    ];
    for (const [key, href] of preschoolModules) {
      if (src.includes(key) && src.includes(href)) {
        ok(`Sidebar: preescolar — "${key}" → /${href}`);
      } else {
        fail(`Sidebar: preescolar — FALTA "${key}" (href /${href})`);
      }
    }

    // Módulos primaria en navItems
    src.includes("grading") && src.includes("grades") ? ok('Sidebar: primaria — "grading" presente') : fail('Sidebar: primaria — FALTA "grading"');
    src.includes("report_cards") ? ok('Sidebar: primaria — "report_cards" presente') : fail('Sidebar: primaria — FALTA "report_cards"');

    // isModuleEnabled filtra el navItems
    src.includes("isModuleEnabled") ? ok("Sidebar filtra navItems con isModuleEnabled") : fail("Sidebar NO filtra con isModuleEnabled");
  }
}

// ─── Frontend: registry.ts ────────────────────────────────────────────────────
section("Frontend: lib/modules/registry.ts MODULES_BY_LEVEL");
{
  const src = read("frontend/lib/modules/registry.ts");
  if (!src) { fail("registry.ts no encontrado"); }
  else {
    const levelChecks = [
      ["babies",    ["daily_logs", "meals", "naps", "milestones", "photos_evidence"]],
      ["preescolar",["qualitative_assessments", "development_areas", "preschool_report_cards"]],
      ["kinder",    ["qualitative_assessments", "development_areas", "preschool_report_cards"]],
      ["primaria",  ["grading", "report_cards", "subjects", "assignments", "exams"]],
    ];
    for (const [level, modules] of levelChecks) {
      for (const mod of modules) {
        if (src.includes(mod)) {
          ok(`registry: ${level} → "${mod}"`);
        } else {
          fail(`registry: ${level} FALTA "${mod}"`);
        }
      }
    }
  }
}

// ─── Resumen ──────────────────────────────────────────────────────────────────
console.log(`\n── Resultado: ${passed} passed / ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
