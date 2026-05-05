#!/usr/bin/env node
/**
 * check-school-portals.js
 * Verifica que las rutas de portales escolares estén disponibles en el frontend estático.
 *
 * Uso:
 *   node scripts/check-school-portals.js
 *
 * Variables de entorno opcionales:
 *   FRONTEND_BASE_URL  default: https://onlineu.mx/educore
 *   TEST_SLUG          default: (solo verifica rutas genéricas)
 */

const FRONTEND_BASE = (process.env.FRONTEND_BASE_URL || "https://onlineu.mx/educore").replace(/\/$/, "");
const TEST_SLUG = process.env.TEST_SLUG || "";

function pass(msg) { console.log(`  ✅ ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); process.exitCode = 1; }
function info(msg) { console.log(`  ℹ️  ${msg}`); }
function section(msg) { console.log(`\n── ${msg} ──`); }

async function checkRoute(label, url, { expectRedirect = false } = {}) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    if (res.ok || res.status === 404) {
      if (res.status === 404) {
        fail(`${label} → 404 NOT FOUND (${url})`);
      } else {
        pass(`${label} → ${res.status} OK`);
      }
    } else {
      fail(`${label} → ${res.status} (${url})`);
    }
  } catch (err) {
    fail(`${label} → NETWORK ERROR: ${err.message} (${url})`);
  }
}

async function main() {
  console.log(`\n🔍 School Portals Check — ${FRONTEND_BASE}\n`);

  section("Rutas de portales públicos");
  await checkRoute("Hub de portales /escuela/",        `${FRONTEND_BASE}/escuela/`);
  await checkRoute("Login público /login",             `${FRONTEND_BASE}/login`);
  await checkRoute("Portal selector /school-portal/",  `${FRONTEND_BASE}/school-portal`);

  section("Portales por rol (rutas internas de Next.js)");
  await checkRoute("Teacher dashboard /teacher/dashboard",  `${FRONTEND_BASE}/teacher/dashboard`);
  await checkRoute("Parent dashboard /parent/dashboard",    `${FRONTEND_BASE}/parent/dashboard`);
  await checkRoute("Student dashboard /student/dashboard",  `${FRONTEND_BASE}/student/dashboard`);
  await checkRoute("School Admin /school-admin/dashboard",  `${FRONTEND_BASE}/school-admin/dashboard`);

  if (TEST_SLUG) {
    section(`Portales por slug: ${TEST_SLUG}`);
    await checkRoute(`Hub escuela ?slug=${TEST_SLUG}`,          `${FRONTEND_BASE}/escuela/?slug=${TEST_SLUG}`);
    await checkRoute(`Login Director slug=${TEST_SLUG}`,        `${FRONTEND_BASE}/login?slug=${TEST_SLUG}&role=school_admin`);
    await checkRoute(`Login Profesor slug=${TEST_SLUG}`,        `${FRONTEND_BASE}/login?slug=${TEST_SLUG}&role=teacher`);
    await checkRoute(`Login Padre slug=${TEST_SLUG}`,           `${FRONTEND_BASE}/login?slug=${TEST_SLUG}&role=parent`);
    await checkRoute(`Login Alumno slug=${TEST_SLUG}`,          `${FRONTEND_BASE}/login?slug=${TEST_SLUG}&role=student`);
  } else {
    info("TEST_SLUG no definido — se omiten checks por slug. Usa: TEST_SLUG=kinder1 node scripts/check-school-portals.js");
  }

  section("Verificación de subdominio DNS (informativa)");
  if (TEST_SLUG) {
    const subdomainUrl = `https://${TEST_SLUG}.onlineu.mx`;
    try {
      const res = await fetch(subdomainUrl, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        pass(`Subdominio ${subdomainUrl} → ${res.status} ACCESIBLE (DNS activo)`);
      } else {
        info(`Subdominio ${subdomainUrl} → ${res.status} (DNS resuelve pero devuelve error HTTP)`);
      }
    } catch (err) {
      if (err.message.includes("NXDOMAIN") || err.message.includes("ENOTFOUND") || err.message.includes("getaddrinfo")) {
        info(`Subdominio ${subdomainUrl} → DNS no configurado (esperado si no tienes wildcard *.onlineu.mx). Usa portales internos.`);
      } else if (err.name === "TimeoutError") {
        info(`Subdominio ${subdomainUrl} → Timeout (DNS puede no estar configurado o servidor tarda).`);
      } else {
        info(`Subdominio ${subdomainUrl} → ${err.message}`);
      }
    }
  } else {
    info("Define TEST_SLUG para verificar el subdominio.");
  }

  section("Resumen");
  if (process.exitCode) {
    console.log("\n❌ Hay rutas con problemas. Revisa los errores arriba.\n");
  } else {
    console.log("\n✅ Todas las rutas de portales responden OK.\n");
    if (!TEST_SLUG) {
      info("Para verificar portales de una escuela específica: TEST_SLUG=kinder1 node scripts/check-school-portals.js\n");
    }
  }
}

main().catch((err) => { console.error("Error inesperado:", err); process.exit(1); });
