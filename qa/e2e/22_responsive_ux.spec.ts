import { test } from '@playwright/test';
import { assertNoHorizontalOverflow, auditPageLoad, recordResult } from './helpers/audit';

const viewports = [
  { name: 'mobile 375x667', width: 375, height: 667 },
  { name: 'tablet 768x1024', width: 768, height: 1024 },
  { name: 'desktop 1366x768', width: 1366, height: 768 },
  { name: 'desktop 1920x1080', width: 1920, height: 1080 },
];

test('responsive UX: matriz solicitada en landing/login', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await auditPageLoad(page, 'Responsive', `landing ${viewport.name}`, '/', /Educore|Sistema|Solicitar|gestion/i);
    await assertNoHorizontalOverflow(page, 'Responsive', `landing overflow ${viewport.name}`);
    await auditPageLoad(page, 'Responsive', `login ${viewport.name}`, '/login/', /Educore|Iniciar|email|correo|password/i);
    await assertNoHorizontalOverflow(page, 'Responsive', `login overflow ${viewport.name}`);
  }

  recordResult({
    area: 'Responsive',
    flow: 'roles autenticados responsive',
    status: 'SKIPPED_NO_CREDENTIALS',
    expected: 'Sidebar, menu movil, tablas, modales y formularios por rol con cuentas QA.',
    actual: 'La matriz autenticada queda pendiente hasta contar con sesiones QA por rol.',
  });
});
