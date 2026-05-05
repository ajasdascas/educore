#!/usr/bin/env node
/**
 * check-api-reachability.js
 *
 * Verifies that the EduCore backend is reachable from this machine,
 * checks CORS headers, and optionally runs authenticated endpoint checks.
 *
 * Usage:
 *   node scripts/check-api-reachability.js
 *
 * With credentials (full smoke):
 *   API_BASE_URL=https://... SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... node scripts/check-api-reachability.js
 *
 * Env vars:
 *   API_BASE_URL          (default: https://educore-production-beef.up.railway.app)
 *   FRONTEND_BASE_URL     (default: https://onlineu.mx/educore)
 *   SUPER_ADMIN_EMAIL     (optional)
 *   SUPER_ADMIN_PASSWORD  (optional)
 *   SCHOOL_ADMIN_EMAIL    (optional)
 *   SCHOOL_ADMIN_PASSWORD (optional)
 *   SUPPORT_TENANT_ID     (optional — UUID of a school for support-mode tests)
 */

"use strict";

const https  = require("https");
const http   = require("http");
const url    = require("url");

const API_BASE        = (process.env.API_BASE_URL        || "https://educore-production-beef.up.railway.app").replace(/\/$/, "");
const FRONTEND_BASE   = (process.env.FRONTEND_BASE_URL   || "https://onlineu.mx/educore").replace(/\/$/, "");
const SA_EMAIL        = process.env.SUPER_ADMIN_EMAIL    || "";
const SA_PASSWORD     = process.env.SUPER_ADMIN_PASSWORD || "";
const SCH_EMAIL       = process.env.SCHOOL_ADMIN_EMAIL   || "";
const SCH_PASSWORD    = process.env.SCHOOL_ADMIN_PASSWORD|| "";
const SUPPORT_TENANT  = process.env.SUPPORT_TENANT_ID    || "";

let passed = 0, failed = 0, skipped = 0;

const ok   = (msg) => { console.log(`  ✅ ${msg}`); passed++; };
const fail = (msg) => { console.error(`  ❌ ${msg}`); failed++; };
const skip = (msg) => { console.log(`  ⏭️  SKIPPED: ${msg}`); skipped++; };
const info = (msg) => console.log(`     ${msg}`);
const section = (title) => console.log(`\n═══ ${title} ${"═".repeat(Math.max(0, 55 - title.length))}`);

function request(method, endpoint, body, extraHeaders = {}) {
  return new Promise((resolve) => {
    const parsed  = url.parse(`${API_BASE}${endpoint}`);
    const lib     = parsed.protocol === "https:" ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      "Content-Type":  "application/json",
      "User-Agent":    "EduCore-Reachability/1.0",
      ...extraHeaders,
    };
    if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

    const req = lib.request({
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path:     parsed.path,
      method,
      headers,
      timeout:  10000,
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, json, raw: data });
      });
    });

    req.on("error",   (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", ()  => { req.destroy(); resolve({ status: 0, error: "timeout" }); });

    if (payload) req.write(payload);
    req.end();
  });
}

