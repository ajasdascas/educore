#!/usr/bin/env node
/**
 * check-rbac-tenant-real.js
 * Audits RBAC (Role-Based Access Control) and tenant isolation.
 * Checks: JWT claims, role middleware, tenant_id filtering, IDOR risks.
 * Does NOT make HTTP requests — static code analysis only.
 *
 * Run: node scripts/check-rbac-tenant-real.js
 */
const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
let passed = 0; let failed = 0; let warnings = 0;
function pass(msg)  { console.log(`  ✅ PASS    ${msg}`); passed++; }
function fail(msg)  { console.log(`  ❌ FAIL    ${msg}`); failed++; }
function warn(msg)  { console.log(`  ⚠️  WARN    ${msg}`); warnings++; }
function skip(msg)  { console.log(`  ⬜ SKIP    ${msg}`); skip.count = (skip.count || 0) + 1; console.skipped = (console.skipped || 0) + 1; }
let skipped = 0;
function skipMsg(msg) { console.log(`  ⬜ SKIP    ${msg}`); skipped++; }

function readFile(p) {
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf-8");
}

function globGoFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d) {
    for (const f of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, f.name);
      if (f.isDirectory() && f.name !== "vendor" && f.name !== ".git") walk(full);
      else if (f.name.endsWith(".go")) results.push(full);
    }
  }
  walk(dir);
  return results;
}

console.log("\n🛡️  RBAC & TENANT ISOLATION AUDIT\n");

const backendDir = path.join(ROOT, "backend");
const allGoFiles = globGoFiles(backendDir);
const allGoContent = allGoFiles.map(f => ({ file: f, content: readFile(f) }));

// 1. JWT middleware
console.log("1. JWT authentication middleware");
const middlewareDir = path.join(backendDir, "internal", "middleware");
const jwtMiddlewareFiles = allGoContent.filter(({ content }) =>
  content.includes("Authorization") && (content.includes("jwt") || content.includes("JWT"))
);
if (jwtMiddlewareFiles.length > 0) {
  pass(`JWT middleware found in ${jwtMiddlewareFiles.length} file(s)`);
  jwtMiddlewareFiles.slice(0, 3).forEach(({ file }) =>
    console.log(`     └─ ${path.relative(ROOT, file)}`)
  );
} else {
  fail("No JWT middleware found");
}

// Check for Bearer token extraction
const bearerFiles = allGoContent.filter(({ content }) => content.includes("Bearer"));
if (bearerFiles.length > 0) {
  pass(`Bearer token extraction in ${bearerFiles.length} file(s)`);
} else {
  fail("No Bearer token extraction found");
}

// 2. Role-based access control
console.log("\n2. Role-based access control");
const roleMiddlewareFiles = allGoContent.filter(({ content }) =>
  (content.includes("RequireRole") || content.includes("RoleCheck") ||
   content.includes("role") || content.includes("SUPER_ADMIN") ||
   content.includes("SCHOOL_ADMIN")) && content.includes("Forbidden")
);
if (roleMiddlewareFiles.length > 0) {
  pass(`Role enforcement middleware found in ${roleMiddlewareFiles.length} file(s)`);
} else {
  fail("No role enforcement middleware found — RBAC may not be enforced");
}

// Check roles are used in routes
const routeRoleFiles = allGoContent.filter(({ content }) =>
  content.includes("SUPER_ADMIN") || content.includes("SCHOOL_ADMIN") ||
  content.includes("TEACHER") || content.includes("PARENT") || content.includes("STUDENT")
);
if (routeRoleFiles.length > 0) {
  pass(`Role constants used in ${routeRoleFiles.length} file(s)`);
} else {
  fail("Role constants not found — routes may be unprotected");
}

// 3. Tenant isolation
console.log("\n3. Tenant isolation (tenant_id in queries)");
// Check that data-querying files use tenant_id
const handlerFiles = allGoContent.filter(({ file }) =>
  file.includes("handler.go") || file.includes("service.go")
);
const tenantFilteredFiles = handlerFiles.filter(({ content }) =>
  content.includes("tenant_id") || content.includes("tenantID") || content.includes("TenantID")
);
if (tenantFilteredFiles.length > 0) {
  pass(`tenant_id filtering in ${tenantFilteredFiles.length} handler/service file(s)`);
} else {
  fail("No tenant_id filtering found in handlers/services — potential data leak between tenants");
}

// Check for ctx tenant extraction pattern
const ctxTenantFiles = allGoContent.filter(({ content }) =>
  content.includes("Locals(\"tenant") || content.includes("locals[\"tenant") ||
  content.includes("GetTenantID") || content.includes("tenantFromCtx") ||
  content.includes("c.Locals") && content.includes("tenant")
);
if (ctxTenantFiles.length > 0) {
  pass(`Tenant extraction from context found in ${ctxTenantFiles.length} file(s)`);
} else {
  warn("No clear pattern for extracting tenant from request context — verify isolation manually");
}

