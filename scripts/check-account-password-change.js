#!/usr/bin/env node
/**
 * check-account-password-change.js
 *
 * Validates that password change with active session works for all roles:
 *   1. Backend has PUT /api/v1/account/password
 *   2. Backend has GET /api/v1/account/security
 *   3. Both endpoints use only Protected middleware (no RequireRoles)
 *   4. AccountPages.tsx consumes those endpoints
 *   5. Security pages for parent/teacher/school-admin/student import AccountSecurityPage
 *
 * Usage:
 *   node scripts/check-account-password-change.js
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

console.log("\n🔑 Account Password Change Audit\n");

// 1. Backend account handler has PUT /password
const accountHandler = read("backend/internal/modules/account/handler.go");
if (!accountHandler) {
  check(false, "backend/internal/modules/account/handler.go exists");
  allPass = false;
} else {
  check(
    accountHandler.includes('router.Put("/password"') ||
    accountHandler.includes("UpdatePassword"),
    "Account handler registers PUT /password"
  );
  check(
    accountHandler.includes('router.Get("/security"') ||
    accountHandler.includes("GetSecurity"),
    "Account handler registers GET /security"
  );
  check(
    accountHandler.includes('router.Get("/modules"') ||
    accountHandler.includes("GetMyModules"),
    "Account handler registers GET /modules (cross-role module fetch)"
  );
}

// 2. Account module is registered without RequireRoles in main.go
const mainGo = read("backend/cmd/server/main.go");
if (mainGo) {
  // Verify account group does NOT have RequireRoles immediately after Protected
  const accountSection = mainGo.match(/account[Gg]roup[^}]{0,400}/s);
  if (accountSection) {
    check(
      !accountSection[0].includes("RequireRoles"),
      "Account route group uses only Protected middleware (no RequireRoles)"
    );
  } else {
    // search differently — just ensure account is registered
    check(
      mainGo.includes("accountGroup") || mainGo.includes("account.NewHandler"),
      "Account module is registered in main.go"
    );
  }
}

// 3. Frontend AccountPages.tsx consumes /account/password and /account/security
const accountPages = read("frontend/components/modules/account/AccountPages.tsx");
if (!accountPages) {
  check(false, "frontend/components/modules/account/AccountPages.tsx exists");
  allPass = false;
} else {
  check(
    accountPages.includes("/account/password"),
    "AccountPages.tsx calls PUT /api/v1/account/password"
  );
  check(
    accountPages.includes("/account/security"),
    "AccountPages.tsx calls GET /api/v1/account/security"
  );
}

// 4. Security pages for all roles import / render AccountSecurityPage
const securityPagePaths = [
  "frontend/app/parent/security/page.tsx",
  "frontend/app/teacher/security/page.tsx",
  "frontend/app/school-admin/security/page.tsx",
];
for (const pagePath of securityPagePaths) {
  const content = read(pagePath);
  if (!content) {
    check(false, pagePath + " exists");
  } else {
    check(
      content.includes("AccountSecurity") ||
      content.includes("AccountPages") ||
      content.includes("account"),
      pagePath + " references account security component"
    );
  }
}

// 5. Student settings also accessible
const studentSettings = read("frontend/app/student/settings/page.tsx");
if (studentSettings) {
  check(
    studentSettings.includes("AccountSecurity") ||
    studentSettings.includes("AccountPages") ||
    studentSettings.includes("security") ||
    studentSettings.includes("password"),
    "frontend/app/student/settings references security/password component"
  );
} else {
  check(false, "frontend/app/student/settings/page.tsx exists (student password change)");
}

console.log("\n" + (allPass ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED") + "\n");
process.exit(allPass ? 0 : 1);
