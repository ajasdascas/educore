#!/usr/bin/env node
/**
 * check-production-health.js
 * Checks deployment health: backend env vars, frontend config, API URL,
 * provider configuration status.
 *
 * Run: node scripts/check-production-health.js
 * Run: node scripts/check-production-health.js --live  (makes real HTTP request to backend)
 */
const fs   = require("fs");
const path = require("path");
const http = require("http");
const https= require("https");

const ROOT     = path.resolve(__dirname, "..");
const LIVE     = process.argv.includes("--live");

let passed = 0;
let failed = 0;
let skipped= 0;

function pass(msg)   { console.log(`  ✅ PASS    ${msg}`); passed++; }
function fail(msg)   { console.log(`  ❌ FAIL    ${msg}`); failed++; }
function skip(msg)   { console.log(`  ⬜ SKIP    ${msg}`); skipped++; }
function info(msg)   { console.log(`  ℹ️  INFO    ${msg}`); }

// ── Backend .env ──────────────────────────────────────────────────────────────
console.log("\n🏥 PRODUCTION HEALTH CHECK\n");
console.log("1. Backend required env vars (from backend/.env)");

const backendEnvPath = path.join(ROOT, "backend", ".env");
const backendEnvExamplePath = path.join(ROOT, "backend", ".env.example");
let backendEnv = {};

if (fs.existsSync(backendEnvPath)) {
  const lines = fs.readFileSync(backendEnvPath, "utf-8").split("\n");
  for (const l of lines) {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) backendEnv[m[1]] = m[2].trim();
  }
  info("Read backend/.env");
} else {
  skip("backend/.env not found — using process.env only");
  backendEnv = process.env;
}

function envSet(key) {
  return !!(backendEnv[key] && backendEnv[key].trim() !== "");
}

// Critical vars
const critical = [
  "DATABASE_URL", "JWT_SECRET",
];
const optional = [
  { key: "REDIS_URL",                   label: "Redis cache" },
  { key: "RESEND_API_KEY",             label: "Email (Resend)" },
  { key: "STRIPE_SECRET_KEY",          label: "Stripe payments" },
  { key: "BACKUP_S3_BUCKET",           label: "R2/S3 backups" },
  { key: "BACKUP_S3_ACCESS_KEY_ID",    label: "R2/S3 access key" },
  { key: "BACKUP_S3_SECRET_ACCESS_KEY",label: "R2/S3 secret key" },
  { key: "BACKUP_S3_ENDPOINT",         label: "R2/S3 endpoint" },
  { key: "FRONTEND_URL",               label: "Frontend URL (activation emails)" },
  { key: "APP_ENV",                    label: "App environment" },
];

for (const key of critical) {
  if (envSet(key)) pass(`${key} is set`);
  else fail(`${key} is NOT set — CRITICAL`);
}

console.log("\n2. Optional provider env vars (SKIPPED = not configured)");
for (const { key, label } of optional) {
  if (envSet(key)) pass(`${key} is set (${label})`);
  else skip(`${key} not set → ${label} PROVIDER NOT CONFIGURED`);
}

// ── Frontend env ──────────────────────────────────────────────────────────────
console.log("\n3. Frontend .env.local");
const frontendEnvPath = path.join(ROOT, "frontend", ".env.local");
let frontendEnv = {};
if (fs.existsSync(frontendEnvPath)) {
  const lines = fs.readFileSync(frontendEnvPath, "utf-8").split("\n");
  for (const l of lines) {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) frontendEnv[m[1]] = m[2].trim();
  }
  const apiUrl = frontendEnv["NEXT_PUBLIC_API_URL"] || "";
  if (!apiUrl) {
    fail("NEXT_PUBLIC_API_URL is not set");
  } else if (apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
    console.log(`  ⚠️  WARN    NEXT_PUBLIC_API_URL=${apiUrl} — localhost (dev ok, NOT production)`);
  } else {
    pass(`NEXT_PUBLIC_API_URL=${apiUrl}`);
  }
  const demoMode = frontendEnv["NEXT_PUBLIC_DEMO_MODE"] || "";
  if (demoMode === "true") {
    console.log(`  ⚠️  WARN    NEXT_PUBLIC_DEMO_MODE=true — must be false in production`);
  } else {
    pass("NEXT_PUBLIC_DEMO_MODE is not true");
  }
} else {
  skip("frontend/.env.local not found");
}

// ── Backend deployment indicator ─────────────────────────────────────────────
console.log("\n4. Deployment config");
const mainGoPath = path.join(ROOT, "backend", "cmd", "server", "main.go");
if (fs.existsSync(mainGoPath)) {
  const mainGo = fs.readFileSync(mainGoPath, "utf-8");
  if (mainGo.includes("railway.up.railway.app") || mainGo.includes("onlineu.mx") || mainGo.includes("academic.lat")) {
    pass("Production domain found in main.go CORS config");
  } else {
    console.log("  ⚠️  WARN    No production domain found in main.go CORS config");
  }
  if (mainGo.includes("/api/v1/health")) {
    pass("Health endpoint /api/v1/health exists");
  }
}

// ── Live health check ─────────────────────────────────────────────────────────
if (LIVE) {
  console.log("\n5. Live backend health check");
  const apiBase = backendEnv["NEXT_PUBLIC_API_URL"] || frontendEnv["NEXT_PUBLIC_API_URL"] || "http://localhost:8082";
  const url = `${apiBase}/api/v1/health`;
  info(`Calling ${url}`);
  const client = url.startsWith("https") ? https : http;
  const req = client.get(url, (res) => {
    let data = "";
    res.on("data", d => data += d);
    res.on("end", () => {
      if (res.statusCode === 200) pass(`Backend responded 200 OK`);
      else fail(`Backend responded ${res.statusCode}`);
    });
  });
  req.on("error", (e) => fail(`Backend unreachable: ${e.message}`));
  req.setTimeout(5000, () => { req.destroy(); fail("Backend health check timed out"); });
} else {
  skip("Live check — run with --live to test backend HTTP health");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`
────────────────────────────────────────────────────
  ✅ Passed  : ${passed}
  ❌ Failed  : ${failed}
  ⬜ Skipped : ${skipped}
────────────────────────────────────────────────────`);

if (failed > 0) {
  console.log("\nCRITICAL issues found. Fix before production.\n");
  process.exit(1);
} else {
  console.log("\nHealth check passed ✓\n");
}
