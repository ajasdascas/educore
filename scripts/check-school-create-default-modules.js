#!/usr/bin/env node
/**
 * check-school-create-default-modules.js
 *
 * Validates that creating a school without a plan activates the correct
 * default modules for the chosen education level:
 *   1. modulesByEducationLevel map exists in backend handler.go
 *   2. kinder default modules include daily-care modules (daily_logs, meals, naps...)
 *   3. primaria default modules include academic modules (grades, subjects, exams...)
 *   4. kinder defaults do NOT include primaria-only modules
 *   5. CreateSchool uses the level defaults during provisioning
 *
 * Usage:
 *   node scripts/check-school-create-default-modules.js
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.error(`  ❌ ${msg}`); return false; };

let allPass = true;
function check(result, msg) {
  if (!result) { allPass = false; fail(msg); } else { pass(msg); }
}

function read(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

console.log("\n🏗️  School Create Default Modules Audit\n");

// 1. modulesByEducationLevel map in handler.go
const handlerGo = read("backend/internal/modules/super_admin/handler.go");
if (!handlerGo) {
  check(false, "backend/internal/modules/super_admin/handler.go exists");
  allPass = false;
} else {
  check(
    handlerGo.includes("modulesByEducationLevel") || handlerGo.includes("DefaultModulesByLevel"),
    "modulesByEducationLevel map defined in super_admin handler"
  );

  // 2. kinder includes care modules
  const kinderSection = handlerGo.match(/"kinder":\s*\{[^}]+\}/s) ||
                        handlerGo.match(/"kinder":\s*\[[^\]]+\]/s);
  if (kinderSection) {
    const k = kinderSection[0];
    check(k.includes("daily_logs"), "kinder defaults include daily_logs");
    check(k.includes("meals") || k.includes("naps"), "kinder defaults include meals/naps");
  } else {
    // Try lookahead search
    const kinderIdx = handlerGo.indexOf('"kinder"');
    if (kinderIdx !== -1) {
      const kinderSlice = handlerGo.slice(kinderIdx, kinderIdx + 400);
      check(kinderSlice.includes("daily_logs"), "kinder defaults include daily_logs");
      check(kinderSlice.includes("meals") || kinderSlice.includes("naps"),
        "kinder defaults include meals/naps");
    } else {
      fail("kinder level found in modulesByEducationLevel");
      allPass = false;
    }
  }

  // 3. primaria includes academic modules
  const primariaIdx = handlerGo.indexOf('"primaria"');
  if (primariaIdx !== -1) {
    const primariaSlice = handlerGo.slice(primariaIdx, primariaIdx + 400);
    check(primariaSlice.includes("grades") || primariaSlice.includes("grading"),
      "primaria defaults include grading/grades");
    check(primariaSlice.includes("subjects") || primariaSlice.includes("exams"),
      "primaria defaults include subjects/exams");
  } else {
    fail("primaria level found in modulesByEducationLevel");
    allPass = false;
  }

  // 4. kinder defaults do NOT include primaria-only modules
  if (kinderSection) {
    const k = kinderSection[0];
    check(!k.includes('"grades"') && !k.includes('"exams"') && !k.includes('"report_cards"'),
      "kinder defaults do NOT include primaria-only modules (grades/exams/report_cards)");
  }

  // 5. CreateSchool uses modulesByEducationLevel
  check(
    handlerGo.includes("modulesByEducationLevel") &&
    (handlerGo.includes("CreateSchool") || handlerGo.includes("func (h *Handler) CreateSchool")),
    "CreateSchool function uses modulesByEducationLevel during provisioning"
  );

  // 6. Level defaults applied for each level in req.Levels
  check(
    handlerGo.includes("for _, level := range req.Levels") ||
    handlerGo.includes("for _, mod := range modulesByEducationLevel"),
    "CreateSchool iterates req.Levels to apply level-specific defaults"
  );
}

// 7. Frontend school creation sends levels in request
const schoolsPage = read("frontend/app/super-admin/schools/page.tsx");
if (schoolsPage) {
  check(
    schoolsPage.includes("levels") && schoolsPage.includes("handleLevelSelect"),
    "School creation form has level selection that is sent in request"
  );
}

console.log("\n" + (allPass ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED") + "\n");
process.exit(allPass ? 0 : 1);
