import { test } from '@playwright/test';
import {
  auditPageLoad,
  checkVisibleText,
  clickFirst,
  fillFirst,
  loginSuperAdminWithFallback,
  recordResult,
  saveAuditScreenshot,
} from './helpers/audit';

test('auth: login vacio, login invalido, forgot y rutas protegidas', async ({ page }, testInfo) => {
  await auditPageLoad(page, 'Auth', 'abrir pagina login', '/login/', /Educore|Iniciar|correo|email|password/i);
  await saveAuditScreenshot(page, 'auth-login-page', testInfo);

  await clickFirst(page, ['button[type="submit"]', 'button:has-text("Iniciar")', 'button:has-text("Entrar")']);
  await page.waitForTimeout(500);
  recordResult({
    area: 'Auth',
    flow: 'login vacio',
    status: /login/i.test(page.url()) ? 'PASS' : 'WARN',
    url: page.url(),
    expected: 'El formulario vacio no autentica al usuario.',
    actual: `URL despues de submit vacio: ${page.url()}`,
  });

  await fillFirst(page, ['input[type="email"]', 'input[name="email"]'], 'qa.codex.invalid@example.test');
  await fillFirst(page, ['input[type="password"]', 'input[name="password"]'], 'QA-CODEX-invalid-password');
  await clickFirst(page, ['button[type="submit"]', 'button:has-text("Iniciar")', 'button:has-text("Entrar")']);
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  recordResult({
    area: 'Auth',
    flow: 'login invalido',
    status: /login/i.test(page.url()) ? 'PASS' : 'FAIL',
    url: page.url(),
    expected: 'Credenciales invalidas no crean sesion.',
    actual: `URL despues de credenciales invalidas: ${page.url()}`,
    severity: /login/i.test(page.url()) ? undefined : 'P1',
  });

  const forgotVisible = await page.getByText(/olvide|recuperar|forgot/i).first().isVisible().catch(() => false);
  recordResult({
    area: 'Auth',
    flow: 'forgot password',
    status: forgotVisible ? 'PASS' : 'SKIPPED',
    url: page.url(),
    expected: 'Flujo de recuperacion visible o ruta documentada.',
    actual: forgotVisible ? 'Link/texto de recuperacion visible.' : 'No se encontro link de recuperacion en login.',
  });

  await auditPageLoad(page, 'Auth', 'ruta protegida sin sesion', '/super-admin/users/', /login|iniciar|Educore|No autorizado|Unauthorized/i);
  await checkVisibleText(page, 'Auth', 'bloqueo ruta protegida sin sesion', /login|iniciar|no autorizado|unauthorized|Educore/i);
});

test('auth: login super admin y logout si hay credenciales locales', async ({ page, request }) => {
  const loggedIn = await loginSuperAdminWithFallback(page, request);
  if (!loggedIn) return;

  let logoutClicked = await clickFirst(page, [
    'button:has-text("Cerrar sesion")',
    'button:has-text("Cerrar Sesion")',
    'button:has-text("Salir")',
    'a:has-text("Cerrar sesion")',
    '[aria-label*="logout" i]',
  ]);
  if (!logoutClicked) {
    await clickFirst(page, ['[data-testid="profile-menu-trigger"]', 'button[aria-label="Abrir menu de perfil"]']);
    await page.waitForTimeout(500);
    logoutClicked = await clickFirst(page, [
      'button:has-text("Cerrar Sesion")',
      'button:has-text("Cerrar sesion")',
      '[role="menuitem"]:has-text("Cerrar Sesion")',
    ]);
  }
  recordResult({
    area: 'Auth',
    flow: 'logout super admin',
    status: logoutClicked ? 'PASS' : 'WARN',
    url: page.url(),
    role: 'SUPER_ADMIN',
    expected: 'Existe accion de logout y puede accionarse.',
    actual: logoutClicked ? 'Logout clickeado.' : 'No se encontro control de logout por texto/aria.',
    severity: logoutClicked ? undefined : 'P3',
  });
});
