#!/usr/bin/env node
/**
 * QA: Parent Portal → Mis Hijos + support mode fix
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const results = [];
let passed = 0, failed = 0;

function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
  results.push({ label, ok, detail });
}

function readFile(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); } catch { return ""; }
}

console.log("\n🔍 PARENT PORTAL — MIS HIJOS — QA\n");

// Backend repo checks
const repo = readFile("backend/internal/modules/parent/repository.go");
check("GetAllChildrenByTenant exists", repo.includes("GetAllChildrenByTenant"));
check("TIME_FORMAT in GetAllChildrenByTenant", repo.includes("TIME_FORMAT(csb.start_time"));
check("DATE_FORMAT in GetAllChildrenByTenant", repo.includes("DATE_FORMAT(ar.date"));
check("No parent_id filter in GetAllChildrenByTenant query",
  repo.includes("func (r *Repository) GetAllChildrenByTenant") &&
  (() => {
    const fnStart = repo.indexOf("func (r *Repository) GetAllChildrenByTenant");
    const fnEnd = repo.indexOf("\nfunc ", fnStart + 1);
    const body = repo.slice(fnStart, fnEnd > 0 ? fnEnd : fnStart + 3000);
    return !body.includes("parent_id = $2");
  })()
);
check("GetChildrenByParent still uses parent_id filter",
  (() => {
    const fnStart = repo.indexOf("func (r *Repository) GetChildrenByParent");
    const fnEnd = repo.indexOf("\nfunc ", fnStart + 1);
    const body = repo.slice(fnStart, fnEnd > 0 ? fnEnd : fnStart + 3000);
    return body.includes("u.id = $2");
  })()
);
check("TIME_FORMAT in GetChildrenByParent (next_class subquery)",
  (() => {
    const fnStart = repo.indexOf("func (r *Repository) GetChildrenByParent");
    const fnEnd = repo.indexOf("\nfunc ", fnStart + 1);
    const body = repo.slice(fnStart, fnEnd > 0 ? fnEnd : fnStart + 3000);
    return body.includes("TIME_FORMAT(csb.start_time");
  })()
);

// Backend service checks
const svc = readFile("backend/internal/modules/parent/service.go");
check("GetChildren has isSupportMode parameter", svc.includes("isSupportMode bool"));
check("GetChildren branches on support mode", svc.includes("if isSupportMode {"));
check("GetAllChildrenByTenant called in support mode branch", svc.includes("GetAllChildrenByTenant"));
check("VerifyParentAccess bypasses check in support mode",
  (() => {
    const idx = svc.indexOf("func (s *Service) VerifyParentAccess");
    const end = svc.indexOf("\nfunc ", idx + 1);
    const body = svc.slice(idx, end > 0 ? end : idx + 500);
    return body.includes("isSupportMode bool") && body.includes("return true, nil");
  })()
);

// Backend handler checks
const handler = readFile("backend/internal/modules/parent/handler.go");
check("GetChildren handler reads support_mode local",
  handler.includes('c.Locals("support_mode").(bool)'));
check("GetChildren passes isSupport to service",
  (() => {
    const idx = handler.indexOf("func (h *Handler) GetChildren");
    const end = handler.indexOf("\nfunc ", idx + 1);
    const body = handler.slice(idx, end > 0 ? end : idx + 500);
    return body.includes("isSupport") && body.includes("GetChildren(") && body.includes("isSupport");
  })()
);
check("GetChildDetails uses support_mode",
  (() => {
    const idx = handler.indexOf("func (h *Handler) GetChildDetails");
    const end = handler.indexOf("\nfunc ", idx + 1);
    const body = handler.slice(idx, end > 0 ? end : idx + 600);
    return body.includes("isSupport") && body.includes("VerifyParentAccess") && body.includes("isSupport");
  })()
);
check("All 6 child handlers pass isSupport to VerifyParentAccess",
  ["GetChildGrades", "GetChildAttendance", "GetChildSchedule", "GetChildReportCard", "GetChildTeachers", "GetChildAssignments"].every(fn => {
    const idx = handler.indexOf(`func (h *Handler) ${fn}`);
    if (idx === -1) return false;
    const end = handler.indexOf("\nfunc ", idx + 1);
    const body = handler.slice(idx, end > 0 ? end : idx + 600);
    return body.includes("isSupport") && body.includes("VerifyParentAccess");
  })
);

// Frontend checks
const fe = readFile("frontend/app/parent/children/page.tsx");
check("Frontend page exists", fe.length > 0);
check("Empty state rendered when no children", fe.includes("No hay alumnos vinculados"));
check("Loading state", fe.includes("Cargando hijos"));
check("No mock/demo data in frontend", !fe.includes("mock") && !fe.includes("demo"));
check("Typed interfaces (no any for list)", fe.includes("ChildSummary[]"));
check("Selecciona un alumno (not hijo) — matches real case", fe.includes("Selecciona un alumno"));

console.log(`\n📊 RESULTADO: ${passed}/${passed + failed} checks passed`);
if (failed > 0) {
  console.log(`\n⚠️  ${failed} checks fallaron. Revisa arriba.`);
  process.exit(1);
} else {
  console.log("\n✅ Todo correcto — Parent Children portal listo para support mode.\n");
}
