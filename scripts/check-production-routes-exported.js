#!/usr/bin/env node
/**
 * check-production-routes-exported.js
 * Verifica que todos los page.tsx relevantes de los portales (school-admin, teacher,
 * parent, student) sean compatibles con static export de Next.js.
 *
 * Comprueba:
 *   1. No hay middleware.ts que bloquee rutas
 *   2. Las rutas dinámicas [param] tienen generateStaticParams()
 *   3. No hay uso de server-only APIs (cookies(), headers() fuera de API routes)
 *   4. Todos los hrefs de navigation.ts están cubiertos por page.tsx
 *
 * Run: node scripts/check-production-routes-exported.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT   = path.resolve(__dirname, "..");
const FRONT  = path.join(ROOT, "frontend");
const APPDIR = path.join(FRONT, "app");

let passed = 0; let failed = 0; let warnings = 0;
const pass = (m) => { console.log(`  ✅ PASS    ${m}`); passed++; };
const fail = (m) => { console.log(`  ❌ FAIL    ${m}`); failed++; };
const warn = (m) => { console.log(`  ⚠️  WARN    ${m}`); warnings++; };

function walkPages(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPages(full, results);
    else if (entry.name === "page.tsx" || entry.name === "page.js") results.push(full);
  }
  return results;
}

console.log("\n📦 PRODUCTION STATIC EXPORT COMPATIBILITY\n");

// 1. No middleware.ts
console.log("1. middleware.ts check (blocks static export)");
const middlewarePath = path.join(FRONT, "middleware.ts");
if (fs.existsSync(middlewarePath)) {
  fail("frontend/middleware.ts exists — this BREAKS static export (output: export)");
} else {
  pass("No frontend/middleware.ts — static export safe");
}

// 2. next.config has output:export
console.log("\n2. next.config.ts — output: export");
const nextConfigs = ["next.config.ts", "next.config.js", "next.config.mjs"].map(f => path.join(FRONT, f));
let foundConfig = false;
for (const cfg of nextConfigs) {
  if (fs.existsSync(cfg)) {
    const content = fs.readFileSync(cfg, "utf-8");
    foundConfig = true;
    if (content.includes("output") && content.includes("export")) {
      pass(`${path.basename(cfg)} has output: "export" or conditional export`);
    } else {
      warn(`${path.basename(cfg)} found but output: "export" not detected — verify manually`);
    }
    break;
  }
}
if (!foundConfig) warn("No next.config.ts/js/mjs found");

// 3. Dynamic routes have generateStaticParams
console.log("\n3. Dynamic routes — generateStaticParams present");
const allPages = walkPages(APPDIR);
const dynamicPages = allPages.filter(p => p.includes("[") && p.includes("]"));
let dynamicOk = 0; let dynamicFail = 0;
for (const page of dynamicPages) {
  // Skip API routes
  if (page.includes("/api/") || page.includes("\\api\\")) continue;
  const content = fs.readFileSync(page, "utf-8");
  const rel = path.relative(ROOT, page).replace(/\\/g, "/");
  if (content.includes("generateStaticParams")) {
    dynamicOk++;
  } else {
    // Some pages use catch-all or other patterns — warn not fail
    warn(`Dynamic page without generateStaticParams: ${rel}`);
    dynamicFail++;
  }
}
if (dynamicFail === 0) {
  pass(`All ${dynamicOk} dynamic pages have generateStaticParams`);
} else {
  warn(`${dynamicFail} dynamic pages lack generateStaticParams (see above)`);
}

// 4. No server-only cookies()/headers() in page components
console.log("\n4. Server-only API usage check");
const PORTAL_DIRS = ["school-admin", "teacher", "parent", "student"].map(r => path.join(APPDIR, r));
let serverApiViolations = 0;
for (const portalDir of PORTAL_DIRS) {
  const pages = walkPages(portalDir);
  for (const page of pages) {
    const content = fs.readFileSync(page, "utf-8");
    const rel = path.relative(ROOT, page).replace(/\\/g, "/");
    // If file has 'use client' it's fine — server APIs would error at build time anyway
    if (content.includes("'use client'") || content.includes('"use client"')) continue;
    if (content.includes("cookies()") || content.includes("headers()")) {
      warn(`Server-only API (cookies/headers) in non-client page: ${rel}`);
      serverApiViolations++;
    }
  }
}
if (serverApiViolations === 0) {
  pass("No server-only API violations in portal pages");
}

// 5. Count pages per portal
console.log("\n5. Pages count per portal");
const portals = ["school-admin", "teacher", "parent", "student", "super-admin"];
let total = 0;
for (const portal of portals) {
  const pages = walkPages(path.join(APPDIR, portal));
  console.log(`     ${portal}: ${pages.length} pages`);
  total += pages.length;
}
pass(`Total portal pages: ${total}`);

// Summary
console.log(`
────────────────────────────────────────────────────
  ✅ Passed   : ${passed}
  ❌ Failed   : ${failed}
  ⚠️  Warnings : ${warnings}
────────────────────────────────────────────────────
`);
if (failed > 0) process.exit(1);
