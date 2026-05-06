#!/usr/bin/env node
/**
 * check-school-provisioning.js
 * QA: Verifica que el provisioning de escuela esté correctamente implementado.
 * Valida código fuente del backend y del frontend.
 *
 * Uso:
 *   node scripts/check-school-provisioning.js
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

// ─── Backend: CreateSchool handler ──────────────────────────────────────────
section("Backend: CreateSchool provisioning completo");
{
  const src = read("backend/internal/modules/super_admin/handler.go");
  if (!src) { fail("super_admin/handler.go no encontrado"); }
  else {
    const checks = [
      ["Crea tenant",                 /INSERT INTO tenants/],
      ["Crea admin user SCHOOL_ADMIN",/SCHOOL_ADMIN/],
      ["Siembra tenant_roles",        /tenant_roles/],
      ["Activa core modules",         /modules_catalog/],
      ["Activa módulos por nivel",    /modulesByEducationLevel/],
      ["Siembra ciclo escolar",       /school_years/],
      ["Siembra school_settings",     /school_settings/],
      ["Siembra grade_levels",        /grade_levels/],
      ["Siembra subjects default",    /subjects/],
      ["Siembra grupo default",       /INSERT.*groups/],
      ["Activa portal modules",       /portal_school_admin/],
    ];
    for (const [label, re] of checks) {
      re.test(src) ? ok(label) : fail(`FALTA: ${label}`);
    }

    // Niveles soportados
    const levels = ["babies", "preescolar", "kinder", "primaria"];
    for (const l of levels) {
      src.includes(`"${l}"`) ? ok(`Nivel "${l}" soportado`) : fail(`Nivel "${l}" NO soportado`);
    }

    // Módulos bebés
    const babyModules = ["daily_logs", "meals", "naps", "diapers", "health_checks", "incidents", "pickup_authorizations", "milestones", "photos_evidence"];
    for (const m of babyModules) {
      src.includes(`"${m}"`) ? ok(`Módulo bebés: ${m}`) : fail(`Módulo bebés FALTA: ${m}`);
    }

    // Módulos preescolar/kinder
    const preschoolModules = ["qualitative_assessments", "development_areas", "observations", "activities", "behavior_notes", "preschool_report_cards"];
    for (const m of preschoolModules) {
      src.includes(`"${m}"`) ? ok(`Módulo preescolar: ${m}`) : fail(`Módulo preescolar FALTA: ${m}`);
    }

    // Módulos primaria
    const primaryModules = ["grades", "grading", "report_cards", "subjects", "assignments", "exams"];
    for (const m of primaryModules) {
      src.includes(`"${m}"`) ? ok(`Módulo primaria: ${m}`) : fail(`Módulo primaria FALTA: ${m}`);
    }

    // Dual MySQL/Postgres
    src.includes("IsMySQL") ? ok("Soporta MySQL (Hostinger) y PostgreSQL") : fail("NO soporta dual MySQL/PostgreSQL");
  }
}

// ─── Frontend: formulario crear escuela ─────────────────────────────────────
section("Frontend: formulario crear escuela");
{
  const src = read("frontend/app/super-admin/schools/page.tsx");
  if (!src) { fail("super-admin/schools/page.tsx no encontrado"); }
  else {
    ["babies", "preescolar", "kinder", "primaria"].forEach((l) => {
      src.includes(l) ? ok(`Opción "${l}" en formulario`) : fail(`Opción "${l}" FALTA en formulario`);
    });
    src.includes("educationLevelOptions") ? ok("educationLevelOptions definido") : fail("educationLevelOptions no encontrado");
  }
}

// ─── Backend: portal_access.go ───────────────────────────────────────────────
section("Backend: portal_access.go — crear usuarios por portal");
{
  const src = read("backend/internal/modules/school_admin/portal_access.go");
  if (!src) { fail("school_admin/portal_access.go no encontrado"); }
  else {
    ok("portal_access.go existe");
    src.includes("CreateTeacherPortalAccess") ? ok("CreateTeacherPortalAccess handler") : fail("FALTA CreateTeacherPortalAccess");
    src.includes("CreateStudentPortalAccess") ? ok("CreateStudentPortalAccess handler") : fail("FALTA CreateStudentPortalAccess");
    src.includes("CreateParentPortalAccess")  ? ok("CreateParentPortalAccess handler")  : fail("FALTA CreateParentPortalAccess");
    src.includes("TEACHER") ? ok("Crea usuario role=TEACHER") : fail("No crea TEACHER");
    src.includes("STUDENT") ? ok("Crea usuario role=STUDENT") : fail("No crea STUDENT");
    src.includes("PARENT")  ? ok("Crea usuario role=PARENT")  : fail("No crea PARENT");
    src.includes("generatePortalPassword") ? ok("Genera contraseña aleatoria") : fail("No genera contraseña");
    src.includes("UPDATE students SET user_id") ? ok("Vincula user_id en students al crear STUDENT") : fail("No vincula user_id en students");
  }
}

// ─── Migración 006: students.user_id ─────────────────────────────────────────
section("Migración 006: students.user_id (pendiente en Hostinger)");
{
  const src = read("backend/migrations_mysql/006_student_portal_user_id.sql");
  if (!src) { fail("006_student_portal_user_id.sql no encontrado"); }
  else {
    ok("006_student_portal_user_id.sql existe");
    src.includes("user_id") ? ok("Agrega columna user_id a students") : fail("No agrega user_id a students");
    info("⚠️  Aplicar manualmente en Hostinger si aún no se hizo.");
  }
}

// ─── Registry frontend ────────────────────────────────────────────────────────
section("Frontend: registry.ts — niveles y módulos actualizados");
{
  const src = read("frontend/lib/modules/registry.ts");
  if (!src) { fail("lib/modules/registry.ts no encontrado"); }
  else {
    ["babies", "preescolar", "kinder", "primaria"].forEach((l) => {
      src.includes(`"${l}"`) ? ok(`Nivel ${l} en EducationLevel`) : fail(`Nivel ${l} FALTA en EducationLevel`);
    });
    ["daily_logs", "qualitative_assessments", "preschool_report_cards", "grading"].forEach((m) => {
      src.includes(m) ? ok(`Módulo ${m} en MODULES_BY_LEVEL`) : fail(`Módulo ${m} FALTA en MODULES_BY_LEVEL`);
    });
  }
}

// ─── Resumen ──────────────────────────────────────────────────────────────────
console.log(`\n── Resultado: ${passed} passed / ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
