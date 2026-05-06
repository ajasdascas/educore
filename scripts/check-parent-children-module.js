#!/usr/bin/env node
/**
 * QA: Parent Children Module
 * Verifies the parent/children page, backend endpoints, and parent-student link system.
 */
const fs = require("fs");
const path = require("path");

let passed = 0, failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ ${name}${detail ? " — " + detail : ""}`); failed++; failures.push(name); }
}

function read(rel) {
  const abs = path.join(__dirname, "..", rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
}

// ─── 1. Frontend page ────────────────────────────────────────────────────────
console.log("\n1. /parent/children page");
const page = read("frontend/app/parent/children/page.tsx");
check("page.tsx exists", page !== null);
if (page) {
  check("Uses 'use client'", page.startsWith('"use client"'));
  check("Imports authFetch", page.includes("authFetch"));
  check("Imports isSupportMode", page.includes("isSupportMode"));
  check("Uses res.success (not res.ok)", page.includes("res.success") && !page.includes("res.ok"));
  check("Has level detection (detectLevel)", page.includes("detectLevel"));
  check("Has kinder panel", page.includes("KinderPanel") || page.includes("kinder"));
  check("Has preescolar panel", page.includes("PreescolarPanel") || page.includes("preescolar"));
  check("Has primaria panel", page.includes("PrimariaPanel") || page.includes("primaria"));
  check("Support mode shows actionable message (link to school-admin)", page.includes("/school-admin/students"));
  check("level_key used from API", page.includes("level_key"));
  check("No blank screen — has visible content", page.length > 1000);
  check("Has empty state for 0 children", page.includes("children.length === 0"));
  check("Has kinder-specific links (daily-logs)", page.includes("/parent/daily-logs"));
  check("Has preescolar-specific links (development-areas)", page.includes("development-areas"));
}

// ─── 2. Backend parent handler ────────────────────────────────────────────────
console.log("\n2. Parent handler routes");
const parentHandler = read("backend/internal/modules/parent/handler.go");
check("parent/handler.go exists", parentHandler !== null);
if (parentHandler) {
  check("GET /children route", parentHandler.includes('"/children"') || parentHandler.includes("GetChildren"));
  check("GetChildren uses support mode", parentHandler.includes("support_mode") || parentHandler.includes("isSupport"));
}

// ─── 3. Parent service support mode ──────────────────────────────────────────
console.log("\n3. Parent service support mode");
const svc = read("backend/internal/modules/parent/service.go");
check("service.go exists", svc !== null);
if (svc) {
  check("GetChildren handles isSupportMode", svc.includes("isSupportMode") || svc.includes("isSupportMode bool"));
  check("GetAllChildrenByTenant called in support mode", svc.includes("GetAllChildrenByTenant"));
}

// ─── 4. Repository level_key ──────────────────────────────────────────────────
console.log("\n4. Repository includes level_key");
const repo = read("backend/internal/modules/parent/repository.go");
check("repository.go exists", repo !== null);
if (repo) {
  check("GetAllChildrenByTenant exists", repo.includes("GetAllChildrenByTenant"));
  check("level_key in GetChildrenByParent query", repo.includes("gl.level"));
  check("LevelKey scanned in GetChildrenByParent", repo.includes("&child.LevelKey"));
  check("LevelKey scanned in GetAllChildrenByTenant", (repo.match(/&child\.LevelKey/g) || []).length >= 2);
}

// ─── 5. ChildSummaryResponse type has LevelKey ───────────────────────────────
console.log("\n5. ChildSummaryResponse type");
const types = read("backend/internal/modules/parent/types.go");
check("types.go exists", types !== null);
if (types) {
  check("LevelKey field in ChildSummaryResponse", types.includes('LevelKey') && types.includes('level_key'));
}

// ─── 6. School admin parent management endpoints ─────────────────────────────
console.log("\n6. School admin parent management endpoints");
const saHandler = read("backend/internal/modules/school_admin/handler.go");
check("school_admin/handler.go exists", saHandler !== null);
if (saHandler) {
  check("GET students/:id/parents route", saHandler.includes('"/students/:id/parents"') || saHandler.includes("GetStudentParents"));
  check("POST students/:id/parents route", saHandler.includes("LinkParentToStudent"));
  check("DELETE students/:id/parents/:parentId route", saHandler.includes("UnlinkParentFromStudent"));
}

// ─── 7. portal_access.go fixes ───────────────────────────────────────────────
console.log("\n7. CreateParentPortalAccess links parent to student");
const pa = read("backend/internal/modules/school_admin/portal_access.go");
check("portal_access.go exists", pa !== null);
if (pa) {
  check("GetStudentParents handler defined", pa.includes("func (h *Handler) GetStudentParents"));
  check("LinkParentToStudent handler defined", pa.includes("func (h *Handler) LinkParentToStudent"));
  check("UnlinkParentFromStudent handler defined", pa.includes("func (h *Handler) UnlinkParentFromStudent"));
  check("CreateParentPortalAccess inserts into parent_student", pa.includes("parent_student") && pa.includes("newParentID"));
  check("Uses INSERT IGNORE for MySQL link", pa.includes("INSERT IGNORE INTO parent_student"));
  check("Relationship guardian set", pa.includes("guardian"));
}

// ─── 8. parent_student table exists in migrations ────────────────────────────
console.log("\n8. parent_student table in migrations");
const mig001 = read("backend/migrations_mysql/001_hostinger_core.sql");
check("Migration 001 exists", mig001 !== null);
if (mig001) {
  check("parent_student table defined", mig001.includes("CREATE TABLE IF NOT EXISTS parent_student"));
  check("parent_id FK", mig001.includes("fk_parent_student_parent"));
  check("student_id FK", mig001.includes("fk_parent_student_student"));
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log(`Parent Children Module QA: ${passed} passed, ${failed} failed`);
if (failures.length > 0) { console.log("\nFailed:"); failures.forEach(f => console.log(`  • ${f}`)); }
console.log("═".repeat(60) + "\n");
process.exit(failed > 0 ? 1 : 0);
