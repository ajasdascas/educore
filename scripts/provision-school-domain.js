#!/usr/bin/env node
/**
 * provision-school-domain.js
 *
 * Called automatically (or manually) when a new school is created.
 * Because *.onlineu.mx wildcard DNS is already set up (run provision-wildcard-domain.js once),
 * this script's job is lightweight:
 *   1. Verify the school exists in the EduCore DB
 *   2. Confirm DNS wildcard resolves the subdomain
 *   3. Log the provisioned URL
 *   4. Optionally send a welcome email (placeholder — implement with Resend)
 *
 * For Cloudflare users: swap the DNS check block for a Cloudflare API call.
 * For custom certs per subdomain: add Let's Encrypt / Cloudflare SSL provisioning here.
 *
 * Usage:
 *   node scripts/provision-school-domain.js --slug=kinder1 --name="Kinder Uno"
 *
 * Or as a GitHub Actions step:
 *   run: node scripts/provision-school-domain.js --slug=${{ inputs.slug }}
 */

"use strict";

const https = require("https");
const dns = require("dns");

// ─── Parse args ──────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...v] = a.slice(2).split("=");
      return [k, v.join("=")];
    })
);

const slug = args.slug || process.env.SCHOOL_SLUG;
const schoolName = args.name || process.env.SCHOOL_NAME || slug;

const DOMAIN = process.env.DOMAIN || "onlineu.mx";
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");

if (!API_URL) {
  console.error("ERROR: define NEXT_PUBLIC_API_URL (URL pública del backend).");
  process.exit(1);
}

if (!slug) {
  console.error("Usage: node scripts/provision-school-domain.js --slug=<school-slug>");
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : require("http");
    lib.get(url, { headers: { "User-Agent": "EduCore/1.0" } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", (e) => resolve({ status: 0, error: e.message }));
  });
}

function resolveDNS(hostname) {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (err, addrs) => {
      resolve(err ? null : addrs?.[0]);
    });
  });
}

// ─── Provision steps ─────────────────────────────────────────────────────────

async function verifyInDatabase(slug) {
  const url = `${API_URL}/api/v1/public/school-info?slug=${encodeURIComponent(slug)}`;
  const res = await httpGet(url);

  if (res.error || res.status !== 200) {
    throw new Error(`School "${slug}" not found in EduCore database (API returned ${res.status})`);
  }

  try {
    const data = JSON.parse(res.body);
    if (!data?.data?.name) throw new Error("No name in response");
    return data.data.name;
  } catch {
    throw new Error("Invalid API response — school may not be active");
  }
}

async function verifyDNS(slug) {
  const hostname = `${slug}.${DOMAIN}`;
  const ip = await resolveDNS(hostname);
  if (!ip) {
    // Wildcard may not have propagated yet — warn but don't fail
    console.log(`  ⚠️  DNS not resolving yet for ${hostname} — may need up to 24h to propagate`);
    console.log(`      If it never resolves: run node scripts/provision-wildcard-domain.js`);
    return false;
  }
  console.log(`  ✅ DNS: ${hostname} → ${ip}`);
  return true;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏫 EduCore — School Domain Provisioner`);
  console.log(`   Slug  : ${slug}`);
  console.log(`   Name  : ${schoolName}`);
  console.log(`   Domain: ${slug}.${DOMAIN}\n`);

  // Step 1 — Verify school in DB
  process.stdout.write("1. Verifying school in EduCore database... ");
  let dbName;
  try {
    dbName = await verifyInDatabase(slug);
    console.log(`done`);
    console.log(`   ✅ School found: "${dbName}"`);
  } catch (e) {
    console.log("failed");
    console.error(`   ❌ ${e.message}`);
    process.exit(1);
  }

  // Step 2 — DNS wildcard check
  console.log("2. Checking DNS wildcard resolution...");
  await verifyDNS(slug);

  // Step 3 — Output portal URLs
  const subdomainUrl = `https://${slug}.${DOMAIN}`;
  const fallbackUrl  = `https://${DOMAIN}/educore/escuela/?slug=${slug}`;

  console.log("\n🎉 School domain provisioned successfully!");
  console.log(`\n   Subdomain URL (after DNS propagates):`);
  console.log(`   ${subdomainUrl}  →  ${fallbackUrl}`);
  console.log(`\n   Direct portal URL (always works):`);
  console.log(`   ${fallbackUrl}`);

  // Step 4 — Future: send welcome email via Resend
  // await sendWelcomeEmail({ slug, name: dbName, url: subdomainUrl });

  console.log("\n✅ Done. Verify with:");
  console.log(`   node scripts/check-school-domain.js ${slug}\n`);
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});
