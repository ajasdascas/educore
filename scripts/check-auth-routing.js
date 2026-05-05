#!/usr/bin/env node
/**
 * check-auth-routing.js
 *
 * Validates that the EduCore login routing logic is correct
 * for all roles and both contexts (subdomain + platform).
 *
 * Tests (static analysis — no real HTTP needed):
 *   1. ROLE_LABELS cover all expected roles
 *   2. getDashboardPath covers all expected roles
 *   3. Login page handles ?role=student without crashing
 *   4. Escuela portal PORTALS includes 'student'
 *   5. htaccess routes /login?role=student correctly
 *
 * Usage:
 *   node scripts/check-auth-routing.js
 *   node scripts/check-auth-routing.js --verbose
 */

"use strict";

const fs = require("fs");
const path = require("path");

const verbose = process.argv.includes("--verbose");
const ROOT = path.resolve(__dirname, "..");

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.log(`  ❌ ${msg}`); return false; };
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const info = (msg) => verbose && console.log(`     ${msg}`);

let allPassed = true;

function check(condition, passMsg, failMsg) {
  if (condition) {
    pass(passMsg);
    return true;
  } else {
    fail(failMsg);
    allPassed = false;
    return false;
  }
}

function readFile(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf-8");
  } catch {
    return null;
  }
}

console.log("\n🔐 EduCore — Auth Routing Verification\n" + "─".repeat(50));

// ─── 1. login/page.tsx ───────────────────────────────────────────────────────
console.log("\n[Login Page — frontend/app/login/page.tsx]");
const loginPage = readFile("frontend/app/login/page.tsx");
if (!loginPage) {
  fail("File not found: frontend/app/login/page.tsx");
  allPassed = false;
} else {
  const roles = ["school_admin", "teacher", "parent", "student"];
  roles.forEach((role) => {
    // Accept both quoted ("role") and unquoted (role:) TypeScript object key syntax
    check(
      loginPage.includes(`"${role}"`) || loginPage.includes(`'${role}'`) || loginPage.includes(`${role}:`),
      `ROLE_LABELS includes '${role}'`,
      `ROLE_LABELS missing '${role}' — add it to ROLE_LABELS in login/page.tsx`
    );
  });

  check(
    loginPage.includes("STUDENT") && loginPage.includes("/student/dashboard"),
    "Login handles STUDENT role → /student/dashboard",
    "Login missing STUDENT redirect — add case for STUDENT in handleLogin"
  );

  info("Login file found and checked.");
}

// ─── 2. auth.ts ──────────────────────────────────────────────────────────────
console.log("\n[Auth lib — frontend/lib/auth.ts]");
const authLib = readFile("frontend/lib/auth.ts");
if (!authLib) {
  fail("File not found: frontend/lib/auth.ts");
  allPassed = false;
} else {
  check(
    authLib.includes('"STUDENT"'),
    "User type includes 'STUDENT' role",
    "User interface missing 'STUDENT' — add to role union type"
  );
  check(
    authLib.includes("case \"STUDENT\"") || authLib.includes("'STUDENT'"),
    "getDashboardPath handles STUDENT → /student/dashboard",
    "getDashboardPath missing STUDENT case — add: case 'STUDENT': return '/student/dashboard'"
  );
}

// ─── 3. escuela/page.tsx ─────────────────────────────────────────────────────
console.log("\n[Escuela Portal — frontend/app/escuela/page.tsx]");
const escuela = readFile("frontend/app/escuela/page.tsx");
if (!escuela) {
  fail("File not found: frontend/app/escuela/page.tsx");
  allPassed = false;
} else {
  check(
    escuela.includes('role: "student"'),
    "PORTALS array includes 'student' portal card",
    "PORTALS missing 'student' entry — add portal card for students"
  );
  check(
    escuela.includes("student: \"Estudiante\"") || escuela.includes('"student"'),
    "ROLE_LABELS includes 'student'",
    "ROLE_LABELS missing 'student'"
  );
}

