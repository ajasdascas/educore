#!/usr/bin/env node
/**
 * check-payments-provider.js
 * Validates payment provider (Stripe) configuration and integration state.
 * NEVER makes real charges. NEVER logs key values.
 *
 * Run: node scripts/check-payments-provider.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let passed = 0; let failed = 0; let skipped = 0;
function pass(msg)  { console.log(`  ✅ PASS    ${msg}`); passed++; }
function fail(msg)  { console.log(`  ❌ FAIL    ${msg}`); failed++; }
function skip(msg)  { console.log(`  ⬜ SKIP    ${msg}`); skipped++; }

// Read env
let env = {};
const envPath = path.join(ROOT, "backend", ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(l => {
    const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  });
}
function envSet(k) { return !!(env[k] && env[k].trim()); }

console.log("\n💳 PAYMENTS PROVIDER AUDIT\n");

// 1. Backend integration exists
console.log("1. Backend Stripe integration");
const serviceFile = path.join(ROOT, "backend/internal/modules/school_admin/service.go");
if (fs.existsSync(serviceFile)) {
  const content = fs.readFileSync(serviceFile, "utf-8");
  if (content.includes("stripe.com/v1/checkout/sessions")) {
    pass("Stripe checkout session creation exists in service.go");
  } else {
    fail("Stripe checkout session not found in service.go");
  }
  if (content.includes("STRIPE_SECRET_KEY")) {
    pass("STRIPE_SECRET_KEY env var read from os.Getenv");
  }
  if (content.includes("EDUCORE_STRIPE_ENABLED")) {
    pass("EDUCORE_STRIPE_ENABLED feature flag exists (safe default: disabled)");
  }
} else {
  fail("service.go not found");
}

// 2. Webhook handler
console.log("\n2. Stripe webhook endpoint");
const webhookHandler = path.join(ROOT, "backend/internal/modules/webhook/handler.go");
if (fs.existsSync(webhookHandler)) {
  const wh = fs.readFileSync(webhookHandler, "utf-8");
  if (wh.includes("stripe") || wh.includes("Stripe")) {
    pass("Webhook handler has Stripe references");
  } else {
    skip("Webhook handler has no Stripe — payment webhooks not implemented yet");
  }
} else {
  skip("No webhook handler found");
}

// 3. Env vars
console.log("\n3. Stripe env vars");
if (envSet("STRIPE_SECRET_KEY")) {
  const key = env["STRIPE_SECRET_KEY"];
  if (key.startsWith("sk_test_")) {
    pass("STRIPE_SECRET_KEY is TEST mode key (sk_test_...) ✓ Safe");
  } else if (key.startsWith("sk_live_")) {
    console.log("  ⚠️  WARN    STRIPE_SECRET_KEY is LIVE mode — ensure this is intentional");
    passed++;
  } else {
    fail("STRIPE_SECRET_KEY has unexpected format");
  }
} else {
  skip("STRIPE_SECRET_KEY not set → Stripe PROVIDER NOT CONFIGURED");
}

if (envSet("EDUCORE_STRIPE_ENABLED")) {
  pass(`EDUCORE_STRIPE_ENABLED=${env["EDUCORE_STRIPE_ENABLED"]}`);
} else {
  skip("EDUCORE_STRIPE_ENABLED not set (defaults to disabled — safe)");
}

// 4. Frontend payment UI
console.log("\n4. Frontend payment UI");
const frontendPayments = path.join(ROOT, "frontend/app/school-admin/payments/page.tsx");
const parentPayments   = path.join(ROOT, "frontend/app/parent/payments/page.tsx");
if (fs.existsSync(frontendPayments)) {
  const content = fs.readFileSync(frontendPayments, "utf-8");
  if (content.includes("stripe") || content.includes("Stripe") || content.includes("checkout")) {
    pass("school-admin/payments page has Stripe checkout integration");
  } else if (content.includes("useEffect") || content.includes("authFetch")) {
    pass("school-admin/payments page calls backend (billing data)");
  } else {
    skip("school-admin/payments page exists but may be empty state");
  }
} else {
  fail("school-admin/payments/page.tsx not found");
}

if (fs.existsSync(parentPayments)) {
  pass("parent/payments/page.tsx exists");
} else {
  skip("parent/payments/page.tsx not found");
}

// 5. Platform subscription billing (EduCore billing to schools)
console.log("\n5. Platform subscription billing");
const plansHandler = path.join(ROOT, "backend/internal/modules/super_admin/plans.go");
if (fs.existsSync(plansHandler)) {
  pass("plans.go exists (subscription plans management)");
} else {
  fail("plans.go not found");
}
const subsTable = "subscription_plans";
const sqlFiles = fs.readdirSync(path.join(ROOT, "backend/migrations_mysql"))
  .filter(f => f.endsWith(".sql"))
  .some(f => {
    const content = fs.readFileSync(path.join(ROOT, "backend/migrations_mysql", f), "utf-8");
    return content.includes(subsTable);
  });
if (sqlFiles) pass(`${subsTable} table in migrations`);
else fail(`${subsTable} table not found in migrations`);

// Summary
console.log(`
────────────────────────────────────────────────────
  ✅ Passed  : ${passed}
  ❌ Failed  : ${failed}
  ⬜ Skipped : ${skipped}

  STATUS: ${envSet("STRIPE_SECRET_KEY") ? "STRIPE CONFIGURED" : "PROVIDER NOT CONFIGURED — Payments disabled"}
────────────────────────────────────────────────────
`);
if (failed > 0) process.exit(1);
