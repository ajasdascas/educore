import { test } from '@playwright/test';
import { auditPageLoad, hasSuperAdminCredentials, loginSuperAdminWithFallback, recordSkip } from './helpers/audit';

test('backups y deploy history: lectura y estados claros', async ({ page, request }) => {
  if (!hasSuperAdminCredentials) {
    recordSkip('Backups/Deploy', 'Super Admin backups', 'Faltan credenciales para revisar historial y estados sin crear backups.');
    recordSkip('Backups/Deploy', 'crear/editar/eliminar backup', 'Operacion mutante bloqueada sin credenciales y mutation gate.');
    return;
  }

  const loggedIn = await loginSuperAdminWithFallback(page, request);
  if (!loggedIn) return;

  await auditPageLoad(page, 'Backups/Deploy', 'abrir backups', '/super-admin/backups/', /Backup|Deploy|Historial|R2|Storage|Database/i);
  recordSkip('Backups/Deploy', 'crear backup', 'No se crean backups en produccion desde auditoria automatica sin aprobacion explicita adicional.');
});
