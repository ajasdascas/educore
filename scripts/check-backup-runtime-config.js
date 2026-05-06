#!/usr/bin/env node
/**
 * Audit: Backup runtime configuration and download-URL flow.
 *
 * Validates:
 *  1. R2/S3 env vars documented in .env.example or README
 *  2. executeBackupJob checks BACKUP_STORAGE_PROVIDER before any dump
 *  3. Backup is only marked completed AFTER uploadToS3 succeeds
 *  4. storage_key is saved alongside completed status (no orphaned entries)
 *  5. Download endpoint returns a signed URL as JSON (not a redirect)
 *  6. Frontend uses authFetch to obtain the signed URL, then window.open
 *  7. No direct window.open to a protected backend endpoint
 *  8. Presigned URL expires in a reasonable time (≤ 30 min)
 *  9. generatePresignedURL supports custom endpoint (Cloudflare R2 path-style)
 * 10. uploadToS3 uses AWS Sig V4 (hmacSign / sha256Hash helpers present)
 * 11. mysqldump LookPath guard — actionable error if not found
 * 12. MYSQLDUMP_PATH env override supported
 * 13. Temp file cleaned up via defer (not before upload)
 * 14. No public_html path referenced in backup storage
 * 15. QA scripts exist for both backups-module and super-admin-users
 */

const fs   = require("fs");
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
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const enterprise   = read("backend/internal/modules/super_admin/enterprise.go");
const frontendPage = read("frontend/app/super-admin/backups/page.tsx");
const envExample   = read(".env.example");
const docs         = read("docs/BACKUPS_AND_RESTORE.md");

// Extract executeBackupJob body (first 7000 chars for broad coverage)
const execStart = enterprise.indexOf("func (h *Handler) executeBackupJob(");
const execBody  = execStart >= 0 ? enterprise.slice(execStart, execStart + 7000) : "";

// Extract DownloadBackupURL body
const dlStart = enterprise.indexOf("func (h *Handler) DownloadBackupURL(");
const dlBody  = dlStart >= 0 ? enterprise.slice(dlStart, dlStart + 1200) : "";

// ── 1. R2/S3 env vars documented ─────────────────────────────────────────────
console.log("\n1. R2/S3 env vars documented");

check("BACKUP_S3_BUCKET documented",           envExample.includes("BACKUP_S3_BUCKET")           || docs.includes("BACKUP_S3_BUCKET"));
check("BACKUP_S3_ENDPOINT documented",         envExample.includes("BACKUP_S3_ENDPOINT")         || docs.includes("BACKUP_S3_ENDPOINT"));
check("BACKUP_S3_ACCESS_KEY_ID documented",    envExample.includes("BACKUP_S3_ACCESS_KEY_ID")    || docs.includes("BACKUP_S3_ACCESS_KEY_ID"));
check("BACKUP_S3_SECRET_ACCESS_KEY documented",envExample.includes("BACKUP_S3_SECRET_ACCESS_KEY")|| docs.includes("BACKUP_S3_SECRET_ACCESS_KEY"));
check("BACKUP_STORAGE_PROVIDER documented",    envExample.includes("BACKUP_STORAGE_PROVIDER")    || docs.includes("BACKUP_STORAGE_PROVIDER"));

// ── 2. Storage provider gate before dump ─────────────────────────────────────
console.log("\n2. Storage provider gate before dump");

const storageCheckIdx  = execBody.indexOf("BACKUP_STORAGE_PROVIDER");
const mysqldumpIdx     = execBody.indexOf("mysqldump");
const pgDumpIdx        = execBody.indexOf("pg_dump");

check("BACKUP_STORAGE_PROVIDER checked in executeBackupJob", storageCheckIdx > 0);
check("Storage check comes before mysqldump/pg_dump",
  storageCheckIdx > 0 && storageCheckIdx < mysqldumpIdx && storageCheckIdx < pgDumpIdx);

// ── 3. completed only after upload ────────────────────────────────────────────
console.log("\n3. completed status set only after upload");

const uploadIdx    = execBody.indexOf("uploadToS3(");
const completedIdx = execBody.indexOf("status = 'completed'");

check("uploadToS3 called in executeBackupJob",     uploadIdx > 0,    `uploadIdx=${uploadIdx}`);
check("completed status set after uploadToS3 call",
  uploadIdx > 0 && completedIdx > uploadIdx,
  `uploadIdx=${uploadIdx} completedIdx=${completedIdx}`);

// ── 4. storage_key saved with completed ───────────────────────────────────────
console.log("\n4. storage_key saved on completed");

const completedBlock = completedIdx > 0 ? execBody.slice(completedIdx, completedIdx + 600) : "";
check("storage_key saved in completed UPDATE", completedBlock.includes("storage_key"));
check("No empty storage_key on completed",
  !execBody.match(/status.*=.*'completed'[\s\S]{0,200}storage_key.*=.*''/));

// ── 5. Download endpoint returns JSON signed URL ──────────────────────────────
console.log("\n5. Download endpoint returns JSON (not redirect)");

check("DownloadBackupURL handler exists",      dlBody.includes("func (h *Handler) DownloadBackupURL("));
check("generatePresignedURL called",           dlBody.includes("generatePresignedURL("));
check("response.Success used (JSON response)", dlBody.includes("response.Success("));
check("No HTTP 302 redirect in download handler",
  !dlBody.includes("StatusFound") && !dlBody.includes("c.Redirect("));
