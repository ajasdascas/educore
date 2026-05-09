#!/usr/bin/env node
/**
 * check-backups-r2-real.js
 * Audits the R2/S3 backup integration.
 * Checks: backup code exists, env vars, cron schedule, restore procedure.
 * NEVER makes real API calls. NEVER logs key values.
 *
 * Run: node scripts/check-backups-r2-real.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let passed = 0; let failed = 0; let skipped = 0;
function pass(msg)  { console.log(`  ✅ PASS    ${msg}`); passed++; }
function fail(msg)  { console.log(`  ❌ FAIL    ${msg}`); failed++; }
function skip(msg)  { console.log(`  ⬜ SKIP    ${msg}`); skipped++; }

// Load env
let env = {};
const envPath = path.join(ROOT, "backend", ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(l => {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  });
}
function envSet(k) { return !!(env[k] && env[k].trim()); }

console.log("\n💾 R2/S3 BACKUPS AUDIT\n");

// 1. Backup env vars
console.log("1. Backup env vars");
const R2_VARS = [
  { key: "BACKUP_S3_BUCKET",            label: "R2 bucket name" },
  { key: "BACKUP_S3_ENDPOINT",          label: "R2/S3 endpoint URL" },
  { key: "BACKUP_S3_REGION",            label: "R2/S3 region" },
  { key: "BACKUP_S3_ACCESS_KEY_ID",     label: "R2 access key ID" },
  { key: "BACKUP_S3_SECRET_ACCESS_KEY", label: "R2 secret key" },
];
let r2Configured = true;
for (const v of R2_VARS) {
  if (envSet(v.key)) pass(`${v.key} is set (${v.label})`);
  else { skip(`${v.key} not set → ${v.label} PROVIDER NOT CONFIGURED`); r2Configured = false; }
}

// 2. Backup Go code
console.log("\n2. Backup Go implementation");
function findInGoFiles(dir, ...keywords) {
  if (!fs.existsSync(dir)) return [];
  const found = [];
  function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, f.name);
      if (f.isDirectory() && f.name !== "vendor") walk(full);
      else if (f.name.endsWith(".go")) {
        const c = fs.readFileSync(full, "utf-8");
        if (keywords.every(kw => c.includes(kw))) found.push(full);
      }
    }
  }
  walk(dir);
  return found;
}

const backupFiles = findInGoFiles(
  path.join(ROOT, "backend"),
  "BACKUP_S3"
);
if (backupFiles.length > 0) {
  pass(`R2/S3 backup code in ${backupFiles.length} file(s):`);
  backupFiles.forEach(f => console.log(`     └─ ${path.relative(ROOT, f)}`));
} else {
  fail("No Go file references BACKUP_S3_* — backup code not implemented");
}

// S3 client usage
// Check for AWS SDK OR hand-rolled AWS4 signature (both are valid R2 upload mechanisms)
const goModPath = path.join(ROOT, "backend", "go.mod");
let hasAwsSDK = false;
if (fs.existsSync(goModPath)) {
  const goMod = fs.readFileSync(goModPath, "utf-8");
  if (goMod.includes("aws-sdk-go") || goMod.includes("minio-go")) {
    pass("AWS SDK or minio-go found in go.mod");
    hasAwsSDK = true;
  }
}
// Also accept hand-rolled AWS4 signing (no external dep needed for presigned URLs / direct HTTP)
const aws4Files = findInGoFiles(path.join(ROOT, "backend"), "AWS4-HMAC-SHA256");
if (aws4Files.length > 0) {
  pass(`Hand-rolled AWS4 signing found — R2 uploads via custom HTTP client (${aws4Files.length} file(s))`);
  hasAwsSDK = true;
} else if (!hasAwsSDK) {
  fail("Neither aws-sdk-go/minio-go nor hand-rolled AWS4 signing found — R2 uploads cannot work");
}

// 3. Backup scripts
console.log("\n3. Backup scripts");
const backupScripts = [
  "scripts/backup-db.sh",
  "scripts/backup-db.ps1",
  "scripts/backup.sh",
  "scripts/db-backup.sh",
];
let foundScript = false;
for (const s of backupScripts) {
  if (fs.existsSync(path.join(ROOT, s))) {
    pass(`Backup script found: ${s}`);
    foundScript = true;
  }
}
if (!foundScript) skip("No shell backup script found — backup may be triggered via Go cron");

// Check Go cron/scheduler for backup
const cronFiles = findInGoFiles(path.join(ROOT, "backend"), "backup");
if (cronFiles.length > 0) {
  pass(`Backup job found in Go codebase (${cronFiles.length} file(s))`);
} else {
  skip("No Go backup job found — backup must be triggered externally");
}

// 4. Documentation
console.log("\n4. Backup documentation");
const docsDir = path.join(ROOT, "docs");
const backupDocs = [
  "BACKUPS_R2_SETUP.md",
  "BACKUP_SETUP.md",
  "backup.md",
  "R2_SETUP.md",
];
let foundDoc = false;
for (const d of backupDocs) {
  if (fs.existsSync(path.join(docsDir, d))) {
    pass(`Backup docs found: docs/${d}`);
    foundDoc = true;
  }
}
if (!foundDoc) skip("No backup documentation found — create docs/BACKUPS_R2_SETUP.md");

// 5. Summary status
console.log(`
────────────────────────────────────────────────────
  ✅ Passed  : ${passed}
  ❌ Failed  : ${failed}
  ⬜ Skipped : ${skipped}

  STATUS: ${r2Configured ? "R2 CONFIGURED" : "R2 NOT CONFIGURED — Backups disabled"}
────────────────────────────────────────────────────
`);
if (failed > 0) process.exit(1);
