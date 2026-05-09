#!/usr/bin/env node
/**
 * check-static-export-compatibility.js
 * Validates that the Next.js frontend is compatible with static export (output: "export").
 * Fails on patterns that break static builds.
 *
 * Run: node scripts/check-static-export-compatibility.js
 */
const fs   = require("fs");
const path = require("path");

const FRONTEND = path.resolve(__dirname, "..", "frontend");
const APP_DIR  = path.join(FRONTEND, "app");

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(msg) { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg) { console.log(`  ❌ FAIL  ${msg}`); failed++; }
function warn(msg) { console.log(`  ⚠️  WARN  ${msg}`); warnings++; }

function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && !f.name.startsWith(".") && f.name !== "node_modules") walk(full, cb);
    else if (f.isFile()) cb(full);
  }
}

console.log("\n🏗️  STATIC EXPORT COMPATIBILITY AUDIT\n");

// 1. Check next.config
console.log("1. next.config.mjs / next.config.js");
const configPath = fs.existsSync(path.join(FRONTEND, "next.config.mjs"))
  ? path.join(FRONTEND, "next.config.mjs")
  : path.join(FRONTEND, "next.config.js");

if (!fs.existsSync(configPath)) {
  fail("next.config not found");
} else {
  const cfg = fs.readFileSync(configPath, "utf-8");
  if (cfg.includes('output: "export"') || cfg.includes("output: 'export'") || cfg.includes("output:\"export\"")) {
    pass(`output: "export" found in next.config`);
  } else if (cfg.includes("output") && cfg.includes("export")) {
    pass(`output: "export" found (conditional in next.config)`);
  } else {
    warn("output: 'export' not found in next.config — may be missing");
  }
  if (cfg.includes("rewrite") || cfg.includes("redirect")) {
    warn("Rewrites/redirects found in next.config — incompatible with static export");
  } else {
    pass("No rewrites/redirects in next.config");
  }
}

// 2. Check for API routes in app/api/
console.log("\n2. API Route Handlers (frontend/app/api/)");
const apiDir = path.join(APP_DIR, "api");
if (!fs.existsSync(apiDir)) {
  pass("No frontend/app/api/ directory (correct for static export)");
} else {
  const apiFiles = [];
  walk(apiDir, f => { if (f.endsWith(".ts") || f.endsWith(".tsx")) apiFiles.push(f); });
  if (apiFiles.length === 0) {
    pass("frontend/app/api/ exists but is empty");
  } else {
    fail(`frontend/app/api/ has ${apiFiles.length} route handlers — incompatible with static export`);
    apiFiles.slice(0, 5).forEach(f => console.log(`     └─ ${path.relative(FRONTEND, f)}`));
  }
}

// 3. Check for middleware.ts
console.log("\n3. middleware.ts");
const middlewarePath = path.join(FRONTEND, "middleware.ts");
const middlewarePathJs = path.join(FRONTEND, "middleware.js");
if (!fs.existsSync(middlewarePath) && !fs.existsSync(middlewarePathJs)) {
  pass("No middleware.ts (correct for static export)");
} else {
  fail("middleware.ts found — incompatible with static export (no server runtime)");
}

// 4. Check dynamic routes have generateStaticParams
console.log("\n4. Dynamic routes without generateStaticParams");
const dynamicRoutes = [];
const staticParamsMissing = [];

walk(APP_DIR, f => {
  const rel = path.relative(APP_DIR, f);
  if (rel.includes("[") && rel.endsWith("page.tsx")) {
    const content = fs.readFileSync(f, "utf-8");
    if (!content.includes("generateStaticParams")) {
      staticParamsMissing.push(rel);
    } else {
      dynamicRoutes.push(rel);
    }
  }
});

if (staticParamsMissing.length === 0) {
  pass(`All ${dynamicRoutes.length} dynamic routes have generateStaticParams`);
} else {
  fail(`${staticParamsMissing.length} dynamic routes missing generateStaticParams:`);
  staticParamsMissing.forEach(f => console.log(`     └─ ${f}`));
}

// 5. Check for server-only patterns in pages
console.log("\n5. Server-only patterns (cookies(), headers(), Request) in pages");
const serverPatterns = [
  { pattern: /cookies\(\)/, label: "cookies() server API" },
  { pattern: /headers\(\)/, label: "headers() server API" },
  { pattern: /new Request\(|NextRequest/, label: "NextRequest/Request" },
  { pattern: /import.*'next\/server'/, label: "next/server import" },
];
const serverViolations = [];
walk(APP_DIR, f => {
  if (!f.endsWith(".tsx") && !f.endsWith(".ts")) return;
  const rel = path.relative(FRONTEND, f);
  if (rel.startsWith("app/api/")) return; // already caught
  const content = fs.readFileSync(f, "utf-8");
  // Skip files with "use client"
  if (content.startsWith('"use client"') || content.startsWith("'use client'")) return;
  for (const { pattern, label } of serverPatterns) {
    if (pattern.test(content)) {
      serverViolations.push(`${rel} — ${label}`);
    }
  }
});
if (serverViolations.length === 0) {
  pass("No server-only patterns detected in page files");
} else {
  fail(`${serverViolations.length} potential server-only patterns (check manually):`);
  serverViolations.slice(0, 5).forEach(v => console.log(`     └─ ${v}`));
}

// 6. Check NEXT_PUBLIC_API_URL not pointing to localhost in .env
console.log("\n6. NEXT_PUBLIC_API_URL in .env.local");
const envLocal = path.join(FRONTEND, ".env.local");
if (fs.existsSync(envLocal)) {
  const envContent = fs.readFileSync(envLocal, "utf-8");
  const apiUrlMatch = envContent.match(/NEXT_PUBLIC_API_URL=(.+)/);
  if (apiUrlMatch) {
    const apiUrl = apiUrlMatch[1].trim();
    if (apiUrl.includes("localhost")) {
      warn(`NEXT_PUBLIC_API_URL=${apiUrl} — points to localhost (dev only, OK)`);
    } else {
      pass(`NEXT_PUBLIC_API_URL=${apiUrl.substring(0, 40)}...`);
    }
  } else {
    warn("NEXT_PUBLIC_API_URL not set in .env.local");
  }
  const demoMode = envContent.match(/NEXT_PUBLIC_DEMO_MODE=(.+)/);
  if (demoMode && demoMode[1].trim() === "true") {
    warn("NEXT_PUBLIC_DEMO_MODE=true — must be false in production");
  }
} else {
  warn("No frontend/.env.local found");
}

// 7. Summary
const total = passed + failed + warnings;
console.log(`
────────────────────────────────────────────────────
  ✅ Passed   : ${passed}
  ❌ Failed   : ${failed}
  ⚠️  Warnings : ${warnings}
  📋 Total    : ${total}
────────────────────────────────────────────────────`);

if (failed > 0) {
  console.log("\nStatic export has BLOCKING issues. Fix before deploying.\n");
  process.exit(1);
} else {
  console.log("\nStatic export compatible ✓\n");
}
