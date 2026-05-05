#!/usr/bin/env node
/**
 * provision-wildcard-domain.js
 *
 * One-time setup: creates *.onlineu.mx wildcard DNS + cPanel subdomain.
 * After this runs once, every new school subdomain works automatically.
 *
 * Supports three DNS providers (auto-detected from available env vars):
 *   1. Cloudflare  — CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID
 *   2. Hostinger   — HOSTINGER_API_TOKEN
 *   3. cPanel UAPI — CPANEL_HOST + CPANEL_USER + CPANEL_TOKEN (for wildcard subdomain)
 *
 * Usage:
 *   node scripts/provision-wildcard-domain.js
 *   DRY_RUN=true node scripts/provision-wildcard-domain.js
 *
 * Required env (at least one DNS provider):
 *   CLOUDFLARE_API_TOKEN  + CLOUDFLARE_ZONE_ID   — Cloudflare DNS management
 *   HOSTINGER_API_TOKEN                           — Hostinger DNS panel
 *   CPANEL_HOST + CPANEL_USER + CPANEL_TOKEN      — cPanel wildcard subdomain
 *   SERVER_IP                                     — explicit server IP (auto-detected if omitted)
 *   DOMAIN                                        — root domain (default: onlineu.mx)
 *   DRY_RUN=true                                  — print plan without making changes
 */

"use strict";

const https = require("https");
const http = require("http");
const dns = require("dns");

const DOMAIN = process.env.DOMAIN || "onlineu.mx";
const DRY_RUN = process.env.DRY_RUN === "true";

// ─── Provider secrets detection ──────────────────────────────────────────────

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ZONE = process.env.CLOUDFLARE_ZONE_ID;
const HOSTINGER_TOKEN = process.env.HOSTINGER_API_TOKEN;
const CPANEL_HOST = process.env.CPANEL_HOST;
const CPANEL_USER = process.env.CPANEL_USER;
const CPANEL_TOKEN = process.env.CPANEL_TOKEN;

const hasCloudflare = !!(CF_TOKEN && CF_ZONE);
const hasHostinger = !!HOSTINGER_TOKEN;
const hasCpanel = !!(CPANEL_HOST && CPANEL_USER && CPANEL_TOKEN);

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
      // Accept self-signed certs for cPanel (common in shared hosting)
      rejectUnauthorized: false,
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Request timeout after 15s"));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function resolveIP(domain) {
  return new Promise((resolve) => {
    dns.resolve4(domain, (err, addresses) => {
      if (err || !addresses?.length) resolve(null);
      else resolve(addresses[0]);
    });
  });
}

// ─── IP detection ─────────────────────────────────────────────────────────────

async function detectServerIP() {
  let serverIP = process.env.SERVER_IP;
  if (!serverIP) {
    console.log("🔍 Resolving current A record for root domain...");
    serverIP = await resolveIP(DOMAIN);
    if (!serverIP) {
      console.error(
        `❌  Could not resolve IP for ${DOMAIN}.\n` +
          `    Set SERVER_IP env var manually.\n` +
          `    Find it in: hPanel → Hosting → Manage → Server IP address`
      );
      process.exit(1);
    }
    console.log(`   Detected IP: ${serverIP}`);
  } else {
    console.log(`   Using IP: ${serverIP} (from SERVER_IP env)`);
  }
  return serverIP;
}

// ─── CLOUDFLARE ───────────────────────────────────────────────────────────────

