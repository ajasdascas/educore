#!/usr/bin/env node
// check-report-cards-export.js — Static + live checks for boletas PDF export

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://onlineu.mx/api";
const EMAIL = process.env.SUPER_ADMIN_EMAIL;
const PASS = process.env.SUPER_ADMIN_PASS;
const SUPPORT_TENANT = process.env.SUPPORT_TENANT_ID;

let ok = 0;
let fail = 0;

function pass(msg) { console.log(`  ✅ ${msg}`); ok++; }
function failed(msg) { console.log(`  ❌ ${msg}`); fail++; }
function skip(msg) { console.log(`  ⏭️  SKIPPED: ${msg}`); }
function section(title) { console.log(`\n── ${title} ──`); }

// ─── STATIC CHECKS ───────────────────────────────────────────────────────────

section("Static: report-cards/page.tsx");

const pagePath = path.join(__dirname, "../frontend/app/school-admin/report-cards/page.tsx");
if (!fs.existsSync(pagePath)) {
  failed("report-cards/page.tsx not found");
  process.exit(1);
}

const src = fs.readFileSync(pagePath, "utf8");

// Must NOT download JSON from the export button
if (src.includes('application/json') && src.includes('downloadPreview')) {
  failed("downloadPreview still uses application/json Blob — not fixed");
} else {
  pass("No JSON Blob in export path");
}

if (src.includes('.json"') && src.includes('link.download')) {
  failed("link.download still uses .json extension");
} else {
  pass("link.download does not use .json");
}

// Must use jsPDF
if (src.includes("jspdf") || src.includes("jsPDF")) {
  pass("jsPDF import found");
} else {
  failed("jsPDF not imported — PDF generation missing");
}

// Must have .pdf in filename
if (src.includes(".pdf")) {
  pass("PDF filename (.pdf) found in source");
} else {
  failed(".pdf extension not found — export may not produce PDF");
}

// Must keep authFetch for generate call
if (src.includes('authFetch') && src.includes('report-cards/generate')) {
  pass("authFetch used for generate endpoint");
} else {
  failed("authFetch for generate not found");
}

// Must NOT have downloadPreview calling JSON.stringify for the export
const downloadFn = src.match(/const downloadPDF[\s\S]*?^  };/m)?.[0] || src.match(/downloadPDF[\s\S]{0,800}/)?.[0] || "";
if (downloadFn.includes("JSON.stringify")) {
  failed("downloadPDF still uses JSON.stringify");
} else {
  pass("downloadPDF does not use JSON.stringify");
}

section("Static: reports/page.tsx");

const reportsPath = path.join(__dirname, "../frontend/app/school-admin/reports/page.tsx");
if (!fs.existsSync(reportsPath)) {
  failed("reports/page.tsx not found");
} else {
  const rSrc = fs.readFileSync(reportsPath, "utf8");
  if (rSrc.includes("response.data.filename") && rSrc.includes("response.data.content") && rSrc.includes("response.data.mime_type")) {
    pass("exportReport expects {filename, content, mime_type}");
  } else {
    failed("exportReport does not read {filename, content, mime_type}");
  }
  if (rSrc.includes("downloadTextFile")) {
    pass("downloadTextFile helper present");
  } else {
    failed("downloadTextFile helper missing");
  }
}

section("Static: backend reports.go ExportReport");

const reportsGoPath = path.join(__dirname, "../backend/internal/modules/school_admin/reports.go");
if (!fs.existsSync(reportsGoPath)) {
  failed("reports.go not found");
} else {
  const goSrc = fs.readFileSync(reportsGoPath, "utf8");
  if (goSrc.includes('"filename"') && goSrc.includes('"content"') && goSrc.includes('"mime_type"')) {
    pass("ExportReport returns {filename, content, mime_type}");
  } else {
    failed("ExportReport does not return expected shape");
  }
  if (goSrc.includes("buildExportContent") || goSrc.includes("buildCSVContent")) {
    pass("buildExportContent helper present");
  } else {
    failed("buildExportContent helper missing");
  }
  if (!goSrc.includes('"demo": true') && !goSrc.includes('"demo":true')) {
    pass("demo flag removed from ExportReport");
  } else {
    failed("demo flag still present in ExportReport");
  }
}

section("Static: MySQL migration 007_school_reports.sql");

