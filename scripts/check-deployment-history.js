#!/usr/bin/env node
/**
 * Static and optional live checks for EduCore deployment history.
 *
 * Live env:
 *   API_BASE_URL
 *   EDUCORE_DEPLOY_WEBHOOK_SECRET
 *   SUPER_ADMIN_EMAIL
 *   SUPER_ADMIN_PASSWORD
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const API_BASE_URL = (process.env.API_BASE_URL || "").replace(/\/$/, "");
const DEPLOY_SECRET = process.env.EDUCORE_DEPLOY_WEBHOOK_SECRET || "";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "";

let failed = 0;

function read(rel) {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.log(`FAIL ${message}`);
  failed += 1;
}

function check(condition, ok, bad) {
  condition ? pass(ok) : fail(bad);
}

function apiURL(apiPath) {
  if (!API_BASE_URL) return apiPath;
  if (API_BASE_URL.endsWith("/api/v1") && apiPath.startsWith("/api/v1")) {
    return `${API_BASE_URL}${apiPath.slice("/api/v1".length)}`;
  }
  return `${API_BASE_URL}${apiPath}`;
}

async function request(apiPath, options = {}) {
  const res = await fetch(apiURL(apiPath), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let body = {};
  try {
    body = await res.json();
  } catch (_) {
    // keep empty body
  }
  return { status: res.status, ok: res.ok, body };
}

section("Static: migration 010");
const migration = read("backend/migrations_mysql/010_deployment_history.sql");
check(!!migration, "migration 010 exists", "backend/migrations_mysql/010_deployment_history.sql missing");
check(migration.includes("CREATE TABLE IF NOT EXISTS deployment_history"), "deployment_history table exists in SQL", "deployment_history table SQL missing");
for (const column of [
  "environment", "service", "provider", "status", "title", "description", "commit_sha",
  "commit_short_sha", "branch", "actor", "repository", "workflow_name", "run_id",
  "run_number", "run_attempt", "run_url", "deployed_at",
]) {
  check(migration.includes(column), `column ${column} present`, `column ${column} missing`);
}
for (const index of ["environment", "service", "status", "deployed_at", "commit_sha", "run_id"]) {
  check(migration.includes(index), `index/check for ${index} present`, `index/check for ${index} missing`);
}

section("Static: backend endpoints");
const deployments = read("backend/internal/modules/super_admin/deployments.go");
const main = read("backend/cmd/server/main.go");
check(deployments.includes("RecordDeployment"), "internal deployments record handler exists", "RecordDeployment handler missing");
check(deployments.includes("/deployments") && deployments.includes("ListDeployments"), "super admin deployments endpoints exist", "super admin deployments endpoints missing");
check(deployments.includes("X-EduCore-Deploy-Secret"), "validates X-EduCore-Deploy-Secret header", "deploy secret header validation missing");
check(deployments.includes("subtle.ConstantTimeCompare"), "secret comparison is constant-time", "constant-time secret comparison missing");
check(main.includes("EDUCORE_DEPLOY_WEBHOOK_SECRET"), "backend reads EDUCORE_DEPLOY_WEBHOOK_SECRET", "backend env var EDUCORE_DEPLOY_WEBHOOK_SECRET missing");
check(main.includes("/internal") && main.includes("RegisterInternalDeploymentRoutes"), "internal route registered", "internal route not registered");
check(main.includes("RegisterDeploymentRoutes"), "super admin deployment routes registered", "super admin deployment routes not registered");

section("Static: GitHub Actions");
const workflow = read(".github/workflows/deploy-frontend-hostinger.yml");
check(workflow.includes("EDUCORE_DEPLOY_WEBHOOK_URL"), "workflow uses EDUCORE_DEPLOY_WEBHOOK_URL", "workflow missing EDUCORE_DEPLOY_WEBHOOK_URL");
check(workflow.includes("EDUCORE_DEPLOY_WEBHOOK_SECRET"), "workflow uses EDUCORE_DEPLOY_WEBHOOK_SECRET", "workflow missing EDUCORE_DEPLOY_WEBHOOK_SECRET");
check(workflow.includes("Record deployment in EduCore"), "workflow records deployment after FTP", "deployment record step missing");
check(workflow.includes("github.sha") || workflow.includes("GITHUB_SHA"), "workflow sends commit sha", "workflow missing commit sha");
check(workflow.includes("github.run_id") || workflow.includes("GITHUB_RUN_ID"), "workflow sends run id", "workflow missing run id");
// if: always() ensures the webhook fires even when the deploy step fails
check(workflow.includes("if: always()"), "workflow Record step has if: always() (fires on failure too)", "Record step missing if: always() — failed deploys will NOT be recorded");
// Dynamic status — must not hardcode "success"
check(workflow.includes("job.status") || workflow.includes("JOB_STATUS"), "workflow sends dynamic job status (not hardcoded success)", "workflow hardcodes status=success — failures not captured");
// Safety checks: secrets must not be echoed or dumped
check(!workflow.includes("echo $EDUCORE_DEPLOY_WEBHOOK_SECRET"), "workflow does not echo secret with shell expansion", "workflow echoes deploy secret");
check(!workflow.includes("echo \"${EDUCORE_DEPLOY_WEBHOOK_SECRET}\""), "workflow does not echo secret with braces", "workflow echoes deploy secret");
check(!workflow.includes("cat deployment-payload.json"), "workflow does not dump payload", "workflow dumps deployment payload");
// Graceful skip if secrets not configured
check(workflow.includes("exit 0") && (workflow.includes("not configured") || workflow.includes("skipping")), "workflow skips gracefully if secrets absent", "workflow may fail pipeline when secrets are missing");

section("Static: Super Admin UI");
const backupsPage = read("frontend/app/super-admin/backups/page.tsx");
check(backupsPage.includes("/api/v1/super-admin/deployments"), "Super Admin Respaldos consumes /super-admin/deployments", "Respaldos page does not consume deployments API");
check(backupsPage.includes("Historial de actualizaciones"), "UI has Historial de actualizaciones section", "deployment history section missing");
// Updated empty state includes GitHub Actions hint
check(
  backupsPage.includes("Aún no hay despliegues registrados") && backupsPage.includes("GitHub Actions"),
  "UI empty state mentions GitHub Actions",
  "empty state does not mention GitHub Actions — user has no guidance"
);
check(backupsPage.includes("No se pudo cargar el historial de despliegues."), "UI has requested error state", "error state missing");
check(backupsPage.includes("deployment.title") || backupsPage.includes(".title"), "UI shows title", "UI title missing");
check(backupsPage.includes("deployment.description") || backupsPage.includes(".description"), "UI shows description", "UI description missing");
check(backupsPage.includes("commit_short_sha") || backupsPage.includes("commit_sha"), "UI shows commit", "UI commit missing");
check(backupsPage.includes("run_url") && backupsPage.includes("Ver workflow"), "UI shows run_url workflow action", "UI run_url/workflow action missing");

section("Static: seed script");
const seedScript = read("scripts/seed-deployment-history-local.js");
check(!!seedScript, "seed-deployment-history-local.js exists", "seed script missing");
check(seedScript.includes("EDUCORE_DEPLOY_WEBHOOK_URL") && seedScript.includes("EDUCORE_DEPLOY_WEBHOOK_SECRET"), "seed script reads webhook env vars", "seed script missing env var reads");
check(!seedScript.includes("process.exit(0)") || seedScript.includes("process.exit(1)"), "seed script exits 1 on error", "seed script swallows errors");

async function liveChecks() {
  const hasLiveEnv = API_BASE_URL && DEPLOY_SECRET && SUPER_ADMIN_EMAIL && SUPER_ADMIN_PASSWORD;
  if (!hasLiveEnv) {
    section("Live checks skipped");
    console.log("Set API_BASE_URL, EDUCORE_DEPLOY_WEBHOOK_SECRET, SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD to run live checks.");
    return;
  }

  section("Live: webhook auth and Super Admin read");
  const stamp = Date.now();
  const payload = {
    environment: "production",
    service: "frontend",
    provider: "github_actions",
    status: "success",
    title: `QA deployment history ${stamp}`,
    description: "Registro de prueba generado por scripts/check-deployment-history.js",
    commit_sha: `codex-check-${stamp}`,
    commit_short_sha: "codexchk",
    branch: "master",
    actor: "codex",
    repository: "ajasdascas/educore",
    workflow_name: "Deployment history QA",
    run_id: `codex-check-${stamp}`,
    run_number: "0",
    run_attempt: "1",
    run_url: "https://github.com/ajasdascas/educore/actions",
  };

  const wrong = await request("/api/v1/internal/deployments/record", {
    method: "POST",
    headers: { "X-EduCore-Deploy-Secret": "wrong-secret" },
    body: JSON.stringify(payload),
  });
  check(wrong.status === 401, "POST with incorrect secret returns 401", `POST with incorrect secret returned ${wrong.status}`);

  const correct = await request("/api/v1/internal/deployments/record", {
    method: "POST",
    headers: { "X-EduCore-Deploy-Secret": DEPLOY_SECRET },
    body: JSON.stringify(payload),
  });
  check(correct.ok, "POST with correct secret returns success", `POST with correct secret failed: ${correct.status} ${JSON.stringify(correct.body)}`);

  const login = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      role: "SUPER_ADMIN",
    }),
  });
  const token = login.body?.data?.access_token;
  check(login.ok && token, "SUPER_ADMIN login successful", `SUPER_ADMIN login failed: ${login.status} ${JSON.stringify(login.body)}`);
  if (!token) return;

  const list = await request("/api/v1/super-admin/deployments?service=frontend&limit=10", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const records = list.body?.data?.deployments || [];
  const found = Array.isArray(records) && records.some((item) => item.run_id === payload.run_id && item.title === payload.title);
  check(list.ok, "GET /super-admin/deployments returns success", `GET deployments failed: ${list.status} ${JSON.stringify(list.body)}`);
  check(found, "GET /super-admin/deployments contains test record", "test deployment record not found");
}

liveChecks()
  .then(() => {
    section("Summary");
    if (failed > 0) {
      console.log(`${failed} check(s) failed.`);
      process.exit(1);
    }
    console.log("All deployment history checks passed.");
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
