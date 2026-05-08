import { test } from '@playwright/test';
import { recordSkip } from './helpers/audit';

const studentFlows = [
  'login alumno QA',
  'dashboard alumno',
  'classroom',
  'horario',
  'actividades',
  'biblioteca',
  'examenes',
  'boleta/calificaciones',
  'encuestas',
  'estado de cuenta si aplica',
  'mi institucion',
  'centro de mensajes/noticias',
  'perfil/documentos personalizados',
  'RBAC: alumno solo ve sus datos',
];

test('student portal: matriz de flujos QA', async () => {
  for (const flow of studentFlows) {
    recordSkip('Student Portal', flow, 'Falta cuenta de alumno QA creada por flujo mutante seguro.');
  }
});
