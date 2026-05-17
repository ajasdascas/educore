#!/usr/bin/env node
/**
 * check-school-edit-action.js
 *
 * Validates that the "Editar" button in Super Admin > Schools is functional:
 *   1. Edit dropdown item has an onClick handler (openEditModal)
 *   2. openEditModal function is defined in the schools page
 *   3. handleSaveEdit function is defined
 *   4. Edit Dialog modal exists in the JSX
 *   5. Backend registers PUT /super-admin/schools/:id
 *   6. Backend UpdateSchool handler exists in schools.go
 *
 * Usage:
 *   node scripts/check-school-edit-action.js
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => { console.error(`  ❌ ${msg}`); return false; };

let allPass = true;
function check(result, msg) {
  if (!result) { allPass = false; fail(msg); } else { pass(msg); }
}

function read(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

console.log("\n🏫 School Edit Action Audit\n");

// 1-4. Frontend schools page
const schoolsPage = read("frontend/app/super-admin/schools/page.tsx");
if (!schoolsPage) {
  check(false, "frontend/app/super-admin/schools/page.tsx exists");
  allPass = false;
} else {
  check(true, "frontend/app/super-admin/schools/page.tsx exists");

  // Edit DropdownMenuItem must have onClick
  check(
    schoolsPage.includes("openEditModal") &&
    (schoolsPage.includes("onClick={() => openEditModal") ||
     schoolsPage.includes("onClick={()=>openEditModal")),
    "Edit DropdownMenuItem has onClick => openEditModal"
  );

  // openEditModal function defined
  check(
    schoolsPage.includes("function openEditModal") ||
    schoolsPage.includes("async function openEditModal") ||
    schoolsPage.includes("const openEditModal"),
    "openEditModal function is defined"
  );

  // handleSaveEdit function defined
  check(
    schoolsPage.includes("function handleSaveEdit") ||
    schoolsPage.includes("async function handleSaveEdit") ||
    schoolsPage.includes("const handleSaveEdit"),
    "handleSaveEdit function is defined"
  );

  // Edit Dialog modal present
  check(
    schoolsPage.includes("editModalOpen") && schoolsPage.includes("DialogContent"),
    "Edit Dialog modal exists in JSX"
  );

  // PUT request to /super-admin/schools/:id
  check(
    schoolsPage.includes("PUT") && schoolsPage.includes("/super-admin/schools/"),
    "handleSaveEdit sends PUT to /api/v1/super-admin/schools/:id"
  );

  // editFormData state
  check(
    schoolsPage.includes("editFormData") && schoolsPage.includes("editingSchool"),
    "editFormData and editingSchool state variables exist"
  );
}

// 5. Backend route registration
const superAdminHandler = read("backend/internal/modules/super_admin/handler.go");
if (!superAdminHandler) {
  check(false, "backend/internal/modules/super_admin/handler.go exists");
  allPass = false;
} else {
  check(
    superAdminHandler.includes('router.Put("/schools/:id"') ||
    superAdminHandler.includes('router.PUT("/schools/:id"'),
    "Backend registers PUT /schools/:id route"
  );
}

// 6. UpdateSchool handler exists
const schoolsGo = read("backend/internal/modules/super_admin/schools.go");
if (!schoolsGo) {
  check(false, "backend/internal/modules/super_admin/schools.go exists");
  allPass = false;
} else {
  check(
    schoolsGo.includes("func (h *Handler) UpdateSchool"),
    "UpdateSchool handler defined in schools.go"
  );
  check(
    schoolsGo.includes("PUT") ||
    schoolsGo.includes("UpdateSchool") ||
    schoolsGo.includes("update school"),
    "UpdateSchool handles field updates"
  );
}

console.log("\n" + (allPass ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED") + "\n");
process.exit(allPass ? 0 : 1);
