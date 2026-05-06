#!/usr/bin/env node
/**
 * Audit: MySQL/MariaDB compatibility of all backend Go files
 * Fails if it finds PostgreSQL-only syntax that the adapter does NOT handle.
 *
 * The portable_db adapter already translates:
 *   ILIKE -> LIKE
 *   TO_CHAR patterns
 *   INTERVAL 'N unit' (via intervalLiteral regex)
 *   NOW() -> CURRENT_TIMESTAMP
 *   ::cast -> removed
 *   NULLS LAST/FIRST -> removed
 *   gen_random_uuid() -> UUID()
 *   jsonb_build_object -> JSON_OBJECT
 *   ||' '|| -> CONCAT
 *   double-quoted identifiers -> backtick
 *   ON CONFLICT -> ON DUPLICATE KEY UPDATE
 *   INSERT ... RETURNING -> emulated
 *
 * Patterns that are NOT handled by the adapter and would break MySQL:
 *   jsonb_set(         — no MySQL equivalent in adapter
 *   INTERVAL '1 hour' — IS handled by adapter regex, but mark if used in new files
 *   NOW() + INTERVAL ' — handled (NOW replaced, then interval), but risky raw form
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
let passed = 0, failed = 0, warned = 0;

function check(label, ok, note = "") {
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}${note ? " — " + note : ""}`); failed++; }
}
function warn(label, note = "") {
  console.log(`  ⚠️  ${label}${note ? " — " + note : ""}`); warned++;
}
function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return ""; }
}

// ── Gather all .go files in backend/internal ──────────────────────────────
function walkGo(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkGo(full));
    else if (entry.name.endsWith(".go")) results.push(full);
  }
  return results;
}

const goFiles = walkGo(path.join(ROOT, "backend/internal"));
const allGo = goFiles.map((f) => ({ file: path.relative(ROOT, f), content: fs.readFileSync(f, "utf8") }));

console.log(`\n🗄️  EDUCORE — MySQL COMPATIBILITY AUDIT\n`);
console.log(`   Scanning ${allGo.length} backend Go files...\n`);

// ── 1. Patterns that adapter does NOT handle ──────────────────────────────
console.log("1. PostgreSQL-only patterns NOT in adapter");

const criticalPatterns = [
  { pattern: /jsonb_set\s*\(/i, label: "jsonb_set() — no MySQL equivalent in adapter" },
  {
    // FILTER (WHERE ...) is PostgreSQL-only. OK only when same file also has an explicit
    // IsMySQL / database.IsMySQL override that rewrites the query for MySQL.
    pattern: /\bFILTER\s*\(\s*WHERE\b/i,
    label: "FILTER (WHERE ...) aggregate — MySQL unsupported (must have IsMySQL override)",
    allowIfContains: /IsMySQL/,
  },
  { pattern: /\bWITH\s+RECURSIVE\b/i, label: "WITH RECURSIVE CTE — MySQL 8+ only, verify version" },
  { pattern: /array_agg\s*\(/i, label: "array_agg() — no MySQL equivalent" },
  { pattern: /string_agg\s*\(/i, label: "string_agg() — no MySQL equivalent (use GROUP_CONCAT)" },
  { pattern: /\bGENERATE_SERIES\b/i, label: "GENERATE_SERIES — no MySQL equivalent" },
];

let criticalFound = false;
for (const { pattern, label, allowIfContains } of criticalPatterns) {
  const hits = allGo.filter(({ content }) => {
    if (!pattern.test(content)) return false;
    if (allowIfContains && allowIfContains.test(content)) return false; // has manual override
    return true;
  });
  if (hits.length > 0) {
    criticalFound = true;
    console.log(`  ❌ ${label}`);
    hits.forEach(({ file }) => console.log(`     → ${file}`));
    failed++;
  } else {
    console.log(`  ✅ No unguarded ${label.split(" —")[0]} found`);
    passed++;
  }
}

// ── 2. Patterns that adapter DOES handle (verify they're not in new files
//       outside the module that already tested them) ────────────────────────
console.log("\n2. Adapter-handled patterns — verifying account + auth modules specifically");

const accountFile = read("backend/internal/modules/account/handler.go");
const authFile = read("backend/internal/modules/auth/handler.go");

check("account/handler.go: no jsonb_set", !accountFile.includes("jsonb_set("));
check("account/handler.go: no settings->>  JSONB operator (uses separate table)", !accountFile.includes("->>"));
check("account/handler.go: no ::jsonb cast", !accountFile.includes("::jsonb"));
check("account/handler.go: no ::text cast", !accountFile.includes("::text"));
check("account/handler.go: no ILIKE", !/ILIKE/i.test(accountFile));
check("account/handler.go: no RETURNING clause", !accountFile.includes("RETURNING"));
check("account/handler.go: no TO_CHAR", !accountFile.includes("TO_CHAR"));
check("account/handler.go: no INTERVAL string literal in query", !accountFile.includes("INTERVAL '"));
check("auth/handler.go: no INTERVAL string literal", !authFile.includes("INTERVAL '"));
check("auth/handler.go: no NOW() + INTERVAL raw form", !authFile.includes("NOW() + INTERVAL"));

// ── 3. account_settings migration exists ──────────────────────────────────
console.log("\n3. MySQL migration for account_settings");
check("migrations_mysql/012_account_profile_settings.sql exists",
  fs.existsSync(path.join(ROOT, "backend/migrations_mysql/012_account_profile_settings.sql")));

const migration012 = read("backend/migrations_mysql/012_account_profile_settings.sql");
check("Migration creates account_settings table", migration012.includes("CREATE TABLE IF NOT EXISTS account_settings"));
check("Migration has FK to users", migration012.includes("REFERENCES users(id)"));
check("Migration is idempotent (IF NOT EXISTS)", migration012.includes("IF NOT EXISTS"));
check("Migration uses DATETIME not TIMESTAMPTZ", !migration012.includes("TIMESTAMPTZ"));

// ── 4. Auth handler SQL ────────────────────────────────────────────────────
console.log("\n4. Auth handler SQL correctness");
check("ForgotPassword uses Go time.Add(1h) instead of SQL INTERVAL", authFile.includes("time.Now().UTC().Add(time.Hour)"));
check("ForgotPassword passes expiry as parameter $2", authFile.includes("invitation_expires_at = $2") || authFile.includes("invitation_expires_at = $2\n"));
check("ResetPassword compares expiry in WHERE (no INTERVAL)", authFile.includes("invitation_expires_at > NOW()"));

// ── 5. UpdateSettings uses account_settings table ─────────────────────────
console.log("\n5. Settings endpoint uses account_settings table");
check("GetSettings queries account_settings", accountFile.includes("FROM account_settings"));
check("UpdateSettings inserts into account_settings", accountFile.includes("INTO account_settings"));
check("UpdateSettings uses ON CONFLICT (handled by adapter)", accountFile.includes("ON CONFLICT (user_id)"));
check("No UPSERT-specific PostgreSQL syntax", !accountFile.includes("ON CONFLICT ON CONSTRAINT"));

// ── 6. password_hash null safety ─────────────────────────────────────────
console.log("\n6. NULL-safe password_hash handling");
check("UpdatePassword uses sql.NullString for password_hash", accountFile.includes("sql.NullString") && accountFile.includes("password_hash"));
check("UpdatePassword guards against NULL hash", accountFile.includes("!currentHash.Valid") || accountFile.includes("currentHash.String == \"\""));
check("GetSecurity uses sql.NullString for password_hash", accountFile.includes("sql.NullString") && accountFile.includes("HasPassword:"));
check("GetSecurity does not return password_hash to client", !accountFile.includes("json:\"password_hash\""));

// ── 7. New modules: teacher + student notifications/announcements ─────────────
console.log("\n7. New modules — MySQL-safe SQL (teacher/student notifications, announcements)");

const teacherRepo = read("backend/internal/modules/teacher/repository.go");
const studentRepo = read("backend/internal/modules/student/repository.go");

// Only check that CreateAnnouncement (new code) doesn't use RETURNING
const createAnnBlock = teacherRepo.split("func (r *Repository) CreateAnnouncement")[1] || "";
const nextFn = createAnnBlock.indexOf("\nfunc ");
const createAnnBody = nextFn > 0 ? createAnnBlock.slice(0, nextFn) : createAnnBlock.slice(0, 600);
check("teacher CreateAnnouncement: no RETURNING (MySQL-safe)", !createAnnBody.includes("RETURNING"));
check("teacher/repository.go: no ::jsonb cast",
  !teacherRepo.includes("::jsonb"));
check("teacher/repository.go: CreateAnnouncement uses database.NewID()",
  teacherRepo.includes("database.NewID()"));
check("teacher/repository.go: CreateAnnouncement uses Exec (not QueryRow+RETURNING)",
  teacherRepo.includes("r.db.Exec") && teacherRepo.includes("CreateAnnouncement"));
check("teacher/repository.go: MarkNotificationRead uses Exec",
  teacherRepo.includes("MarkNotificationRead") && teacherRepo.includes("r.db.Exec"));
check("student/repository.go: no RETURNING clause",
  !studentRepo.includes("RETURNING"));
check("student/repository.go: MarkNotificationRead uses Exec",
  studentRepo.includes("MarkNotificationRead") && studentRepo.includes("r.db.Exec"));

// ── 8. Scan for remaining Postgres patterns in entire backend ────────────
console.log("\n8. Full scan — remaining PostgreSQL patterns (adapter-handled, informational)");

const adapterHandled = [
  { pattern: /ILIKE/i, label: "ILIKE" },
  { pattern: /TO_CHAR\s*\(/i, label: "TO_CHAR" },
  { pattern: /RETURNING\s/i, label: "RETURNING" },
  { pattern: /::jsonb/i, label: "::jsonb cast" },
  { pattern: /::text/i, label: "::text cast" },
  { pattern: /INTERVAL\s+'[^']+'/i, label: "INTERVAL string literal" },
  { pattern: /NOW\(\)\s*\+\s*INTERVAL/i, label: "NOW() + INTERVAL" },
];

let adapterWarnings = 0;
for (const { pattern, label } of adapterHandled) {
  const hits = allGo
    .filter(({ content }) => pattern.test(content))
    .map(({ file }) => file);
  if (hits.length > 0) {
    adapterWarnings++;
    warn(`${label} found in ${hits.length} file(s) — adapter handles this`, hits.slice(0, 3).join(", "));
  } else {
    console.log(`  ✅ No ${label} outside adapter scope`);
    passed++;
  }
}

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
console.log(`  ✅ Passed:   ${passed}`);
console.log(`  ❌ Failed:   ${failed}`);
console.log(`  ⚠️  Warnings: ${warned} (adapter-handled, not blocking)`);
if (failed === 0) {
  console.log("\n  🎉 MySQL compatibility — all critical checks passed\n");
} else {
  console.log(`\n  🚨 ${failed} critical MySQL incompatibility issue(s) — fix before deploy\n`);
  process.exit(1);
}