async function cloudflareProvision(serverIP) {
  console.log("\n[DNS] Cloudflare provider detected");

  const cfHeaders = {
    Authorization: `Bearer ${CF_TOKEN}`,
    "Content-Type": "application/json",
  };

  // List existing records
  console.log("  Listing existing DNS records...");
  const listRes = await request(
    "GET",
    `https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records?type=A&name=*.${DOMAIN}`,
    null,
    cfHeaders
  );

  if (listRes.status !== 200) {
    throw new Error(
      `Cloudflare list failed (${listRes.status}): ${JSON.stringify(listRes.body)}`
    );
  }

  const records = listRes.body?.result || [];
  const existing = records.find(
    (r) => r.type === "A" && (r.name === `*.${DOMAIN}` || r.name === "*")
  );

  if (existing) {
    console.log(`  ✅ Wildcard record already exists: *.${DOMAIN} → ${existing.content}`);
    if (existing.content !== serverIP) {
      console.log(
        `  ⚠️  IP mismatch — record points to ${existing.content}, expected ${serverIP}`
      );
      if (!DRY_RUN) {
        console.log(`  Updating record...`);
        const updateRes = await request(
          "PATCH",
          `https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records/${existing.id}`,
          { content: serverIP, ttl: 1, proxied: false },
          cfHeaders
        );
        if (updateRes.body?.success) {
          console.log(`  ✅ Record updated: *.${DOMAIN} → ${serverIP}`);
        } else {
          throw new Error(`Cloudflare update failed: ${JSON.stringify(updateRes.body?.errors)}`);
        }
      } else {
        console.log(`  [DRY RUN] Would update record to ${serverIP}`);
      }
    }
    return true;
  }

  // Create wildcard record
  const payload = { type: "A", name: `*.${DOMAIN}`, content: serverIP, ttl: 1, proxied: false };
  console.log(`  Creating *.${DOMAIN} → ${serverIP}`);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would POST: ${JSON.stringify(payload)}`);
    return true;
  }

  const createRes = await request(
    "POST",
    `https://api.cloudflare.com/client/v4/zones/${CF_ZONE}/dns_records`,
    payload,
    cfHeaders
  );

  if (createRes.body?.success) {
    console.log(`  ✅ Cloudflare wildcard created: *.${DOMAIN} → ${serverIP}`);
    return true;
  }

  throw new Error(
    `Cloudflare create failed: ${JSON.stringify(createRes.body?.errors || createRes.body)}`
  );
}

// ─── HOSTINGER ────────────────────────────────────────────────────────────────

async function hostingerProvision(serverIP) {
  console.log("\n[DNS] Hostinger provider detected");

  const hHeaders = {
    Authorization: `Bearer ${HOSTINGER_TOKEN}`,
    "Content-Type": "application/json",
  };

  // List existing records
  console.log("  Listing existing DNS records...");
  const listRes = await request(
    "GET",
    `https://api.hostinger.com/v1/dns/zone/${DOMAIN}/records`,
    null,
    hHeaders
  );

  if (listRes.status !== 200) {
    throw new Error(
      `Hostinger list failed (${listRes.status}): ${JSON.stringify(listRes.body)}`
    );
  }

  const records = listRes.body?.data || listRes.body || [];
  const existing = records.find(
    (r) => r.type === "A" && (r.name === "*" || r.name === `*.${DOMAIN}`)
  );

  if (existing) {
    const ip = existing.content || existing.value;
    console.log(`  ✅ Wildcard record already exists: * → ${ip}`);
    if (ip !== serverIP) {
      console.log(`  ⚠️  IP mismatch — record points to ${ip}, expected ${serverIP}`);
      console.log(
        `     To update manually: Hostinger DNS → delete record * → create * A ${serverIP}`
      );
    }
    return true;
  }

  // Create
  const payload = { type: "A", name: "*", content: serverIP, ttl: 3600 };
  console.log(`  Creating * → ${serverIP}`);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would POST: ${JSON.stringify(payload)}`);
    return true;
  }

  const createRes = await request(
    "POST",
    `https://api.hostinger.com/v1/dns/zone/${DOMAIN}/records`,
    payload,
    hHeaders
  );

  if (createRes.status === 200 || createRes.status === 201) {
    console.log(`  ✅ Hostinger wildcard created: *.${DOMAIN} → ${serverIP}`);
    return true;
  }

  throw new Error(
    `Hostinger create failed (${createRes.status}): ${JSON.stringify(createRes.body)}`
  );
}

// ─── cPANEL UAPI ─────────────────────────────────────────────────────────────
//
// cPanel UAPI endpoint for subdomains:
//   POST https://{host}:2083/execute/SubDomain/addsubdomain
//   Auth: cpanel {USER}:{TOKEN}   (API token format)
//
// This creates the wildcard subdomain (* → public_html/) in the Apache vhost,
// which is required so the server processes *.onlineu.mx requests.
//
// Reference: https://api.docs.cpanel.net/openapi/cpanel/operation/SubDomain-addsubdomain/
// ─────────────────────────────────────────────────────────────────────────────

