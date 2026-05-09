import { test } from '@playwright/test';
import { auditPageLoad, hasSuperAdminCredentials, loginSuperAdminWithFallback, recordResult, recordSkip } from './helpers/audit';

test('credenciales e invitaciones: sin hash visible ni email real', async ({ page, request }) => {
  if (!hasSuperAdminCredentials) {
    recordSkip('Credenciales', 'crear accesos QA profesor/padre/alumno', 'Faltan credenciales Super Admin E2E y objetos QA.');
    return;
  }

  const loggedIn = await loginSuperAdminWithFallback(page, request);
  if (!loggedIn) return;

  await auditPageLoad(page, 'Credenciales', 'Super Admin usuarios globales', '/super-admin/users/', /Usuarios|Globales|Admin|Email|Rol/i);
  const text = await page.locator('body').innerText().catch(() => '');
  const hashVisible = /password_hash|\$2[aby]\$|argon2/i.test(text);
  recordResult({
    area: 'Credenciales',
    flow: 'password_hash no visible en UI',
    status: hashVisible ? 'FAIL_SECURITY' : 'PASS_READ_ONLY',
    role: 'SUPER_ADMIN',
    url: page.url(),
    expected: 'La UI nunca muestra password_hash ni hashes de password.',
    actual: hashVisible ? 'Se detecto patron de hash en texto visible.' : 'No se detectaron hashes en texto visible.',
    severity: hashVisible ? 'P0' : undefined,
  });

  recordResult({
    area: 'Emails',
    flow: 'invitaciones sin provider QA',
    status: 'SKIPPED_PROVIDER_NOT_CONFIGURED',
    expected: 'No enviar correos reales desde auditoria.',
    actual: 'No se hizo click en enviar invitacion real; se requiere Resend/test provider para prueba profunda.',
  });
});
