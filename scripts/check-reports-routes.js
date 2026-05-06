#!/usr/bin/env node
/**
 * Audit: reports routes security — no accidental public routes
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

console.log("\n📊  EDUCORE — REPORTS ROUTES AUDIT\n");

const reportsHandler = read("backend/internal/modules/reports/handler.go");
const main = read("backend/cmd/server/main.go");

// ── 1. RegisterRoutes signature ────────────────────────────────────────────
console.log("1. RegisterRoutes signature");
check("RegisterRoutes accepts fiber.Router (not *fiber.App)", reportsHandler.includes("func (h *Handler) RegisterRoutes(app fiber.Router)"));
check("No direct app.Group('/api/v1') inside RegisterRoutes", !reportsHandler.includes("app.Group(\"/api/v1\")"));

// ── 2. RegisterQuickRoutes signature ──────────────────────────────────────
console.log("\n2. RegisterQuickRoutes signature");
check("RegisterQuickRoutes accepts fiber.Router (not *fiber.App)", reportsHandler.includes("func (h *Handler) RegisterQuickRoutes(router fiber.Router)"));
check("Quick routes use relative paths (no /api/v1 prefix)", !reportsHandler.match(/RegisterQuickRoutes[\s\S]{0,200}\/api\/v1/));
check("Quick routes grouped under /quick sub-path", reportsHandler.includes("router.Group(\"/quick\")"));
check("No hardcoded absolute path /api/v1/reports/quick inside RegisterQuickRoutes",
  !reportsHandler.includes("app.Group(\"/api/v1/reports/quick\")")
);

// ── 3. main.go wiring — protected groups ──────────────────────────────────
console.log("\n3. main.go — route protection wiring");

// Extract the block where reportsGroup is defined and used
const reportsGroupIdx = main.indexOf("reportsGroup");
const reportsBlock = reportsGroupIdx !== -1 ? main.slice(reportsGroupIdx, reportsGroupIdx + 400) : "";

check("reportsGroup has Protected() middleware", reportsBlock.includes("middleware.Protected("));
check("reportsGroup has RequireRoles(SCHOOL_ADMIN, TEACHER)", reportsBlock.includes("RequireRoles(\"SCHOOL_ADMIN\", \"TEACHER\")"));
check("RegisterRoutes called on reportsGroup", reportsBlock.includes("reportsHandler.RegisterRoutes(reportsGroup)"));
check("RegisterQuickRoutes called on reportsGroup (protected)", reportsBlock.includes("reportsHandler.RegisterQuickRoutes(reportsGroup)"));

// ── 4. No stale *fiber.App quick route registration ───────────────────────
console.log("\n4. No stale public quick route registrations");
check("RegisterQuickRoutes NOT called with raw app (unprotected)", !main.includes("RegisterQuickRoutes(app)"));
check("No /api/v1/reports/quick group created outside middleware",
  (() => {
    // Make sure the string "/api/v1/reports/quick" doesn't appear in main (it would be unprotected)
    return !main.includes("/api/v1/reports/quick");
  })()
);

// ── 5. Quick route handlers exist ─────────────────────────────────────────
console.log("\n5. Quick route handlers");
check("GetQuickAttendanceToday handler defined", reportsHandler.includes("func (h *Handler) GetQuickAttendanceToday"));
check("GetQuickGradesThisWeek handler defined", reportsHandler.includes("func (h *Handler) GetQuickGradesThisWeek"));
check("GetReportStatus handler defined", reportsHandler.includes("func (h *Handler) GetReportStatus"));
check("DownloadReport handler defined", reportsHandler.includes("func (h *Handler) DownloadReport"));

// ── 6. Tenant isolation in report handlers ────────────────────────────────
console.log("\n6. Tenant isolation");
const reportsRepo = read("backend/internal/modules/reports/repository.go");
const tenantRefs = (reportsRepo.match(/tenant_id/g) || []).length;
check("Repository references tenant_id (isolation)", tenantRefs > 0, `found ${tenantRefs} references`);
check("GetReports query filters by tenant_id", reportsRepo.includes("tenant_id = $1") || reportsRepo.includes("tenant_id ="));

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(55)}`);
console.log(`  ✅ Passed:  ${passed}`);
console.log(`  ❌ Failed:  ${failed}`);
if (failed === 0) {
  console.log("\n  🎉 Reports routes — all checks passed\n");
} else {
  console.log(`\n  ⚠️  ${failed} check(s) failed — see above\n`);
  process.exit(1);
}
