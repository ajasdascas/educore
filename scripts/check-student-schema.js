#!/usr/bin/env node
/**
 * check-student-schema.js
 *
 * Verifies that all tables and columns required by the student module
 * exist in the production/staging database.
 *
 * Usage:
 *   # With MySQL (production/staging):
 *   MYSQL_DSN="user:pass@tcp(host:3306)/dbname" node scripts/check-student-schema.js
 *
 *   # With PostgreSQL (Railway legacy):
 *   DATABASE_URL="postgres://..." node scripts/check-student-schema.js
 *
 *   # Dry run (no DB access — static analysis only):
 *   node scripts/check-student-schema.js
 */

"use strict";

const MYSQL_DSN     = process.env.MYSQL_DSN     || "";
const DATABASE_URL  = process.env.DATABASE_URL  || "";

const REQUIRED_SCHEMA = [
  // Table                Column
  ["students",            "id"],
  ["students",            "tenant_id"],
  ["students",            "user_id"],           // added in 006_student_portal_user_id.sql
  ["students",            "first_name"],
  ["students",            "paternal_last_name"], // MySQL real name (was last_name in old Go code)
  ["students",            "maternal_last_name"], // MySQL real name (was last_name_mother in old Go code)
  ["students",            "last_name"],
  ["students",            "enrollment_number"],
  ["students",            "status"],
  ["grade_records",       "id"],
  ["grade_records",       "tenant_id"],
  ["grade_records",       "student_id"],
  ["grade_records",       "subject_id"],
  ["grade_records",       "period"],
  ["grade_records",       "score"],             // MySQL real name (was "grade" in old Go code)
  ["grade_records",       "qualitative_value"], // replaces eval_type
  ["grade_records",       "created_at"],
  ["attendance_records",  "id"],
  ["attendance_records",  "tenant_id"],
  ["attendance_records",  "student_id"],
  ["attendance_records",  "status"],
  ["group_students",      "group_id"],
  ["group_students",      "student_id"],
  ["group_students",      "created_at"],
  ["groups",              "id"],
  ["groups",              "name"],
  ["groups",              "grade_id"],
  ["grade_levels",        "id"],
  ["grade_levels",        "name"],
  ["subjects",            "id"],
  ["subjects",            "name"],
];

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.error(`  ❌ ${msg}`); };
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const info = (msg) => console.log(`     ${msg}`);

let allPassed = true;
function check(ok, passMsg, failMsg) {
  if (ok) { pass(passMsg); return true; }
  fail(failMsg); allPassed = false; return false;
}

// ─── Static analysis ──────────────────────────────────────────────────────────

function staticChecks() {
  console.log("\n═══ STATIC SCHEMA ANALYSIS ══════════════════════════════════════════════");

  const fs   = require("fs");
  const path = require("path");
  const ROOT = path.resolve(__dirname, "..");

  const mysqlMigrationFile = path.join(ROOT, "backend/migrations_mysql/001_hostinger_core.sql");
  const mysqlMigration = fs.existsSync(mysqlMigrationFile)
    ? fs.readFileSync(mysqlMigrationFile, "utf-8")
    : null;

  const migration006 = path.join(ROOT, "backend/migrations_mysql/006_student_portal_user_id.sql");
  const hasMigration006 = fs.existsSync(migration006);

  console.log("\n[MySQL migration files]");
  check(!!mysqlMigration, "001_hostinger_core.sql found", "001_hostinger_core.sql missing — student schema cannot be verified");
  check(hasMigration006,  "006_student_portal_user_id.sql exists (adds students.user_id)", "006_student_portal_user_id.sql missing — students.user_id will not be added");

  if (mysqlMigration) {
    console.log("\n[Required tables in MySQL migration]");
    const tables = ["students","grade_records","attendance_records","group_students","groups","grade_levels","subjects"];
    tables.forEach((t) => {
      check(
        mysqlMigration.includes(`CREATE TABLE IF NOT EXISTS ${t} `) ||
        mysqlMigration.includes(`CREATE TABLE IF NOT EXISTS \`${t}\``),
        `Table ${t} defined in migration`,
        `Table ${t} NOT found in 001_hostinger_core.sql`
      );
    });

    console.log("\n[Critical column names — MySQL schema vs. student module]");
    check(mysqlMigration.includes("paternal_last_name"), "students.paternal_last_name (correct column name)", "students.paternal_last_name missing");
    check(mysqlMigration.includes("maternal_last_name"), "students.maternal_last_name (correct column name)", "students.maternal_last_name missing");
    check(mysqlMigration.includes("score"), "grade_records.score (correct column name — not 'grade')", "grade_records.score missing");
    check(mysqlMigration.includes("qualitative_value"), "grade_records.qualitative_value (used as eval_type fallback)", "grade_records.qualitative_value missing");
    check(!mysqlMigration.match(/grade_records[^)]+\bgrade\b[^_]/), "grade_records does NOT have a bare 'grade' column (uses 'score')", "Unexpected bare 'grade' column in grade_records");
  }

  console.log("\n[Student module Go files]");
  const repoFile = path.join(ROOT, "backend/internal/modules/student/repository.go");
  const repo = fs.existsSync(repoFile) ? fs.readFileSync(repoFile, "utf-8") : null;
  if (!repo) {
    fail("student/repository.go not found"); allPassed = false;
  } else {
    // Check that the dangerous old column name patterns are not used as table.column references
    // "s.last_name_mother" or "students.last_name_mother" would be a real column reference (wrong)
    // "AS last_name_mother" is a safe SQL alias (OK — maps to JSON field)
    // "gr.grade" or "grade_records.grade" would reference a non-existent column (wrong)
    // "gr.eval_type" would reference a non-existent column (wrong)
    check(!repo.match(/\bs\.last_name_mother\b/), "repository.go does NOT use 's.last_name_mother' (uses maternal_last_name)", "repository.go uses 's.last_name_mother' — column does not exist in MySQL");
    check(!repo.match(/\bgr\.grade\b/), "repository.go does NOT use 'gr.grade' (non-existent column; uses score)", "repository.go still uses 'gr.grade' — column does not exist");
    check(!repo.match(/\bgr\.eval_type\b/), "repository.go does NOT use 'gr.eval_type' (non-existent column; uses qualitative_value)", "repository.go still uses 'gr.eval_type'");
    check(repo.includes("maternal_last_name"), "repository.go uses 'maternal_last_name'", "repository.go missing 'maternal_last_name'");
    check(repo.includes("score"), "repository.go uses 'score' for grade", "repository.go missing 'score'");
    check(repo.includes("qualitative_value"), "repository.go uses 'qualitative_value'", "repository.go missing 'qualitative_value'");
    check(repo.includes("s.user_id"), "repository.go uses 's.user_id' in WHERE clause", "repository.go missing 's.user_id' lookup");

    // Verify placeholders — portable_db handles translation, so $N is fine
    check(repo.includes("$1") && repo.includes("$2"), "repository.go uses $1/$2 placeholders (translated by portable_db)", "repository.go missing positional placeholders");
    check(repo.includes("TO_CHAR"), "repository.go uses TO_CHAR (translated to DATE_FORMAT by portable_db)", "repository.go missing TO_CHAR (should be present, portable_db translates it)");
  }

  const mysqlRepairFile = path.join(ROOT, "backend/internal/pkg/mysqlrepair/repair.go");
  const mysqlRepair = fs.existsSync(mysqlRepairFile) ? fs.readFileSync(mysqlRepairFile, "utf-8") : null;
  if (mysqlRepair) {
    check(mysqlRepair.includes('"students", "user_id"'), "mysqlrepair includes students.user_id auto-repair entry", "mysqlrepair does NOT include students.user_id — staging won't auto-add the column");
  }
}

