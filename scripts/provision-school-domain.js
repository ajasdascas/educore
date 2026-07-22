#!/usr/bin/env node
/**
 * Idempotently provisions one EduCore school subdomain through the official
 * Hostinger Hosting API and points it at the shared static export directory.
 *
 * Required environment:
 *   NEXT_PUBLIC_API_URL
 *   HOSTINGER_API_TOKEN
 *   HOSTINGER_HOSTING_USERNAME
 *
 * Optional environment:
 *   HOSTINGER_WEBSITE_DOMAIN       default: onlineu.mx
 *   HOSTINGER_SUBDOMAIN_DIRECTORY default: educore
 *   HOSTINGER_API_BASE_URL         default: https://developers.hostinger.com
 *
 * Usage:
 *   node scripts/provision-school-domain.js --slug=kinder1 --name="Kinder Uno"
 */

"use strict";

const dns = require("dns");
const http = require("http");
const https = require("https");
const path = require("path");

const RESERVED_SLUGS = new Set([
  "www", "api", "mail", "ftp", "smtp", "webmail", "admin", "dashboard",
  "app", "educore", "onlineu", "support", "status", "static", "assets",
  "cdn", "dev", "staging", "cpanel", "webdisk", "portal", "login", "auth",
  "public", "ns1", "ns2", "mx",
]);

function parseArgs(argv) {
  return Object.fromEntries(
    argv
      .filter((value) => value.startsWith("--"))
      .map((value) => {
        const [key, ...rest] = value.slice(2).split("=");
        return [key, rest.join("=")];
      })
  );
}

function validateSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  if (slug.length < 2 || slug.length > 63) {
    throw new Error("El slug debe tener entre 2 y 63 caracteres.");
  }
  if (slug.includes("--") || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    throw new Error("El slug solo puede contener minúsculas, números y guiones válidos.");
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error("El slug solicitado está reservado por la plataforma.");
  }
  return slug;
}

function request(method, target, { body, headers = {}, timeout = 20000 } = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(target);
    const client = parsed.protocol === "https:" ? https : http;
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = client.request(
      parsed,
      {
        method,
        timeout,
        headers: {
          Accept: "application/json",
          "User-Agent": "EduCore-DomainProvisioner/2.0",
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          if (responseBody.length < 1024 * 1024) responseBody += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, body: responseBody }));
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (error) => resolve({ status: 0, error: error.message, body: "" }));
    if (payload) req.write(payload);
    req.end();
  });
}

