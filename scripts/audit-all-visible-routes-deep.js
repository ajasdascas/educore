#!/usr/bin/env node
/**
 * audit-all-visible-routes-deep.js
 *
 * Verifies that EVERY navigation href defined in navigation.ts has:
 *   1. A corresponding page.tsx in the app directory
 *   2. A corresponding index.html in the out/ build directory
 *   3. A matching entry in DEFAULT_ENABLED_MODULES or MODULE_ALIASES
 *
 * Run: node scripts/audit-all-visible-routes-deep.js
 */

const fs = require("fs");
const path = require("path");

const FRONTEND_DIR = path.resolve(__dirname, "../frontend");
const APP_DIR = path.join(FRONTEND_DIR, "app");
const OUT_DIR = path.join(FRONTEND_DIR, "out");

// ─── Extract navigation hrefs from navigation.ts ─────────────────────────────

const navFile = fs.readFileSync(path.join(FRONTEND_DIR, "lib/modules/navigation.ts"), "utf-8");

function extractNavItems(arrayName) {
  const regex = new RegExp(`export const ${arrayName}[\\s\\S]*?\\[([\\s\\S]*?)\\];`);
  const match = navFile.match(regex);
  if (!match) return [];

  const items = [];
  const hrefRegex = /href:\s*"([^"]+)"/g;
  const moduleKeyRegex = /moduleKey:\s*"([^"]+)"/g;

  const block = match[1];
  const lines = block.split("\n");

  let currentItem = "";
  for (const line of lines) {
    currentItem += line;
    if (line.includes("},") || line.includes("} ,")) {
      const hrefMatch = currentItem.match(/href:\s*"([^"]+)"/);
      const moduleMatch = currentItem.match(/moduleKey:\s*"([^"]+)"/);
      if (hrefMatch) {
        items.push({
          href: hrefMatch[1],
          moduleKey: moduleMatch ? moduleMatch[1] : null,
        });
      }
      currentItem = "";
    }
  }
  return items;
}

const navArrays = {
  SCHOOL_ADMIN: extractNavItems("SCHOOL_ADMIN_NAV"),
  TEACHER: extractNavItems("TEACHER_NAV"),
  PARENT: extractNavItems("PARENT_NAV"),
  STUDENT: extractNavItems("STUDENT_NAV"),
};

// ─── Check page.tsx existence ─────────────────────────────────────────────────

function hrefToPagePath(href) {
  return path.join(APP_DIR, ...href.split("/").filter(Boolean), "page.tsx");
}

function hrefToOutPath(href) {
  return path.join(OUT_DIR, ...href.split("/").filter(Boolean), "index.html");
}

// ─── Extract DEFAULT_ENABLED_MODULES keys from registry.ts ───────────────────

const registryFile = fs.readFileSync(path.join(FRONTEND_DIR, "lib/modules/registry.ts"), "utf-8");
const enabledKeysRegex = /key:\s*"([^"]+)"/g;
const enabledKeys = new Set();
let km;
while ((km = enabledKeysRegex.exec(registryFile)) !== null) {
  enabledKeys.add(km[1]);
}

// ─── Run audit ───────────────────────────────────────────────────────────────

let totalChecked = 0;
let totalMissing = 0;
const issues = [];

console.log("╔══════════════════════════════════════════════════════════════════╗");
console.log("║        EduCore — Route Audit (navigation.ts vs build)          ║");
console.log("╚══════════════════════════════════════════════════════════════════╝\n");

for (const [role, items] of Object.entries(navArrays)) {
  console.log(`\n── ${role} (${items.length} items) ──────────────────────────────────`);

  for (const item of items) {
    totalChecked++;
    const pagePath = hrefToPagePath(item.href);
    const outPath = hrefToOutPath(item.href);

    const hasPage = fs.existsSync(pagePath);
    const hasOut = fs.existsSync(outPath);
    const moduleInRegistry = item.moduleKey ? enabledKeys.has(item.moduleKey) : true;

    const status = [];
    if (!hasPage) status.push("NO page.tsx");
    if (!hasOut) status.push("NO out/index.html");
    if (!moduleInRegistry) status.push(`moduleKey "${item.moduleKey}" NOT in registry`);

    if (status.length > 0) {
      totalMissing++;
      issues.push({ role, href: item.href, moduleKey: item.moduleKey, problems: status });
      console.log(`  ❌ ${item.href}`);
      status.forEach(s => console.log(`     └─ ${s}`));
    } else {
      console.log(`  ✓  ${item.href}`);
    }
  }
}

console.log("\n\n════════════════════════════════════════════════════════════════════");
console.log(`  TOTAL CHECKED: ${totalChecked}`);
console.log(`  PASSED:        ${totalChecked - totalMissing}`);
console.log(`  ISSUES:        ${totalMissing}`);
console.log("════════════════════════════════════════════════════════════════════");

if (issues.length > 0) {
  console.log("\n\n── ISSUES SUMMARY ──────────────────────────────────────────────────\n");
  for (const issue of issues) {
    console.log(`[${issue.role}] ${issue.href} (moduleKey: ${issue.moduleKey || "none"})`);
    issue.problems.forEach(p => console.log(`  → ${p}`));
  }
  process.exit(1);
} else {
  console.log("\n✅ All navigation routes have corresponding pages and are in the module registry.\n");
  process.exit(0);
}