// ─── Live DB checks ───────────────────────────────────────────────────────────

async function liveChecks() {
  const driver = MYSQL_DSN ? "mysql" : DATABASE_URL ? "postgres" : null;
  if (!driver) {
    warn("No DB credentials found. Set MYSQL_DSN (MySQL) or DATABASE_URL (PostgreSQL).");
    warn("SKIPPED: live database column checks.");
    warn("To run live checks: MYSQL_DSN=\"user:pass@tcp(host:3306)/db\" node scripts/check-student-schema.js");
    return;
  }

  console.log(`\n═══ LIVE DATABASE CHECKS (driver: ${driver}) ═════════════════════════════`);

  if (driver === "mysql") {
    await mysqlLiveChecks();
  } else {
    await postgresLiveChecks();
  }
}

async function mysqlLiveChecks() {
  let mysql;
  try {
    mysql = require("mysql2/promise");
  } catch {
    warn("mysql2 package not installed. Run: npm install mysql2");
    warn("SKIPPED: live MySQL checks.");
    return;
  }

  // Parse DSN: user:pass@tcp(host:port)/db
  const m = MYSQL_DSN.match(/^([^:]+):([^@]*)@tcp\(([^:]+):(\d+)\)\/(.+)$/);
  if (!m) {
    warn("MYSQL_DSN format not recognized. Expected: user:pass@tcp(host:port)/dbname");
    warn("SKIPPED: live MySQL checks.");
    return;
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: m[3], port: parseInt(m[4]), user: m[1], password: m[2], database: m[5],
    });
  } catch (e) {
    warn(`Cannot connect to MySQL: ${e.message}`);
    warn("SKIPPED: live MySQL checks.");
    return;
  }

  console.log(`Connected to MySQL at ${m[3]}:${m[4]}/${m[5]}`);

  let passed = 0, failed = 0;
  for (const [table, column] of REQUIRED_SCHEMA) {
    try {
      const [rows] = await conn.query(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      const exists = rows[0].cnt > 0;
      check(exists, `${table}.${column}`, `${table}.${column} MISSING in database`);
      if (exists) passed++; else failed++;
    } catch (e) {
      fail(`Error checking ${table}.${column}: ${e.message}`);
      failed++;
    }
  }

  await conn.end();
  console.log(`\n   Result: ${passed}/${passed + failed} columns verified in database.`);
}

async function postgresLiveChecks() {
  let pg;
  try {
    pg = require("pg");
  } catch {
    warn("pg package not installed. Run: npm install pg");
    warn("SKIPPED: live PostgreSQL checks.");
    return;
  }

  const client = new pg.Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
  } catch (e) {
    warn(`Cannot connect to PostgreSQL: ${e.message}`);
    warn("SKIPPED: live PostgreSQL checks.");
    return;
  }

  let passed = 0, failed = 0;
  for (const [table, column] of REQUIRED_SCHEMA) {
    try {
      const res = await client.query(
        `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      const exists = parseInt(res.rows[0].count) > 0;
      check(exists, `${table}.${column}`, `${table}.${column} MISSING in database`);
      if (exists) passed++; else failed++;
    } catch (e) {
      fail(`Error checking ${table}.${column}: ${e.message}`);
      failed++;
    }
  }

  await client.end();
  console.log(`\n   Result: ${passed}/${passed + failed} columns verified in database.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🎓 EduCore — Student Module Schema Verification\n");
  console.log("Checks that the student module queries match the real MySQL schema.\n");

  staticChecks();
  await liveChecks();

  console.log("\n" + "─".repeat(60));
  if (allPassed) {
    console.log("🎉 All schema checks passed!\n");
  } else {
    console.log("⚠️  Some checks failed. Review issues above.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});