const migPath = path.join(__dirname, "../backend/migrations_mysql/007_school_reports.sql");
if (!fs.existsSync(migPath)) {
  failed("007_school_reports.sql migration missing");
} else {
  const sql = fs.readFileSync(migPath, "utf8");
  if (sql.includes("CREATE TABLE IF NOT EXISTS school_reports")) {
    pass("Migration creates school_reports (IF NOT EXISTS)");
  } else {
    failed("Migration missing CREATE TABLE IF NOT EXISTS school_reports");
  }
  for (const col of ["tenant_id", "name", "type", "status", "format", "start_date", "end_date", "summary", "insights"]) {
    if (sql.includes(col)) {
      pass(`Column ${col} present`);
    } else {
      failed(`Column ${col} MISSING`);
    }
  }
}

section("Static: mysqlrepair includes school_reports");

const repairPath = path.join(__dirname, "../backend/internal/pkg/mysqlrepair/repair.go");
if (!fs.existsSync(repairPath)) {
  skip("mysqlrepair/repair.go not found");
} else {
  const repairSrc = fs.readFileSync(repairPath, "utf8");
  if (repairSrc.includes("school_reports")) {
    pass("school_reports table in stagingSchemaStatements");
  } else {
    failed("school_reports NOT in mysqlrepair — table won't be created in staging");
  }
}

// ─── LIVE CHECKS (only if credentials provided) ──────────────────────────────

section("Live checks");

if (!EMAIL || !PASS) {
  skip("SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASS not set — skipping live tests");
  printSummary();
  process.exit(fail > 0 ? 1 : 0);
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
    if (!token) { failed("Login failed"); printSummary(); process.exit(1); }
    pass("Login successful");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    if (SUPPORT_TENANT) headers["X-Support-Tenant-ID"] = SUPPORT_TENANT;

    // Get students
    const studentsRes = await fetch(`${BASE_URL}/v1/school-admin/academic/students?per_page=5`, { headers });
    const studentsData = await studentsRes.json();
    const students = studentsData?.data?.items || studentsData?.data || [];
    if (!students.length) { skip("No students found — skipping boleta export test"); }
    else {
      const studentId = students[0].id;

      // Generate report card
      const genRes = await fetch(`${BASE_URL}/v1/school-admin/report-cards/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ student_id: studentId, period: "current", include_attendance: true, include_comments: true }),
      });
      const genData = await genRes.json();
      if (genData?.success) {
        pass(`GenerateReportCard OK — student ${studentId}`);
      } else {
        failed(`GenerateReportCard failed: ${genData?.error || JSON.stringify(genData)}`);
      }
    }

    // Generate school report
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const reportRes = await fetch(`${BASE_URL}/v1/school-admin/reports/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "academic_summary", format: "csv", group_id: "all", start_date: monthStart, end_date: today, include_charts: true, include_details: true }),
    });
    const reportData = await reportRes.json();
    if (reportData?.success && reportData?.data?.id) {
      pass(`GenerateReport OK — id ${reportData.data.id}`);
      const reportId = reportData.data.id;

      // Export report
      const exportRes = await fetch(`${BASE_URL}/v1/school-admin/reports/${reportId}/export`, { method: "POST", headers });
      const exportData = await exportRes.json();
      if (exportData?.success && exportData?.data?.filename && exportData?.data?.content && exportData?.data?.mime_type) {
        pass(`ExportReport OK — ${exportData.data.filename} (${exportData.data.mime_type})`);
        if (exportData.data.filename.endsWith(".csv") || exportData.data.filename.endsWith(".json")) {
          pass("Export filename has correct extension");
        } else {
          failed(`Unexpected filename: ${exportData.data.filename}`);
        }
      } else {
        failed(`ExportReport failed: ${JSON.stringify(exportData?.data || exportData)}`);
      }
    } else {
      // Check for Error 1146
      const errMsg = reportData?.error || reportData?.message || JSON.stringify(reportData);
      if (errMsg.includes("1146") || errMsg.includes("school_reports")) {
        failed(`Table school_reports missing in production — apply migration 007_school_reports.sql: ${errMsg}`);
      } else {
        failed(`GenerateReport failed: ${errMsg}`);
      }
    }
  } catch (e) {
    failed(`Live check exception: ${e.message}`);
  }
  printSummary();
  process.exit(fail > 0 ? 1 : 0);
})();

function printSummary() {
  console.log(`\n══════════════════════════════`);
  console.log(`  PASSED: ${ok}   FAILED: ${fail}`);
  console.log(`══════════════════════════════\n`);
}
