#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const files = {
  migration: "backend/migrations_mysql/010_deployment_history.sql",
  backend: "backend/internal/modules/super_admin/deployments.go",
  server: "backend/cmd/server/main.go",
  workflow: ".github/workflows/deploy-frontend-hostinger.yml",
  ui: "frontend/app/super-admin/backups/page.tsx",
  docs: "docs/DEPLOYMENT_HISTORY.md",
};

function read(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing file: ${relPath}`);
  }
  return fs.readFileSync(fullPath, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includes(haystack, needle, message) {
  assert(haystack.includes(needle), message || `Expected to find: ${needle}`);
}

function matches(haystack, regex, message) {
  assert(regex.test(haystack), message || `Expected to match: ${regex}`);
}

function apiBaseFromEnv() {
  const raw = (process.env.API_BASE_URL || "").replace(/\/+$/, "");
  if (!raw) return "";
  return raw.endsWith("/api/v1") ? raw : `${raw}/api/v1`;
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

function runStaticChecks() {
  const migration = read(files.migration);
  const backend = read(files.backend);
  const server = read(files.server);
  const workflow = read(files.workflow);
  const ui = read(files.ui);
  const docs = read(files.docs);

  includes(migration, "CREATE TABLE IF NOT EXISTS deployment_history", "migration 010 must create deployment_history idempotently");
  for (const column of [
    "environment",
    "service",
    "provider",
    "status",
    "title",
    "description",
    "commit_sha",
    "commit_short_sha",
    "branch",
    "actor",
    "repository",
    "workflow_name",
    "run_id",
    "run_number",
    "run_attempt",
    "run_url",
    "deployed_at",
  ]) {
    includes(migration, column, `migration must include column ${column}`);
  }
  for (const index of ["environment", "service", "status", "deployed_at", "commit_sha", "run_id"]) {
    includes(migration, index, `migration must include index coverage for ${index}`);
  }

  includes(backend, "RecordDeployment", "backend must implement internal deployment record handler");
  includes(backend, '"/deployments/record"', "backend must expose internal deployment record endpoint");
  includes(backend, '"/deployments"', "backend must expose super-admin deployments list endpoint");
  includes(backend, '"/deployments/:id"', "backend must expose super-admin deployment detail endpoint");
  includes(backend, "X-EduCore-Deploy-Secret", "backend must validate X-EduCore-Deploy-Secret");
  includes(backend, "subtle.ConstantTimeCompare", "deployment secret comparison must be constant-time");
  includes(backend, "run_id", "backend must upsert by run_id");
  includes(backend, "run_attempt", "backend must upsert by run_attempt");

  includes(server, "EDUCORE_DEPLOY_WEBHOOK_SECRET", "server must read EDUCORE_DEPLOY_WEBHOOK_SECRET");
  includes(server, "RegisterInternalDeploymentRoutes", "server must register internal deployment routes");
  includes(server, "RegisterDeploymentRoutes", "server must register super-admin deployment routes");

  includes(workflow, "Record deployment in EduCore", "workflow must record deployment after FTP deploy");
  includes(workflow, "EDUCORE_DEPLOY_WEBHOOK_URL", "workflow must use EDUCORE_DEPLOY_WEBHOOK_URL");
  includes(workflow, "EDUCORE_DEPLOY_WEBHOOK_SECRET", "workflow must use EDUCORE_DEPLOY_WEBHOOK_SECRET");
  includes(workflow, "github.sha", "workflow must use github.sha");
  includes(workflow, "github.run_id", "workflow must use github.run_id");
  includes(workflow, "X-EduCore-Deploy-Secret", "workflow must send deployment secret header");
  includes(workflow, "deployment-payload.json", "workflow must send a structured deployment payload");
  matches(workflow, /Deploy to Hostinger via FTP[\s\S]+Record deployment in EduCore/, "record step must run after FTP deploy");
  assert(!workflow.includes("set -x"), "workflow must not enable shell tracing");
  assert(!/echo\s+["']?\$EDUCORE_DEPLOY_WEBHOOK_SECRET/.test(workflow), "workflow must not echo the webhook secret");
  assert(!/cat\s+deployment-(payload|response)\.json/.test(workflow), "workflow must not print payload or response bodies");

  includes(ui, "/api/v1/super-admin/deployments", "Super Admin Respaldos must consume deployments endpoint");
  includes(ui, "Historial de actualizaciones", "UI must show deployment history section");
  includes(ui, "Aún no hay despliegues registrados.", "UI must include deployment empty state");
  includes(ui, "No se pudo cargar el historial de despliegues.", "UI must include deployment error state");
  includes(ui, "deployment.title", "UI must show deployment title");
  includes(ui, "deployment.description", "UI must show deployment description");
  includes(ui, "commit_short_sha", "UI must show short commit");
  includes(ui, "run_url", "UI must link to workflow run_url");

  includes(docs, "EDUCORE_DEPLOY_WEBHOOK_URL", "docs must document GitHub webhook URL secret");
  includes(docs, "EDUCORE_DEPLOY_WEBHOOK_SECRET", "docs must document webhook secret");
  includes(docs, "Rollback", "docs must document rollback");

  console.log("Static deployment history checks passed.");
}

async function runLiveChecks() {
  const required = [
    "API_BASE_URL",
    "EDUCORE_DEPLOY_WEBHOOK_SECRET",
    "SUPER_ADMIN_EMAIL",
    "SUPER_ADMIN_PASSWORD",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.log(`Live checks skipped. Missing env: ${missing.join(", ")}`);
    return;
  }

  const apiBase = apiBaseFromEnv();
  const recordURL = `${apiBase}/internal/deployments/record`;
  const testRunID = `codex-deployment-history-${Date.now()}`;
  const payload = {
    environment: "production",
    service: "frontend",
    provider: "github_actions",
    status: "success",
    title: "Codex deployment history QA",
    description: "Registro de prueba generado por scripts/check-deployment-history.js",
    commit_sha: "codex-test-commit-sha",
    commit_short_sha: "codexqa",
    branch: "codex/deployment-history-clean",
    actor: "codex",
    repository: "ajasdascas/educore",
    workflow_name: "Deployment history QA",
    run_id: testRunID,
    run_number: "0",
    run_attempt: "1",
    run_url: "https://github.com/ajasdascas/educore/actions",
  };

  const wrong = await fetch(recordURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-EduCore-Deploy-Secret": "wrong-secret",
    },
    body: JSON.stringify(payload),
  });
  assert(wrong.status === 401, `wrong secret must return 401, got ${wrong.status}`);

  const correct = await fetch(recordURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-EduCore-Deploy-Secret": process.env.EDUCORE_DEPLOY_WEBHOOK_SECRET,
    },
    body: JSON.stringify(payload),
  });
  assert(correct.ok, `correct secret must return 2xx, got ${correct.status}`);

  const login = await fetchJSON(`${apiBase}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
      role: "SUPER_ADMIN",
    }),
  });
  assert(login.response.ok && login.body?.success, `SUPER_ADMIN login failed with HTTP ${login.response.status}`);
  const token = login.body?.data?.access_token;
  assert(token, "SUPER_ADMIN login did not return access_token");

  const deployments = await fetchJSON(`${apiBase}/super-admin/deployments?service=frontend&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(deployments.response.ok && deployments.body?.success, `deployments GET failed with HTTP ${deployments.response.status}`);
  const rows = deployments.body?.data?.deployments || [];
  assert(Array.isArray(rows), "deployments response must include data.deployments array");
  assert(rows.some((row) => row.run_id === testRunID), "deployments list must contain the QA record");

  console.log("Live deployment history checks passed.");
}

(async () => {
  try {
    runStaticChecks();
    await runLiveChecks();
  } catch (error) {
    console.error(`Deployment history check failed: ${error.message}`);
    process.exitCode = 1;
  }
})();
