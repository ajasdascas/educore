#!/usr/bin/env node
/**
 * QA: School Store Module
 * Verifies the school_store module key exists in the catalog,
 * the parent/store page exists and shows a proper stub (no blank screen),
 * and the nav item is gated by the module key.
 */
const fs = require("fs");
const path = require("path");

let passed = 0, failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`); failed++; failures.push(name); }
}

function read(rel) {
  const abs = path.join(__dirname, "..", rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

// ─── 1. Module key in catalog migration ──────────────────────────────────────
console.log("\n1. school_store in modules_catalog");
const mig017 = read("backend/migrations_mysql/017_level_module_catalog_expansion.sql");
check("Migration 017 exists", mig017 !== null);
if (mig017) {
  check("school_store key in modules_catalog INSERT", mig017.includes("school_store"));
}

// ─── 2. Frontend page ────────────────────────────────────────────────────────
console.log("\n2. /parent/store page");
const store = read("frontend/app/parent/store/page.tsx");
check("/parent/store/page.tsx exists", store !== null);
if (store) {
  check("Uses 'use client'", store.startsWith('"use client"'));
  check("Shows store not configured message", store.includes("configurad") || store.includes("Tienda") || store.includes("tienda"));
  check("No blank screen — has visible content", store.length > 200);
  check("Has link to messages or contact path", store.includes("/parent/messages") || store.includes("messages") || store.includes("contact"));
  check("No broken fetch (empty state without API error)", !store.includes("throw") || store.includes("catch"));
  check("No mock product data", !store.includes("precio:") && !store.includes("product_id") && !store.includes("[{name:"));
}

// ─── 3. Nav item gated by moduleKey ──────────────────────────────────────────
console.log("\n3. Parent layout nav gating");
const layout = read("frontend/app/parent/layout.tsx");
check("parent/layout.tsx exists", layout !== null);
if (layout) {
  check("Nav item /parent/store exists", layout.includes("/parent/store"));
  check("school_store moduleKey gates the nav item", layout.includes('"school_store"'));
  check("enabledModuleKeys filter applied", layout.includes("enabledModuleKeys"));
}

// ─── 4. modulesByEducationLevel — school_store not mandatory ─────────────────
console.log("\n4. school_store is not required for kinder");
const handler = read("backend/internal/modules/super_admin/handler.go");
check("super_admin/handler.go exists", handler !== null);
if (handler) {
  // school_store should appear in primaria but NOT kinder/preescolar
  const kinderSection = handler.match(/["']kinder["']:\s*\[([^\]]+)\]/);
  if (kinderSection) {
    check("school_store NOT in kinder modules", !kinderSection[1].includes("school_store"));
  } else {
    check("kinder key found in modulesByEducationLevel", handler.includes('"kinder"'));
  }
  // school_store is in modules_catalog but optional (not auto-provisioned) — verified via migration
  check("school_store key referenced in backend", handler.includes("school_store") || mig017?.includes("school_store"));
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`School Store Module QA: ${passed} passed, ${failed} failed`);
if (failures.length > 0) { console.log("\nFailed:"); failures.forEach(f => console.log(`  • ${f}`)); }
console.log("═".repeat(60) + "\n");
process.exit(failed > 0 ? 1 : 0);
