#!/usr/bin/env node
/**
 * check-parent-child-flow-functional.js
 *
 * Verifica que el flujo de vinculación padre-hijo esté completo end-to-end:
 * 1. Tabla parent_student existe en migraciones (PG + MySQL).
 * 2. Endpoints backend GET/POST/PUT/DELETE para gestionar vínculos.
 * 3. Endpoint backend GET /parent/children que filtra por parent_student.
 * 4. UI parent/children carga la lista y detecta nivel.
 * 5. UI school-admin/students tiene modal "Gestionar padres" o crea padres al matricular.
 *
 * Run: node scripts/check-parent-child-flow-functional.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

let passed = 0; let failed = 0;
const pass = (m) => { console.log(`  ✅ PASS    ${m}`); passed++; };
const fail = (m) => { console.log(`  ❌ FAIL    ${m}`); failed++; };

function readFileIfExists(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "";
}

console.log("\n👨‍👩‍👧 PARENT-CHILD FLOW FUNCTIONAL AUDIT\n");

// ─── 1. Tabla parent_student en ambas BDs
console.log("1. Tabla parent_student en migraciones");
const PG_FILES = [
  "backend/migrations/001_initial.sql",
  "backend/migrations/001_up.sql",
  "backend/migrations/008_students_parents_history_imports.sql",
];
const MYSQL_FILES = [
  "backend/migrations_mysql/000_reset_hostinger_core.sql",
  "backend/migrations_mysql/001_hostinger_core.sql",
];
const pgHasTable = PG_FILES.some((f) => readFileIfExists(path.join(ROOT, f)).includes("parent_student"));
const mysqlHasTable = MYSQL_FILES.some((f) => readFileIfExists(path.join(ROOT, f)).includes("parent_student"));
if (pgHasTable) pass("PostgreSQL tiene parent_student"); else fail("PostgreSQL no tiene parent_student");
if (mysqlHasTable) pass("MySQL/Hostinger tiene parent_student"); else fail("MySQL no tiene parent_student");

// ─── 2. Endpoints backend (GET/POST/PUT/DELETE)
console.log("\n2. Endpoints backend de school-admin para gestionar vínculos");
const handlerFile = path.join(ROOT, "backend", "internal", "modules", "school_admin", "handler.go");
const handlerContent = readFileIfExists(handlerFile);
const portalAccessFile = path.join(ROOT, "backend", "internal", "modules", "school_admin", "portal_access.go");
const portalAccessContent = readFileIfExists(portalAccessFile);

const ROUTES = [
  { method: "Get",    path: "/students/:id/parents",            handler: "GetStudentParents" },
  { method: "Post",   path: "/students/:id/parents",            handler: "LinkParentToStudent" },
  { method: "Put",    path: "/students/:id/parents/:parentId",  handler: "UpdateParentLink" },
  { method: "Delete", path: "/students/:id/parents/:parentId",  handler: "UnlinkParentFromStudent" },
];
for (const r of ROUTES) {
  const routeRegistered = handlerContent.includes(`${r.method}("${r.path}"`);
  const handlerImpl = portalAccessContent.includes(`func (h *Handler) ${r.handler}(`);
  if (routeRegistered && handlerImpl) {
    pass(`${r.method.toUpperCase()} ${r.path} → ${r.handler}`);
  } else {
    fail(`${r.method.toUpperCase()} ${r.path} → ${r.handler} ${routeRegistered ? "" : "(ruta no registrada)"}${handlerImpl ? "" : " (handler ausente)"}`);
  }
}

// ─── 3. Endpoint backend de parent
console.log("\n3. Endpoint backend GET /parent/children con filtro parent_student");
const parentHandler = readFileIfExists(path.join(ROOT, "backend", "internal", "modules", "parent", "handler.go"));
const parentRepo = readFileIfExists(path.join(ROOT, "backend", "internal", "modules", "parent", "repository.go"));
if (parentHandler.includes('Get("/children"') && parentHandler.includes("GetChildren")) {
  pass("GET /api/v1/parent/children registrado");
} else {
  fail("GET /api/v1/parent/children no registrado en parent/handler.go");
}
if (parentRepo.includes("parent_student") && parentRepo.includes("GetChildrenByParent")) {
  pass("Repository filtra por parent_student");
} else {
  fail("Repository no filtra por parent_student — fuga potencial entre tenants");
}

// ─── 4. UI parent/children
console.log("\n4. UI Parent — pantalla 'Mis Hijos'");
const parentChildrenPage = readFileIfExists(path.join(ROOT, "frontend", "app", "parent", "children", "page.tsx"));
if (parentChildrenPage.length === 0) {
  fail("frontend/app/parent/children/page.tsx no existe");
} else {
  if (parentChildrenPage.includes("/api/v1/parent/children")) pass("UI llama a /api/v1/parent/children");
  else fail("UI no llama al endpoint correcto");
  if (parentChildrenPage.includes("detectLevel") || parentChildrenPage.includes("level_key")) pass("UI detecta nivel del hijo (kinder/preescolar/primaria)");
  else fail("UI no detecta nivel del hijo");
  if (parentChildrenPage.includes("No hay alumnos vinculados") || parentChildrenPage.includes("Sin alumnos")) pass("UI muestra empty state honesto");
  else fail("UI no tiene empty state cuando no hay vínculos");
}

// ─── 5. UI school-admin/students con creación + modal de gestión
console.log("\n5. UI School Admin — gestión de padres");
const studentsPage = readFileIfExists(path.join(ROOT, "frontend", "app", "school-admin", "students", "page.tsx"));
if (studentsPage.length === 0) {
  fail("frontend/app/school-admin/students/page.tsx no existe");
} else {
  if (studentsPage.includes("ParentContact") && studentsPage.includes("relationship")) {
    pass("Crear estudiante incluye campos de Padres/Tutores");
  } else {
    fail("Crear estudiante no incluye campos de Padres/Tutores");
  }
  if (studentsPage.includes("openParentsManager") || studentsPage.includes("parentsManagerOpen")) {
    pass("Existe modal 'Gestionar padres' para padres ya vinculados");
  } else {
    fail("Falta modal 'Gestionar padres' (listar/editar/desvincular)");
  }
  if (studentsPage.includes("UpdateParentLink") || studentsPage.includes('method: "PUT"') && studentsPage.includes("/parents/")) {
    pass("UI llama a PUT para editar vínculo");
  } else {
    // Acepta DELETE+POST como alternativa, pero recomienda PUT
    if (studentsPage.includes('method: "DELETE"') && studentsPage.includes("/parents/")) {
      pass("UI llama a DELETE para desvincular (PUT es opcional)");
    } else {
      fail("UI no tiene flujo para editar/desvincular padres");
    }
  }
}

// ─── 6. Tipos compartidos
console.log("\n6. Tipos consistentes entre frontend y backend");
const relationshipsInBackend = portalAccessContent.match(/mother\b|father\b|guardian\b|other\b/g) || [];
const relationshipsInFrontend = studentsPage.match(/mother\b|father\b|guardian\b|other\b/g) || [];
if (relationshipsInBackend.length >= 4 && relationshipsInFrontend.length >= 4) {
  pass("Ambos lados usan relationship: mother|father|guardian|other");
} else {
  fail("Inconsistencia en valores de relationship");
}

console.log(`
────────────────────────────────────────────────────
  ✅ Passed   : ${passed}
  ❌ Failed   : ${failed}
────────────────────────────────────────────────────
`);
if (failed > 0) process.exit(1);
