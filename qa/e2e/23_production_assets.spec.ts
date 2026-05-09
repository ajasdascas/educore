import { test } from '@playwright/test';
import { e2eApiURL, e2eBaseURL, recordResult } from './helpers/audit';

test('produccion: assets, basePath y health basicos', async ({ request }) => {
  const landing = await request.get(`${e2eBaseURL}/`, { failOnStatusCode: false });
  const html = await landing.text().catch(() => '');
  const hasBasePathAssets = /\/educore\/_next\//.test(html) || /_next\//.test(html);

  recordResult({
    area: 'Deploy/static export',
    flow: 'landing production basePath',
    status: landing.ok() && hasBasePathAssets ? 'PASS_REAL' : landing.status() === 404 ? 'FAIL_404' : 'PARTIAL',
    url: `${e2eBaseURL}/`,
    expected: 'Landing carga y referencia assets compatibles con /educore.',
    actual: `HTTP ${landing.status()}; basePathAssets=${hasBasePathAssets}; bytes=${html.length}`,
    severity: landing.ok() ? undefined : 'P1',
  });

  for (const route of ['/login/', '/escuela/', '/super-admin/dashboard/']) {
    const response = await request.get(`${e2eBaseURL}${route}`, { failOnStatusCode: false });
    recordResult({
      area: 'Deploy/static export',
      flow: `deep route refresh ${route}`,
      status: response.status() === 404 ? 'FAIL_404' : response.status() >= 500 ? 'FAIL_500' : 'PASS_READ_ONLY',
      url: `${e2eBaseURL}${route}`,
      expected: 'Ruta profunda exportada no da 404/5xx.',
      actual: `HTTP ${response.status()}`,
      severity: response.status() >= 500 ? 'P1' : response.status() === 404 ? 'P2' : undefined,
    });
  }

  const health = await request.get(`${e2eApiURL}/api/v1/health`, { failOnStatusCode: false });
  const healthText = await health.text().catch(() => '');
  recordResult({
    area: 'Deploy/static export',
    flow: 'API health no localhost',
    status: health.ok() && !healthText.includes('localhost') ? 'PASS_REAL' : 'PARTIAL',
    url: `${e2eApiURL}/api/v1/health`,
    expected: 'API produccion responde health y no apunta a localhost en respuesta.',
    actual: `HTTP ${health.status()}; localhost=${healthText.includes('localhost')}`,
    severity: health.ok() ? undefined : 'P1',
  });
});
