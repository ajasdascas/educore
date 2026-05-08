import { test } from '@playwright/test';
import { hasSuperAdminCredentials, recordSkip } from './helpers/audit';

const flows = [
  'dashboard school admin',
  'estructura',
  'estudiantes crear/editar QA',
  'padres/tutores y vinculacion',
  'credenciales alumno/padre',
  'profesores',
  'grupos y asignaciones',
  'horarios',
  'asistencia',
  'calificaciones/boletas si aplica',
  'documentos/reportes',
  'comunicaciones',
  'configuracion',
];

test('school admin: operacion core por escuela QA', async () => {
  for (const flow of flows) {
    recordSkip(
      'School Admin',
      flow,
      hasSuperAdminCredentials
        ? 'Falta escuela QA provisionada y/o modo soporte confirmado para ejecutar este flujo sin tocar datos reales.'
        : 'Faltan credenciales Super Admin E2E para entrar en modo soporte o preparar escuela QA.',
    );
  }
});