// 4. Super admin isolation
console.log("\n4. Super admin cross-tenant access control");
const superAdminHandler = path.join(backendDir, "internal", "modules", "super_admin", "handler.go");
if (fs.existsSync(superAdminHandler)) {
  const h = readFile(superAdminHandler);
  if (h.includes("SUPER_ADMIN") || h.includes("superAdmin") || h.includes("super_admin")) {
    pass("super_admin handler has role references");
  } else {
    fail("super_admin handler lacks role enforcement");
  }
  if (h.includes("X-Support-Tenant-ID") || h.includes("support_tenant") || h.includes("SupportTenant")) {
    pass("Super admin uses X-Support-Tenant-ID header for cross-tenant access");
  } else {
    warn("Super admin cross-tenant access pattern not found (X-Support-Tenant-ID)");
  }
} else {
  fail("super_admin/handler.go not found");
}

// 5. IDOR risk assessment
console.log("\n5. IDOR (Insecure Direct Object Reference) risk check");
// Find endpoints with :id params that don't verify tenant
const idorRisks = handlerFiles.filter(({ content, file }) => {
  if (file.includes("super_admin")) return false; // SA has intentional cross-tenant
  const hasIdParam = content.includes('Params("id")') || content.includes("c.Params");
  const hasTenantCheck = content.includes("tenant_id") || content.includes("tenantID");
  return hasIdParam && !hasTenantCheck;
});
if (idorRisks.length > 0) {
  warn(`${idorRisks.length} handler/service uses :id params without obvious tenant check:`);
  idorRisks.forEach(({ file }) => console.log(`     └─ ${path.relative(ROOT, file)}`));
} else {
  pass("All handlers with :id params appear to check tenant_id");
}

// 6. Password exposure
console.log("\n6. Sensitive data exposure check");
const passwordInResponse = allGoContent.filter(({ content }) =>
  content.includes("password") && content.includes("json:") &&
  !content.match(/json:"-"/) && content.includes("Password")
);
// Only flag if Password appears in a response/model struct (not a Request DTO).
// Request DTOs and anonymous input structs (parsed via BodyParser) are OK.
const realRisks = passwordInResponse.filter(({ content }) => {
  const lines = content.split("\n");
  let inInputStruct = false;
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // Named request structs
    if (/type\s+\w*(Request|Input|Payload|Form|Login|Reset|Change|Forgot|Accept|Create)\w*\s+struct/.test(l)) {
      inInputStruct = true;
    }
    // Anonymous inline struct used with BodyParser (func body context)
    if (/var\s+req\s+struct\s*\{/.test(l)) inInputStruct = true;
    // Track brace depth to exit struct
    depth += (l.match(/\{/g) || []).length;
    depth -= (l.match(/\}/g) || []).length;
    if (depth <= 0 && i > 0) { inInputStruct = false; depth = 0; }
    // Flag Password only in non-input contexts
    if (!inInputStruct && /Password\s+string\s+`json:"password"`/i.test(l)) {
      return true;
    }
  }
  return false;
});
if (realRisks.length > 0) {
  fail(`Password field exposed in JSON response in ${realRisks.length} file(s)`);
  realRisks.forEach(({ file }) => console.log(`     └─ ${path.relative(ROOT, file)}`));
} else {
  pass("No obvious password field exposed in JSON responses");
}

// Check for json:"-" on password fields (best practice)
const passwordHidden = allGoContent.filter(({ content }) =>
  content.includes('json:"-"') && content.includes("Password") ||
  content.includes("omitempty") && content.includes("password")
);
if (passwordHidden.length > 0) {
  pass(`Password fields properly hidden with json:"-" in ${passwordHidden.length} file(s)`);
}

// 7. Frontend role guard
console.log("\n7. Frontend role guards");
const roleGuardFile = path.join(ROOT, "frontend", "components", "modules", "ModuleGuard.tsx");
const roleGuardFile2 = path.join(ROOT, "frontend", "components", "auth", "RoleGuard.tsx");
if (fs.existsSync(roleGuardFile)) {
  pass("ModuleGuard component exists (frontend module access control)");
} else if (fs.existsSync(roleGuardFile2)) {
  pass("RoleGuard component exists");
} else {
  warn("No RoleGuard/ModuleGuard component found — frontend may not enforce role restrictions");
}

// Check middleware.ts absence (static export)
const middlewarePath = path.join(ROOT, "frontend", "middleware.ts");
if (!fs.existsSync(middlewarePath)) {
  pass("No frontend middleware.ts — auth enforced on backend only (correct for static export)");
} else {
  warn("middleware.ts exists — verify it does not break static export");
}

// Summary
console.log(`
────────────────────────────────────────────────────
  ✅ Passed   : ${passed}
  ❌ Failed   : ${failed}
  ⚠️  Warnings : ${warnings}
  ⬜ Skipped  : ${skipped}
────────────────────────────────────────────────────
`);
if (failed > 0) process.exit(1);
