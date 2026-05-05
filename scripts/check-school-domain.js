#!/usr/bin/env node
/**
 * check-school-domain.js
 *
 * Verifies that a school subdomain is correctly set up:
 *   1. DNS resolves (wildcard catch-all)
 *   2. HTTP redirect reaches the EduCore school portal
 *   3. Backend /public/school-info returns valid data for the slug
 *
 * Usage:
 *   node scripts/check-school-domain.js kinder1
 *   node scripts/check-school-domain.js colegio-la-paz --verbose
 *
 * Options:
 *   --verbose   Print full HTTP responses
 */

"use strict";

const https = require("https");
const http = require("http");
const dns = require("dns");

const slug = process.argv[2];
const verbose = process.argv.includes("--verbose");

const DOMAIN = process.env.DOMAIN || "onlineu.mx";
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://educore-production-beef.up.railway.app";

if (!slug) {
  console.error("Usage: node scripts/check-school-domain.js <slug>");
  console.error("Example: node scripts/check-school-domain.js kinder1");
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const info = (msg) => verbose && console.log(`     ${msg}`);

function resolveDNS(hostname) {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addrs) => {
      if (err) resolve({ ok: false, error: err.message });
      else resolve({ ok: true, addresses: addrs });
    });
  });
}

function httpGet(url, options = {}) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const timeout = options.timeout || 8000;

    const req = lib.get(
      url,
      { headers: { "User-Agent": "EduCore-DomainChecker/1.0" }, timeout },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

// ─── Checks ──────────────────────────────────────────────────────────────────

async function checkDNS(hostname) {
  process.stdout.write(`  Resolving ${hostname}... `);
  const res = await resolveDNS(hostname);
  if (res.ok) {
    console.log(`→ ${res.addresses.join(", ")}`);
    pass(`DNS resolves (wildcard catch-all is active)`);
    info(`IPs: ${res.addresses.join(", ")}`);
    return true;
  } else {
    console.log("failed");
    fail(`DNS does not resolve: ${res.error}`);
    warn("Run: node scripts/provision-wildcard-domain.js");
    return false;
  }
}

async function checkRedirect(hostname) {
  const url = `http://${hostname}/`;
  process.stdout.write(`  HTTP redirect from ${url}... `);
  const res = await httpGet(url);

  if (res.error) {
    console.log("failed");
    fail(`HTTP error: ${res.error}`);
    return false;
  }

  console.log(`→ ${res.status}`);
  info(`Location: ${res.headers?.location || "(none)"}`);

  if (res.status >= 301 && res.status <= 308) {
    const location = res.headers?.location || "";
    if (location.includes("/educore/escuela/") || location.includes(`slug=${slug}`)) {
      pass(`Redirect → EduCore school portal (${location})`);
      return true;
    } else {
      warn(`Redirect exists but points elsewhere: ${location}`);
      return true; // partial pass
    }
  } else if (res.status === 200) {
    warn(`Got 200 directly — .htaccess subdomain redirect may not be active`);
    return false;
  } else {
    fail(`Unexpected status: ${res.status}`);
    return false;
  }
}

async function checkAPI(slug) {
  const url = `${API_URL}/api/v1/public/school-info?slug=${encodeURIComponent(slug)}`;
  process.stdout.write(`  Checking backend API for slug "${slug}"... `);
  const res = await httpGet(url);

  if (res.error) {
    console.log("failed");
    fail(`API error: ${res.error}`);
    return false;
  }

  console.log(`→ ${res.status}`);
  info(`Response: ${res.body.substring(0, 200)}`);

  if (res.status === 200) {
    try {
      const data = JSON.parse(res.body);
      if (data?.data?.name) {
        pass(`School found in DB: "${data.data.name}"`);
        return true;
      }
    } catch { /* fall through */ }
    warn("Backend returned 200 but no school name in response");
    return false;
  } else if (res.status === 404) {
    fail(`Slug "${slug}" not found in EduCore database`);
    warn("Make sure the school was created in the Super Admin panel with this exact slug");
    return false;
  } else {
    fail(`Backend returned ${res.status}`);
    return false;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const hostname = `${slug}.${DOMAIN}`;
  console.log(`\n🔍 EduCore — Domain Check: ${hostname}`);
  console.log("─".repeat(50));

  const checks = [
    { name: "DNS Resolution", fn: () => checkDNS(hostname) },
    { name: "HTTP Redirect", fn: () => checkRedirect(hostname) },
    { name: "Backend API",   fn: () => checkAPI(slug) },
  ];

  let passed = 0;

  for (const check of checks) {
    console.log(`\n[${check.name}]`);
    const ok = await check.fn();
    if (ok) passed++;
  }

  console.log("\n" + "─".repeat(50));
  console.log(`Result: ${passed}/${checks.length} checks passed\n`);

  if (passed === checks.length) {
    console.log(`🎉 ${hostname} is fully operational!`);
    console.log(`   School portal: https://${DOMAIN}/educore/escuela/?slug=${slug}`);
  } else {
    console.log("⚠️  Some checks failed. Review the issues above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});
