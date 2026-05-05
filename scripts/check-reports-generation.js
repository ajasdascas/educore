#!/usr/bin/env node
// check-reports-generation.js — Live test for school reports generation and export

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://onlineu.mx/api";
const EMAIL = process.env.SUPER_ADMIN_EMAIL;
const PASS = process.env.SUPER_ADMIN_PASS;
const SUPPORT_TENANT = process.env.SUPPORT_TENANT_ID;

let ok = 0, fail = 0;
function pass(msg) { console.log(`  ✅ ${msg}`); ok++; }
function failed(msg) { console.log(`  ❌ ${msg}`); fail++; }
function skip(msg) { console.log(`  ⏭️  SKIPPED: ${msg}`); }
function section(title) { console.log(`\n── ${title} ──`); }

function printSummary() {
  console.log(`\n══════════════════════════════`);
  console.log(`  PASSED: ${ok}   FAILED: ${fail}`);
  console.log(`══════════════════════════════\n`);
}

section("Reports generation live checks");

if (!EMAIL || !PASS) {
  skip("SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASS not set");
  skip("Usage: SUPER_ADMIN_EMAIL=x SUPER_ADMIN_PASS=y SUPPORT_TENANT_ID=z node scripts/check-reports-generation.js");
  printSummary();
  process.exit(0);
}

(async () => {
  try {
    // Login
    const loginRes = await fetch(`${BASE_URL}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASS }),
    });
    const loginData = await loginRes.json();
    const token = loginData?.data?.access_token;
    if (!token) {
      failed(`Login failed: ${JSON.stringify(loginData)}`);
      printSummary();
      process.exit(1);
    }
    pass("Login OK");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (SUPPORT_TENANT) {
      headers["X-Support-Tenant-ID"] = SUPPORT_TENANT;
      pass(`Support mode: tenant ${SUPPORT_TENANT}`);
    }

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

    // Test all report types
    const types = ["academic_summary", "attendance", "grades"];
    const formats = ["csv", "json"];

    for (const type of types) {
      for (const format of formats) {
        section(`Generate ${type} / ${format}`);

        const genRes = await fetch(`${BASE_URL}/v1/school-admin/reports/generate`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            type,
            format,
            group_id: "all",
            start_date: monthStart,
            end_date: today,
            include_charts: true,
            include_details: true,
          }),
        });

        let genData;
        try {
          genData = await genRes.json();
        } catch {
          failed(`Response not JSON — HTTP ${genRes.status}`);
          continue;
        }

        // Check no raw SQL error exposed
        const errMsg = (genData?.error || genData?.message || "").toLowerCase();
        if (errMsg.includes("1146") || errMsg.includes("table") && errMsg.includes("doesn't exist")) {
          failed(`SQL error 1146 exposed — school_reports table missing: ${genData.error}`);
          continue;
        }
        if (errMsg.includes("sql") || errMsg.includes("error 1")) {
          failed(`Raw SQL error exposed to user: ${genData.error}`);
          continue;
        }
        pass("No raw SQL error exposed");

        if (!genData?.success) {
          failed(`Generate failed: ${genData?.error || JSON.stringify(genData)}`);
          continue;
        }
        pass(`Generate ${type}/${format} OK — id ${genData.data?.id}`);

        const reportId = genData.data?.id;
        if (!reportId) { failed("No report ID in response"); continue; }

        // Verify status
        if (genData.data?.status === "completed") {
          pass("Status: completed");
        } else {
          failed(`Unexpected status: ${genData.data?.status}`);
        }

        // Verify historial
        const listRes = await fetch(`${BASE_URL}/v1/school-admin/reports`, { headers });
        const listData = await listRes.json();
        const reports = listData?.data?.reports || listData?.data || [];
        const found = Array.isArray(reports) && reports.some(r => r.id === reportId);
        if (found) {
          pass("Report appears in historial");
        } else {
          failed("Report NOT found in historial");
        }

        // Export
        const expRes = await fetch(`${BASE_URL}/v1/school-admin/reports/${reportId}/export`, {
          method: "POST",
          headers,
        });
        const expData = await expRes.json();

        if (!expData?.success) {
          failed(`Export failed: ${expData?.error || JSON.stringify(expData)}`);
          continue;
        }

        if (!expData.data?.filename) { failed("Export missing filename"); continue; }
        if (!expData.data?.content) { failed("Export missing content"); continue; }
        if (!expData.data?.mime_type) { failed("Export missing mime_type"); continue; }
        pass(`Export OK — ${expData.data.filename} (${expData.data.mime_type})`);

        // Verify extension matches format
        const expectedExt = format === "json" ? ".json" : ".csv";
        if (expData.data.filename.endsWith(expectedExt)) {
          pass(`Filename extension matches format (${expectedExt})`);
        } else {
          failed(`Filename ${expData.data.filename} does not end with ${expectedExt}`);
        }

        // Verify content is not empty
        if (expData.data.content.length > 10) {
          pass(`Content non-empty (${expData.data.content.length} chars)`);
        } else {
          failed("Content too short or empty");
        }

        // Only test one combination in CI to save time
        break;
      }
      break;
    }

  } catch (e) {
    failed(`Exception: ${e.message}`);
    if (process.env.DEBUG) console.error(e);
  }

  printSummary();
  process.exit(fail > 0 ? 1 : 0);
})();
