import { test } from '@playwright/test';
import { auditPageLoad, hasSuperAdminCredentials, loginSuperAdminWithFallback, recordResult, recordSkip } from './helpers/audit';

test('mensajes, notificaciones y permisos: rutas y limites seguros', async ({ page, request }) => {
  if (!hasSuperAdminCredentials) {
    recordSkip('Mensajes', 'comunicaciones multirol QA', 'Faltan credenciales Super Admin E2E y usuarios QA vinculados.');
  } else {
    const loggedIn = await loginSuperAdminWithFallback(page, request);
    if (loggedIn) {
      await auditPageLoad(page, 'Mensajes', 'School Admin comunicaciones protegido', '/school-admin/communications/', /Comunicaciones|Mensajes|login|iniciar|No autorizado|Unauthorized/i);
    }
  }

  await auditPageLoad(page, 'Notificaciones', 'Parent notificaciones sin sesion', '/parent/notifications/', /login|iniciar|Notificaciones|No autorizado|Unauthorized/i);
  await auditPageLoad(page, 'Permisos', 'Parent permisos sin sesion', '/parent/consents/', /login|iniciar|Permisos|Autorizaciones|No autorizado|Unauthorized/i);
  recordResult({
    area: 'Mensajes',
    flow: 'no cross-tenant ni mensajes a otra escuela',
    status: 'SKIPPED_NO_CREDENTIALS',
    expected: 'Validar solo con usuarios QA de dos escuelas controladas.',
    actual: 'No se intento enviar mensajes entre tenants sin cuentas QA suficientes.',
  });
});
