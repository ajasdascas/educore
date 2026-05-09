#!/usr/bin/env node
/**
 * check-no-flat-operational-routes-in-admin-menu.js
 *
 * Garantiza que el menú de School Admin NO contenga rutas operativas diarias de Kinder
 * como ítems top-level (Comidas, Siestas, Pañal, Estado de ánimo).
 * Esos módulos deben vivir DENTRO de "Registro diario" como sub-tabs.
 *
 * School Admin = supervisión. Las páginas flat /school-admin/{meals,naps,diapers,mood}
 * pueden seguir existiendo como aliases para deep-linking, pero NO deben aparecer
 * como entradas separadas del sidebar.
 *
 * Run: node scripts/check-no-flat-operational-routes-in-admin-menu.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT     = path.resolve(__dirname, "..");
const NAV_FILE = path.join(ROOT, "frontend", "lib", "modules", "navigation.ts");

let passed = 0; let failed = 0;
const pass = (m) => { console.log(`  ✅ PASS    ${m}`); passed++; };
const fail = (m) => { console.log(`  ❌ FAIL    ${m}`); failed++; };

console.log("\n🚫 NO FLAT OPERATIONAL ROUTES IN ADMIN MENU\n");

if (!fs.existsSync(NAV_FILE)) {
  fail("navigation.ts not found");
  process.exit(1);
}

const nav = fs.readFileSync(NAV_FILE, "utf-8");
const adminStart = nav.indexOf("export const SCHOOL_ADMIN_NAV");
const adminEnd = nav.indexOf("export const TEACHER_NAV");
if (adminStart === -1 || adminEnd === -1) {
  fail("Could not find SCHOOL_ADMIN_NAV section");
  process.exit(1);
}
const adminSection = nav.slice(adminStart, adminEnd);

// Routes that MUST NOT appear as top-level items in school-admin menu.
const FORBIDDEN_HREFS = [
  "/school-admin/meals",
  "/school-admin/naps",
  "/school-admin/diapers",
  "/school-admin/mood",
];

console.log("1. Forbidden flat operational hrefs (must NOT be in SCHOOL_ADMIN_NAV)");
for (const href of FORBIDDEN_HREFS) {
  const present = adminSection.includes(`href: "${href}"`) || adminSection.includes(`href: '${href}'`);
  if (present) {
    fail(`SCHOOL_ADMIN_NAV contiene ${href} — debe estar dentro de Registro diario como sub-tab`);
  } else {
    pass(`SCHOOL_ADMIN_NAV NO contiene ${href}`);
  }
}

// And /school-admin/daily-logs SHOULD be present as the container.
console.log("\n2. Container 'Registro diario' (/school-admin/daily-logs) is present");
if (adminSection.includes(`href: "/school-admin/daily-logs"`) || adminSection.includes(`href: '/school-admin/daily-logs'`)) {
  pass("/school-admin/daily-logs presente como container");
} else {
  fail("/school-admin/daily-logs NO está en SCHOOL_ADMIN_NAV — debe ser el container de operaciones diarias");
}

// And the alias pages MUST still exist (for direct URL access to old routes).
console.log("\n3. Flat alias pages still exist on disk (compat con URLs viejas)");
const APPDIR = path.join(ROOT, "frontend", "app");
for (const href of FORBIDDEN_HREFS) {
  const rel = href.replace(/^\//, "");
  const pagePath = path.join(APPDIR, rel, "page.tsx");
  if (fs.existsSync(pagePath)) {
    pass(`${href} → page.tsx existe (alias para deep-linking)`);
  } else {
    fail(`${href} → falta page.tsx alias (URLs viejas darán 404)`);
  }
}

// And daily-logs page should be tabbed (use Tabs component).
console.log("\n4. /school-admin/daily-logs/page.tsx usa Tabs (es la página tabbed)");
const dailyLogsPage = path.join(APPDIR, "school-admin", "daily-logs", "page.tsx");
if (fs.existsSync(dailyLogsPage)) {
  const content = fs.readFileSync(dailyLogsPage, "utf-8");
  if (content.includes("Tabs") && content.includes("TabsContent")) {
    pass("/school-admin/daily-logs/page.tsx usa <Tabs> con sub-tabs");
  } else {
    fail("/school-admin/daily-logs/page.tsx no usa Tabs — debería ser página tabbed");
  }
} else {
  fail("/school-admin/daily-logs/page.tsx no existe");
}

console.log(`
────────────────────────────────────────────────────
  ✅ Passed   : ${passed}
  ❌ Failed   : ${failed}
────────────────────────────────────────────────────
`);
if (failed > 0) process.exit(1);
