#!/usr/bin/env node
/**
 * check-student-api.js
 *
 * Smoke tests the 4 STUDENT API endpoints end-to-end.
 * Logs in as a STUDENT user, fetches each endpoint, validates structure.
 *
 * Required env vars:
 *   STUDENT_EMAIL       - email of a user with role=STUDENT
 *   STUDENT_PASSWORD    - password for that user
 *   API_BASE_URL        - backend base URL (default: https://educore-production-beef.up.railway.app)
 *
 * Usage:
 *   STUDENT_EMAIL=alumno@escuela.com STUDENT_PASSWORD=*** node scripts/check-student-api.js
 *
 * If credentials are missing, the script prints SKIPPED and exits 0 (not a failure).
 */

"use strict";

const https  = require("https");
const http   = require("http");
const url    = require("url");

const API_BASE = (process.env.API_BASE_URL || "https://educore-production-beef.up.railway.app").replace(/\/$/, "");
const EMAIL    = process.env.STUDENT_EMAIL    || "";
const PASSWORD = process.env.STUDENT_PASSWORD || "";

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.error(`  ❌ ${msg}`); };
const warn = (msg) => console.log(`  ⚠️  ${msg}`);

let allPassed = true;
function check(ok, passMsg, failMsg) {
  if (ok) { pass(passMsg); return true; }
  fail(failMsg); allPassed = false; return false;
}

function request(method, endpoint, body, token) {
  return new Promise((resolve) => {
    const parsed  = url.parse(`${API_BASE}${endpoint}`);
    const lib     = parsed.protocol === "https:" ? https : http;
    const payload = body ? JSON.stringify(body) : null;

    const headers = {
      "Content-Type":  "application/json",
      "User-Agent":    "EduCore-StudentSmoke/1.0",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
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
        resolve({ status: res.statusCode, json });
      });
    });

    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, error: "timeout" }); });

    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("\n🎓 EduCore — Student API Smoke Test\n");

  if (!EMAIL || !PASSWORD) {
    warn("SKIPPED: STUDENT_EMAIL and/or STUDENT_PASSWORD not set.");
    warn("Set them to run live API checks:");
    warn("  STUDENT_EMAIL=alumno@esc.com STUDENT_PASSWORD=*** node scripts/check-student-api.js");
    console.log("\n─────────────────────────────────────────────────────────");
    console.log("SKIPPED (no credentials)\n");
    process.exit(0);
  }

  // ─── 1. Login ────────────────────────────────────────────────────────────────
  console.log(`[1. Login as STUDENT — ${EMAIL}]`);
  const loginRes = await request("POST", "/api/v1/auth/login", { email: EMAIL, password: PASSWORD });

  if (!check(loginRes.status === 200, `Login returned 200`, `Login failed with HTTP ${loginRes.status}: ${JSON.stringify(loginRes.json)}`)) {
    console.log("\nStopping — cannot continue without a valid token.");
    process.exit(1);
  }

  const token = loginRes.json?.data?.access_token || loginRes.json?.access_token;
  check(!!token, "access_token present in login response", "access_token missing from login response");

  const role = loginRes.json?.data?.user?.role || loginRes.json?.user?.role;
  check(role === "STUDENT", `User role is STUDENT (got: ${role})`, `Expected STUDENT role, got: ${role}`);

  if (!token) {
    console.log("\nStopping — no token to call protected endpoints.");
    process.exit(1);
  }

  // ─── 2. Dashboard ────────────────────────────────────────────────────────────
  console.log("\n[2. GET /api/v1/student/dashboard]");
  const dashRes = await request("GET", "/api/v1/student/dashboard", null, token);
  check(dashRes.status === 200, `dashboard returned 200`, `dashboard returned ${dashRes.status}: ${JSON.stringify(dashRes.json)}`);
  if (dashRes.json?.data) {
    const d = dashRes.json.data;
    check(typeof d.student === "object",            "dashboard.student object present",            "dashboard.student missing");
    check(typeof d.student?.first_name === "string","dashboard.student.first_name is string",       "dashboard.student.first_name missing");
    check(Array.isArray(d.recent_grades),            "dashboard.recent_grades is array",             "dashboard.recent_grades missing");
    check(typeof d.attendance_summary === "object",  "dashboard.attendance_summary present",         "dashboard.attendance_summary missing");
    check(typeof d.attendance_summary?.total_days === "number", "attendance_summary.total_days is number", "attendance_summary.total_days not a number");
  }

  // ─── 3. Profile ──────────────────────────────────────────────────────────────
  console.log("\n[3. GET /api/v1/student/profile]");
  const profRes = await request("GET", "/api/v1/student/profile", null, token);
  check(profRes.status === 200, `profile returned 200`, `profile returned ${profRes.status}: ${JSON.stringify(profRes.json)}`);
  if (profRes.json?.data) {
    const p = profRes.json.data;
    check(typeof p.id === "string",           "profile.id present",           "profile.id missing");
    check(typeof p.first_name === "string",   "profile.first_name present",   "profile.first_name missing");
    check(typeof p.tenant_id === "string",    "profile.tenant_id present",    "profile.tenant_id missing");
  }

  // ─── 4. Grades ───────────────────────────────────────────────────────────────
  console.log("\n[4. GET /api/v1/student/grades]");
  const gradesRes = await request("GET", "/api/v1/student/grades", null, token);
  check(gradesRes.status === 200, `grades returned 200`, `grades returned ${gradesRes.status}: ${JSON.stringify(gradesRes.json)}`);
  if (gradesRes.json?.data && Array.isArray(gradesRes.json.data)) {
    const g = gradesRes.json.data;
    if (g.length > 0) {
      check(typeof g[0].subject_name === "string",  "grade[0].subject_name is string",  "grade[0].subject_name wrong type");
      check(typeof g[0].grade === "number",          "grade[0].grade is number",          "grade[0].grade not a number");
      check(typeof g[0].period === "string",         "grade[0].period is string",         "grade[0].period missing");
    } else {
      pass("grades array is empty (no grades registered yet — OK)");
    }
  }

  // ─── 5. Attendance ───────────────────────────────────────────────────────────
  console.log("\n[5. GET /api/v1/student/attendance]");
  const attRes = await request("GET", "/api/v1/student/attendance", null, token);
  check(attRes.status === 200, `attendance returned 200`, `attendance returned ${attRes.status}: ${JSON.stringify(attRes.json)}`);
  if (attRes.json?.data) {
    const a = attRes.json.data;
    check(typeof a.total_days === "number", "attendance.total_days is number", "attendance.total_days wrong type");
    check(typeof a.rate === "number",       "attendance.rate is number",       "attendance.rate wrong type");
  }

  // ─── 6. Security checks ──────────────────────────────────────────────────────
  console.log("\n[6. Security — unauthenticated access must return 401]");
  const unauthRes = await request("GET", "/api/v1/student/dashboard", null, null);
  check(unauthRes.status === 401, `unauthenticated dashboard returns 401 (got ${unauthRes.status})`, `unauthenticated dashboard should return 401, got ${unauthRes.status}`);

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  if (allPassed) {
    console.log("🎉 All student API checks passed!\n");
  } else {
    console.log("⚠️  Some checks failed. Review above.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});
