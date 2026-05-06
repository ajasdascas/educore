#!/usr/bin/env node
/**
 * check-school-portals.js
 * QA: Verifica portales internos, subdominio experimental y código fuente.
 *
 * Uso:
 *   node scripts/check-school-portals.js
 *   TEST_SLUG=kinder1 node scripts/check-school-portals.js
 */

const fs = require("fs");
const path = require("path");

const FRONTEND_BASE = (process.env.FRONTEND_BASE_URL || "https://onlineu.mx/educore").replace(/\/$/, "");
const API_BASE = process.env.API_BASE_URL || "https://api.onlineu.mx";
const TEST_SLUG = process.env.TEST_SLUG || "";
const ROOT = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend");

let passed = 0;
let failed = 0;

function ok(msg)      { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg)    { console.error(`  ❌ ${msg}`); failed++; }
function info(msg)    { console.log(`  ℹ️  ${msg}`); }
function section(msg) { console.log(`\n── ${msg} ──`); }

async function checkRoute(label, url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (res.status === 200 || res.status === 304) {
      ok(`${label} → ${res.status}`);
    } else if (res.status === 404) {
      fail(`${label} → 404 NOT FOUND (${url})`);
    } else {
      info(`${label} → ${res.status} (${url})`);
    }
  } catch (err) {
    if (err.name === "TimeoutError") {
      fail(`${label} → TIMEOUT (${url})`);
    } else if (err.message?.includes("NXDOMAIN") || err.message?.includes("ENOTFOUND")) {
      info(`${label} → DNS no configurado (esperado para subdominio) ${url}`);
    } else {
      fail(`${label} → NETWORK ERROR: ${err.message}`);
    }
  }
}

// ─── Verificación estática de código fuente ──────────────────────────────────
function checkStatic() {
  section("Verificación estática del código fuente");

  const detailFile = path.join(FRONTEND, "app/super-admin/schools/details/page.tsx");
  if (!fs.existsSync(detailFile)) { fail("super-admin/schools/details/page.tsx no existe"); return; }
  const detail = fs.readFileSync(detailFile, "utf8");

  // Portales internos usan rutas Next (sin hardcodear /educore)
  if (/loginHref.*`\/login\?slug=/.test(detail)) {
    ok("Portales internos usan /login?slug= (Next basePath maneja /educore)");
  } else {
    fail("Portales internos NO usan rutas Next internas /login?slug=");
  }

  // Sección subdominio renombrada
  if (/Subdominio experimental/.test(detail)) {
    ok('"Subdominio experimental" presente (renombrado correctamente)');
  } else {
    fail('"Subdominio experimental" NO encontrado — sección no renombrada');
  }

  // Botones experimentales dicen "Probar"
  if (/Probar subdominio/.test(detail)) {
    ok('Botones experimentales dicen "Probar subdominio"');
  } else {
    fail('Botones experimentales NO dicen "Probar subdominio"');
  }

  // Alerta de Hostinger/basePath presente
  if (/basePath/.test(detail) && /Hostinger/.test(detail)) {
    ok("Alerta Hostinger/basePath presente en subdominio experimental");
  } else {
    fail("Alerta Hostinger/basePath FALTA en subdominio experimental");
  }

  // Endpoint resolve en backend
  const mainFile = path.join(ROOT, "backend/cmd/server/main.go");
  if (fs.existsSync(mainFile)) {
    const main = fs.readFileSync(mainFile, "utf8");
    if (/public\/schools\/resolve/.test(main)) {
      ok("Endpoint GET /public/schools/resolve registrado en main.go");
    } else {
      fail("Endpoint /public/schools/resolve NO en main.go");
    }
  }

  // escuela/page.tsx usa ruta interna como identificador
  const escuelaFile = path.join(FRONTEND, "app/escuela/page.tsx");
  if (fs.existsSync(escuelaFile)) {
    const esc = fs.readFileSync(escuelaFile, "utf8");
    if (/onlineu\.mx\/educore\/escuela\/\?slug=/.test(esc)) {
      ok("Portal selector muestra URL interna /escuela/?slug= (no subdominio)");
    } else {
      fail("Portal selector NO muestra URL interna como identificador visible");
    }
  }

  // Migración 009 existe
  const mig009 = path.join(ROOT, "backend/migrations_mysql/009_school_levels_modules_portals.sql");
  if (fs.existsSync(mig009)) {
    ok("009_school_levels_modules_portals.sql existe");
    const sql = fs.readFileSync(mig009, "utf8");
    for (const t of ["school_levels", "school_modules", "school_portals",
                     "school_feature_flags", "school_periods",
                     "school_grading_scales", "school_provisioning_events"]) {
      if (new RegExp(`CREATE TABLE IF NOT EXISTS ${t}`).test(sql)) {
        ok(`  tabla ${t} en migración 009`);
      } else {
        fail(`  tabla ${t} FALTA en migración 009`);
      }
    }
  } else {
    fail("009_school_levels_modules_portals.sql NO existe");
  }
}

// ─── Verificación de red ─────────────────────────────────────────────────────
async function checkNetwork() {
  section("Portales internos (red)");
  await checkRoute("Hub de portales /escuela/",        `${FRONTEND_BASE}/escuela/`);
  await checkRoute("Login público /login",             `${FRONTEND_BASE}/login`);
  await checkRoute("School admin dashboard",           `${FRONTEND_BASE}/school-admin/dashboard`);

  if (TEST_SLUG) {
    section(`Portales con slug=${TEST_SLUG}`);
    await checkRoute(`Hub escuela /?slug=${TEST_SLUG}`,   `${FRONTEND_BASE}/escuela/?slug=${TEST_SLUG}`);
    await checkRoute(`Login Director slug=${TEST_SLUG}`,  `${FRONTEND_BASE}/login?slug=${TEST_SLUG}&role=school_admin`);
    await checkRoute(`Login Profesor slug=${TEST_SLUG}`,  `${FRONTEND_BASE}/login?slug=${TEST_SLUG}&role=teacher`);
    await checkRoute(`Login Padre slug=${TEST_SLUG}`,     `${FRONTEND_BASE}/login?slug=${TEST_SLUG}&role=parent`);
    await checkRoute(`Login Alumno slug=${TEST_SLUG}`,    `${FRONTEND_BASE}/login?slug=${TEST_SLUG}&role=student`);

    section(`Endpoint resolve slug=${TEST_SLUG}`);
    await checkRoute(`GET /public/schools/resolve?slug=${TEST_SLUG}`,
      `${API_BASE}/api/v1/public/schools/resolve?slug=${TEST_SLUG}`);

    section(`Subdominio experimental (informativo, puede fallar en Hostinger)`);
    info(`Probando ${TEST_SLUG}.onlineu.mx — se espera pantalla en blanco o error DNS en Hostinger shared`);
    await checkRoute(`Subdominio ${TEST_SLUG}.onlineu.mx`,
      `https://${TEST_SLUG}.onlineu.mx`);
  } else {
    info("Define TEST_SLUG para verificar portales de una escuela. Ej: TEST_SLUG=kinder1 node scripts/check-school-portals.js");
  }
}

async function main() {
  console.log(`\n🔍 EduCore — School Portals QA Check\n`);
  checkStatic();
  await checkNetwork();

  console.log(`\n── Resultado: ${passed} passed / ${failed} failed ──\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error("Error:", err); process.exit(1); });
