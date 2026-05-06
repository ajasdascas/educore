#!/usr/bin/env node
/**
 * Seed: Demo Schools by Education Level
 *
 * --dry-run  (default) — prints what would be created, including modules per level
 * --apply              — prints curl commands to hit the EduCore Super Admin API
 *
 * Usage:
 *   node scripts/seed-demo-schools-by-level.js          # dry-run
 *   node scripts/seed-demo-schools-by-level.js --apply  # show API commands
 */

const isDryRun = !process.argv.includes("--apply");

// ── Module catalog by education level ────────────────────────────────────────
// Mirrors the modulesByEducationLevel structure in backend/internal/modules/super_admin/schools.go
const modulesByEducationLevel = {
  kinder: [
    { key: "daily_logs",  label: "Bitácora diaria" },
    { key: "meals",       label: "Comidas y alimentación" },
    { key: "naps",        label: "Siestas" },
    { key: "diapers",     label: "Control de pañal" },
    { key: "mood",        label: "Estado de ánimo" },
    { key: "incidents",   label: "Incidentes" },
  ],
  preescolar: [
    { key: "qualitative_assessments", label: "Evaluaciones cualitativas" },
    { key: "development_areas",       label: "Áreas de desarrollo" },
    { key: "observations",            label: "Observaciones del docente" },
    { key: "evidence",                label: "Evidencias de aprendizaje" },
  ],
  primaria: [
    { key: "grades",         label: "Calificaciones" },
    { key: "attendance",     label: "Asistencias" },
    { key: "assignments",    label: "Tareas" },
    { key: "report_cards",   label: "Boletas" },
    { key: "communications", label: "Comunicados" },
  ],
};

// ── Demo school definitions ───────────────────────────────────────────────────
const DEMO_SCHOOLS = [
  {
    name: "Kinder Demo",
    slug: "kinder-demo",
    levels: ["kinder"],
    plan: "basic",
    admin_email: "admin@kinder-demo.edu.mx",
    admin_name: "Admin Kinder",
    school_year: "2025-2026",
    phone: "7771234001",
    contact_email: "contacto@kinder-demo.edu.mx",
    address: "Calle Jardín 1, Cuernavaca, Morelos",
    timezone: "America/Mexico_City",
  },
  {
    name: "Preescolar Demo",
    slug: "preescolar-demo",
    levels: ["preescolar"],
    plan: "basic",
    admin_email: "admin@preescolar-demo.edu.mx",
    admin_name: "Admin Preescolar",
    school_year: "2025-2026",
    phone: "7771234002",
    contact_email: "contacto@preescolar-demo.edu.mx",
    address: "Calle Flores 2, Cuernavaca, Morelos",
    timezone: "America/Mexico_City",
  },
  {
    name: "Primaria Demo",
    slug: "primaria-demo",
    levels: ["primaria"],
    plan: "basic",
    admin_email: "admin@primaria-demo.edu.mx",
    admin_name: "Admin Primaria",
    school_year: "2025-2026",
    phone: "7771234003",
    contact_email: "contacto@primaria-demo.edu.mx",
    address: "Av. Educación 3, Cuernavaca, Morelos",
    timezone: "America/Mexico_City",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(str, len) { return String(str).padEnd(len); }
function hr(char, len) { return char.repeat(len); }

// ── DRY RUN ───────────────────────────────────────────────────────────────────
if (isDryRun) {
  console.log("\n🌱  EDUCORE — DEMO SCHOOLS SEED (DRY RUN)\n");
  console.log(`   ${DEMO_SCHOOLS.length} escuela(s) serían creadas:\n`);

  for (const school of DEMO_SCHOOLS) {
    console.log(hr("─", 60));
    console.log(`  📍 ${school.name}`);
    console.log(`     slug:          ${school.slug}`);
    console.log(`     levels:        ${school.levels.join(", ")}`);
    console.log(`     plan:          ${school.plan}`);
    console.log(`     admin_email:   ${school.admin_email}`);
    console.log(`     admin_name:    ${school.admin_name}`);
    console.log(`     school_year:   ${school.school_year}`);
    console.log(`     phone:         ${school.phone}`);
    console.log(`     contact_email: ${school.contact_email}`);
    console.log(`     address:       ${school.address}`);
    console.log(`     timezone:      ${school.timezone}`);

    console.log(`\n     Módulos que se activarían:`);
    for (const level of school.levels) {
      const mods = modulesByEducationLevel[level] || [];
      if (mods.length === 0) {
        console.log(`       [${level}] — no modules defined`);
      } else {
        for (const mod of mods) {
          console.log(`       [${level}] ${pad(mod.key, 28)} → ${mod.label}`);
        }
      }
    }
    console.log("");
  }

  // Summary table
  console.log(hr("═", 60));
  console.log(`\n  RESUMEN`);
  console.log(`  ${pad("Escuela", 20)} ${pad("Nivel", 12)} ${pad("Plan", 8)} Módulos`);
  console.log(`  ${hr("-", 56)}`);
  for (const s of DEMO_SCHOOLS) {
    const totalMods = s.levels.reduce((sum, l) => sum + (modulesByEducationLevel[l] || []).length, 0);
    console.log(`  ${pad(s.name, 20)} ${pad(s.levels.join("+"), 12)} ${pad(s.plan, 8)} ${totalMods}`);
  }
  console.log(`\n  Total escuelas: ${DEMO_SCHOOLS.length}`);
  console.log(`\n  ℹ️  Ejecuta con --apply para ver los comandos curl de la API.\n`);
  process.exit(0);
}

// ── APPLY MODE ────────────────────────────────────────────────────────────────
console.log("\n🚀  EDUCORE — DEMO SCHOOLS SEED (APPLY MODE)\n");
console.log("  ⚠️  Apply mode: Use the EduCore Super Admin API to create schools.");
console.log("      POST /api/v1/super-admin/schools with each school's data.");
console.log("      Set SUPER_ADMIN_TOKEN env var.\n");

const baseUrl = process.env.EDUCORE_API_URL || "https://api.educore.onlineu.mx";
const token   = process.env.SUPER_ADMIN_TOKEN || "<YOUR_SUPER_ADMIN_TOKEN>";

for (const school of DEMO_SCHOOLS) {
  const payload = JSON.stringify({
    name:          school.name,
    slug:          school.slug,
    levels:        school.levels,
    plan:          school.plan,
    admin_email:   school.admin_email,
    admin_name:    school.admin_name,
    school_year:   school.school_year,
    phone:         school.phone,
    contact_email: school.contact_email,
    address:       school.address,
    timezone:      school.timezone,
  });

  console.log(`# ${school.name}`);
  console.log(`curl -s -X POST "${baseUrl}/api/v1/super-admin/schools" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -H "Authorization: Bearer ${token}" \\`);
  console.log(`  -d '${payload}'\n`);
}

console.log("  After creation, activate modules via:");
console.log(`  POST ${baseUrl}/api/v1/super-admin/schools/:id/modules/:key/toggle\n`);
process.exit(0);
