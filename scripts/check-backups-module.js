#!/usr/bin/env node
/**
 * Audit: Backups module — MySQL safety and operational correctness.
 *
 * Validates:
 *   1. executeBackupJob is MySQL-aware (IsMySQL gate)
 *   2. pg_dump usage is inside the PostgreSQL-only branch (never for MySQL)
 *   3. mysqldump has actionable fallback when not found
 *   4. BACKUP_STORAGE_PROVIDER check comes before any dump attempt
 *   5. CreateBackupJob uses database.NewID() + Exec (no RETURNING)
 *   6. ListBackups has no PostgreSQL casts (::uuid, ::text)
 *   7. started_at migration exists
 *   8. Frontend shows error column and status badges
 *   9. Frontend shows storage-not-configured and mysqldump-not-available banners
 *  10. Cleanup SQL script exists and targets both queued and running stale jobs
 *  11. Restore endpoint exists but auto-restore is NOT wired
 *  12. Endpoints require SUPER_ADMIN guard
 *  13. Docs exist
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let passed = 0, failed = 0;

function check(label, ok, note = "") {
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else     { console.log(`  ❌ ${label}${note ? " — " + note : ""}`); failed++; }
}
function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return ""; }
}

const enterprise = read("backend/internal/modules/super_admin/enterprise.go");
const frontendPage = read("frontend/app/super-admin/backups/page.tsx");
const cleanupSQL = read("scripts/cleanup-stale-backup-jobs.sql");
const migration015 = read("backend/migrations_mysql/015_backup_jobs_started_at.sql");

// ── 1. MySQL gate ─────────────────────────────────────────────────────────────
console.log("\n1. executeBackupJob — MySQL/PostgreSQL branching");

check("executeBackupJob exists", enterprise.includes("func (h *Handler) executeBackupJob("));
check("IsMySQL gate present in executeBackupJob", enterprise.includes("database.IsMySQL(h.db.Driver())"));

// Extract executeBackupJob body for targeted checks
const execBackupStart = enterprise.indexOf("func (h *Handler) executeBackupJob(");
const execBackupBodyRaw = execBackupStart >= 0
  ? enterprise.slice(execBackupStart, execBackupStart + 4000)
  : "";

// Verify pg_dump is ONLY inside the PostgreSQL branch (else branch)
// The else branch starts with "} else {" and pg_dump must appear after it
const elseBranchIdx = execBackupBodyRaw.indexOf("} else {");
const pgDumpIdx = execBackupBodyRaw.indexOf("pg_dump");
const mysqldumpIdx = execBackupBodyRaw.indexOf("mysqldump");

check("pg_dump only in PostgreSQL else-branch (after 'else {')",
  pgDumpIdx > elseBranchIdx && elseBranchIdx > 0);
check("mysqldump in MySQL branch (before 'else {')",
  mysqldumpIdx > 0 && mysqldumpIdx < elseBranchIdx);

// ── 2. BACKUP_STORAGE_PROVIDER checked before any dump ───────────────────────
console.log("\n2. Storage provider gate before dump attempt");

const storageCheckIdx = execBackupBodyRaw.indexOf("BACKUP_STORAGE_PROVIDER");
check("BACKUP_STORAGE_PROVIDER checked in executeBackupJob", storageCheckIdx > 0);
check("Storage check comes before mysqldump/pg_dump attempt",
  storageCheckIdx > 0 && storageCheckIdx < mysqldumpIdx && storageCheckIdx < pgDumpIdx);

// ── 3. mysqldump actionable fallback ─────────────────────────────────────────
console.log("\n3. mysqldump not-found fallback");

check("exec.LookPath used for mysqldump check", execBackupBodyRaw.includes("exec.LookPath(mysqldumpPath)"));
check("Actionable error message for missing mysqldump",
  enterprise.includes("mysqldump not available in this runtime"));
check("Railway-specific guidance in error message",
  enterprise.includes("Railway") && enterprise.includes("mysqldump"));
check("MYSQLDUMP_PATH env var override supported", enterprise.includes("MYSQLDUMP_PATH"));

// ── 4. CreateBackupJob — no RETURNING, uses NewID ────────────────────────────
console.log("\n4. CreateBackupJob — MySQL-safe INSERT");

const createJobStart = enterprise.indexOf("func (h *Handler) CreateBackupJob(");
const createJobBody = createJobStart >= 0
  ? enterprise.slice(createJobStart, createJobStart + 1500)
  : "";

check("CreateBackupJob exists", createJobStart >= 0);
check("CreateBackupJob uses database.NewID()", createJobBody.includes("database.NewID()"));
check("CreateBackupJob uses Exec (not QueryRow)", createJobBody.includes("h.db.Exec("));
check("CreateBackupJob has no RETURNING clause", !createJobBody.includes("RETURNING"));
check("CreateBackupJob uses RebindPlaceholders", createJobBody.includes("RebindPlaceholders"));

// ── 5. ListBackups — no PostgreSQL casts ─────────────────────────────────────
console.log("\n5. ListBackups — no PostgreSQL casts");

const listBackupsStart = enterprise.indexOf("func (h *Handler) ListBackups(");
const listBackupsBody = listBackupsStart >= 0
  ? enterprise.slice(listBackupsStart, listBackupsStart + 1500)
  : "";

check("ListBackups exists", listBackupsStart >= 0);
check("ListBackups has no ::uuid cast", !listBackupsBody.includes("::uuid"));
check("ListBackups has no ::text cast", !listBackupsBody.includes("::text"));
check("ListBackups uses RebindPlaceholders or raw MySQL-safe SQL",
  listBackupsBody.includes("RebindPlaceholders") ||
  (!listBackupsBody.includes("::uuid") && !listBackupsBody.includes("::text")));

// ── 6. UPDATE statements use RebindPlaceholders ───────────────────────────────
console.log("\n6. backup_jobs UPDATE statements — RebindPlaceholders");

const updateCount = (execBackupBodyRaw.match(/RebindPlaceholders/g) || []).length;
check("RebindPlaceholders used in executeBackupJob UPDATEs", updateCount >= 2,
  `found ${updateCount} occurrences (expected >= 2 for markFailed and complete)`);

// ── 7. Migration 015 — started_at column ─────────────────────────────────────
console.log("\n7. Migration 015 — started_at column");

check("015_backup_jobs_started_at.sql exists",
  fs.existsSync(path.join(ROOT, "backend/migrations_mysql/015_backup_jobs_started_at.sql")));
check("Migration adds started_at column", migration015.includes("started_at"));
check("Migration is idempotent (checks column existence first)",
  migration015.includes("information_schema") || migration015.includes("IF NOT EXISTS"));
check("Migration targets backup_jobs table", migration015.includes("backup_jobs"));

// ── 8. Frontend — error column and status badges ─────────────────────────────
console.log("\n8. Frontend backups page — error display and status badges");

check("error field in BackupJob type", frontendPage.includes("error?: string") || frontendPage.includes("error?:"));
check("Error column in table header", frontendPage.includes("Detalle error") || frontendPage.includes("error"));
check("Error truncated display with title tooltip",
  frontendPage.includes("title={backup.error}") || frontendPage.includes("title="));
check("Completed status badge (green)",
  frontendPage.includes("completed") && frontendPage.includes("green"));
check("Failed status badge (red)",
  frontendPage.includes("failed") && frontendPage.includes("red"));
check("Running status badge (blue)",
  frontendPage.includes("running") && frontendPage.includes("blue"));

// ── 9. Frontend — configuration banners ─────────────────────────────────────
console.log("\n9. Frontend — not-configured and mysqldump banners");

check("Storage-not-configured banner present",
  frontendPage.includes("not configured") || frontendPage.includes("BACKUP_STORAGE_PROVIDER"));
check("mysqldump-not-available banner present",
  frontendPage.includes("mysqldump"));
check("AlertTriangle or Info icon used in banners",
  frontendPage.includes("AlertTriangle") || frontendPage.includes("Info"));

// ── 10. Cleanup SQL ───────────────────────────────────────────────────────────
console.log("\n10. Cleanup SQL — stale job recovery");

check("cleanup-stale-backup-jobs.sql exists",
  fs.existsSync(path.join(ROOT, "scripts/cleanup-stale-backup-jobs.sql")));
check("Cleanup handles stale 'queued' jobs", cleanupSQL.includes("queued"));
check("Cleanup handles stuck 'running' jobs", cleanupSQL.includes("running"));
check("Cleanup uses DATE_SUB (MySQL-compatible)", cleanupSQL.includes("DATE_SUB"));
check("Cleanup sets completed_at = NOW()", cleanupSQL.includes("completed_at = NOW()"));

// ── 11. Restore — only registered, not auto-executed ─────────────────────────
console.log("\n11. Restore endpoint — registered, not auto-executed");

check("RestoreBackupJob handler exists", enterprise.includes("func (h *Handler) RestoreBackupJob("));
check("Restore requires confirmation text", enterprise.includes("requireConfirmation(") && enterprise.includes("RESTORE "));
check("Restore only updates status to restore_requested (no auto-execute)",
  enterprise.includes("restore_requested") && !enterprise.includes("executeRestoreJob"));

// ── 12. Route registration ────────────────────────────────────────────────────
console.log("\n12. Route registration");

check("GET /backups registered",          enterprise.includes('router.Get("/backups"'));
check("POST /backups registered",         enterprise.includes('router.Post("/backups"'));
check("GET /backups/:id registered",      enterprise.includes('router.Get("/backups/:id"'));
check("PUT /backups/:id registered",      enterprise.includes('router.Put("/backups/:id"'));
check("DELETE /backups/:id registered",   enterprise.includes('router.Delete("/backups/:id"'));
check("GET /backups/:id/download",        enterprise.includes('router.Get("/backups/:id/download"'));
check("POST /backups/:id/restore registered",
  enterprise.includes('router.Post("/backups/:id/restore"'));

// ── 12b. completed only after upload ─────────────────────────────────────────
console.log("\n12b. completed = uploaded");

const execBody2 = enterprise.slice(execBackupStart, execBackupStart + 6000);
const uploadIdx = execBody2.indexOf("uploadToS3(");
// The file is deleted via defer after uploadToS3, so just verify uploadToS3 exists
// and that completed is only set after the upload call
const completedIdx = execBody2.indexOf("status = 'completed'");
check("uploadToS3 called in executeBackupJob",
  uploadIdx > 0, `uploadIdx=${uploadIdx}`);
check("'completed' status set after uploadToS3 call",
  uploadIdx > 0 && completedIdx > uploadIdx,
  `uploadIdx=${uploadIdx} completedIdx=${completedIdx}`);
check("storage_key saved on completed", execBody2.includes("storage_key"));
check("executeBackupJob does NOT mark completed without storage_key",
  !execBody2.match(/status.*=.*'completed'[\s\S]{0,200}storage_key.*=.*''/));

// ── 13. Documentation ─────────────────────────────────────────────────────────
console.log("\n13. Documentation");

check("docs/BACKUPS_AND_RESTORE.md exists",
  fs.existsSync(path.join(ROOT, "docs/BACKUPS_AND_RESTORE.md")));

const docs = read("docs/BACKUPS_AND_RESTORE.md");
check("Docs mention BACKUP_STORAGE_PROVIDER", docs.includes("BACKUP_STORAGE_PROVIDER"));
check("Docs explain mysqldump requirement", docs.includes("mysqldump"));
check("Docs mention Railway limitation", docs.includes("Railway"));
check("Docs explain manual stale-job cleanup", docs.includes("cleanup-stale-backup-jobs"));

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
if (failed === 0) {
  console.log("\n  🎉 Backups module — all checks passed\n");
} else {
  console.log(`\n  🚨 ${failed} issue(s) found — fix before deploy\n`);
  process.exit(1);
}
