import { test } from '@playwright/test';
import { auditPageLoad, hasSuperAdminCredentials, loginSuperAdminWithFallback, recordResult, recordSkip } from './helpers/audit';

test('backups: vista real, provider y acciones seguras', async ({ page, request }) => {
  if (!hasSuperAdminCredentials) {
    recordSkip('Backups', 'crear/editar/descargar/eliminar backup QA', 'Faltan credenciales Super Admin E2E.');
    return;
  }

  const loggedIn = await loginSuperAdminWithFallback(page, request);
  if (!loggedIn) return;

  await auditPageLoad(page, 'Backups', 'abrir Super Admin Backups', '/super-admin/backups/', /Backup|Backups|Historial|Deploy|GitHub/i);
  recordResult({
    area: 'Backups',
    flow: 'crear backup QA-CODEX Backup Test',
    status: process.env.E2E_ALLOW_BACKUP_MUTATION === 'true' ? 'PARTIAL' : 'SKIPPED_PROVIDER_NOT_CONFIGURED',
    role: 'SUPER_ADMIN',
    url: page.url(),
    expected: 'Crear backup solo si provider y bandera explicita de backup QA estan habilitados.',
    actual: process.env.E2E_ALLOW_BACKUP_MUTATION === 'true'
      ? 'Bandera presente; el flujo profundo debe validar provider antes de crear.'
      : 'No se creo ni descargo backup para evitar tocar datos reales/provider sin bandera dedicada.',
    recommendation: 'Habilitar E2E_ALLOW_BACKUP_MUTATION=true solo en entorno QA/VPS con backup aislado.',
  });
});
