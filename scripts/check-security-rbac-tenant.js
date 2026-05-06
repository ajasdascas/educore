#!/usr/bin/env node
/**
 * Security & RBAC audit — EduCore SaaS
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let passed = 0, failed = 0, warnings = 0;

function check(label, ok, note = "") {
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}${note ? " — " + note : ""}`); failed++; }
}
function warn(label, note = "") {
  console.log(`  ⚠️  ${label}${note ? " — " + note : ""}`);
  warnings++;
}
function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return ""; }
}

console.log("\n🔒 EDUCORE — SECURITY & RBAC AUDIT\n");

// ── 1. Auth middleware ──────────────────────────────────────────────────────
console.log("1. Auth Middleware");
const authMw = read("backend/internal/middleware/auth.go");
check("Protected() validates JWT Bearer token", authMw.includes("strings.HasPrefix(authHeader, \"Bearer \")"));
check("tenant_id set from JWT claims", authMw.includes("c.Locals(\"tenant_id\", claims.TenantID)"));
check("support_mode only set for SUPER_ADMIN", authMw.includes("claims.Role == \"SUPER_ADMIN\"") && authMw.includes("support_mode"));
check("RequireRoles() enforces role list", authMw.includes("func RequireRoles(") && authMw.includes("Insufficient permissions"));
check("SUPER_ADMIN support mode bypasses role gate correctly", authMw.includes("isSupport := c.Locals(\"support_mode\")") && authMw.includes("return c.Next()"));

// ── 2. Route protection in main.go ─────────────────────────────────────────
console.log("\n2. Route Protection");
const main = read("backend/cmd/server/main.go");
check("Super-admin routes require SUPER_ADMIN role", main.includes("RequireRoles(\"SUPER_ADMIN\")"));
check("School-admin routes protected", main.includes("RequireRoles(\"SCHOOL_ADMIN\", \"SUPER_ADMIN\")"));
check("Parent routes require PARENT role", main.includes("RequireRoles(\"PARENT\")"));
check("Teacher routes require TEACHER role", main.includes("RequireRoles(\"TEACHER\")"));
check("Student routes require STUDENT role", main.includes("RequireRoles(\"STUDENT\")"));
check("Auth routes public (no RequireRoles on /auth/login)", (() => {
  const idx = main.indexOf("authHandler.RegisterRoutes");
  const end = main.indexOf("\n", idx);
  return main.slice(idx, end).includes("/auth") && !main.slice(idx, end).includes("RequireRoles");
})());

// ── 3. Tenant isolation in parent module ───────────────────────────────────
console.log("\n3. Tenant Isolation — Parent Module");
const parentRepo = read("backend/internal/modules/parent/repository.go");
check("All GetChildren queries filter by tenant_id", parentRepo.includes("s.tenant_id = $1") || parentRepo.includes("WHERE s.tenant_id = $1"));
check("GetAllChildrenByTenant has no hardcoded user filter", (() => {
  const idx = parentRepo.indexOf("func (r *Repository) GetAllChildrenByTenant");
  if (idx === -1) return false;
  const end = parentRepo.indexOf("\nfunc ", idx + 1);
  const body = parentRepo.slice(idx, end > 0 ? end : idx + 3000);
  return !body.includes("u.id = $2");
})());
check("VerifyParentChild checks tenant_id AND parent_id AND student_id", (() => {
  const idx = parentRepo.indexOf("func (r *Repository) VerifyParentChild");
  const end = parentRepo.indexOf("\nfunc ", idx + 1);
  const body = parentRepo.slice(idx, end > 0 ? end : idx + 500);
  return body.includes("tenant_id") && body.includes("parent_id") && body.includes("student_id");
})());

// ── 4. No SQL injection patterns ───────────────────────────────────────────
console.log("\n4. SQL Injection Checks");
const goFiles = ["backend/internal/modules/parent/repository.go",
                  "backend/internal/modules/teacher/repository.go",
                  "backend/internal/modules/student/repository.go",
                  "backend/internal/modules/school_admin/handler.go"];
let fmtStringConcat = 0;
for (const file of goFiles) {
  const content = read(file);
  // Flag fmt.Sprintf with string concat that includes user input (oversimplified check)
  const danglines = content.split("\n").filter(l =>
    l.includes("fmt.Sprintf") && l.includes("+ ") &&
    !l.includes("filter") && !l.includes("$%d") && !l.includes("placeholder")
  );
  fmtStringConcat += danglines.length;
}
check("No obvious SQL string concatenation with user input", fmtStringConcat === 0,
  fmtStringConcat > 0 ? `${fmtStringConcat} potential issues found` : "");

// ── 5. Frontend — no exposed secrets ───────────────────────────────────────
console.log("\n5. Frontend Security");
const libAuth = read("frontend/lib/auth.ts") || read("frontend/lib/auth.tsx");
check("authFetch exists", libAuth.length > 0);
check("authFetch adds Authorization header", libAuth.includes("Authorization") && libAuth.includes("Bearer"));
check("Support mode sends X-Support-Tenant-ID header", libAuth.includes("X-Support-Tenant-ID"));
const envExample = read(".env.example") || read(".env.sample");
check(".env.example exists", envExample.length > 0);
check("No JWT secret hardcoded in .env.example",
  !envExample.toLowerCase().includes("jwt_secret=my") &&
  !envExample.toLowerCase().includes("jwt_secret=secret"));

// ── 6. CORS config ─────────────────────────────────────────────────────────
console.log("\n6. CORS");
check("CORS restricts origins to known domains", main.includes("AllowOrigins") && (main.includes("onlineu.mx") || main.includes("academic.lat")));
check("Credentials allowed (for cookie auth)", main.includes("AllowCredentials: true"));
check("X-Support-Tenant-ID header allowed", main.includes("X-Support-Tenant-ID"));

// ── 7. Password security ───────────────────────────────────────────────────
console.log("\n7. Password Security");
const authSvc = read("backend/internal/modules/auth/service.go") || read("backend/internal/modules/auth/handler.go");
const parentSvc = read("backend/internal/modules/parent/service.go");
check("bcrypt used for password hashing", parentSvc.includes("bcrypt") || authSvc.includes("bcrypt"));
check("Password strength validation exists",
  parentSvc.includes("validatePasswordStrength") || authSvc.includes("validatePasswordStrength"));
check("Minimum password length enforced",
  parentSvc.includes("len(password) < 8") || authSvc.includes("len(password) < 8"));

// ── 8. Hardcoded credentials check ────────────────────────────────────────
console.log("\n8. Hardcoded Credentials");
const suspiciousPatterns = ["password123", "admin123", "secret123", "1234567890abcdef"];
const backendGoFiles = require("child_process").execSync(
  `find "${path.join(ROOT, "backend")}" -name "*.go" -not -path "*/vendor/*" -not -path "*_test.go"`,
  { encoding: "utf8" }
).trim().split("\n").filter(Boolean);

let hardcodedCount = 0;
for (const file of backendGoFiles) {
  try {
    const content = fs.readFileSync(file, "utf8");
    for (const pattern of suspiciousPatterns) {
      if (content.toLowerCase().includes(pattern)) {
        hardcodedCount++;
        break;
      }
    }
  } catch {}
}
check("No hardcoded credential patterns in backend .go files", hardcodedCount === 0,
  hardcodedCount > 0 ? `${hardcodedCount} files with suspicious patterns` : "");

// ── 9. Kinder parent portal — child ownership check ───────────────────────
console.log("\n9. Kinder Parent Portal — Authorization");
const kinderGo = read("backend/internal/modules/parent/kinder.go");
check("parent/kinder.go exists", kinderGo.length > 0,
  kinderGo.length === 0 ? "file missing — kinder parent portal not yet implemented" : "");
if (kinderGo.length > 0) {
  check("parent/kinder.go has verifyAndGetChild (child ownership guard)",
    kinderGo.includes("verifyAndGetChild"),
    "must verify parent owns child BEFORE returning any kinder data");
  check("verifyAndGetChild uses tenant_id isolation",
    kinderGo.includes("tenant_id"),
    "query must scope by tenant_id to prevent cross-tenant data leaks");
  check("verifyAndGetChild checks parent_id against authenticated user",
    kinderGo.includes("parent_id") || kinderGo.includes("parentID"),
    "must validate the requesting user is a parent of the requested child");
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n📊 RESULTADO: ${passed}/${passed + failed} checks passed, ${warnings} warnings`);
if (failed > 0) {
  console.log(`\n⚠️  ${failed} security issues necesitan atención.`);
  process.exit(1);
} else {
  console.log("\n✅ Auditoría de seguridad completada. Sin issues críticos.\n");
}
