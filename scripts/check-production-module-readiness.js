#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;
let passes = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function check(condition, message) {
  if (condition) {
    passes += 1;
    console.log(`PASS ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL ${message}`);
  }
}

const releaseContracts = [
  {
    key: "academic_core",
    routes: ["academic", "students", "teachers", "groups"],
    backend: ['api.Group("/academic", h.RequireModule("academic_core"))'],
  },
  {
    key: "schedules",
    routes: ["schedule"],
    backend: ['h.RequireModule("schedules")'],
  },
  {
    key: "attendance",
    routes: ["attendance"],
    backend: ['api.Group("/attendance", h.RequireModule("attendance"))'],
  },
  {
    key: "grading",
    routes: ["grades"],
    backend: ['api.Group("/grades", h.RequireModule("grading"))'],
  },
];

const handler = read("backend/internal/modules/school_admin/handler.go");
for (const contract of releaseContracts) {
  for (const route of contract.routes) {
    check(
      fs.existsSync(path.join(ROOT, "frontend", "app", "school-admin", route, "page.tsx")),
      `${contract.key} has a real page at /school-admin/${route}`
    );
  }
  for (const marker of contract.backend) {
    check(handler.includes(marker), `${contract.key} API is fail-closed by module middleware`);
  }
}

const serverMain = read("backend/cmd/server/main.go");
for (const [route, moduleKey] of [
  ["/parent", "parent_portal"],
  ["/teacher", "teacher_portal"],
  ["/student", "portal_students"],
  ["/reports", "reports"],
  ["/communications", "communications"],
  ["/webhooks", "versioning"],
]) {
  check(
    serverMain.includes(`api.Group("${route}"`) &&
      serverMain.includes(`RequireProductionModule("${moduleKey}")`),
    `${route} parallel router is protected by the production readiness gate`
  );
}

