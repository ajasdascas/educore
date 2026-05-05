#!/usr/bin/env node
// check-school-reports-table.js — Verify school_reports table in MySQL

const MYSQL_DSN = process.env.MYSQL_DSN || process.env.DATABASE_URL;

let ok = 0, fail = 0;
function pass(msg) { console.log(`  ✅ ${msg}`); ok++; }
function failed(msg) { console.log(`  ❌ ${msg}`); fail++; }
function skip(msg) { console.log(`  ⏭️  SKIPPED: ${msg}`); }
function section(title) { console.log(`\n── ${title} ──`); }

section("school_reports table verification");

if (!MYSQL_DSN) {
  skip("MYSQL_DSN / DATABASE_URL not set — cannot connect to MySQL");
  skip("To run live checks: MYSQL_DSN='user:pass@tcp(host:3306)/dbname' node scripts/check-school-reports-table.js");
  console.log("\nManual verification SQL:");
  console.log("  SELECT COUNT(*) FROM information_schema.TABLES");
  console.log("    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'school_reports';");
  console.log("\nTo apply migration manually:");
  console.log("  mysql -h HOST -u USER -p DATABASE < backend/migrations_mysql/007_school_reports.sql");
  printSummary();
  process.exit(0);
}

// Try to load mysql2 (may not be installed)
let mysql;
try {
  mysql = require("mysql2/promise");
} catch {
  skip("mysql2 not installed — run: npm install mysql2");
  skip("Cannot verify table without mysql2");
  printSummary();
  process.exit(0);
}

// Parse DSN: user:pass@tcp(host:port)/dbname or mysql://user:pass@host:port/dbname
function parseDSN(dsn) {
  if (dsn.startsWith("mysql://")) {
    const url = new URL(dsn);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
    };
  }
  // user:pass@tcp(host:port)/dbname
  const m = dsn.match(/^([^:]+):([^@]*)@tcp\(([^:)]+):?(\d*)\)\/(.+)$/);
  if (!m) throw new Error(`Cannot parse DSN: ${dsn.replace(/:([^@]+)@/, ':***@')}`);
  return { host: m[3], port: parseInt(m[4]) || 3306, user: m[1], password: m[2], database: m[5] };
}

const REQUIRED_COLUMNS = [
  "id", "tenant_id", "name", "type", "status", "format",
  "group_id", "start_date", "end_date", "generated_by",
  "summary", "insights", "created_at", "completed_at", "deleted_at",
];

(async () => {
  let conn;
  try {
    const cfg = parseDSN(MYSQL_DSN);
    conn = await mysql.createConnection(cfg);
    pass("MySQL connection established");

    // Check table exists
    const [rows] = await conn.execute(
      "SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'school_reports'"
    );
    if (rows[0].cnt > 0) {
      pass("Table school_reports EXISTS");
    } else {
      failed("Table school_reports MISSING — apply: mysql < backend/migrations_mysql/007_school_reports.sql");
      printSummary();
      await conn.end();
      process.exit(1);
    }

    // Check columns
    const [cols] = await conn.execute(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'school_reports'"
    );
    const existing = new Set(cols.map(r => r.COLUMN_NAME));
    for (const col of REQUIRED_COLUMNS) {
      if (existing.has(col)) {
        pass(`Column ${col} present`);
      } else {
        failed(`Column ${col} MISSING`);
      }
    }

    // Check indexes
    const [indexes] = await conn.execute("SHOW INDEX FROM school_reports");
    const idxNames = [...new Set(indexes.map(r => r.Key_name))];
    if (idxNames.includes("idx_school_reports_tenant")) {
      pass("Index idx_school_reports_tenant present");
    } else {
      failed("Index idx_school_reports_tenant missing");
    }

  } catch (e) {
    failed(`DB check failed: ${e.message}`);
  } finally {
    if (conn) await conn.end();
  }
  printSummary();
  process.exit(fail > 0 ? 1 : 0);
})();

function printSummary() {
  console.log(`\n══════════════════════════════`);
  console.log(`  PASSED: ${ok}   FAILED: ${fail}`);
  console.log(`══════════════════════════════\n`);
}
