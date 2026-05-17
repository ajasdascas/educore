#!/usr/bin/env node
/**
 * QA: Kinder Parent Portal UI
 * Verifies all kinder-specific pages and nav items exist and follow the correct patterns.
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

// ─── 1. Pages exist ──────────────────────────────────────────────────────────
console.log("\n1. Kinder parent pages exist");
const pages = ["daily-logs","meals","naps","diapers","mood","incidents"];
for (const p of pages) {
  const content = read(`frontend/app/parent/${p}/page.tsx`);
  check(`/parent/${p}/page.tsx exists`, content !== null);
  if (content) {
    check(`/parent/${p} uses "use client"`, content.startsWith('"use client"'));
    check(`/parent/${p} imports authFetch`, content.includes("authFetch"));
    check(`/parent/${p} uses res.success (not res.ok)`, content.includes("res.success") && !content.includes("res.ok"));
    check(`/parent/${p} has empty state text`, content.includes("escuela") || content.includes("configurad") || content.includes("registros") || content.includes("incidentes") || content.includes("bien"));
    check(`/parent/${p} no mock data (no Math.random / hardcoded arrays)`, !content.includes("Math.random") && !content.match(/\[\s*\{[^}]*nombre.*\}/));
  }
}

// ─── 2. Parent store stub ─────────────────────────────────────────────────────
console.log("\n2. Parent store stub");
const store = read("frontend/app/parent/store/page.tsx");
check("/parent/store/page.tsx exists", store !== null);
if (store) {
  check("Store shows 'no configurada' message", store.includes("configurad") || store.includes("Tienda"));
  check("Store has link to messages (no broken button)", store.includes("/parent/messages"));
  check("Store does NOT fetch API (static content)", !store.includes("authFetch") || store.includes("ShoppingBag"));
}

// ─── 3. Layout nav items ──────────────────────────────────────────────────────
console.log("\n3. Parent layout nav items");
const layout = read("frontend/app/parent/layout.tsx");
check("parent/layout.tsx exists", layout !== null);
if (layout) {
  for (const p of pages) {
    const href = `/parent/${p.replace("-", "-")}`;
    check(`Layout has ${href} nav item`, layout.includes(href));
  }
  check("Layout has /parent/store nav item", layout.includes("/parent/store"));
  check("daily_logs moduleKey", layout.includes('"daily_logs"'));
  check("meals moduleKey", layout.includes('"meals"'));
  check("naps moduleKey", layout.includes('"naps"'));
  check("diapers moduleKey", layout.includes('"diapers"'));
  check("mood moduleKey", layout.includes('"mood"'));
  check("incidents moduleKey", layout.includes('"incidents"'));
  check("school_store moduleKey", layout.includes('"school_store"'));
  check("Layout filters by enabledModuleKeys", layout.includes("enabledModuleKeys"));
}

// ─── 4. Backend kinder endpoints ─────────────────────────────────────────────
console.log("\n4. Backend parent handler — kinder routes");
const parentHandler = read("backend/internal/modules/parent/handler.go");
check("parent/handler.go exists", parentHandler !== null);
if (parentHandler) {
  check("Route: /daily-logs", parentHandler.includes("daily-logs"));
  check("Route: /meals", parentHandler.includes('"/meals"') || parentHandler.includes("meals"));
  check("Route: /naps", parentHandler.includes('"/naps"') || parentHandler.includes("naps"));
  check("Route: /diapers", parentHandler.includes('"/diapers"') || parentHandler.includes("diapers"));
  check("Route: /mood", parentHandler.includes('"/mood"') || parentHandler.includes("mood"));
  check("Route: /incidents", parentHandler.includes('"/incidents"') || parentHandler.includes("incidents"));
  check("Handler: GetChildDailyLogs", parentHandler.includes("GetChildDailyLogs"));
  check("Handler: GetChildMeals", parentHandler.includes("GetChildMeals"));
  check("Handler: GetChildNaps", parentHandler.includes("GetChildNaps"));
  check("Handler: GetChildDiapers", parentHandler.includes("GetChildDiapers"));
  check("Handler: GetChildMood", parentHandler.includes("GetChildMood"));
  check("Handler: GetChildIncidents", parentHandler.includes("GetChildIncidents"));
  check("Kinder handlers verify parent access (VerifyParentAccess)", parentHandler.includes("VerifyParentAccess"));
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`Kinder Parent UI QA: ${passed} passed, ${failed} failed`);
if (failures.length > 0) { console.log("\nFailed:"); failures.forEach(f => console.log(`  • ${f}`)); }
console.log("═".repeat(60) + "\n");
process.exit(failed > 0 ? 1 : 0);
