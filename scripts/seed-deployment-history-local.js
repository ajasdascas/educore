#!/usr/bin/env node
/**
 * Optional local seed — inserts a test deployment record via the webhook endpoint.
 * Use this only during development or manual QA to populate the UI without waiting
 * for a real GitHub Actions run.
 *
 * Required env vars:
 *   EDUCORE_DEPLOY_WEBHOOK_URL    — e.g. http://localhost:8080/api/v1/internal/deployments/record
 *   EDUCORE_DEPLOY_WEBHOOK_SECRET — must match EDUCORE_DEPLOY_WEBHOOK_SECRET in the backend
 *
 * Usage:
 *   EDUCORE_DEPLOY_WEBHOOK_URL=http://localhost:8080/api/v1/internal/deployments/record \
 *   EDUCORE_DEPLOY_WEBHOOK_SECRET=my-dev-secret \
 *   node scripts/seed-deployment-history-local.js
 *
 * To simulate a failure:
 *   DEPLOY_STATUS=failure node scripts/...
 */

const webhookURL = process.env.EDUCORE_DEPLOY_WEBHOOK_URL;
const webhookSecret = process.env.EDUCORE_DEPLOY_WEBHOOK_SECRET;
const deployStatus = process.env.DEPLOY_STATUS || "success";

if (!webhookURL || !webhookSecret) {
  console.error(
    "❌  Missing required env vars.\n" +
      "    EDUCORE_DEPLOY_WEBHOOK_URL  and  EDUCORE_DEPLOY_WEBHOOK_SECRET  must be set.\n" +
      "    See docs/DEPLOYMENT_HISTORY.md for setup instructions."
  );
  process.exit(1);
}

const validStatuses = ["success", "failure", "cancelled", "in_progress"];
if (!validStatuses.includes(deployStatus)) {
  console.error(`❌  DEPLOY_STATUS must be one of: ${validStatuses.join(", ")}`);
  process.exit(1);
}

const stamp = Date.now();
const fakeRunId = `local-seed-${stamp}`;

const payload = {
  environment: "production",
  service: "frontend",
  provider: "github_actions",
  status: deployStatus,
  title: `[LOCAL SEED] Deploy Frontend to Hostinger`,
  description: `Registro de prueba insertado manualmente con seed-deployment-history-local.js (${new Date().toISOString()})`,
  commit_sha: `localdev${stamp}`,
  commit_short_sha: "localdev",
  branch: "master",
  actor: process.env.USER || "local-dev",
  repository: "ajasdascas/educore",
  workflow_name: "Deploy Frontend to Hostinger",
  run_id: fakeRunId,
  run_number: "0",
  run_attempt: "1",
  run_url: "https://github.com/ajasdascas/educore/actions",
};

console.log(`\n🌱  Seeding local deployment record`);
console.log(`    URL:    ${webhookURL}`);
console.log(`    Status: ${deployStatus}`);
console.log(`    Run ID: ${fakeRunId}\n`);

fetch(webhookURL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-EduCore-Deploy-Secret": webhookSecret,
  },
  body: JSON.stringify(payload),
})
  .then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`✅  Deployment record inserted (HTTP ${res.status})`);
      console.log(`    ID: ${body?.data?.id || "—"}`);
      console.log(`\n    Refresh Super Admin → Respaldos → Historial de actualizaciones\n`);
    } else {
      console.error(`❌  Webhook returned HTTP ${res.status}`);
      console.error(`    Body: ${JSON.stringify(body)}`);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error(`❌  Could not reach webhook: ${err.message}`);
    console.error(`    Is the backend running at ${webhookURL}?`);
    process.exit(1);
  });
