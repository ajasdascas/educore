#!/usr/bin/env node
/**
 * check-no-secrets.js
 * Scans the repo for hardcoded secrets, API keys, tokens, and credentials.
 * Safe: never prints the actual secret value — only the filename + line number.
 *
 * Run: node scripts/check-no-secrets.js
 * Run: node scripts/check-no-secrets.js --strict  (exit 1 on any find)
 */
const fs   = require("fs");
const path = require("path");

const IS_STRICT = process.argv.includes("--strict");
const ROOT      = path.resolve(__dirname, "..");

// Files/dirs to skip
const SKIP_PATHS = [
  "node_modules", ".git", ".claude/worktrees", "dist", ".next", "out",
  "frontend/out", "frontend/.next", "backend/vendor",
  // reference/example files are OK
  ".env.example", ".env.local.example",
  // Documentation and runbooks may contain example values — skip their .md files
  "docs/obsidian", "DEPLOY.md", "README.md",
];

// Secret patterns — regex + label
const SECRET_PATTERNS = [
  { re: /RESEND_API_KEY\s*=\s*re_[A-Za-z0-9]{20,}/,    label: "Resend API key" },
  { re: /sk_live_[A-Za-z0-9]{20,}/,                     label: "Stripe live secret key" },
  { re: /sk_test_[A-Za-z0-9]{20,}/,                     label: "Stripe test secret key" },
  { re: /pk_live_[A-Za-z0-9]{20,}/,                     label: "Stripe live publishable key" },
  { re: /ABSK[A-Za-z0-9+/=]{50,}/,                      label: "AWS Bedrock API key" },
  { re: /AKIA[A-Z0-9]{16}/,                              label: "AWS access key ID" },
  { re: /ghp_[A-Za-z0-9]{36}/,                          label: "GitHub personal access token" },
  { re: /ghs_[A-Za-z0-9]{36}/,                          label: "GitHub Actions token" },
  { re: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, label: "Private key" },
  // Note: generic password= catches too many Go default-value patterns (bcrypt'd immediately).
  // We only flag SQL-style assignments and ENV-style assignments to avoid false positives.
  { re: /DB_PASSWORD\s*=\s*["'][^"']{3,}["']/,          label: "DB password hardcoded" },
  // JWT_SECRET in shell export / .env file (not in Go string comparisons)
  { re: /JWT_SECRET\s*=\s*["'][a-zA-Z0-9+/=_\-]{8,}["']/, label: "JWT secret hardcoded" },
  { re: /BACKUP_S3_SECRET_ACCESS_KEY\s*=\s*[A-Za-z0-9+/]{20,}/, label: "S3 secret key" },
  { re: /BACKUP_S3_ACCESS_KEY_ID\s*=\s*[A-Z0-9]{16,}/,  label: "S3 access key" },
  { re: /REDIS_URL\s*=\s*rediss?:\/\/:[^@]*@[^:\s]+/,   label: "Redis URL with password" },
];

// File extensions to scan
const SCAN_EXTS = new Set([".go",".ts",".tsx",".js",".jsx",".json",".yaml",".yml",".toml",".env",".sh",".ps1",".md"]);
// Always scan .env files even without extension match
const ALWAYS_SCAN = /\.env(\.|$)/;

let findings = 0;

function shouldSkip(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  return SKIP_PATHS.some(s => rel.includes(s));
}

function scanFile(filePath) {
  if (shouldSkip(filePath)) return;
  const ext  = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath);
  if (!SCAN_EXTS.has(ext) && !ALWAYS_SCAN.test(base)) return;

  let content;
  try { content = fs.readFileSync(filePath, "utf-8"); }
  catch { return; }

  const lines = content.split("\n");
  const rel   = path.relative(ROOT, filePath).replace(/\\/g, "/");

  // Skip .env.example files
  if (base.includes("example") || base.includes("sample")) return;
  // Skip files that are clearly documentation/templates showing blank values
  // (e.g. RESEND_API_KEY= with nothing after)

  for (const { re, label } of SECRET_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip commented-out lines
      if (line.trimStart().startsWith("//") || line.trimStart().startsWith("#")) continue;
      if (re.test(line)) {
        // For .env files, skip empty assignments like KEY=
        if (ALWAYS_SCAN.test(base)) {
          const assignMatch = line.match(/=\s*(.*)$/);
          if (assignMatch && (!assignMatch[1] || assignMatch[1].trim() === "")) continue;
        }
        // For .go files: skip lines that are adjacent to bcrypt hashing (provisioning defaults)
        if (ext === ".go") {
          const window = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 5)).join("\n");
          if (window.includes("bcrypt") || window.includes("GenerateFromPassword")) continue;
          // Skip documentation-style placeholder values in .md or comment strings
          if (line.includes("tu-jwt-secret") || line.includes("change-this") ||
              line.includes("your-secret") || line.includes("placeholder")) continue;
        }
        console.log(`  ⚠️  ${rel}:${i + 1} — ${label}`);
        findings++;
      }
    }
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full);
    else scanFile(full);
  }
}

console.log("\n🔐 SECRETS SCAN\n");
walk(ROOT);

if (findings === 0) {
  console.log("  ✅ No hardcoded secrets detected\n");
  console.log("────────────────────────────────────────────────────");
  console.log("  ✅ Clean — 0 secrets found");
  console.log("────────────────────────────────────────────────────\n");
} else {
  console.log(`\n────────────────────────────────────────────────────`);
  console.log(`  ❌ ${findings} potential secret(s) found — REVIEW IMMEDIATELY`);
  console.log(`  (Values are not printed to avoid exposure)`);
  console.log(`────────────────────────────────────────────────────\n`);
  if (IS_STRICT) process.exit(1);
}
