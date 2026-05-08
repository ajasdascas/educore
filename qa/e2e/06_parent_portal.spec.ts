import { test } from '@playwright/test';
import { recordSkip } from './helpers/audit';

const parentFlows = [
  'login padre QA',
  'mis hijos y selector de hijo',
  'asistencia',
  'calificaciones/avances',
  'documentos',
  'pagos y estado de cuenta sin pagos reales',
  'permisos',
  'mensajes/notificaciones',
  'Kinder: daily log, meals, naps, diapers, mood, incidents',
  'Preescolar: campos formativos, observaciones, evidencias',
  'Primaria: tareas, boleta, calificaciones, estado de cuenta',
  'RBAC: padre solo ve hijos vinculados',
];

test('parent portal: matriz de flujos QA', async () => {
  for (const flow of parentFlows) {
    recordSkip('Parent Portal', flow, 'Falta usuario padre QA vinculado a alumno QA.');
  }
});