check("URL field in JSON response",            dlBody.includes(`"url"`));
check("expires_at field in JSON response",     dlBody.includes(`"expires_at"`));

// ── 6. Frontend uses authFetch for signed URL ─────────────────────────────────
console.log("\n6. Frontend download flow — authFetch + window.open(signedUrl)");

check("downloadBackup function exists",          frontendPage.includes("downloadBackup"));
check("authFetch used in downloadBackup",
  frontendPage.includes("authFetch") && frontendPage.includes("download-url"));
check("window.open called with signedUrl variable",
  frontendPage.includes("window.open(signedUrl") || frontendPage.includes("window.open(signedURL"));
check("setActionLoading used during download",   frontendPage.includes("setActionLoading(backup.id)"));

// ── 7. No direct window.open to protected endpoint ────────────────────────────
console.log("\n7. No direct window.open to protected endpoint");

check("No window.open directly to /backups/:id/download",
  !frontendPage.match(/window\.open\([^)]*\/backups\/[^)]*\/download[^-]/));
check("No window.open directly to /backups/:id (raw protected endpoint)",
  !frontendPage.match(/window\.open\([^)]*\/api\/v1\/super-admin\/backups\/[^)]*\)/));

// ── 8. Presigned URL expiry ────────────────────────────────────────────────────
console.log("\n8. Presigned URL expiry ≤ 30 min");

const presignFn = enterprise.indexOf("func (h *Handler) generatePresignedURL(");
const presignBody = presignFn > 0 ? enterprise.slice(presignFn, presignFn + 1500) : "";

// expires = 900 (15 min) or 1800 (30 min) — accept any value ≤ 1800
const expiresMatch = presignBody.match(/expires\s*:?=\s*(\d+)/);
const expiresVal   = expiresMatch ? parseInt(expiresMatch[1], 10) : 0;
check(`Presigned URL expiry set (found ${expiresVal}s)`,
  expiresVal > 0 && expiresVal <= 1800,
  expiresVal === 0 ? "could not find expires value" : `${expiresVal}s > 1800s (30 min)`);

// ── 9. R2 path-style support in generatePresignedURL ─────────────────────────
console.log("\n9. Cloudflare R2 path-style URL support");

check("Custom endpoint override in generatePresignedURL", presignBody.includes("BACKUP_S3_ENDPOINT"));
check("Path-style key construction (bucket + '/' + key)",
  presignBody.includes('bucket + "/" + key') || presignBody.includes("bucket+\"/\"+key") || presignBody.includes("bucket + \"/\" + key"));

// ── 10. AWS Sig V4 primitives ─────────────────────────────────────────────────
console.log("\n10. AWS Sig V4 primitives");

check("hmacSign helper present",   enterprise.includes("func hmacSign("));
check("sha256Hash helper present", enterprise.includes("func sha256Hash("));
check("AWS4-HMAC-SHA256 algorithm used",
  enterprise.includes("AWS4-HMAC-SHA256"));
check("Signing key chain: date → region → s3 → aws4_request",
  enterprise.includes(`"aws4_request"`) && enterprise.includes(`"s3"`));

// ── 11. mysqldump LookPath guard ──────────────────────────────────────────────
console.log("\n11. mysqldump availability check");

check("exec.LookPath used for mysqldump",        execBody.includes("exec.LookPath(mysqldumpPath)"));
check("Actionable error for missing mysqldump",  enterprise.includes("mysqldump not available in this runtime"));
check("Railway guidance included",               enterprise.includes("Railway") && enterprise.includes("mysqldump"));

// ── 12. MYSQLDUMP_PATH env override ──────────────────────────────────────────
console.log("\n12. MYSQLDUMP_PATH override");

check("MYSQLDUMP_PATH env var supported",        enterprise.includes("MYSQLDUMP_PATH"));

// ── 13. Temp file cleanup via defer (not before upload) ───────────────────────
console.log("\n13. Temp file cleanup via defer");

const deferCleanupIdx = execBody.indexOf("defer func()");
check("defer used for temp file cleanup",        deferCleanupIdx > 0);
// defer registration must appear before uploadToS3 call in source text,
// but execution happens last — this verifies the pattern, not execution order
check("defer cleanup registered before upload call",
  deferCleanupIdx > 0 && deferCleanupIdx < uploadIdx,
  `deferIdx=${deferCleanupIdx} uploadIdx=${uploadIdx}`);

// ── 14. No public_html path ───────────────────────────────────────────────────
console.log("\n14. No public_html in backup storage path");

check("No public_html in executeBackupJob",  !execBody.includes("public_html"));
check("No public_html in uploadToS3",
  !enterprise.slice(enterprise.indexOf("func (h *Handler) uploadToS3"), enterprise.indexOf("func (h *Handler) uploadToS3") + 2000).includes("public_html"));

// ── 15. QA scripts exist ──────────────────────────────────────────────────────
console.log("\n15. QA scripts present");

check("check-backups-module.js exists",    exists("scripts/check-backups-module.js"));
check("check-super-admin-users.js exists", exists("scripts/check-super-admin-users.js"));
check("check-backup-runtime-config.js exists (this file)", exists("scripts/check-backup-runtime-config.js"));

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
if (failed === 0) {
  console.log("\n  🎉 Backup runtime config — all checks passed\n");
} else {
  console.log(`\n  🚨 ${failed} issue(s) found — fix before deploy\n`);
  process.exit(1);
}