async function cpanelProvision() {
  console.log("\n[cPanel] cPanel UAPI provider detected");

  const cpanelHeaders = {
    Authorization: `cpanel ${CPANEL_USER}:${CPANEL_TOKEN}`,
  };

  // First, list existing subdomains to check if wildcard already exists
  console.log("  Listing existing subdomains...");

  let listRes;
  try {
    listRes = await request(
      "GET",
      `https://${CPANEL_HOST}:2083/execute/SubDomain/listsubdomains`,
      null,
      cpanelHeaders
    );
  } catch (err) {
    const msg = err.message || "";
    // Provide actionable errors for common cPanel connectivity issues
    if (msg.includes("ECONNREFUSED") || msg.includes("ECONNRESET")) {
      throw new Error(
        `Cannot connect to cPanel at ${CPANEL_HOST}:2083.\n` +
          `    Check that CPANEL_HOST is the server hostname (not the domain) and port 2083 is open.`
      );
    }
    if (msg.includes("timeout")) {
      throw new Error(`cPanel connection timed out. Verify CPANEL_HOST and firewall rules.`);
    }
    throw err;
  }

  if (listRes.status !== 200 || listRes.body?.status === 0) {
    const reason = listRes.body?.errors?.[0] || listRes.body?.error || listRes.status;
    if (String(reason).includes("Authentication")) {
      throw new Error(
        `cPanel authentication failed.\n` +
          `    Verify CPANEL_USER and CPANEL_TOKEN.\n` +
          `    Generate a token in: cPanel → Security → Manage API Tokens`
      );
    }
    throw new Error(`cPanel listsubdomains failed: ${reason}`);
  }

  const subdomains = listRes.body?.data || [];
  const wildcardExists = subdomains.some(
    (s) => s.domain === "*" || s.subdomain === "*" || s.domain === `*.${DOMAIN}`
  );

  if (wildcardExists) {
    console.log(`  ✅ Wildcard subdomain already exists in cPanel`);
    return true;
  }

  // Create wildcard subdomain
  console.log(`  Creating wildcard subdomain * → public_html/`);

  if (DRY_RUN) {
    console.log(
      `  [DRY RUN] Would POST to /execute/SubDomain/addsubdomain with domain=* rootdomain=${DOMAIN}`
    );
    return true;
  }

  // cPanel UAPI uses query params for POST
  const params = new URLSearchParams({
    domain: "*",
    rootdomain: DOMAIN,
    dir: "public_html",
  });

  const addRes = await request(
    "POST",
    `https://${CPANEL_HOST}:2083/execute/SubDomain/addsubdomain?${params}`,
    null,
    {
      ...cpanelHeaders,
      "Content-Length": "0",
    }
  );

  if (addRes.status === 200 && addRes.body?.status === 1) {
    console.log(`  ✅ cPanel wildcard subdomain created: *.${DOMAIN} → public_html/`);
    return true;
  }

  // Parse cPanel-specific error
  const cpError = addRes.body?.errors?.[0] || addRes.body?.error || JSON.stringify(addRes.body);

  if (String(cpError).includes("exists") || String(cpError).includes("already")) {
    console.log(`  ✅ Wildcard subdomain already exists (cPanel reported duplicate)`);
    return true;
  }

  // Some Hostinger shared plans restrict wildcard subdomains via API
  if (
    String(cpError).includes("permission") ||
    String(cpError).includes("forbidden") ||
    String(cpError).includes("not allowed")
  ) {
    throw new Error(
      `cPanel API rejected the wildcard subdomain creation.\n` +
        `    This is a HOSTING PLAN LIMITATION — Hostinger shared plans may not allow\n` +
        `    wildcard subdomains via API. You must create it manually:\n\n` +
        `    1. hPanel → Hosting → Manage → cPanel\n` +
        `    2. Domains → Subdomains\n` +
        `    3. Subdomain: *  |  Domain: ${DOMAIN}  |  Document Root: public_html/\n` +
        `    4. Save\n\n` +
        `    This is a ONE-TIME step. After this, all new schools work automatically.`
    );
  }

  throw new Error(`cPanel addsubdomain failed: ${cpError}`);
}

// ─── Manual instructions fallback ────────────────────────────────────────────