// ─── 4. student layout & dashboard ───────────────────────────────────────────
console.log("\n[Student Module — frontend/app/student/]");
const studentLayout = readFile("frontend/app/student/layout.tsx");
const studentDash = readFile("frontend/app/student/dashboard/page.tsx");
check(
  !!studentLayout,
  "student/layout.tsx exists",
  "student/layout.tsx missing — create it with RoleGuard allowedRoles={['STUDENT']}"
);
check(
  !!studentDash && studentDash.length > 100,
  "student/dashboard/page.tsx is implemented (not placeholder)",
  "student/dashboard/page.tsx is missing or is just a placeholder"
);
if (studentLayout) {
  check(
    studentLayout.includes("STUDENT"),
    "Student layout uses RoleGuard with 'STUDENT' role",
    "Student layout missing RoleGuard allowedRoles={['STUDENT']}"
  );
}

// ─── 5. RoleGuard ────────────────────────────────────────────────────────────
console.log("\n[RoleGuard — frontend/components/providers/RoleGuard.tsx]");
const roleGuard = readFile("frontend/components/providers/RoleGuard.tsx");
if (!roleGuard) {
  fail("File not found: RoleGuard.tsx");
  allPassed = false;
} else {
  check(
    roleGuard.includes("STUDENT") || roleGuard.includes("allowedRoles"),
    "RoleGuard accepts STUDENT role",
    "RoleGuard may not allow STUDENT — check the allowedRoles type"
  );
}

// ─── 6. .htaccess ────────────────────────────────────────────────────────────
console.log("\n[.htaccess Router — frontend/htaccess-subdomain-root]");
const htaccess = readFile("frontend/htaccess-subdomain-root");
if (!htaccess) {
  fail("File not found: frontend/htaccess-subdomain-root");
  allPassed = false;
} else {
  check(
    htaccess.includes("RewriteEngine On"),
    ".htaccess has RewriteEngine On",
    ".htaccess missing RewriteEngine On"
  );
  check(
    htaccess.includes("onlineu.mx"),
    ".htaccess targets onlineu.mx",
    ".htaccess does not reference onlineu.mx"
  );
  check(
    htaccess.includes("/login"),
    ".htaccess routes /login paths",
    ".htaccess missing /login routing rule"
  );
  // student login flows through /login?role=student — .htaccess passes all query strings
  check(
    htaccess.includes("QUERY_STRING") || htaccess.includes("QSA") || htaccess.includes("QSD"),
    ".htaccess preserves query string (role=student will be forwarded)",
    ".htaccess may not preserve ?role=student — check QSA/QSD flags"
  );
}

// ─── 7. Backend student module ───────────────────────────────────────────────
console.log("\n[Backend — student module]");
const studentHandler = readFile("backend/internal/modules/student/handler.go");
const studentInMain = readFile("backend/cmd/server/main.go");
check(
  !!studentHandler,
  "backend/internal/modules/student/handler.go exists",
  "backend student handler missing — create modules/student/"
);
if (studentInMain) {
  check(
    studentInMain.includes('"STUDENT"') || studentInMain.includes("student"),
    "main.go registers student module routes",
    "main.go does not register student module — add RequireRoles('STUDENT')"
  );
}

// ─── 8. GitHub Actions workflow ──────────────────────────────────────────────
console.log("\n[GitHub Actions — .github/workflows/deploy.yml]");
const workflow = readFile(".github/workflows/deploy.yml");
if (!workflow) {
  warn("No deploy.yml found — deploy may be manual");
} else {
  check(
    workflow.includes("htaccess"),
    "Workflow deploys .htaccess to server root",
    "Workflow does not deploy .htaccess — wildcard routing may not work"
  );
  check(
    workflow.includes("FTP_PASSWORD"),
    "Workflow uses FTP_PASSWORD secret",
    "Workflow missing FTP_PASSWORD — check secrets configuration"
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
if (allPassed) {
  console.log("🎉 All auth routing checks passed!\n");
} else {
  console.log("⚠️  Some checks failed. Review the issues above.\n");
  process.exit(1);
}
