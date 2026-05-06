#!/usr/bin/env node
/**
 * check-role-portal-login.js
 * Valida que el login del portal escolar respete el rol seleccionado.
 *
 * Modo estático (sin credenciales): verifica estructura del código.
 * Modo live (con credenciales): prueba el flujo real contra el backend.
 *
 * Variables de entorno:
 *   API_BASE_URL        default: https://educore-production-beef.up.railway.app
 *   SCHOOL_SLUG         default: kinder1
 *   SCHOOL_ADMIN_EMAIL / SCHOOL_ADMIN_PASSWORD
 *   TEACHER_EMAIL / TEACHER_PASSWORD
 *   PARENT_EMAIL / PARENT_PASSWORD
 *   STUDENT_EMAIL / STUDENT_PASSWORD
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = (process.env.API_BASE_URL || "https://educore-production-beef.up.railway.app").replace(/\/$/, "");
const SCHOOL_SLUG = process.env.SCHOOL_SLUG || "kinder1";

const ROOT = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend");
const BACKEND  = path.join(ROOT, "backend");

let exitCode = 0;
function pass(msg)    { console.log(`  ✅ ${msg}`); }
function fail(msg)    { console.log(`  ❌ ${msg}`); exitCode = 1; }
function info(msg)    { console.log(`  ℹ️  ${msg}`); }
function section(msg) { console.log(`\n── ${msg} ──`); }

// ─── Helper: read file ───────────────────────────────────────────────────────
function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

// ─── Static checks ───────────────────────────────────────────────────────────
section("Fase 1 — Estructura estática: escuela/page.tsx");
{
  const src = read("frontend/app/escuela/page.tsx");
  if (!src) { fail("frontend/app/escuela/page.tsx no encontrado"); }
  else {
    const roles = ["school_admin", "teacher", "parent", "student"];
    const allRoles = roles.every(r => src.includes(`role: "${r}"`));
    allRoles ? pass("PORTALS define los 4 roles (school_admin/teacher/parent/student)") : fail("Faltan roles en PORTALS");
    // Links use template literals: `/login?slug=${slug}&role=${portal.role}` — check the pattern
    src.includes("/login?slug=") ? pass("Links apuntan a /login?slug=...") : fail("Links no incluyen slug");
    (src.includes("&role=${portal.role}") || src.includes("&role=${role}") || src.includes("role=school_admin"))
      ? pass("Links incluyen role en href") : fail("Links no incluyen role en href");
    src.includes('"school_admin"') ? pass("role school_admin definido en PORTALS") : fail("Falta role school_admin");
    src.includes('"teacher"')  ? pass("role teacher definido en PORTALS")  : fail("Falta role teacher");
    src.includes('"parent"')   ? pass("role parent definido en PORTALS")   : fail("Falta role parent");
    src.includes('"student"')  ? pass("role student definido en PORTALS")  : fail("Falta role student");
  }
}

section("Fase 2 — Estructura estática: login/page.tsx");
{
  const src = read("frontend/app/login/page.tsx");
  if (!src) { fail("frontend/app/login/page.tsx no encontrado"); }
  else {
    src.includes('params.get("role")')  ? pass("Lee query param role")  : fail("No lee query param role");
    src.includes('params.get("slug")')  ? pass("Lee query param slug") : fail("No lee query param slug");
    src.includes("requested_role")      ? pass("Envía requested_role al backend") : fail("No envía requested_role al backend");
    src.includes("tenant_slug")         ? pass("Envía tenant_slug al backend")    : fail("No envía tenant_slug al backend");
    src.includes("ROLE_MISMATCH")       ? pass("Maneja código ROLE_MISMATCH")     : fail("No maneja ROLE_MISMATCH");
    const noTokenSave = src.includes("ROLE_MISMATCH") && !src.includes("login(response") ||
      (src.match(/ROLE_MISMATCH[\s\S]{0,200}return/) !== null);
    noTokenSave ? pass("ROLE_MISMATCH no guarda token (return antes de login())") : fail("ROLE_MISMATCH puede guardar token");
    src.includes("ROLE_DASHBOARDS")     ? pass("Usa ROLE_DASHBOARDS para redirect por rol seleccionado") : fail("No usa redirect por rol seleccionado");
    src.includes("/teacher/dashboard")  ? pass("Redirige teacher → /teacher/dashboard")  : fail("Falta redirect teacher");
    src.includes("/parent/dashboard")   ? pass("Redirige parent → /parent/dashboard")   : fail("Falta redirect parent");
    src.includes("/student/dashboard")  ? pass("Redirige student → /student/dashboard") : fail("Falta redirect student");
  }
}

section("Fase 3 — Estructura estática: backend auth/handler.go");
{
  const src = read("backend/internal/modules/auth/handler.go");
  if (!src) { fail("backend/internal/modules/auth/handler.go no encontrado"); }
  else {
    src.includes("requested_role")      ? pass("Handler acepta campo requested_role") : fail("Handler no acepta requested_role");
    src.includes("ROLE_MISMATCH")       ? pass("Handler devuelve código ROLE_MISMATCH") : fail("Handler no devuelve ROLE_MISMATCH");
    src.includes("portalRoleMap")       ? pass("Mapa portalRoleMap definido") : fail("Mapa portalRoleMap no encontrado");
    src.includes('"SUPER_ADMIN"') && src.includes("SUPER_ADMIN debe usar el Manager Maestro")
      ? pass("SUPER_ADMIN bloqueado de portales escolares") : fail("SUPER_ADMIN no bloqueado de portales");
    src.includes('"teacher":      {"TEACHER"}')  ? pass("teacher → TEACHER mapeado") : fail("Falta mapeo teacher→TEACHER");
    src.includes('"parent":       {"PARENT"}')   ? pass("parent → PARENT mapeado")  : fail("Falta mapeo parent→PARENT");
    src.includes('"student":      {"STUDENT"}')  ? pass("student → STUDENT mapeado") : fail("Falta mapeo student→STUDENT");
    src.includes('"school_admin"') ? pass("school_admin → SCHOOL_ADMIN mapeado") : fail("Falta mapeo school_admin");
  }
}

section("Fase 4 — Guards de dashboards");
{
  const guards = [
    ["frontend/app/teacher/layout.tsx",    "TEACHER"],
    ["frontend/app/parent/layout.tsx",     "PARENT"],
    ["frontend/app/student/layout.tsx",    "STUDENT"],
    ["frontend/app/school-admin/layout.tsx","SCHOOL_ADMIN"],
  ];
  for (const [file, role] of guards) {
    const src = read(file);
    if (!src) { fail(`${file} no encontrado`); continue; }
    src.includes("RoleGuard") ? pass(`${file} usa RoleGuard`) : fail(`${file} sin RoleGuard`);
    src.includes(role) ? pass(`RoleGuard en ${file} incluye ${role}`) : fail(`${file} no protege rol ${role}`);
  }
}

section("Fase 5 — Modo soporte en layouts teacher/parent/student");
{
  const roleLayouts = [
    ["frontend/app/teacher/layout.tsx", "teacher"],
    ["frontend/app/parent/layout.tsx",  "parent"],
    ["frontend/app/student/layout.tsx", "student"],
  ];
  for (const [file, role] of roleLayouts) {
    const src = read(file);
    if (!src) { fail(`${file} no encontrado`); continue; }
    src.includes("SupportModeBanner")     ? pass(`${role}: SupportModeBanner renderizado`)     : fail(`${role}: falta SupportModeBanner`);
    src.includes("isSupportMode")         ? pass(`${role}: verifica isSupportMode`)            : fail(`${role}: no verifica isSupportMode`);
    src.includes("supportTenantId")       ? pass(`${role}: hidrata supportTenantId de URL`)    : fail(`${role}: no hidrata supportTenantId`);
    src.includes("Selecciona una escuela") ? pass(`${role}: gate SUPER_ADMIN sin soporte`)     : fail(`${role}: falta gate para SUPER_ADMIN sin soporte`);
  }
}

// ─── Live API checks (optional) ─────────────────────────────────────────────
const adminEmail    = process.env.SCHOOL_ADMIN_EMAIL;
const adminPass     = process.env.SCHOOL_ADMIN_PASSWORD;
const teacherEmail  = process.env.TEACHER_EMAIL;
const teacherPass   = process.env.TEACHER_PASSWORD;
const parentEmail   = process.env.PARENT_EMAIL;
const parentPass    = process.env.PARENT_PASSWORD;
const studentEmail  = process.env.STUDENT_EMAIL;
const studentPass   = process.env.STUDENT_PASSWORD;

const hasLive = adminEmail && adminPass;

async function tryLogin(label, email, password, requestedRole, expectCode, expectSuccess) {
  const body = { email, password };
  if (requestedRole) body.requested_role = requestedRole;
  body.tenant_slug = SCHOOL_SLUG;

  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let json = {};
    try { json = await res.json(); } catch (_) {}

    if (expectSuccess) {
      if (json.success && json.data?.access_token) {
        pass(`${label} → login OK (role=${json.data?.user?.role})`);
        return json.data?.user?.role;
      } else {
        fail(`${label} → esperaba login OK pero recibió: ${JSON.stringify(json)}`);
      }
    } else {
      if (!json.success && json.code === expectCode) {
        pass(`${label} → bloqueado correctamente (code=${json.code})`);
        if (json.message) info(`  Mensaje: ${json.message}`);
      } else if (!json.success) {
        pass(`${label} → bloqueado (${res.status}) — code=${json.code || "n/a"}, msg=${json.message || json.error}`);
      } else {
        fail(`${label} → esperaba fallo ${expectCode} pero recibió success=true`);
      }
    }
  } catch (err) {
    fail(`${label} → error de red: ${err.message}`);
  }
  return null;
}

async function main() {
  if (!hasLive) {
    section("Live API checks — OMITIDOS");
    info("Define SCHOOL_ADMIN_EMAIL + SCHOOL_ADMIN_PASSWORD para pruebas live.");
    info(`Ejemplo: SCHOOL_ADMIN_EMAIL=admin@kinder1.com SCHOOL_ADMIN_PASSWORD=pass SCHOOL_SLUG=${SCHOOL_SLUG} node scripts/check-role-portal-login.js`);
  } else {
    section("Live API checks — Casos de prueba");

    // 1. Admin login como school_admin → debe funcionar
    await tryLogin("school_admin login con role=school_admin", adminEmail, adminPass, "school_admin", null, true);

    // 2. Admin login como teacher → ROLE_MISMATCH
    await tryLogin("school_admin login con role=teacher", adminEmail, adminPass, "teacher", "ROLE_MISMATCH", false);

    // 3. Admin login como parent → ROLE_MISMATCH
    await tryLogin("school_admin login con role=parent", adminEmail, adminPass, "parent", "ROLE_MISMATCH", false);

    // 4. Admin login como student → ROLE_MISMATCH
    await tryLogin("school_admin login con role=student", adminEmail, adminPass, "student", "ROLE_MISMATCH", false);

    // 5. Teacher login como teacher → debe funcionar (si credenciales provistas)
    if (teacherEmail && teacherPass) {
      await tryLogin("teacher login con role=teacher", teacherEmail, teacherPass, "teacher", null, true);
    } else {
      info("TEACHER_EMAIL/TEACHER_PASSWORD no definidos — omitiendo prueba teacher login OK");
    }

    // 6. Parent login como parent → debe funcionar (si credenciales provistas)
    if (parentEmail && parentPass) {
      await tryLogin("parent login con role=parent", parentEmail, parentPass, "parent", null, true);
    } else {
      info("PARENT_EMAIL/PARENT_PASSWORD no definidos — omitiendo prueba parent login OK");
    }

    // 7. Student login como student → debe funcionar (si credenciales provistas)
    if (studentEmail && studentPass) {
      await tryLogin("student login con role=student", studentEmail, studentPass, "student", null, true);
    } else {
      info("STUDENT_EMAIL/STUDENT_PASSWORD no definidos — omitiendo prueba student login OK");
    }

    // 8. Cross-role test: teacher intentando entrar como parent (si credenciales provistas)
    if (teacherEmail && teacherPass) {
      await tryLogin("teacher login con role=parent", teacherEmail, teacherPass, "parent", "ROLE_MISMATCH", false);
    }
  }

  section("Resumen");
  if (exitCode) {
    console.log("\n❌ Hay verificaciones fallidas. Revisa los errores arriba.\n");
  } else {
    console.log("\n✅ Todas las verificaciones pasaron.\n");
  }
  process.exit(exitCode);
}

main().catch((err) => { console.error("Error inesperado:", err); process.exit(1); });
