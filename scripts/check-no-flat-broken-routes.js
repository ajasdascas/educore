#!/usr/bin/env node
/**
 * check-no-flat-broken-routes.js
 * Verifica que cada href definido en navigation.ts tenga su page.tsx en el filesystem.
 * Un href roto causa 404 en static export y bloquea el deploy.
 *
 * Run: node scripts/check-no-flat-broken-routes.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT    = path.resolve(__dirname, "..");
const APPDIR  = path.join(ROOT, "frontend", "app");
const NAV_FILE = path.join(ROOT, "frontend", "lib", "modules", "navigation.ts");

let passed = 0; let failed = 0; let skipped = 0;
const pass = (m) => { console.log(`  ✅ PASS    ${m}`); passed++; };
const fail = (m) => { console.log(`  ❌ FAIL    ${m}`); failed++; };
const skip = (m) => { console.log(`  ⬜ SKIP    ${m}`); skipped++; };

console.log("\n🔗 BROKEN ROUTES CHECK (nav → page.tsx)\n");

if (!fs.existsSync(NAV_FILE)) {
  fail("navigation.ts not found");
  process.exit(1);
}

const navContent = fs.readFileSync(NAV_FILE, "utf-8");

// Extract all href values from navigation.ts
const hrefRegex = /href:\s*["']([^"']+)["']/g;
const hrefs = [];
let match;
while ((match = hrefRegex.exec(navContent)) !== null) {
  hrefs.push(match[1]);
}

if (hrefs.length === 0) {
  fail("No hrefs found in navigation.ts — file may be empty or malformed");
  process.exit(1);
}

console.log(`Found ${hrefs.length} hrefs in navigation.ts\n`);
console.log("Checking page.tsx existence for each href...\n");

for (const href of hrefs) {
  // Convert href to filesystem path: /school-admin/daily-logs → frontend/app/school-admin/daily-logs/page.tsx
  const relPath = href.replace(/^\//, ""); // strip leading slash
  const pageFile = path.join(APPDIR, relPath, "page.tsx");

  if (fs.existsSync(pageFile)) {
    pass(`${href} → page.tsx ✓`);
  } else {
    // Also check for page.js (rare but possible)
    const pageFileJs = path.join(APPDIR, relPath, "page.js");
    if (fs.existsSync(pageFileJs)) {
      pass(`${href} → page.js ✓`);
    } else {
      fail(`${href} → NO page.tsx found at app/${relPath}/page.tsx`);
    }
  }
}

console.log(`
────────────────────────────────────────────────────
  Total hrefs checked : ${hrefs.length}
  ✅ Passed           : ${passed}
  ❌ Failed (broken)  : ${failed}
  ⬜ Skipped          : ${skipped}
────────────────────────────────────────────────────
`);
if (failed > 0) {
  console.log("⛔  Fix broken hrefs before deploying — they will 404 in static export.\n");
  process.exit(1);
}
