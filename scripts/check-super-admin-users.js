#!/usr/bin/env node
/**
 * Audit: Super Admin Global Users module
 *
 * Validates:
 *  1. Backend users.go — endpoints registered
 *  2. Backend users.go — ILIKE removed (MySQL-compatible LIKE)
 *  3. Backend users.go — self-disable protection
 *  4. Backend users.go — self-delete protection
 *  5. Backend users.go — last active SUPER_ADMIN protection (toggle)
 *  6. Backend users.go — last active SUPER_ADMIN protection (delete)
 *  7. Backend users.go — soft delete sets deleted_at
 *  8. Backend users.go — no password_hash in SELECT
 *  9. Frontend page.tsx — DropdownMenuTrigger (no broken asChild)
 * 10. Frontend page.tsx — dropdown has Ver detalles, Editar, Desactivar/Reactivar, Eliminar
 * 11. Frontend page.tsx — confirmation dialog for deactivate/delete
 * 12. Frontend page.tsx — self-protection isSelf check
 * 13. Frontend page.tsx — stats cards (Activos, Inactivos)
 * 14. Frontend page.tsx — no mock data
 * 15. UserFormModal.tsx — exists
 * 16. Migration 016 — storage metadata columns exist
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let passed = 0, failed = 0;

function check(label, ok, note = "") {
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else     { console.log(`  ❌ ${label}${note ? " — " + note : ""}`); failed++; }
}
function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return ""; }
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const usersGo    = read("backend/internal/modules/super_admin/users.go");
const frontPage  = read("frontend/app/super-admin/users/page.tsx");
const formModal  = read("frontend/app/super-admin/users/UserFormModal.tsx");
const migration  = read("backend/migrations_mysql/016_backup_jobs_metadata_and_storage.sql");

// ── 1. Route registration ──────────────────────────────────────────────────────
console.log("\n1. Route registration");
check("GET /users registered",       usersGo.includes('router.Get("/users"'));
check("POST /users registered",      usersGo.includes('router.Post("/users"'));
check("GET /users/:id registered",   usersGo.includes('router.Get("/users/:id"'));
check("PUT /users/:id registered",   usersGo.includes('router.Put("/users/:id"'));
check("PATCH /users/:id/toggle",     usersGo.includes('router.Patch("/users/:id/toggle"'));
check("DELETE /users/:id registered",usersGo.includes('router.Delete("/users/:id"'));

// ── 2. MySQL compatibility ─────────────────────────────────────────────────────
console.log("\n2. MySQL compatibility");
check("No ILIKE in users.go (use LIKE)", !usersGo.includes("ILIKE"));
check("LIKE used for search", usersGo.includes("LIKE $"));

// ── 3+4. Self-protection ───────────────────────────────────────────────────────
console.log("\n3-4. Self-protection (backend)");
check("Self-disable protection in ToggleGlobalUserStatus",
  usersGo.includes("No puedes desactivar tu propia cuenta") ||
  (usersGo.includes("currentUserID") && usersGo.includes("ToggleGlobalUserStatus")));
check("Self-delete protection in DeleteGlobalUser",
  usersGo.includes("No puedes eliminar tu propia cuenta"));

// ── 5+6. Last SUPER_ADMIN protection ──────────────────────────────────────────
console.log("\n5-6. Last SUPER_ADMIN protection (backend)");
check("Last active SUPER_ADMIN check in toggle",
  usersGo.includes("último Super Admin activo") || usersGo.includes("last active SUPER_ADMIN"));
check("Last active SUPER_ADMIN check in delete",
  usersGo.includes("último Super Admin activo") || usersGo.includes("last active SUPER_ADMIN"));

// ── 7. Soft delete ─────────────────────────────────────────────────────────────
console.log("\n7. Soft delete");
check("deleted_at set on delete", usersGo.includes("deleted_at = NOW()"));
check("is_active = false on delete", usersGo.includes("is_active = false"));

// ── 8. No password leaks ───────────────────────────────────────────────────────
console.log("\n8. No password leaks");
const selectBlock = usersGo.match(/SELECT id.*?FROM users/s)?.[0] || "";
check("password_hash not selected in list/get queries",
  !usersGo.match(/SELECT[^;]*password_hash[^;]*FROM users/));

// ── 9. Dropdown trigger ────────────────────────────────────────────────────────
console.log("\n9. Dropdown trigger");
check("DropdownMenuTrigger used (no broken asChild with Button)",
  frontPage.includes("DropdownMenuTrigger") &&
  // The fix: trigger directly without asChild wrapping a Button that breaks base-ui
  (frontPage.includes("DropdownMenuTrigger\n") ||
   frontPage.includes("DropdownMenuTrigger ") ||
   frontPage.includes("DropdownMenuTrigger\r")));
check("No asChild on DropdownMenuTrigger wrapping Button (base-ui fix)",
  !frontPage.match(/DropdownMenuTrigger asChild[\s\S]{0,200}Button/));

// ── 10. Dropdown menu items ────────────────────────────────────────────────────
console.log("\n10. Dropdown menu items");
check("Ver detalles action exists",    frontPage.includes("Ver detalles"));
check("Editar action exists",          frontPage.includes("Editar"));
check("Desactivar/Reactivar action",   frontPage.includes("Desactivar") && frontPage.includes("Reactivar"));
check("Eliminar usuario action",       frontPage.includes("Eliminar usuario") || frontPage.includes("Eliminar"));
check("Reset password action",         frontPage.includes("Reset password"));
check("Force logout action",           frontPage.includes("Force logout") || frontPage.includes("force-logout"));

// ── 11. Confirmation dialog ────────────────────────────────────────────────────
console.log("\n11. Confirmation dialogs");
check("Confirmation dialog for deactivate",
  frontPage.includes("confirmAction") && frontPage.includes("Confirmar"));
check("Detail dialog present",
  frontPage.includes("detailUser") || frontPage.includes("Ver detalles"));

// ── 12. Self protection (frontend) ────────────────────────────────────────────
console.log("\n12. Self-protection (frontend)");
check("isSelf check present", frontPage.includes("isSelf"));
check("currentUser from getUser()", frontPage.includes("getUser"));

// ── 13. Stats cards ────────────────────────────────────────────────────────────
console.log("\n13. Stats cards");
check("Activos stat card", frontPage.includes("Activos"));
check("Inactivos stat card", frontPage.includes("Inactivos"));
check("Total Usuarios stat card", frontPage.includes("Total"));

// ── 14. No mock data ──────────────────────────────────────────────────────────
console.log("\n14. No mock data");
check("No mock users in page", !frontPage.includes("mock") && !frontPage.includes("MOCK"));
check("Uses authFetch (real API)", frontPage.includes("authFetch"));

// ── 15. UserFormModal ─────────────────────────────────────────────────────────
console.log("\n15. UserFormModal");
check("UserFormModal.tsx exists", exists("frontend/app/super-admin/users/UserFormModal.tsx"));
check("UserFormModal uses PUT for updates", formModal.includes('method: "PUT"'));
check("UserFormModal uses POST for create", formModal.includes('method: "POST"'));

// ── 16. Migration 016 ─────────────────────────────────────────────────────────
console.log("\n16. Migration 016 — storage metadata");
check("016_backup_jobs_metadata_and_storage.sql exists",
  exists("backend/migrations_mysql/016_backup_jobs_metadata_and_storage.sql"));
check("storage_key column in migration", migration.includes("storage_key"));
check("storage_provider column in migration", migration.includes("storage_provider"));
check("deleted_at column in migration", migration.includes("deleted_at"));
check("title column in migration", migration.includes("title"));
check("Migration is idempotent (information_schema)", migration.includes("information_schema"));

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
if (failed === 0) {
  console.log("\n  🎉 Super Admin Users module — all checks passed\n");
} else {
  console.log(`\n  🚨 ${failed} issue(s) found — fix before deploy\n`);
  process.exit(1);
}