function printManualInstructions(serverIP) {
  console.log("\n⚠️  No DNS API provider configured.");
  console.log("   Set at least one of these to automate:");
  console.log("     CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID  (recommended)");
  console.log("     HOSTINGER_API_TOKEN                         (if using Hostinger DNS)");
  console.log("     CPANEL_HOST + CPANEL_USER + CPANEL_TOKEN    (for cPanel subdomain)");
  console.log("\n📋 Manual steps (one-time setup):");
  console.log(`\n   Step 1 — DNS wildcard record`);
  console.log(`   In your DNS panel, add:`);
  console.log(`     Type: A`);
  console.log(`     Name: *`);
  console.log(`     Value: ${serverIP || "[your server IP]"}`);
  console.log(`     TTL: 3600`);
  console.log(`\n   Step 2 — cPanel wildcard subdomain`);
  console.log(`   hPanel → Hosting → Manage → cPanel → Domains → Subdomains`);
  console.log(`     Subdomain: *`);
  console.log(`     Domain: ${DOMAIN}`);
  console.log(`     Document Root: public_html/`);
  console.log(`\n   After these two steps, ALL schools work automatically.`);
  console.log(`   You never need to repeat this for new schools.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌐 EduCore — Wildcard Domain Provisioner`);
  console.log(`   Domain : ${DOMAIN}`);
  console.log(`   Dry run: ${DRY_RUN}`);
  console.log(`\n   Providers detected:`);
  console.log(`     Cloudflare : ${hasCloudflare ? "✅" : "❌ (missing CF_TOKEN + CF_ZONE)"}`);
  console.log(`     Hostinger  : ${hasHostinger ? "✅" : "❌ (missing HOSTINGER_API_TOKEN)"}`);
  console.log(`     cPanel     : ${hasCpanel ? "✅" : "❌ (missing CPANEL_HOST/USER/TOKEN)"}`);

  const serverIP = await detectServerIP();
  const results = { dns: null, cpanel: null };

  // ── Step 1: DNS wildcard A record ──────────────────────────────────────────
  console.log("\n─── Step 1: DNS Wildcard A Record *.onlineu.mx ───────────────────────");

  if (hasCloudflare) {
    try {
      results.dns = await cloudflareProvision(serverIP);
    } catch (err) {
      console.error(`  ❌ Cloudflare failed: ${err.message}`);
      results.dns = false;
    }
  } else if (hasHostinger) {
    try {
      results.dns = await hostingerProvision(serverIP);
    } catch (err) {
      console.error(`  ❌ Hostinger failed: ${err.message}`);
      results.dns = false;
    }
  } else {
    console.log("  ⚠️  No DNS provider configured for this step.");
    printManualInstructions(serverIP);
    results.dns = false;
  }

  // ── Step 2: cPanel wildcard subdomain ──────────────────────────────────────
  console.log("\n─── Step 2: cPanel Wildcard Subdomain ────────────────────────────────");

  if (hasCpanel) {
    try {
      results.cpanel = await cpanelProvision();
    } catch (err) {
      console.error(`  ❌ cPanel failed: ${err.message}`);
      results.cpanel = false;

      // Show manual fallback for cPanel if API fails
      console.log(`\n  📋 Manual cPanel steps (one-time):`);
      console.log(`     1. hPanel → Hosting → Manage → cPanel`);
      console.log(`     2. Domains → Subdomains`);
      console.log(`     3. Subdomain: *  |  Domain: ${DOMAIN}  |  Root: public_html/`);
      console.log(`     4. Save`);
      console.log(`\n     This is the ONLY step that may require manual action.`);
      console.log(`     It needs to be done ONCE. All future schools are automatic.`);
    }
  } else {
    console.log("  ⚠️  CPANEL_HOST / CPANEL_USER / CPANEL_TOKEN not set.");
    console.log(`  📋 Manual cPanel steps (one-time):`);
    console.log(`     1. hPanel → Hosting → Manage → cPanel`);
    console.log(`     2. Domains → Subdomains`);
    console.log(`     3. Subdomain: *  |  Domain: ${DOMAIN}  |  Root: public_html/`);
    console.log(`     4. Save`);
    console.log(`\n     WHY manual: Hostinger shared plans may not expose cPanel API externally.`);
    console.log(`     This is a ONE-TIME step — new schools never need DNS or cPanel changes.`);
    results.cpanel = null; // null = not attempted, not a failure
  }

  // ── Step 3: GitHub Actions .htaccess ──────────────────────────────────────
  console.log("\n─── Step 3: .htaccess Router ─────────────────────────────────────────");
  console.log("  ✅ Deployed automatically by GitHub Actions on every push to master.");
  console.log(`     File: frontend/htaccess-subdomain-root → /domains/${DOMAIN}/public_html/.htaccess`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════════════");

  const dnsIcon = results.dns === true ? "✅" : results.dns === false ? "❌" : "⚠️ ";
  const cpIcon = results.cpanel === true ? "✅" : results.cpanel === false ? "❌" : "⚠️ (manual)";

  console.log(`  DNS wildcard *.${DOMAIN}  : ${dnsIcon}`);
  console.log(`  cPanel wildcard subdomain  : ${cpIcon}`);
  console.log(`  .htaccess router           : ✅ (auto-deployed)`);

  if (results.dns && results.cpanel !== false) {
    console.log(`\n  🎉 Wildcard setup complete!`);
    console.log(`     Every new school slug works automatically.`);
    console.log(`     No DNS or cPanel changes needed per school.`);
    console.log(`\n  Verify with:`);
    console.log(`     node scripts/check-school-domain.js kinder1`);
  } else {
    console.log(`\n  ⚠️  Complete the manual steps above, then run:`);
    console.log(`     node scripts/check-school-domain.js kinder1`);
  }

  console.log("");
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err.message);
  process.exit(1);
});