// OPTIONS preflight (CORS check)
function preflight(endpoint, origin) {
  return new Promise((resolve) => {
    const parsed = url.parse(`${API_BASE}${endpoint}`);
    const lib    = parsed.protocol === "https:" ? https : http;

    const req = lib.request({
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path:     parsed.path,
      method:   "OPTIONS",
      headers: {
        "Origin":                         origin,
        "Access-Control-Request-Method":  "POST",
        "Access-Control-Request-Headers": "Authorization, Content-Type, X-Support-Tenant-ID",
        "User-Agent":                     "EduCore-Reachability/1.0",
      },
      timeout: 8000,
    }, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    });

    req.on("error",   (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", ()  => { req.destroy(); resolve({ status: 0, error: "timeout" }); });
    req.end();
  });
}

async function main() {
  console.log("\n🌐 EduCore — API Reachability Check\n");
  console.log(`   API base:      ${API_BASE}`);
  console.log(`   Frontend base: ${FRONTEND_BASE}`);

  // ─── 1. Health check ────────────────────────────────────────────────────────
  section("1. HEALTH CHECK");
  const t0 = Date.now();
  const health = await request("GET", "/api/v1/health");
  const latency = Date.now() - t0;

  if (health.status === 0) {
    fail(`Backend unreachable: ${health.error}`);
    info("→ Backend may be down or CORS/firewall is blocking Node.js requests.");
    info(`  Expected: ${API_BASE}/api/v1/health`);
  } else {
    ok(`Health returned HTTP ${health.status} (${latency}ms)`);
    if (health.json?.data?.status === "ok") ok("Health data.status = ok");
    else fail(`Health status unexpected: ${JSON.stringify(health.json?.data)}`);
    if (health.json?.data?.db_driver) info(`  DB driver: ${health.json.data.db_driver}`);
    if (health.json?.data?.env)       info(`  Env:       ${health.json.data.env}`);
  }

  // ─── 2. CORS preflight ───────────────────────────────────────────────────────
  section("2. CORS PREFLIGHT");
  const frontendOrigin = FRONTEND_BASE.startsWith("https://") || FRONTEND_BASE.startsWith("http://")
    ? FRONTEND_BASE.replace(/(https?:\/\/[^/]+).*/, "$1")
    : null;
  const origins = [
    "https://onlineu.mx",
    "https://www.onlineu.mx",
    ...(frontendOrigin && !["https://onlineu.mx","https://www.onlineu.mx"].includes(frontendOrigin) ? [frontendOrigin] : []),
  ];

  for (const origin of origins) {
    const cors = await preflight("/api/v1/health", origin);
    if (cors.status === 0) {
      fail(`OPTIONS preflight failed (${origin}): ${cors.error}`);
    } else {
      const acao = cors.headers["access-control-allow-origin"] || "";
      const acah = cors.headers["access-control-allow-headers"] || "";
      if (acao.includes(origin) || acao === "*") {
        ok(`CORS allows origin ${origin}`);
      } else {
        fail(`CORS does NOT allow origin ${origin} (got: "${acao}")`);
      }
      if (acah.toLowerCase().includes("x-support-tenant-id")) {
        ok("CORS allows header X-Support-Tenant-ID");
      } else {
        fail(`CORS missing X-Support-Tenant-ID header (got: "${acah}")`);
        info("  Fix: add X-Support-Tenant-ID to AllowHeaders in backend CORS config.");
      }
    }
  }

  // ─── 3. Unauthenticated 401 checks ─────────────────────────────────────────
  section("3. UNAUTHENTICATED ENDPOINTS RETURN 401");
  const protectedEndpoints = [
    "/api/v1/school-admin/dashboard",
    "/api/v1/school-admin/academic/students",
    "/api/v1/school-admin/reports",
    "/api/v1/school-admin/documents/fake-id",
    "/api/v1/school-admin/report-cards/generate",
  ];

  for (const ep of protectedEndpoints) {
    const r = await request("GET", ep);
    if (r.status === 401) ok(`${ep} → 401 (correct)`);
    else if (r.status === 0) fail(`${ep} → network error: ${r.error}`);
    else fail(`${ep} → ${r.status} (expected 401)`);
  }

  // ─── 4. Super Admin login + support mode ─────────────────────────────────────
  if (!SA_EMAIL || !SA_PASSWORD) {
    section("4. SUPER ADMIN AUTH");
    skip("SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set");
  } else {
    section("4. SUPER ADMIN AUTH");
    const login = await request("POST", "/api/v1/auth/login", { email: SA_EMAIL, password: SA_PASSWORD });
    if (login.status !== 200 || !login.json?.data?.access_token) {
      fail(`Super Admin login failed: HTTP ${login.status} — ${JSON.stringify(login.json)}`);
    } else {
      ok("Super Admin login → 200 + access_token");
      const saToken = login.json.data.access_token;

      // Schools list
      const schools = await request("GET", "/api/v1/super-admin/schools?per_page=5", null, {
        Authorization: `Bearer ${saToken}`,
      });
      if (schools.status === 200) ok("GET /super-admin/schools → 200");
      else fail(`GET /super-admin/schools → ${schools.status}: ${JSON.stringify(schools.json)}`);

      // Support mode (needs SUPPORT_TENANT_ID)
      if (!SUPPORT_TENANT) {
        skip("SUPPORT_TENANT_ID not set — skipping support-mode school-admin checks");
      } else {
        const dash = await request("GET", "/api/v1/school-admin/dashboard", null, {
          Authorization: `Bearer ${saToken}`,
          "X-Support-Tenant-ID": SUPPORT_TENANT,
        });
        if (dash.status === 200) ok(`Support mode dashboard → 200 (tenant=${SUPPORT_TENANT.slice(0, 8)}...)`);
        else fail(`Support mode dashboard → ${dash.status}: ${JSON.stringify(dash.json)}`);

        const students = await request("GET", "/api/v1/school-admin/academic/students?per_page=5", null, {
          Authorization: `Bearer ${saToken}`,
          "X-Support-Tenant-ID": SUPPORT_TENANT,
        });
        if (students.status === 200) ok("Support mode GET /students → 200");
        else fail(`Support mode GET /students → ${students.status}: ${JSON.stringify(students.json)}`);

        const reports = await request("GET", "/api/v1/school-admin/reports", null, {
          Authorization: `Bearer ${saToken}`,
          "X-Support-Tenant-ID": SUPPORT_TENANT,
        });
        if (reports.status === 200) ok("Support mode GET /reports → 200");
        else fail(`Support mode GET /reports → ${reports.status}: ${JSON.stringify(reports.json)}`);
      }
    }
  }

  // ─── 5. School Admin login ────────────────────────────────────────────────────
  if (!SCH_EMAIL || !SCH_PASSWORD) {
    section("5. SCHOOL ADMIN AUTH");
    skip("SCHOOL_ADMIN_EMAIL / SCHOOL_ADMIN_PASSWORD not set");
  } else {
    section("5. SCHOOL ADMIN AUTH");
    const login = await request("POST", "/api/v1/auth/login", { email: SCH_EMAIL, password: SCH_PASSWORD });
    if (login.status !== 200 || !login.json?.data?.access_token) {
      fail(`School Admin login failed: HTTP ${login.status} — ${JSON.stringify(login.json)}`);
    } else {
      ok("School Admin login → 200 + access_token");
      const schToken = login.json.data.access_token;

      const checks = [
        ["GET", "/api/v1/school-admin/dashboard"],
        ["GET", "/api/v1/school-admin/academic/students?per_page=5"],
        ["GET", "/api/v1/school-admin/academic/groups"],
        ["GET", "/api/v1/school-admin/reports"],
        ["GET", "/api/v1/school-admin/academic/students?per_page=1"],
      ];
      for (const [method, ep] of checks) {
        const r = await request(method, ep, null, { Authorization: `Bearer ${schToken}` });
        if (r.status === 200) ok(`${method} ${ep} → 200`);
        else fail(`${method} ${ep} → ${r.status}: ${JSON.stringify(r.json)}`);
      }

      // Cross-tenant blocked (only if we have a SUPPORT_TENANT to try)
      if (SUPPORT_TENANT) {
        const crossTenant = await request("GET", "/api/v1/school-admin/academic/students?per_page=5", null, {
          Authorization: `Bearer ${schToken}`,
          "X-Support-Tenant-ID": SUPPORT_TENANT,
        });
        if (crossTenant.status === 403) ok("Cross-tenant X-Support-Tenant-ID rejected for SCHOOL_ADMIN (403) ✓ secure");
        else if (crossTenant.status === 200) fail("SECURITY: SCHOOL_ADMIN was able to use X-Support-Tenant-ID — this header must be ignored for non-SUPER_ADMIN");
        else info(`Cross-tenant check returned HTTP ${crossTenant.status} (inconclusive)`);
      }
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log(`✅ Passed:  ${passed}`);
  console.log(`❌ Failed:  ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log("─".repeat(60));
  if (failed > 0) {
    console.log("\n⚠️  Some checks failed. Review issues above.\n");
    process.exit(1);
  } else {
    console.log("\n🎉 All reachability checks passed!\n");
  }
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});
