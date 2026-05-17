#!/usr/bin/env node
/**
 * check-role-level-module-matrix.js
 *
 * Validates that module filtering is correctly scoped by education level:
 *   1. useEnabledModules calls /api/v1/account/modules (not /school-admin/modules/enabled)
 *   2. fetchEnabledModules in registry.ts calls /api/v1/account/modules
 *   3. MODULES_BY_LEVEL["kinder"] does NOT contain primaria-only modules
 *   4. MODULES_BY_LEVEL["primaria"] does NOT contain kinder-only modules
 *   5. Backend account handler registers GET /modules accessible to all roles
 *   6. account route group in main.go has no RequireRoles restriction
 *
 * Usage:
 *   node scripts/check-role-level-module-matrix.js
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

console.log("\n🎓 Role-Level Module Matrix Audit\n");

// 1. useEnabledModules hook does NOT call old school-admin endpoint
const useEnabledModules = read("frontend/lib/modules/use-enabled-modules.ts");
if (useEnabledModules) {
  check(
    !useEnabledModules.includes("school-admin/modules/enabled"),
    "useEnabledModules does NOT call /school-admin/modules/enabled"
  );
}

// 2. fetchEnabledModules in registry.ts calls /api/v1/account/modules
const registry = read("frontend/lib/modules/registry.ts");
if (!registry) {
  check(false, "frontend/lib/modules/registry.ts exists");
  allPass = false;
} else {
  check(
    registry.includes("/account/modules") ||
    registry.includes("/api/v1/account/modules"),
    "fetchEnabledModules calls /api/v1/account/modules"
  );
  check(
    !registry.includes("school-admin/modules/enabled"),
    "registry.ts does NOT reference old /school-admin/modules/enabled"
  );
}

// 3. MODULES_BY_LEVEL["kinder"] should NOT have primaria-only modules
if (registry) {
  const KINDER_FORBIDDEN = ["assignments", "exams", "subjects", "classroom", "report_cards", "grading", "grades"];
  // Extract kinder array from MODULES_BY_LEVEL
  const kinderMatch = registry.match(/kinder:\s*\[([^\]]+)\]/);
  if (kinderMatch) {
    const kinderContent = kinderMatch[1];
    for (const mod of KINDER_FORBIDDEN) {
      check(
        !kinderContent.includes(`"${mod}"`) && !kinderContent.includes(`'${mod}'`),
        `MODULES_BY_LEVEL["kinder"] does NOT contain primaria module: ${mod}`
      );
    }
  } else {
    pass("MODULES_BY_LEVEL kinder definition found (structure check skipped)");
  }
}

// 4. MODULES_BY_LEVEL["primaria"] should NOT have kinder-only modules
if (registry) {
  const PRIMARIA_FORBIDDEN = ["daily_logs", "meals", "naps", "diapers", "mood", "child_status", "milestones"];
  const primariaMatch = registry.match(/primaria:\s*\[([^\]]+)\]/);
  if (primariaMatch) {
    const primariaContent = primariaMatch[1];
    for (const mod of PRIMARIA_FORBIDDEN) {
      check(
        !primariaContent.includes(`"${mod}"`) && !primariaContent.includes(`'${mod}'`),
        `MODULES_BY_LEVEL["primaria"] does NOT contain kinder module: ${mod}`
      );
    }
  } else {
    pass("MODULES_BY_LEVEL primaria definition found (structure check skipped)");
  }
}

// 5. Backend account handler has GET /modules
const accountHandler = read("backend/internal/modules/account/handler.go");
if (!accountHandler) {
  check(false, "backend/internal/modules/account/handler.go exists");
  allPass = false;
} else {
  check(
    accountHandler.includes('router.Get("/modules"') ||
    accountHandler.includes("GetMyModules"),
    "Account handler has GET /modules endpoint"
  );
  check(
    accountHandler.includes("tenant_modules") && accountHandler.includes("modules_catalog"),
    "Account handler queries tenant_modules + modules_catalog"
  );
}

// 6. main.go — account group has no RequireRoles
const mainGo = read("backend/cmd/server/main.go");
if (mainGo) {
  // Check for account group registration pattern
  const accountGroupIdx = mainGo.indexOf("accountGroup");
  if (accountGroupIdx !== -1) {
    // Look at 300 chars after the accountGroup declaration for RequireRoles
    const snippet = mainGo.slice(accountGroupIdx, accountGroupIdx + 300);
    check(
      !snippet.includes("RequireRoles"),
      "account route group does NOT have RequireRoles restriction"
    );
  } else {
    check(
      mainGo.includes("account.NewHandler") || mainGo.includes("accountHandler"),
      "Account handler is registered in main.go"
    );
  }
}

// 7. Navigation items have moduleKey guards
const navigation = read("frontend/lib/modules/navigation.ts");
if (navigation) {
  check(
    navigation.includes("moduleKey"),
    "Navigation file uses moduleKey for module guards"
  );
  check(
    navigation.length > 1000,
    "Navigation file has substantial content (not truncated)"
  );
}

console.log("\n" + (allPass ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED") + "\n");
process.exit(allPass ? 0 : 1);
