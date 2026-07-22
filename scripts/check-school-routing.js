#!/usr/bin/env node
/**
 * Static regression check for the EduCore school-domain architecture. Pass
 * --live to run the read-only DNS/HTTPS/API checker after static validation.
 *
 * Usage:
 *   node scripts/check-school-routing.js
 *   NEXT_PUBLIC_API_URL=https://api.example node scripts/check-school-routing.js --live --slug=kinder1
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { validateSlug } = require("./provision-school-domain");

const root = path.resolve(__dirname, "..");
const live = process.argv.includes("--live");
const verbose = process.argv.includes("--verbose");
const rawSlug = process.argv.find((arg) => arg.startsWith("--slug="))?.slice("--slug=".length) || "kinder1";
let failed = false;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(condition, message) {
  if (condition) {
    console.log(`  PASS ${message}`);
    return;
  }
  console.log(`  FAIL ${message}`);
  failed = true;
}

function staticChecks() {
  const tenant = read("frontend/lib/tenant.ts");
  const login = read("frontend/app/login/page.tsx");
  const landing = read("frontend/app/escuela/page.tsx");
  const packageJSON = JSON.parse(read("frontend/package.json"));
  const router = read("frontend/htaccess-subdomain-app-root");
  const prepare = read("frontend/scripts/prepare-static-hosting.cjs");
  const backend = read("backend/cmd/server/main.go");
  const createSchool = read("backend/internal/modules/super_admin/handler.go");
  const provisioner = read("backend/internal/pkg/schooldomain/hostinger.go");

  console.log("EduCore — verificación estática de subdominios");
  check(tenant.includes("getTenantFromHost") && tenant.includes("parseTenantSlug"), "detección y validación centralizadas del tenant");
  check(login.indexOf("getTenantFromHost") < login.indexOf("parseTenantSlug(paramSlug)"), "hostname autoritativo antes de ?slug= en login");
  check(landing.includes("getActiveTenantSlug") && landing.includes("/public/schools/resolve"), "portal valida el hostname contra la API");
  check(packageJSON.scripts?.build?.includes("prepare-static-hosting.cjs"), "build prepara archivos de Hostinger");
  check(prepare.includes("outputDir") && prepare.includes('".htaccess"'), "build copia el router a out/.htaccess");
  check(router.includes("^educore/(.+)$ $1 [END]") && router.includes("/educore/escuela/"), "router resuelve basePath y entrada escolar");
  check(router.includes("api|mail|ftp") && router.includes("onlineu\\.mx"), "router excluye hosts de infraestructura");
  check(backend.includes("AllowOriginsFunc: isAllowedBrowserOrigin"), "CORS valida dinámicamente orígenes escolares");
  check(!backend.includes('"hosting_status":         "basepath_conflict"'), "API ya no reporta conflicto fijo de basePath");
  check(createSchool.includes("schooldomain.NewFromEnv") && createSchool.includes("domain_provisioning_status"), "crear escuela invoca Hostinger y persiste estado");
  check(provisioner.includes("/subdomains") && provisioner.includes('"directory"'), "provisionador usa endpoint oficial e indica document root");
}

function liveChecks(slug) {
  const args = [path.join(__dirname, "check-school-domain.js"), slug];
  if (verbose) args.push("--verbose");
  const result = spawnSync(process.execPath, args, { cwd: root, env: process.env, stdio: "inherit" });
  if (result.status !== 0) failed = true;
}

function main() {
  const slug = validateSlug(rawSlug);
  staticChecks();
  if (live) liveChecks(slug);
  if (failed) process.exit(1);
  console.log(live ? "Resultado: routing estático y dominio en vivo correctos." : "Resultado: routing estático correcto.");
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