const layout = read("frontend/app/school-admin/layout.tsx");
const navLinks = [...layout.matchAll(/href:\s*"(\/school-admin\/[^"?]+)"/g)].map((match) => match[1]);
for (const href of navLinks) {
  const route = href.replace(/^\/school-admin\//, "");
  check(
    fs.existsSync(path.join(ROOT, "frontend", "app", "school-admin", route, "page.tsx")),
    `sidebar target ${href} exists`
  );
}

const forbiddenLevelModules = [
  "daily_logs", "meals", "naps", "diapers", "mood", "health_checks",
  "incidents", "pickup_authorizations", "milestones", "photos_evidence",
  "qualitative_assessments", "development_areas", "observations", "activities",
  "behavior_notes", "preschool_report_cards", "subjects", "assignments", "exams",
];
const provisioning = read("backend/internal/modules/super_admin/handler.go");
const registry = read("frontend/lib/modules/registry.ts");
for (const key of forbiddenLevelModules) {
  check(!provisioning.includes(`"${key}"`), `provisioning does not activate unfinished ${key}`);
  check(!registry.includes(`"${key}"`), `frontend level registry does not expose unfinished ${key}`);
}

const enabledHook = read("frontend/lib/modules/use-enabled-modules.ts");
check(
  registry.includes('NEXT_PUBLIC_ENABLE_DEMO_MODULES === "true"'),
  "demo module fallback requires an explicit build flag"
);
check(
  !registry.includes("return modules.length > 0 ? modules : DEFAULT_ENABLED_MODULES"),
  "empty module API response cannot silently enable demo modules"
);
check(
  enabledHook.includes("demoModules ? DEFAULT_ENABLED_MODULES : []"),
  "module hook fails closed outside explicit demo builds"
);

const studentsPage = read("frontend/app/school-admin/students/page.tsx");
for (const marker of ["fallbackGroups", "Registro historico importado/demo", "average_grade || 88", "attendance_rate || 94"]) {
  check(!studentsPage.includes(marker), `student UI contains no synthetic marker: ${marker}`);
}

const schoolPortalStudents = read("frontend/app/school-portal/students/page.tsx");
check(!/en desarrollo|pr[oó]ximamente/i.test(schoolPortalStudents), "student school portal is not a placeholder");

const environmentExample = read(".env.example");
check(
  !environmentExample.includes("EDUCORE_DEFAULT_SCHOOL_ADMIN_PASSWORD"),
  "school administrator passwords have no static environment fallback"
);
const ownerSeed = read("backend/internal/pkg/ownerseed/ownerseed.go");
check(
  ownerSeed.includes("ensureOwnerCreateOnce") &&
    ownerSeed.includes("DO NOTHING") &&
    ownerSeed.includes("INSERT IGNORE") &&
    !ownerSeed.includes("ON DUPLICATE KEY UPDATE") &&
    !ownerSeed.includes("DO UPDATE SET"),
  "owner bootstrap is create-only and cannot reactivate or reset an existing Super Admin"
);
check(
  provisioning.includes("generateSchoolAdminPassword") &&
    provisioning.includes("password_must_change") &&
    provisioning.includes('"crypto/rand"'),
  "school creation generates a one-time cryptographic password and requires rotation"
);

const plans = read("backend/internal/modules/super_admin/plans.go");
check(
  plans.includes("classifyRequestedAddons") && plans.includes("planes de producci"),
  "plan mutations reject modules outside the production contract"
);

const enterprise = read("backend/internal/modules/super_admin/enterprise.go");
check(
  enterprise.includes("isProductionReadyTenantModule") && enterprise.includes("readiness_gate"),
  "enterprise module mutations enforce the production readiness gate"
);
check(
  enterprise.includes("Configuration cloning is disabled") && enterprise.includes("School data reset is disabled"),
  "unfinished clone and reset operations fail closed"
);

const schoolDatabase = read("backend/internal/modules/school_admin/database_explorer.go");
const superDatabase = read("backend/internal/modules/super_admin/database_admin.go");
const superLayout = read("frontend/app/super-admin/layout.tsx");
check(
  schoolDatabase.includes('api.Group("/database", h.RequireModule("database_admin"))'),
  "school database explorer is protected by a blocked module gate"
);
check(
  superDatabase.includes("Database Admin is disabled until its security and recovery audit passes") &&
    !superLayout.includes('{ href: "/super-admin/database"'),
  "Super Admin database CRUD is hidden and fails closed"
);

const nextConfig = read("frontend/next.config.mjs");
const deployWorkflow = read(".github/workflows/deploy-frontend-hostinger.yml");
const qualityWorkflow = read(".github/workflows/quality-gates.yml");
check(
  !nextConfig.includes("ignoreBuildErrors") && !nextConfig.includes("ignoreDuringBuilds"),
  "Next.js production build cannot ignore TypeScript or ESLint failures"
);
check(
  deployWorkflow.includes("npm run typecheck") &&
    deployWorkflow.includes("npm run check:production-readiness") &&
    deployWorkflow.includes("npm run lint -- --max-warnings=0") &&
    qualityWorkflow.includes("npm run lint -- --max-warnings=0"),
  "CI and Hostinger deployment are gated by types, contracts and zero-warning lint"
);
check(
  deployWorkflow.includes("set ssl:verify-certificate yes") &&
    !deployWorkflow.includes("plain_ftp") &&
    !deployWorkflow.includes("ssl:verify-certificate no"),
  "Hostinger deployment refuses plaintext FTP and verifies the FTPS certificate"
);

const migrationRunner = read("scripts/migrate.sh");
const migrationWorkflow = read(".github/workflows/migrate-backend-production.yml");
check(
  migrationRunner.includes("schema_migrations") && migrationRunner.includes("MIGRATION_START_AT") && migrationRunner.includes("pg_advisory_xact_lock"),
  "PostgreSQL migrations are tracked, locked and baseline-aware"
);
check(
  migrationWorkflow.includes("024_password_recovery_hardening.sql"),
  "production migration verification includes password recovery hardening"
);
const migrationFiles = fs.readdirSync(path.join(ROOT, "backend", "migrations"))
  .filter((name) => /^\d{3}.*\.sql$/.test(name));
const migrationPrefixes = migrationFiles.map((name) => name.slice(0, 3));
check(
  new Set(migrationPrefixes).size === migrationPrefixes.length &&
    migrationRunner.includes("validate_unique_versions"),
  "PostgreSQL migration prefixes are unique and enforced by the runner"
);

const schoolsList = read("frontend/app/super-admin/schools/page.tsx");
check(
  !schoolsList.includes("<Trash2") && !schoolsList.includes(">Editar</DropdownMenuItem>"),
  "school row menu exposes no destructive or edit no-op"
);

const landing = read("frontend/app/page.tsx");
const metadata = read("frontend/app/layout.tsx");
for (const marker of [
  "setTimeout(",
  "Instituciones activas",
  "Colegio San Gabriel",
  "Video de demostración — Próximamente",
  'href="#"',
  "contacto@educore.mx",
  "próximas 24 horas",
]) {
  check(!landing.includes(marker), `public landing contains no simulated or dead marker: ${marker}`);
}
check(
  landing.includes("NEXT_PUBLIC_DEMO_FORM_ENDPOINT") &&
    landing.includes('startsWith("https://")') &&
    landing.includes("window.location.assign(mailtoHref)"),
  "contact form uses a secure configured endpoint or an explicit email handoff"
);
check(
  !metadata.includes("SIS + LMS") && !metadata.includes("todo-en-uno"),
  "public metadata does not advertise unaudited LMS or all-in-one capabilities"
);

console.log(`\nProduction module readiness: ${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
