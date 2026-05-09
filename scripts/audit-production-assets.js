const fs = require('fs');
const path = require('path');

const baseURL = (process.env.E2E_BASE_URL || 'https://onlineu.mx/educore').replace(/\/+$/, '');
const apiURL = (process.env.E2E_API_URL || 'https://educore-production-beef.up.railway.app').replace(/\/+$/, '');
const root = process.cwd();
const reportDir = path.join(root, 'qa', 'reports');

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function fetchStatus(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { redirect: 'follow' });
    return { url, status: response.status, ok: response.ok, ms: Date.now() - started };
  } catch (error) {
    return { url, status: 0, ok: false, ms: Date.now() - started, error: String(error.message || error) };
  }
}

async function main() {
  fs.mkdirSync(reportDir, { recursive: true });
  const landing = await fetch(`${baseURL}/`, { redirect: 'follow' });
  const html = await landing.text();

  const assetRefs = unique([
    ...Array.from(html.matchAll(/\s(?:src|href)=["']([^"']+)["']/g), (match) => match[1]),
  ])
    .filter((ref) => ref.startsWith('/educore/') || ref.startsWith(baseURL))
    .slice(0, 120)
    .map((ref) => ref.startsWith('http') ? ref : `https://onlineu.mx${ref}`);

  const deepRoutes = [
    '/',
    '/login/',
    '/escuela/',
    '/super-admin/dashboard/',
    '/school-admin/dashboard/',
    '/teacher/dashboard/',
    '/parent/dashboard/',
    '/student/dashboard/',
  ].map((route) => `${baseURL}${route}`);

  const assetResults = [];
  for (const asset of assetRefs) assetResults.push(await fetchStatus(asset));

  const routeResults = [];
  for (const route of deepRoutes) routeResults.push(await fetchStatus(route));

  const health = await fetchStatus(`${apiURL}/api/v1/health`);
  const report = {
    generated_at: new Date().toISOString(),
    base_url: baseURL,
    api_url: apiURL,
    landing: { status: landing.status, ok: landing.ok, bytes: html.length },
    assets_checked: assetResults.length,
    asset_failures: assetResults.filter((item) => item.status >= 400 || item.status === 0),
    routes_checked: routeResults,
    api_health: health,
    notes: [
      'Safe production asset audit only. No authenticated crawling, no fuzzing, no mass scan.',
      'Protected routes may redirect or render login; only 404/5xx are production asset/deep route failures.',
    ],
  };

  fs.writeFileSync(path.join(reportDir, 'PRODUCTION_ASSETS_REPORT.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Production assets checked: ${assetResults.length}; failures: ${report.asset_failures.length}; API health HTTP ${health.status}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
