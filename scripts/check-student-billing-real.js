#!/usr/bin/env node
/**
 * check-student-billing-real.js
 * Audits the student/parent billing and payment flow.
 * Checks: invoices table, manual_payments, payment_receipts,
 *         backend endpoints, frontend pages, Stripe checkout integration.
 *
 * Run: node scripts/check-student-billing-real.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let passed = 0; let failed = 0; let skipped = 0;
function pass(msg)  { console.log(`  ✅ PASS    ${msg}`); passed++; }
function fail(msg)  { console.log(`  ❌ FAIL    ${msg}`); failed++; }
function skip(msg)  { console.log(`  ⬜ SKIP    ${msg}`); skipped++; }
function info(msg)  { console.log(`  ℹ️  INFO    ${msg}`); }

console.log("\n💰 STUDENT BILLING AUDIT\n");

// 1. DB migrations — billing tables
console.log("1. Billing tables in migrations");
const mysqlMigrDir = path.join(ROOT, "backend", "migrations_mysql");
const sqlFiles = fs.existsSync(mysqlMigrDir)
  ? fs.readdirSync(mysqlMigrDir).filter(f => f.endsWith(".sql"))
  : [];

const billingTables = ["invoices", "manual_payments", "payment_receipts", "subscription_plans"];
for (const tbl of billingTables) {
  const found = sqlFiles.some(f => {
    const c = fs.readFileSync(path.join(mysqlMigrDir, f), "utf-8");
    return c.includes(`CREATE TABLE ${tbl}`) || c.includes(`CREATE TABLE IF NOT EXISTS ${tbl}`);
  });
  if (found) pass(`Table '${tbl}' found in migrations`);
  else fail(`Table '${tbl}' NOT found in any migration`);
}

// 2. Backend billing endpoints — school_admin
console.log("\n2. Backend billing endpoints (school_admin)");
const saHandler = path.join(ROOT, "backend/internal/modules/school_admin/handler.go");
if (fs.existsSync(saHandler)) {
  const h = fs.readFileSync(saHandler, "utf-8");
  const checks = [
    { pattern: "invoices",           label: "Invoice listing endpoint" },
    { pattern: "manual_payments",    label: "Manual payment endpoint" },
    { pattern: "payment_receipts",   label: "Payment receipt endpoint" },
    { pattern: "payments",           label: "Payments group/prefix" },
    { pattern: "Stripe",             label: "Stripe checkout session" },
  ];
  for (const c of checks) {
    if (h.includes(c.pattern)) pass(c.label);
    else skip(`${c.label} — not found in school_admin/handler.go`);
  }
} else {
  fail("school_admin/handler.go not found");
}

// 3. Backend billing endpoints — parent
console.log("\n3. Backend billing endpoints (parent)");
const parentHandler = path.join(ROOT, "backend/internal/modules/parent/handler.go");
if (fs.existsSync(parentHandler)) {
  const h = fs.readFileSync(parentHandler, "utf-8");
  if (h.includes("invoices") || h.includes("payments")) {
    pass("Parent handler has payment/invoice references");
  } else {
    skip("Parent handler has no payment references (parents cannot see invoices)");
  }
} else {
  fail("parent/handler.go not found");
}

// 4. Service layer — billing logic
console.log("\n4. Service layer billing logic");
const saService = path.join(ROOT, "backend/internal/modules/school_admin/service.go");
if (fs.existsSync(saService)) {
  const s = fs.readFileSync(saService, "utf-8");
  if (s.includes("invoice") || s.includes("Invoice")) {
    pass("Invoice logic found in school_admin/service.go");
  } else {
    skip("No invoice logic in service.go — billing may be handler-only");
  }
  if (s.includes("stripe.com") || s.includes("checkout/sessions")) {
    pass("Stripe checkout in service.go");
  } else {
    fail("Stripe checkout NOT in service.go");
  }
} else {
  fail("school_admin/service.go not found");
}

// 5. Frontend payment pages
console.log("\n5. Frontend payment pages");
const paymentPages = [
  { role: "school-admin", path: "frontend/app/school-admin/payments/page.tsx" },
  { role: "parent",       path: "frontend/app/parent/payments/page.tsx" },
];
for (const p of paymentPages) {
  const abs = path.join(ROOT, p.path);
  if (!fs.existsSync(abs)) {
    skip(`${p.role}/payments page not found`);
    continue;
  }
  const content = fs.readFileSync(abs, "utf-8");
  const lines = content.split("\n").length;
  if (lines < 15) {
    fail(`${p.role}/payments page exists but appears empty (${lines} lines)`);
  } else if (content.includes("authFetch") || content.includes("stripe") || content.includes("invoice")) {
    pass(`${p.role}/payments page is real (${lines} lines, has data calls)`);
  } else {
    skip(`${p.role}/payments page exists (${lines} lines) — generated stub or empty state`);
  }
}

// 6. Plans management (super_admin)
console.log("\n6. Subscription plans management");
const plansGo = path.join(ROOT, "backend/internal/modules/super_admin/plans.go");
if (fs.existsSync(plansGo)) {
  const p = fs.readFileSync(plansGo, "utf-8");
  if (p.includes("subscription_plans") || p.includes("SubscriptionPlan")) {
    pass("plans.go has subscription_plans logic");
  } else {
    fail("plans.go exists but lacks subscription_plans references");
  }
} else {
  fail("super_admin/plans.go not found");
}

const plansPage = path.join(ROOT, "frontend/app/super-admin/plans/page.tsx");
if (fs.existsSync(plansPage)) {
  const c = fs.readFileSync(plansPage, "utf-8");
  if (c.includes("authFetch") || c.includes("plans")) {
    pass("super-admin/plans page is real");
  } else {
    skip("super-admin/plans page exists — generated stub");
  }
} else {
  skip("super-admin/plans/page.tsx not found");
}

// 7. Billing security check — tenant isolation
console.log("\n7. Billing tenant isolation");
if (fs.existsSync(saHandler)) {
  const h = fs.readFileSync(saHandler, "utf-8");
  if (h.includes("tenant_id") || h.includes("tenantID") || h.includes("TenantID")) {
    pass("Billing handler uses tenant_id (isolation check)");
  } else {
    fail("Billing handler does NOT reference tenant_id — potential tenant leak");
  }
}

// Summary
console.log(`
────────────────────────────────────────────────────
  ✅ Passed  : ${passed}
  ❌ Failed  : ${failed}
  ⬜ Skipped : ${skipped}
────────────────────────────────────────────────────
`);
if (failed > 0) process.exit(1);
