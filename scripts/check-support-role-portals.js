#!/usr/bin/env node
/**
 * check-support-role-portals.js
 * QA: Verifica que el modo soporte para portales de rol esté correctamente implementado.
 *
 * Valida estáticamente:
 * - lib/auth.ts: supportRole en setSupportContext / getSupportContext / clearSupportContext
 * - SupportModeBanner: muestra el rol de soporte
 * - super-admin/schools/details/page.tsx: botones "Ver como..." + enterSupportRoleMode
 * - teacher/parent/student layout.tsx: hidratación de URL params + gate SUPER_ADMIN + SupportModeBanner
 * - middleware/auth.go: SUPER_ADMIN en support_mode solo puede leer
 *
 * Uso:
 *   node scripts/check-support-role-portals.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let passed = 0;
let failed = 0;

function ok(msg)      { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg)    { console.error(`  ❌ ${msg}`); failed++; }
function info(msg)    { console.log(`  ℹ️  ${msg}`); }
function section(msg) { console.log(`\n── ${msg} ──`); }

function read(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

// ─── lib/auth.ts — supportRole en context ────────────────────────────────────
section("lib/auth.ts — SupportRole en context");
{
  const src = read("frontend/lib/auth.ts");
  if (!src) { fail("lib/auth.ts no encontrado"); }
  else {
    src.includes("SupportRole")              ? ok("Tipo SupportRole exportado")                   : fail("Falta tipo SupportRole");
    src.includes("supportRole?: SupportRole") ? ok("getSupportContext retorna supportRole opcional") : fail("getSupportContext no retorna supportRole");
    src.includes('sessionStorage.setItem("support_role"') ? ok("setSupportContext guarda support_role") : fail("setSupportContext no guarda support_role");
    src.includes('sessionStorage.removeItem("support_role"') ? ok("clearSupportContext limpia support_role") : fail("clearSupportContext no limpia support_role");
    src.includes("getSupportRole()")         ? ok("getSupportRole() helper exportado")             : fail("Falta getSupportRole() helper");
    // setSupportContext debe aceptar 4to param opcional
    const setFn = src.match(/function setSupportContext\([^)]+\)/);
    if (setFn) {
      setFn[0].includes("supportRole") ? ok("setSupportContext acepta parámetro supportRole") : fail("setSupportContext no acepta supportRole");
    } else {
      fail("setSupportContext no encontrado");
    }
  }
}

// ─── SupportModeBanner — muestra rol ─────────────────────────────────────────
section("SupportModeBanner — muestra rol de soporte");
{
  const src = read("frontend/components/SupportModeBanner.tsx");
  if (!src) { fail("SupportModeBanner.tsx no encontrado"); }
  else {
    src.includes("supportRole")          ? ok("SupportModeBanner lee supportRole del contexto")  : fail("SupportModeBanner no lee supportRole");
    src.includes("ROLE_LABELS")          ? ok("ROLE_LABELS mapeados en SupportModeBanner")       : fail("Falta ROLE_LABELS en SupportModeBanner");
    src.includes("viendo como")          ? ok("Banner muestra 'viendo como {rol}'")              : fail("Banner no muestra el rol de soporte");
    src.includes("Salir")                ? ok("Botón Salir presente")                            : fail("Falta botón Salir modo soporte");
    src.includes("clearSupportContext")  ? ok("Salir llama clearSupportContext")                 : fail("Salir no limpia contexto de soporte");
  }
}

// ─── details/page.tsx — botones "Ver como..." ────────────────────────────────
section("super-admin/schools/details/page.tsx — portales de rol");
{
  const src = read("frontend/app/super-admin/schools/details/page.tsx");
  if (!src) { fail("details/page.tsx no encontrado"); }
  else {
    src.includes("enterSupportRoleMode")         ? ok("enterSupportRoleMode función presente")        : fail("Falta enterSupportRoleMode");
    src.includes("Ver como Director")            ? ok("Botón 'Ver como Director' presente")           : fail("Falta botón 'Ver como Director'");
    src.includes("Ver como Profesor")            ? ok("Botón 'Ver como Profesor' presente")           : fail("Falta botón 'Ver como Profesor'");
    src.includes("Ver como Padre")               ? ok("Botón 'Ver como Padre' presente")              : fail("Falta botón 'Ver como Padre'");
    src.includes("Ver como Estudiante")          ? ok("Botón 'Ver como Estudiante' presente")         : fail("Falta botón 'Ver como Estudiante'");
    src.includes("Ver portales de rol")          ? ok("Sección 'Ver portales de rol' en UI")          : fail("Falta sección 'Ver portales de rol'");
    src.includes("supportTenantId")              ? ok("enterSupportRoleMode pasa supportTenantId")    : fail("enterSupportRoleMode no pasa supportTenantId");
    src.includes("supportRole")                  ? ok("enterSupportRoleMode pasa supportRole")        : fail("enterSupportRoleMode no pasa supportRole");
    src.includes("/teacher/dashboard")           ? ok("Ruta /teacher/dashboard en enterSupportRoleMode") : fail("Falta ruta /teacher/dashboard");
    src.includes("/parent/dashboard")            ? ok("Ruta /parent/dashboard en enterSupportRoleMode")  : fail("Falta ruta /parent/dashboard");
    src.includes("/student/dashboard")           ? ok("Ruta /student/dashboard en enterSupportRoleMode") : fail("Falta ruta /student/dashboard");
    src.includes("Subdominio de la escuela")     ? ok("Subdominio escolar en sección separada")       : fail("Falta sección de subdominio escolar");
    src.includes("Reintentar configuración")     ? ok("Reintento de provisión presente")              : fail("Falta reintento de provisión");
  }
}

// ─── Layouts de rol — hidratación + gate SUPER_ADMIN + SupportModeBanner ────
section("Layouts teacher / parent / student — soporte");
{
  const layouts = [
    ["frontend/app/teacher/layout.tsx", "teacher"],
    ["frontend/app/parent/layout.tsx",  "parent"],
    ["frontend/app/student/layout.tsx", "student"],
  ];
  for (const [file, role] of layouts) {
    const src = read(file);
    if (!src) { fail(`${file} no encontrado`); continue; }
    src.includes("supportTenantId")      ? ok(`${role}: lee supportTenantId de URL`)           : fail(`${role}: no lee supportTenantId de URL`);
    src.includes("supportRole")          ? ok(`${role}: lee supportRole de URL`)               : fail(`${role}: no lee supportRole de URL`);
    src.includes("setSupportContext")    ? ok(`${role}: llama setSupportContext`)               : fail(`${role}: no llama setSupportContext`);
    src.includes("isSupportMode")        ? ok(`${role}: verifica isSupportMode`)               : fail(`${role}: no verifica isSupportMode`);
    src.includes("SupportModeBanner")    ? ok(`${role}: renderiza SupportModeBanner`)          : fail(`${role}: falta SupportModeBanner`);
    src.includes("RoleGuard")            ? ok(`${role}: usa RoleGuard`)                        : fail(`${role}: falta RoleGuard`);
    // Gate para SUPER_ADMIN sin soporte — debe mostrar pantalla "selecciona escuela"
    src.includes("Selecciona una escuela") ? ok(`${role}: gate SUPER_ADMIN sin soporte`)       : fail(`${role}: falta gate SUPER_ADMIN sin soporte`);
  }
}

// ─── Backend middleware — support_mode de solo lectura ───────────────────────
section("Backend middleware/auth.go — support_mode estrictamente de solo lectura");
{
  const src = read("backend/internal/middleware/auth.go");
  if (!src) { fail("middleware/auth.go no encontrado"); }
  else {
    src.includes("support_mode")               ? ok("support_mode activado cuando X-Support-Tenant-ID presente") : fail("Falta lógica support_mode");
    src.includes("SUPER_ADMIN")                ? ok("SUPER_ADMIN verificado en RequireRoles")  : fail("SUPER_ADMIN no verificado");
    src.includes("Support mode is read-only")
      ? ok("support_mode bloquea toda mutación, incluso rutas SUPER_ADMIN")                    : fail("Falta bloqueo incondicional de mutaciones en support_mode");
  }
}

// ─── Migración histórica 011 ──────────────────────────────────────────────────
section("Migración 011_backfill_school_provisioning.sql");
{
  const src = read("backend/migrations_mysql/011_backfill_school_provisioning.sql");
  if (!src) { fail("011_backfill_school_provisioning.sql no encontrado"); }
  else {
    src.includes("school_levels")             ? ok("Backfill school_levels")    : fail("Falta backfill school_levels");
    src.includes("school_portals")            ? ok("Backfill school_portals")   : fail("Falta backfill school_portals");
    src.includes("school_provisioning_events") ? ok("Registra evento backfill_011") : fail("Falta registro evento provisioning");
    src.includes("INSERT IGNORE")             ? ok("Usa INSERT IGNORE (idempotente)") : fail("No es idempotente (falta INSERT IGNORE)");
  }
}

// ─── Reparación aditiva de escalas de calificación ────────────────────────────
section("Migración 014_backfill_school_grading_scales.sql");
{
  const src = read("backend/migrations_mysql/014_backfill_school_grading_scales.sql");
  if (!src) { fail("014_backfill_school_grading_scales.sql no encontrado"); }
  else {
    src.includes("INSERT IGNORE INTO school_grading_scales") ? ok("Backfill school_grading_scales") : fail("Falta backfill grading_scales");
    src.includes("WHERE sg.tenant_id = t.id")                 ? ok("Backfill aislado por tenant") : fail("Backfill no está aislado por tenant");
    src.includes("NOT EXISTS")                                ? ok("No sobrescribe escalas existentes") : fail("Falta guardia NOT EXISTS");
    src.includes("backfill_grading_scales_014")               ? ok("Registra evento idempotente de reparación") : fail("Falta evento backfill_grading_scales_014");
  }
}

// ─── Resumen ──────────────────────────────────────────────────────────────────
console.log(`\n── Resultado: ${passed} passed / ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
