import { test } from '@playwright/test';
import { hasSuperAdminCredentials, recordSkip } from './helpers/audit';

const flows = [
  'credenciales desde Super Admin',
  'credenciales desde School Admin',
  'reset password temporal',
  'usuario inactivo no entra',
  'password_hash nunca visible',
  'invitaciones con provider not configured si falta Resend',
  'conceptos de cobro',
  'adeudos y estado de cuenta',
  'recibos',
  'pagos sin pasarela real',
  'becas/descuentos/recargos',
  'vista padre/alumno de facturacion',
];

test('billing y credenciales: flujos seguros sin pagos reales', async () => {
  for (const flow of flows) {
    recordSkip(
      'Billing/Credentials',
      flow,
      hasSuperAdminCredentials
        ? 'Falta escuela/usuarios QA creados y E2E_ALLOW_PRODUCTION_MUTATIONS=true; no se ejecutan pagos ni correos reales.'
        : 'Faltan credenciales E2E; no se ejecutan flujos autenticados ni mutantes.',
    );
  }
});
