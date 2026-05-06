#!/usr/bin/env node
/**
 * Audit: account pages — profile/settings/security use real endpoints
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let passed = 0, failed = 0;

function check(label, ok, note = "") {
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}${note ? " — " + note : ""}`); failed++; }
}
function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return ""; }
}
function exists(rel) {
  try { fs.accessSync(path.join(ROOT, rel)); return true; } catch { return false; }
}

console.log("\n👤  EDUCORE — ACCOUNT PAGES AUDIT\n");

// ── 1. Backend module exists ───────────────────────────────────────────────
console.log("1. Backend account module");
const accountHandler = read("backend/internal/modules/account/handler.go");
check("account/handler.go exists", accountHandler.length > 0);
check("GET /profile route registered", accountHandler.includes("router.Get(\"/profile\""));
check("PUT /profile route registered", accountHandler.includes("router.Put(\"/profile\""));
check("PUT /password route registered", accountHandler.includes("router.Put(\"/password\""));
check("GET /settings route registered", accountHandler.includes("router.Get(\"/settings\""));
check("PUT /settings route registered", accountHandler.includes("router.Put(\"/settings\""));
check("GET /security route registered", accountHandler.includes("router.Get(\"/security\""));

// ── 2. Auth enforcement ────────────────────────────────────────────────────
console.log("\n2. Auth enforcement in backend");
const main = read("backend/cmd/server/main.go");
const accountIdx = main.indexOf("accountGroup");
const accountBlock = accountIdx !== -1 ? main.slice(accountIdx, accountIdx + 300) : "";
check("accountGroup registered in main.go", accountBlock.length > 10);
check("accountGroup has Protected() middleware", accountBlock.includes("middleware.Protected("));
check("No RequireRoles — all authenticated users can access", !accountBlock.includes("RequireRoles("));

// ── 3. Handler validates user_id from JWT ─────────────────────────────────
console.log("\n3. JWT user_id extraction");
check("GetProfile extracts user_id from Locals", accountHandler.includes("c.Locals(\"user_id\")"));
check("UpdateProfile extracts user_id from Locals", accountHandler.includes("c.Locals(\"user_id\").(string)"));
check("GetSecurity extracts user_id from Locals", accountHandler.includes("c.Locals(\"user_id\")"));

// ── 4. Data validation ────────────────────────────────────────────────────
console.log("\n4. Input validation");
check("UpdateProfile validates min length (2 chars)", accountHandler.includes("len(req.FirstName) < 2"));
check("UpdatePassword validates min length (8 chars)", accountHandler.includes("len(req.NewPassword) < 8"));
check("UpdatePassword verifies current password via bcrypt", accountHandler.includes("bcrypt.CompareHashAndPassword"));
check("Password hashed with bcrypt before storing", accountHandler.includes("bcrypt.GenerateFromPassword"));

// ── 5. Frontend AccountPages.tsx uses real endpoints ──────────────────────
console.log("\n5. Frontend — real API endpoints");
const accountPages = read("frontend/components/modules/account/AccountPages.tsx");
check("AccountPages.tsx exists", accountPages.length > 0);
check("Profile loads from GET /api/v1/account/profile", accountPages.includes("/api/v1/account/profile"));
check("Profile save uses PUT /api/v1/account/profile", accountPages.includes("method: \"PUT\"") && accountPages.includes("/api/v1/account/profile"));
check("Password change uses PUT /api/v1/account/password", accountPages.includes("/api/v1/account/password"));
check("Settings load from GET /api/v1/account/settings", accountPages.includes("/api/v1/account/settings"));
check("Settings save uses PUT /api/v1/account/settings", accountPages.includes("method: \"PUT\"") && accountPages.includes("/api/v1/account/settings"));
check("Security info loads from GET /api/v1/account/security", accountPages.includes("/api/v1/account/security"));
check("No mock/static data in Profile — loads from API", !accountPages.includes("// mock") && accountPages.includes("authFetch(\"/api/v1/account/profile\")"));
check("Settings NOT stored only in local state — saved to API", !accountPages.includes("localStorage") && accountPages.includes("/api/v1/account/settings"));

// ── 6. Old change-password route (auth) still works ───────────────────────
console.log("\n6. Backward-compatible auth change-password");
const authHandler = read("backend/internal/modules/auth/handler.go");
check("POST /auth/change-password still registered", authHandler.includes("RegisterProtectedRoutes") && authHandler.includes("change-password"));

// ── 7. Profile/security pages exist for all portals ───────────────────────
console.log("\n7. Frontend portal pages");
const portals = ["teacher", "parent", "student", "school-admin", "super-admin"];
portals.forEach((portal) => {
  const profilePage = exists(`frontend/app/${portal}/profile/page.tsx`);
  check(`${portal}/profile/page.tsx exists`, profilePage);
});

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(55)}`);
console.log(`  ✅ Passed:  ${passed}`);
console.log(`  ❌ Failed:  ${failed}`);
if (failed === 0) {
  console.log("\n  🎉 Account pages — all checks passed\n");
} else {
  console.log(`\n  ⚠️  ${failed} check(s) failed — see above\n`);
  process.exit(1);
}