function parseJSONResponse(response, operation) {
  if (response.error) throw new Error(`${operation}: ${response.error}`);
  if (response.status < 200 || response.status >= 300) {
    let message = `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(response.body);
      message += ` (${parsed?.error?.message || parsed?.error || parsed?.message || "respuesta rechazada"})`;
    } catch {
      // Do not print arbitrary provider HTML or any request headers.
    }
    throw new Error(`${operation}: ${message}`);
  }
  if (!response.body.trim()) return null;
  try {
    return JSON.parse(response.body);
  } catch {
    throw new Error(`${operation}: Hostinger devolvió JSON inválido.`);
  }
}

function rootMatchesDirectory(rootDirectory, directory) {
  const normalizedRoot = path.posix.normalize(String(rootDirectory || "").replaceAll("\\", "/"));
  const normalizedDirectory = String(directory || "").replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  return normalizedRoot === normalizedDirectory || normalizedRoot.endsWith(`/${normalizedDirectory}`);
}

async function verifySchool(apiURL, slug) {
  const target = `${apiURL}/api/v1/public/schools/resolve?slug=${encodeURIComponent(slug)}`;
  const response = await request("GET", target);
  const payload = parseJSONResponse(response, "Verificación de la escuela");
  if (!payload?.data?.name || payload.data.slug !== slug) {
    throw new Error("La API no confirmó la escuela solicitada.");
  }
  return payload.data.name;
}

async function ensureHostingerSubdomain(config, slug) {
  const endpoint =
    `${config.apiBaseURL}/api/hosting/v1/accounts/${encodeURIComponent(config.username)}` +
    `/websites/${encodeURIComponent(config.domain)}/subdomains`;
  const headers = { Authorization: `Bearer ${config.token}` };
  const listResponse = await request("GET", endpoint, { headers });
  const listPayload = parseJSONResponse(listResponse, "Consulta de subdominios en Hostinger");
  const subdomains = Array.isArray(listPayload) ? listPayload : listPayload?.data;
  if (!Array.isArray(subdomains)) {
    throw new Error("Consulta de subdominios en Hostinger: formato de respuesta inesperado.");
  }

  const host = `${slug}.${config.domain}`;
  const existing = subdomains.find(
    (item) => item?.subdomain?.toLowerCase() === slug || item?.domain?.toLowerCase() === host
  );
  if (existing) {
    if (!rootMatchesDirectory(existing.root_directory, config.directory)) {
      throw new Error(
        `El subdominio ya existe, pero apunta a otro directorio (${existing.root_directory || "desconocido"}).`
      );
    }
    return { status: "existing", host, rootDirectory: existing.root_directory };
  }

  const createResponse = await request("POST", endpoint, {
    headers,
    body: {
      subdomain: slug,
      directory: config.directory,
      is_using_public_directory: false,
    },
  });
  parseJSONResponse(createResponse, "Creación del subdominio en Hostinger");
  return { status: "created", host, rootDirectory: config.directory };
}

function resolveIPv4(hostname) {
  return new Promise((resolve) => {
    dns.resolve4(hostname, (error, addresses) => resolve(error ? [] : addresses || []));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = validateSlug(args.slug || process.env.SCHOOL_SLUG);
  const schoolName = args.name || process.env.SCHOOL_NAME || slug;
  const apiURL = String(process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");
  const config = {
    token: String(process.env.HOSTINGER_API_TOKEN || "").trim(),
    username: String(process.env.HOSTINGER_HOSTING_USERNAME || "").trim(),
    domain: String(process.env.HOSTINGER_WEBSITE_DOMAIN || process.env.DOMAIN || "onlineu.mx").trim().toLowerCase(),
    directory: String(process.env.HOSTINGER_SUBDOMAIN_DIRECTORY || "educore").trim().replace(/^\/+|\/+$/g, ""),
    apiBaseURL: String(process.env.HOSTINGER_API_BASE_URL || "https://developers.hostinger.com").trim().replace(/\/+$/, ""),
  };

  if (!apiURL) throw new Error("Define NEXT_PUBLIC_API_URL con la URL pública del backend.");
  if (!config.token || !config.username) {
    throw new Error("Define HOSTINGER_API_TOKEN y HOSTINGER_HOSTING_USERNAME.");
  }
  if (config.domain !== "onlineu.mx" || config.directory !== "educore") {
    throw new Error("La provisión está restringida a onlineu.mx y al directorio educore.");
  }
  const hostingerAPI = new URL(config.apiBaseURL);
  const loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostingerAPI.hostname.toLowerCase());
  if (
    (hostingerAPI.hostname.toLowerCase() !== "developers.hostinger.com" && !loopback) ||
    (hostingerAPI.protocol !== "https:" && !(hostingerAPI.protocol === "http:" && loopback)) ||
    (hostingerAPI.pathname !== "/" && hostingerAPI.pathname !== "") ||
    hostingerAPI.username || hostingerAPI.password || hostingerAPI.search || hostingerAPI.hash
  ) {
    throw new Error("HOSTINGER_API_BASE_URL debe usar el host HTTPS oficial de Hostinger.");
  }

  console.log("EduCore — provisión de subdominio escolar");
  console.log(`Escuela: ${schoolName}`);
  console.log(`Slug: ${slug}`);
  console.log(`Dominio: ${slug}.${config.domain}`);

  const confirmedName = await verifySchool(apiURL, slug);
  console.log(`✓ Escuela confirmada por la API: ${confirmedName}`);

  const result = await ensureHostingerSubdomain(config, slug);
  console.log(`✓ Hostinger: ${result.status === "created" ? "subdominio creado" : "configuración existente verificada"}`);
  console.log(`✓ Directorio: ${result.rootDirectory}`);

  const addresses = await resolveIPv4(result.host);
  if (addresses.length) {
    console.log(`✓ DNS activo: ${addresses.join(", ")}`);
  } else {
    console.log("Aviso: Hostinger aceptó la configuración, pero DNS/SSL todavía puede estar propagándose.");
  }

  console.log(`Portal: https://${result.host}/educore/escuela/`);
  console.log(`Respaldo interno: https://${config.domain}/educore/escuela/?slug=${encodeURIComponent(slug)}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  ensureHostingerSubdomain,
  parseArgs,
  rootMatchesDirectory,
  validateSlug,
  verifySchool,
};
