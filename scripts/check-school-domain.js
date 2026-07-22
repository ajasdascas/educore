#!/usr/bin/env node
/**
 * Read-only production health check for one EduCore school domain.
 * Verifies DNS, same-host HTTPS routing, static application delivery and the
 * backend tenant resolver. It never creates or deletes Hostinger resources.
 *
 * Usage:
 *   NEXT_PUBLIC_API_URL=https://api.example node scripts/check-school-domain.js kinder1 --verbose
 */

"use strict";

const dns = require("node:dns");
const http = require("node:http");
const https = require("node:https");
const { validateSlug } = require("./provision-school-domain");

const rawSlug = process.argv[2];
const verbose = process.argv.includes("--verbose");
const domain = String(process.env.HOSTINGER_WEBSITE_DOMAIN || process.env.DOMAIN || "onlineu.mx")
  .trim()
  .toLowerCase();
const apiURL = String(process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");

const pass = (message) => console.log(`  PASS ${message}`);
const fail = (message) => console.log(`  FAIL ${message}`);
const info = (message) => verbose && console.log(`       ${message}`);

function request(target, timeout = 12000) {
  return new Promise((resolve) => {
    const parsed = new URL(target);
    const client = parsed.protocol === "https:" ? https : http;
    const req = client.get(
      parsed,
      { timeout, headers: { "User-Agent": "EduCore-DomainChecker/2.0", Accept: "text/html,application/json" } },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          if (body.length < 1024 * 1024) body += chunk;
        });
        response.on("end", () => resolve({
          status: response.statusCode || 0,
          headers: response.headers,
          body,
        }));
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (error) => resolve({ status: 0, error: error.message, headers: {}, body: "" }));
  });
}

async function checkDNS(hostname) {
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses.length) throw new Error("sin direcciones");
    pass(`DNS resuelve ${hostname}`);
    info(addresses.map(({ address, family }) => `${address} (IPv${family})`).join(", "));
    return true;
  } catch (error) {
    fail(`DNS no resuelve ${hostname}: ${error.code || error.message}`);
    return false;
  }
}

async function checkPortal(hostname) {
  let current = new URL(`https://${hostname}/`);
  let sawExpectedRoute = false;

  for (let hop = 0; hop < 5; hop += 1) {
    const response = await request(current.href);
    if (response.error) {
      fail(`HTTPS no responde en ${current.href}: ${response.error}`);
      return false;
    }
    info(`${response.status} ${current.href}`);

    if (response.status >= 300 && response.status <= 399 && response.headers.location) {
      const next = new URL(response.headers.location, current);
      if (next.hostname.toLowerCase() !== hostname.toLowerCase()) {
        fail(`El portal cambia a un host distinto: ${next.hostname}`);
        return false;
      }
      if (next.pathname.startsWith("/educore/escuela/")) sawExpectedRoute = true;
      current = next;
      continue;
    }

    if (response.status !== 200) {
      fail(`El portal terminó con HTTP ${response.status}`);
      return false;
    }
    if (!sawExpectedRoute && !current.pathname.startsWith("/educore/escuela/")) {
      fail(`La ruta final no es el portal escolar: ${current.pathname}`);
      return false;
    }
    if (!response.body.includes("/_next/") && !response.body.includes("/educore/_next/")) {
      fail("La respuesta no parece ser el export estático de EduCore.");
      return false;
    }
    pass(`HTTPS sirve el portal en ${current.href}`);
    return true;
  }

  fail("El portal excedió el máximo de redirecciones.");
  return false;
}

async function checkAPI(slug) {
  const target = `${apiURL}/api/v1/public/schools/resolve?slug=${encodeURIComponent(slug)}`;
  const response = await request(target);
  if (response.error) {
    fail(`La API no responde: ${response.error}`);
    return false;
  }
  if (response.status !== 200) {
    fail(`La API respondió HTTP ${response.status} para el slug.`);
    return false;
  }
  try {
    const payload = JSON.parse(response.body);
    if (payload?.data?.slug !== slug || !payload?.data?.name) throw new Error("respuesta incompleta");
    pass(`La API confirmó la escuela: ${payload.data.name}`);
    info(`hosting_status=${payload.data.hosting_status || "unknown"}`);
    return true;
  } catch (error) {
    fail(`La respuesta de la API no confirma la escuela: ${error.message}`);
    return false;
  }
}

async function main() {
  if (!rawSlug) throw new Error("Uso: node scripts/check-school-domain.js <slug> [--verbose]");
  if (!apiURL) throw new Error("Define NEXT_PUBLIC_API_URL con la URL pública del backend.");
  const slug = validateSlug(rawSlug);
  const hostname = `${slug}.${domain}`;

  console.log(`EduCore — auditoría de ${hostname}`);
  const results = await Promise.all([
    checkDNS(hostname),
    checkPortal(hostname),
    checkAPI(slug),
  ]);

  if (results.every(Boolean)) {
    console.log("Resultado: dominio escolar operativo.");
    return;
  }
  throw new Error("Una o más comprobaciones fallaron.");
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
