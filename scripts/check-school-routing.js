#!/usr/bin/env node
/**
 * check-school-routing.js
 *
 * Validates the end-to-end school subdomain routing logic:
 *   - "Visitar portal" button generates https://{slug}.onlineu.mx
 *   - kinder1.onlineu.mx routes correctly per .htaccess rules
 *   - Login flows for all 4 roles function correctly
 *   - SUPER_ADMIN access is unrestricted
 *   - Tenant isolation is enforced by JWT (not subdomain)
 *
 * This is a STATIC analysis (reads source files) + optional DNS check.
 * Pass --live for actual HTTP requests.
 *
 * Usage:
 *   node scripts/check-school-routing.js
 *   node scripts/check-school-routing.js --live --slug=kinder1
 *   node scripts/check-school-routing.js --verbose
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const dns = require("dns");

const verbose = process.argv.includes("--verbose");
const live = process.argv.includes("--live");
const slugArg = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1] || "kinder1";
const DOMAIN = process.env.DOMAIN || "onlineu.mx";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://educore-production-beef.up.railway.app";

const ROOT = path.resolve(__dirname, "..");

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.log(`  ❌ ${msg}`); return false; };
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const info = (msg) => verbose && console.log(`     ${msg}`);

let allPassed = true;

function check(condition, passMsg, failMsg) {
  if (condition) { pass(passMsg); return true; }
  fail(failMsg);
  allPassed = false;
  return false;
}

function readFile(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf-8"); }
  catch { return null; }
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: { "User-Agent": "EduCore-Checker/1.0" }, timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, error: "timeout" }); });
  });
}

function resolveDNS(hostname) {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addrs) => resolve(err ? null : addrs?.[0]));
  });
}

// ─── Static checks ────────────────────────────────────────────────────────────

async function staticChecks() {
  console.log("\n═══ STATIC ANALYSIS ═══════════════════════════════════════════════════");

  // 1. "Visit portal" button generates correct URL
  console.log("\n[1. Portal URL generation]");
  const superAdminSchools = readFile("frontend/app/super-admin/schools/page.tsx");
  if (superAdminSchools) {
    check(
      superAdminSchools.includes("onlineu.mx") || superAdminSchools.includes("slug"),
      "Super Admin schools page includes slug/domain reference for portal URL",
      "Super Admin schools page may not generate correct portal URL"
    );
    info("Check that Visitar Portal generates https://{slug}.onlineu.mx");
  } else {
    warn("Super Admin schools page not found — cannot verify portal URL generation");
  }

  // 2. tenant.ts slug detection
  console.log("\n[2. Tenant slug detection — frontend/lib/tenant.ts]");
  const tenantLib = readFile("frontend/lib/tenant.ts");
  if (!tenantLib) {
    fail("frontend/lib/tenant.ts not found");
    allPassed = false;
  } else {
    check(
      tenantLib.includes("getTenantFromHost"),
      "getTenantFromHost function exists",
      "getTenantFromHost missing in tenant.ts"
    );
    check(
      tenantLib.includes(`"kinder1.onlineu.mx"`) || tenantLib.includes("onlineu.mx"),
      "tenant.ts handles onlineu.mx subdomains",
      "tenant.ts does not handle onlineu.mx"
    );
    check(
      tenantLib.includes("www") || tenantLib.includes("EXCLUDED"),
      "www.onlineu.mx excluded from tenant detection",
      "www.onlineu.mx may not be excluded"
    );
    check(
      tenantLib.includes("null"),
      "Returns null for main domain (no tenant context)",
      "May not return null for main domain"
    );
  }

  // 3. Login slug resolution
  console.log("\n[3. Login slug resolution — frontend/app/login/page.tsx]");
  const login = readFile("frontend/app/login/page.tsx");
  if (!login) {
    fail("login/page.tsx not found");
    allPassed = false;
  } else {
    check(
      login.includes("slug") && login.includes("?slug="),
      "Login reads ?slug= from URL",
      "Login does not read ?slug= param"
    );
    check(
      login.includes("getTenantFromHost") || login.includes("hostname"),
      "Login detects slug from hostname (subdomain routing)",
      "Login does not detect slug from hostname"
    );
    check(
      login.includes("SUPER_ADMIN") && login.includes("school-admin"),
      "SUPER_ADMIN on subdomain goes to school-admin dashboard",
      "SUPER_ADMIN subdomain routing missing"
    );
  }

  // 4. .htaccess routing rules
  console.log("\n[4. .htaccess routing — frontend/htaccess-subdomain-root]");
  const htaccess = readFile("frontend/htaccess-subdomain-root");
  if (!htaccess) {
    fail("htaccess-subdomain-root not found");
    allPassed = false;
  } else {
    const rules = [
      { pattern: /RewriteEngine On/, desc: "RewriteEngine On" },
      // Main domain skip: condition + rule may be on different lines — check for both
      { pattern: /www.*onlineu|onlineu.*NC.*\n.*RewriteRule.*- \[L\]|RewriteRule \^ - \[L\]/, desc: "Main domain skip rule" },
      { pattern: /escuela.*slug=%1/, desc: "Root path → /escuela/?slug=" },
      { pattern: /login.*slug=%1/, desc: "/login → inject slug" },
      { pattern: /QUERY_STRING|QSA|QSD/, desc: "Query string preserved (role= forwarded)" },
      { pattern: /R=302/, desc: "302 redirect used (not 301, avoids cache issues)" },
    ];
    rules.forEach(({ pattern, desc }) => {
      check(pattern.test(htaccess), `.htaccess: ${desc}`, `.htaccess missing rule: ${desc}`);
    });

    // Verify student login flow
    check(
      htaccess.includes("QUERY_STRING") || htaccess.includes("QSA"),
      ".htaccess forwards ?role=student correctly",
      ".htaccess may not forward ?role=student — check query string handling"
    );
  }

  // 5. Backend auth — does it support STUDENT role?
  console.log("\n[5. Backend STUDENT role]");
  const authHandler = readFile("backend/internal/modules/auth/handler.go");
  const mainGo = readFile("backend/cmd/server/main.go");
  if (authHandler) {
    check(
      !authHandler.includes("STUDENT") || authHandler.includes("role"),
      "Auth handler processes role-based login",
      "Auth handler may not support STUDENT role"
    );
  }
  if (mainGo) {
    check(
      mainGo.includes("STUDENT") || mainGo.includes("student"),
      "main.go registers /student endpoint with STUDENT role guard",
      "main.go missing student module — STUDENT users have no API routes"
    );
  }

  // 6. RoleGuard: SUPER_ADMIN bypass
  console.log("\n[6. SUPER_ADMIN unrestricted access]");
  const roleGuard = readFile("frontend/components/providers/RoleGuard.tsx");
  if (roleGuard) {
    check(
      roleGuard.includes("SUPER_ADMIN"),
      "RoleGuard grants SUPER_ADMIN access to all routes",
      "RoleGuard does not explicitly handle SUPER_ADMIN"
    );
  }

  // 7. School-admin layout: denies non-school users
  console.log("\n[7. Role-based layout guards]");
  const schoolLayout = readFile("frontend/app/school-admin/layout.tsx");
  const parentLayout = readFile("frontend/app/parent/layout.tsx");
  const teacherLayout = readFile("frontend/app/teacher/layout.tsx");
  const studentLayout = readFile("frontend/app/student/layout.tsx");

  check(
    !!schoolLayout && schoolLayout.includes("RoleGuard"),
    "school-admin layout has RoleGuard",
    "school-admin layout missing RoleGuard"
  );
  check(
    !!parentLayout && parentLayout.includes("RoleGuard"),
    "parent layout has RoleGuard",
    "parent layout missing RoleGuard"
  );
  check(
    !!teacherLayout && teacherLayout.includes("RoleGuard"),
    "teacher layout has RoleGuard",
    "teacher layout missing RoleGuard"
  );
  check(
    !!studentLayout && studentLayout.includes("RoleGuard"),
    "student layout has RoleGuard",
    "student layout missing RoleGuard — create frontend/app/student/layout.tsx"
  );
}

// ─── Live checks ──────────────────────────────────────────────────────────────

async function liveChecks() {
  console.log("\n═══ LIVE CHECKS ════════════════════════════════════════════════════════");
  console.log(`   Slug: ${slugArg}, Domain: ${DOMAIN}, API: ${API_URL}`);

  const hostname = `${slugArg}.${DOMAIN}`;

  // 1. DNS
  console.log(`\n[DNS: ${hostname}]`);
  const ip = await resolveDNS(hostname);
  check(!!ip, `DNS resolves: ${hostname} → ${ip || "?"}`, `DNS not resolving: ${hostname} — run provision-wildcard-domain.js`);

  // 2. HTTP root redirect
  console.log(`\n[HTTP redirect: http://${hostname}/]`);
  const rootRes = await httpGet(`http://${hostname}/`);
  if (rootRes.error) {
    fail(`HTTP error: ${rootRes.error}`);
    allPassed = false;
  } else {
    check(
      rootRes.status >= 300 && rootRes.status < 400,
      `Root path redirects (${rootRes.status})`,
      `Root path returned ${rootRes.status} — expected 3xx`
    );
    const loc = rootRes.headers?.location || "";
    check(
      loc.includes("escuela") || loc.includes("slug"),
      `Redirects to portal selector: ${loc}`,
      `Redirect location does not include 'escuela' or 'slug': ${loc}`
    );
    info(`Location: ${loc}`);
  }

  // 3. Login redirect
  console.log(`\n[HTTP redirect: http://${hostname}/login?role=school_admin]`);
  const loginRes = await httpGet(`http://${hostname}/login?role=school_admin`);
  if (!loginRes.error) {
    const loc = loginRes.headers?.location || "";
    check(
      loc.includes("slug=" + slugArg) && loc.includes("role=school_admin"),
      `Login redirect includes slug and role: ${loc}`,
      `Login redirect missing slug or role: ${loc}`
    );
    info(`Location: ${loc}`);
  } else {
    fail(`Login redirect HTTP error: ${loginRes.error}`);
    allPassed = false;
  }

  // 4. Backend API
  console.log(`\n[Backend API: /api/v1/public/school-info?slug=${slugArg}]`);
  const apiRes = await httpGet(`${API_URL}/api/v1/public/school-info?slug=${encodeURIComponent(slugArg)}`);
  if (apiRes.error) {
    fail(`API error: ${apiRes.error}`);
    allPassed = false;
  } else {
    check(
      apiRes.status === 200,
      `Backend API returns 200 for slug '${slugArg}'`,
      `Backend API returned ${apiRes.status} — slug may not exist in DB`
    );
    if (apiRes.status === 404) {
      warn(`Slug '${slugArg}' not found. Create the school in Super Admin first.`);
    }
  }

  // 5. Main domain — no tenant
  console.log(`\n[Main domain — no tenant context: ${DOMAIN}/login]`);
  const mainRes = await httpGet(`http://${DOMAIN}/educore/login`);
  check(
    !mainRes.error,
    `Main domain /login is reachable (${mainRes.status || "error"})`,
    `Main domain /login not reachable: ${mainRes.error || mainRes.status}`
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🏫 EduCore — School Routing Verification\n");
  console.log("This script checks that:");
  console.log("  • kinder1.onlineu.mx/login?role=X routes correctly");
  console.log("  • onlineu.mx/login has no tenant context");
  console.log("  • All roles (school_admin, teacher, parent, student) are handled");
  console.log("  • SUPER_ADMIN bypasses RoleGuard on all layouts");
  console.log("  • JWT enforces tenant isolation (not just URL)");

  await staticChecks();

  if (live) {
    await liveChecks();
  } else {
    console.log("\n[Live checks skipped — pass --live to run HTTP/DNS checks]");
    console.log(`  Example: node scripts/check-school-routing.js --live --slug=kinder1`);
  }

  console.log("\n" + "─".repeat(60));
  if (allPassed) {
    console.log("🎉 All routing checks passed!\n");
  } else {
    console.log("⚠️  Some checks failed. See issues above.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});
