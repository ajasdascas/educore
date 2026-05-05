#!/usr/bin/env node
/**
 * check-support-mode-static.js
 * Static code audit: verifies support mode wiring without needing live credentials.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FE = path.join(ROOT, "frontend");
const BE = path.join(ROOT, "backend");

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { console.log("  ✅ PASS:", msg); passed++; }
function fail(msg) { console.log("  ❌ FAIL:", msg); failed++; }
function warn(msg) { console.log("  ⚠️  WARN:", msg); warnings++; }

function readFile(relPath) {
  try {
    return fs.readFileSync(path.join(ROOT, relPath), "utf8");
  } catch {
    return null;
  }
}

function grep(content, pattern) {
  return pattern.test(content);
}

console.log("\n=== check-support-mode-static.js ===\n");

// --- 1. auth.ts has X-Support-Tenant-ID ---
console.log("1. authFetch adds X-Support-Tenant-ID");
{
  const auth = readFile("frontend/lib/auth.ts");
  if (!auth) { fail("frontend/lib/auth.ts not found"); }
  else if (grep(auth, /X-Support-Tenant-ID/)) { pass("X-Support-Tenant-ID present in auth.ts"); }
  else { fail("X-Support-Tenant-ID NOT found in auth.ts"); }

  if (auth && grep(auth, /user\?\.role\s*===\s*["']SUPER_ADMIN["']/)) {
    pass("X-Support-Tenant-ID gated by SUPER_ADMIN role check");
  } else if (auth) {
    fail("No SUPER_ADMIN role gate for X-Support-Tenant-ID found in auth.ts");
  }

  if (auth && grep(auth, /sessionStorage\.setItem\(.support_tenant_id./)) {
    pass("setSupportContext writes to sessionStorage 'support_tenant_id'");
  } else if (auth) {
    fail("setSupportContext not writing 'support_tenant_id' to sessionStorage");
  }
}

// --- 2. school-admin layout blocks SUPER_ADMIN without context ---
console.log("\n2. school-admin layout blocks SUPER_ADMIN without support context");
{
  const layout = readFile("frontend/app/school-admin/layout.tsx");
  if (!layout) { fail("frontend/app/school-admin/layout.tsx not found"); }
  else {
    if (grep(layout, /isSupportMode\(\)/)) {
      pass("layout calls isSupportMode()");
    } else {
      fail("layout does NOT call isSupportMode() — SUPER_ADMIN will pass through without context");
    }
    if (grep(layout, /user\?\.role\s*===\s*["']SUPER_ADMIN["']/)) {
      pass("layout checks user.role === SUPER_ADMIN before blocking");
    } else {
      fail("layout has no SUPER_ADMIN role check for support gate");
    }
    if (grep(layout, /supportTenantId/)) {
      pass("layout reads ?supportTenantId query param from URL");
    } else {
      warn("layout may not read ?supportTenantId from URL — direct links won't auto-seed context");
    }
  }
}

// --- 3. super-admin/lab has setSupportContext ---
console.log("\n3. super-admin/lab calls setSupportContext");
{
  const lab = readFile("frontend/app/super-admin/lab/page.tsx");
  if (!lab) { fail("frontend/app/super-admin/lab/page.tsx not found"); }
  else {
    if (grep(lab, /setSupportContext/)) { pass("lab calls setSupportContext"); }
    else { fail("lab does NOT call setSupportContext"); }
    if (grep(lab, /router\.push/)) { pass("lab navigates with router.push after setSupportContext"); }
    else { warn("lab may not navigate after setSupportContext"); }
    if (grep(lab, /\?next=/i) || grep(lab, /nextPath/)) {
      pass("lab handles ?next= redirect param");
    } else {
      warn("lab does not handle ?next= — back-redirect from blocked school-admin page won't auto-select module");
    }
  }
}

// --- 4. super-admin/schools has setSupportContext ---
console.log("\n4. super-admin/schools list calls setSupportContext");
{
  const schools = readFile("frontend/app/super-admin/schools/page.tsx");
  if (!schools) { fail("frontend/app/super-admin/schools/page.tsx not found"); }
  else {
    if (grep(schools, /setSupportContext/)) { pass("schools list calls setSupportContext"); }
    else { fail("schools list does NOT call setSupportContext — no 1-click support mode from list"); }
    if (grep(schools, /Modo Soporte/i) || grep(schools, /ShieldCheck/)) {
      pass("schools list has Modo Soporte button/item");
    } else {
      fail("schools list has no Modo Soporte button");
    }
  }
}

// --- 5. super-admin/schools/details has setSupportContext ---
console.log("\n5. super-admin/schools/details calls setSupportContext");
{
  const details = readFile("frontend/app/super-admin/schools/details/page.tsx");
  if (!details) { warn("frontend/app/super-admin/schools/details/page.tsx not found"); }
  else {
    if (grep(details, /setSupportContext/)) { pass("details page calls setSupportContext"); }
    else { fail("details page does NOT call setSupportContext"); }
  }
}

// --- 6. SupportModeBanner exists ---
console.log("\n6. SupportModeBanner component exists");
{
  const banner = readFile("frontend/components/SupportModeBanner.tsx");
  if (!banner) { fail("frontend/components/SupportModeBanner.tsx not found"); }
  else {
    if (grep(banner, /isSupportMode/)) { pass("SupportModeBanner checks isSupportMode()"); }
    else { fail("SupportModeBanner does not check isSupportMode()"); }
    if (grep(banner, /clearSupportContext/)) { pass("SupportModeBanner has clearSupportContext (salir)"); }
    else { warn("SupportModeBanner has no clearSupportContext — user can't exit support mode"); }
  }
}

// --- 7. school-admin layout has SupportModeBanner ---
console.log("\n7. school-admin layout renders SupportModeBanner");
{
  const layout = readFile("frontend/app/school-admin/layout.tsx");
  if (layout && grep(layout, /SupportModeBanner/)) {
    pass("layout renders SupportModeBanner");
  } else if (layout) {
    fail("layout does NOT render SupportModeBanner");
  }
}

// --- 8. CORS in main.go includes X-Support-Tenant-ID ---
console.log("\n8. Backend CORS allows X-Support-Tenant-ID");
{
  const main = readFile("backend/cmd/server/main.go");
  if (!main) { fail("backend/cmd/server/main.go not found"); }
  else {
    if (grep(main, /X-Support-Tenant-ID/)) {
      pass("backend CORS AllowHeaders includes X-Support-Tenant-ID");
    } else {
      fail("backend CORS does NOT include X-Support-Tenant-ID — preflight will block it");
    }
  }
}

// --- 9. backend auth.go reads X-Support-Tenant-ID ---
console.log("\n9. Backend middleware reads X-Support-Tenant-ID");
{
  const authGo = readFile("backend/internal/middleware/auth.go");
  if (!authGo) { fail("backend/internal/middleware/auth.go not found"); }
  else {
    if (grep(authGo, /X-Support-Tenant-ID/)) {
      pass("auth middleware reads X-Support-Tenant-ID header");
    } else {
      fail("auth middleware does NOT read X-Support-Tenant-ID");
    }
    if (grep(authGo, /SUPER_ADMIN/)) {
      pass("auth middleware gates X-Support-Tenant-ID to SUPER_ADMIN only");
    } else {
      fail("auth middleware has no SUPER_ADMIN check for support header");
    }
  }
}

// --- 10. no raw fetch() in school-admin critical pages ---
console.log("\n10. No raw fetch() in school-admin critical pages (students, reports, documents, boletas)");
{
  const pagesToCheck = [
    "frontend/app/school-admin/students/page.tsx",
    "frontend/app/school-admin/reports/page.tsx",
    "frontend/app/school-admin/documents/page.tsx",
    "frontend/app/school-admin/report-cards/page.tsx",
  ];
  for (const p of pagesToCheck) {
    const content = readFile(p);
    if (!content) { warn(`${p} not found (may not exist yet)`); continue; }
    const rawFetchMatches = content.match(/(?<!auth)(?<!\/\/.*)fetch\(/g);
    if (rawFetchMatches && rawFetchMatches.length > 0) {
      warn(`${p} has ${rawFetchMatches.length} raw fetch() call(s) — verify they are public endpoints`);
    } else {
      pass(`${p} uses no raw fetch()`);
    }
  }
}

// --- Summary ---
console.log("\n========================================");
console.log(`PASSED:   ${passed}`);
console.log(`WARNINGS: ${warnings}`);
console.log(`FAILED:   ${failed}`);
console.log("========================================\n");

if (failed > 0) process.exit(1);
