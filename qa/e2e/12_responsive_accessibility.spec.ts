import { test } from '@playwright/test';
import { assertNoHorizontalOverflow, auditPageLoad, recordResult, saveAuditScreenshot } from './helpers/audit';

const viewports = [
  { name: 'desktop-1280', width: 1280, height: 900 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-375', width: 375, height: 812 },
];

test('responsive y UX: landing y login en desktop/tablet/mobile', async ({ page }, testInfo) => {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await auditPageLoad(page, 'Responsive/UX', `landing ${viewport.name}`, '/', /Educore|gestion|Solicitar|Sistema/i);
    await saveAuditScreenshot(page, `responsive-landing-${viewport.name}`, testInfo);
    await assertNoHorizontalOverflow(page, 'Responsive/UX', `landing ${viewport.name} overflow`);

    await auditPageLoad(page, 'Responsive/UX', `login ${viewport.name}`, '/login/', /Educore|Iniciar|correo|email|password/i);
    await assertNoHorizontalOverflow(page, 'Responsive/UX', `login ${viewport.name} overflow`);
  }

  const contrastProbe = await page.evaluate(() => {
    const textNodes = Array.from(document.querySelectorAll('body *'))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })
      .slice(0, 250)
      .map((element) => {
        const style = window.getComputedStyle(element);
        return { color: style.color, background: style.backgroundColor, text: (element.textContent ?? '').trim().slice(0, 40) };
      })
      .filter((item) => item.text.length > 0);
    return textNodes.length;
  });

  recordResult({
    area: 'Responsive/UX',
    flow: 'muestreo basico de elementos visibles',
    status: contrastProbe > 20 ? 'PASS' : 'WARN',
    url: page.url(),
    expected: 'La pagina expone suficientes elementos visibles para revision de contraste manual/visual.',
    actual: `${contrastProbe} elementos visibles muestreados.`,
    severity: contrastProbe > 20 ? undefined : 'P3',
  });
});
