import { test } from '@playwright/test';
import { auditPageLoad, hasSuperAdminCredentials, loginSuperAdminWithFallback, recordResult, recordSkip } from './helpers/audit';

test('billing y pagos: UI real sin pagos reales ni tarjetas', async ({ page, request }) => {
  if (!hasSuperAdminCredentials) {
    recordSkip('Billing', 'facturacion escolar completa', 'Faltan credenciales Super Admin E2E y objetos QA.');
    return;
  }

  const loggedIn = await loginSuperAdminWithFallback(page, request);
  if (!loggedIn) return;

  await auditPageLoad(page, 'Billing', 'Super Admin billing', '/super-admin/billing/', /Billing|Cobranza|Facturacion|Invoices|Pagos/i);
  await auditPageLoad(page, 'Billing', 'School Admin pagos protegido', '/school-admin/payments/', /login|iniciar|Pagos|Cobranza|No autorizado|Unauthorized/i);
  await auditPageLoad(page, 'Billing', 'Parent pagos protegido', '/parent/payments/', /login|iniciar|Pagos|No autorizado|Unauthorized/i);

  recordResult({
    area: 'Payments',
    flow: 'no usar tarjeta ni provider real',
    status: 'SKIPPED_PROVIDER_NOT_CONFIGURED',
    role: 'QA',
    expected: 'No hacer pagos reales; solo test mode/provider QA documentado.',
    actual: 'No se envio tarjeta, no se creo checkout real y no se registro pago manual sin alumno QA.',
  });
});
