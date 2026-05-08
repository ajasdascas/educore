import { test } from '@playwright/test';
import {
  assertNoHorizontalOverflow,
  auditPageLoad,
  checkVisibleText,
  clickFirst,
  e2eBaseURL,
  recordResult,
  resetAuditReport,
  saveAuditScreenshot,
} from './helpers/audit';

test.beforeAll(() => {
  resetAuditReport();
});

test('landing publica: carga, enlaces, demo, tema y responsive', async ({ page, request }, testInfo) => {
  const loaded = await auditPageLoad(page, 'Public Landing', 'cargar landing principal', '/', /Educore|gestion escolar|Solicitar|Sistema/i);
  if (!loaded) return;

  await saveAuditScreenshot(page, 'public-landing-desktop', testInfo);
  await checkVisibleText(page, 'Public Landing', 'copy principal visible', /Educore|gestion escolar|simplificada|plataforma/i);

  const anchors = await page.locator('a[href]').evaluateAll((nodes) =>
    nodes
      .map((node) => (node as HTMLAnchorElement).href)
      .filter((href) => href && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.includes('#'))
      .filter((href, index, list) => list.indexOf(href) === index)
      .slice(0, 16),
  );

  for (const href of anchors) {
    if (!href.startsWith(e2eBaseURL)) continue;
    const response = await request.get(href, { failOnStatusCode: false });
    recordResult({
      area: 'Public Landing',
      flow: `link interno ${new URL(href).pathname}`,
      status: response.status() === 404 || response.status() >= 500 ? 'FAIL' : 'PASS',
      url: href,
      expected: 'El link interno no responde 404/5xx.',
      actual: `HTTP ${response.status()}`,
      severity: response.status() >= 500 ? 'P1' : response.status() === 404 ? 'P2' : undefined,
    });
  }

  const themeClicked = await clickFirst(page, [
    'button:has-text("Claro")',
    'button:has-text("Oscuro")',
    'button:has-text("Normal")',
    'button[aria-label*="tema" i]',
    'button[aria-label*="theme" i]',
  ]);
  recordResult({
    area: 'Public Landing',
    flow: 'selector de tema',
    status: themeClicked ? 'PASS' : 'WARN',
    url: page.url(),
    expected: 'Existe control de tema y responde al click sin recargar.',
    actual: themeClicked ? 'Control de tema accionado.' : 'No se encontro control de tema por texto/aria.',
    severity: themeClicked ? undefined : 'P3',
  });

  const demoClicked = await clickFirst(page, [
    'button:has-text("Solicitar demo")',
    'a:has-text("Solicitar demo")',
    'button:has-text("demo")',
  ]);
  await page.waitForTimeout(500);
  recordResult({
    area: 'Public Landing',
    flow: 'CTA solicitar demo',
    status: demoClicked ? 'PASS' : 'WARN',
    url: page.url(),
    expected: 'CTA de demo es visible y clickeable.',
    actual: demoClicked ? 'CTA accionado sin excepcion Playwright.' : 'No se encontro CTA de demo.',
    severity: demoClicked ? undefined : 'P3',
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${e2eBaseURL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await saveAuditScreenshot(page, 'public-landing-mobile', testInfo);
  await assertNoHorizontalOverflow(page, 'Public Landing', 'responsive movil 375px');
});
