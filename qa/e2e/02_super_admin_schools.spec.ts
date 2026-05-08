import { test } from '@playwright/test';
import { auditPageLoad, hasSuperAdminCredentials, loginSuperAdminWithFallback, recordSkip, saveAuditScreenshot } from './helpers/audit';

const superAdminRoutes = [
  ['/super-admin/dashboard/', 'dashboard'],
  ['/super-admin/modules/', 'modulos'],
  ['/super-admin/billing/', 'billing'],
  ['/super-admin/analytics/', 'analytics'],
  ['/super-admin/health/', 'health monitor'],
  ['/super-admin/database/', 'database admin'],
  ['/super-admin/audit/', 'auditoria'],
  ['/super-admin/support/', 'soporte'],
  ['/super-admin/storage/', 'storage'],
  ['/super-admin/feature-flags/', 'feature flags'],
  ['/super-admin/backups/', 'backups'],
  ['/super-admin/version/', 'versioning'],
  ['/super-admin/plans/', 'planes'],
  ['/super-admin/schools/', 'escuelas'],
  ['/super-admin/users/', 'usuarios globales'],
];

test('super admin: navegacion completa read-only', async ({ page, request }, testInfo) => {
  if (!hasSuperAdminCredentials) {
    for (const [route, label] of superAdminRoutes) {
      recordSkip('Super Admin', `navegar ${label}`, 'Faltan credenciales Super Admin E2E.', route);
    }
    return;
  }

  const loggedIn = await loginSuperAdminWithFallback(page, request);
  if (!loggedIn) return;

  for (const [route, label] of superAdminRoutes) {
    const ok = await auditPageLoad(page, 'Super Admin', `navegar ${label}`, route, /Dashboard|Admin|Usuarios|Escuelas|Modulos|Billing|Audit|Health|Backups|Planes|Version/i);
    if (ok && label === 'usuarios globales') {
      await saveAuditScreenshot(page, 'super-admin-users', testInfo);
    }
  }
});
